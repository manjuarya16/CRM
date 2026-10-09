import { pool } from '@/config/db';
import { CreateMailInput, UpdateMailInput, MassUpdateMailInput, MassDestroyMailInput } from '@/schemas/mail.schema';
import { sendRealMail } from '@/utils/mailer';
import { logger } from '@/utils/logger';
import { fetchTemplateContext, parsePlaceholders } from '@/utils/templateParser';
import crypto from 'crypto';

export class MailService {
  /**
   * Get paginated email list filtered by folder & search
   */
  async getEmails(params: { folder?: string; search?: string; page?: number; limit?: number }) {
    const folder = params.folder || 'inbox';
    const search = params.search || '';
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 25);
    const offset = (page - 1) * limit;

    const result = await pool.query(
      'SELECT * FROM public.fn_get_emails($1, $2, $3, $4)',
      [folder, search, limit, offset]
    );

    const rows = result.rows;
    const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get unread counters for all folders
   */
  async getFolderCounts() {
    const result = await pool.query('SELECT * FROM public.fn_get_email_folder_counts()');
    return result.rows[0] || {
      inbox_unread: 0,
      inbox_total: 0,
      important_total: 0,
      starred_total: 0,
      draft_total: 0,
      outbox_total: 0,
      sent_total: 0,
      spam_total: 0,
      trash_total: 0,
    };
  }

  /**
   * Get single email thread with all replies and attachments
   */
  async getEmailById(emailId: number) {
    // 1. Fetch main email details via procedural function
    const emailQueryResult = await pool.query(
      'SELECT * FROM public.fn_get_email_details($1)',
      [emailId]
    );

    if (emailQueryResult.rows.length === 0) {
      return null;
    }

    const email = emailQueryResult.rows[0];

    // Mark email as read automatically via procedural function
    if (!email.is_read) {
      await pool.query('SELECT public.fn_update_email_read_status($1, true)', [emailId]);
      email.is_read = true;
    }

    // 2. Fetch attachments for main email via procedural function
    const attachmentsQueryResult = await pool.query(
      'SELECT * FROM public.fn_get_email_attachments($1)',
      [emailId]
    );
    email.attachments = attachmentsQueryResult.rows;

    // 3. Fetch conversation thread (all child replies where parent_id = rootId)
    const rootId = email.parent_id || email.id;
    const repliesQueryResult = await pool.query(
      'SELECT * FROM public.fn_get_email_thread($1)',
      [rootId]
    );

    const replies = repliesQueryResult.rows;
    for (const reply of replies) {
      const replyAttachmentsQueryResult = await pool.query(
        'SELECT * FROM public.fn_get_email_attachments($1)',
        [reply.id]
      );
      reply.attachments = replyAttachmentsQueryResult.rows;
    }

    email.emails = replies;
    return email;
  }

  /**
   * Create / Compose a new email or save draft
   */
  async createEmail(data: CreateMailInput, files: Express.Multer.File[] = [], user?: any) {
    const isDraft = Boolean(data.is_draft);
    const folders = isDraft ? ['draft'] : ['sent'];

    const fromEmail = {
      name: user?.name || 'CRM User',
      email: user?.email || 'user@example.com',
    };

    const uniqueId = `email_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const messageId = `<${uniqueId}@crm.local>`;

    // Parse template placeholders
    const templateContext = await fetchTemplateContext({
      lead_id: data.lead_id,
      person_id: data.person_id,
      organization_id: (data as any).organization_id,
      to_email: data.reply_to,
      user,
    });
    const parsedSubject = parsePlaceholders(data.subject || '(No Subject)', templateContext);
    const parsedReply = parsePlaceholders(data.reply || '', templateContext);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const emailInsertResult = await client.query(
        `SELECT * FROM public.fn_save_email(
          $1, $2, $3, $4, $5, $6, $7::jsonb,
          $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb,
          $13, $14, $15, $16, $17, $18
        )`,
        [
          parsedSubject,
          'mail',
          'admin',
          fromEmail.name,
          parsedReply,
          true,
          JSON.stringify(folders),
          JSON.stringify(fromEmail),
          JSON.stringify(fromEmail),
          JSON.stringify(data.reply_to),
          JSON.stringify(data.cc || []),
          JSON.stringify(data.bcc || []),
          uniqueId,
          messageId,
          data.person_id || null,
          data.lead_id || null,
          data.parent_id || null,
          user?.id || null,
        ]
      );

      const createdEmail = emailInsertResult.rows[0];

      // Insert file attachments via procedural function
      if (files && files.length > 0) {
        for (const file of files) {
          const attachPath = `/uploads/mail/${file.filename}`;
          await client.query(
            'SELECT * FROM public.fn_add_email_attachment($1, $2, $3, $4, $5)',
            [file.originalname, attachPath, file.size, file.mimetype, createdEmail.id]
          );
        }
      }

      // If linked to lead and sent (not draft), log activity on lead timeline
      if (data.lead_id && !isDraft) {
        await client.query(
          `SELECT * FROM public.fn_create_activity($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            `Email: ${parsedSubject}`,
            'email',
            parsedReply,
            null,
            null,
            true,
            user?.id || null,
            null,
            data.lead_id,
            data.person_id || null,
          ]
        );
      }

      // If not a draft, dispatch real external email via SMTP
      if (!isDraft) {
        const attachedFiles = (files || []).map((attachedFile) => ({
          filename: attachedFile.originalname,
          path: `/uploads/mail/${attachedFile.filename}`,
        }));

        sendRealMail({
          to: data.reply_to,
          cc: data.cc,
          bcc: data.bcc,
          subject: parsedSubject,
          text: parsedReply,
          html: parsedReply,
          attachments: attachedFiles,
        }).catch((err) => logger.error(`[MailService] sendRealMail error: ${err}`));
      }

      await client.query('COMMIT');
      return await this.getEmailById(createdEmail.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing draft or send draft
   */
  async updateEmail(emailId: number, data: UpdateMailInput, files: Express.Multer.File[] = [], user?: any) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existingResult = await client.query('SELECT * FROM public.fn_get_email_details($1)', [emailId]);
      if (existingResult.rows.length === 0) {
        throw new Error('Email not found');
      }

      const existingEmail = existingResult.rows[0];
      let folders = existingEmail.folders;
      if (data.is_draft !== undefined) {
        folders = data.is_draft ? ['draft'] : ['sent'];
      } else if (data.folders) {
        folders = data.folders;
      }

      const targetLeadId = data.lead_id !== undefined ? data.lead_id : existingEmail.lead_id;
      const targetPersonId = data.person_id !== undefined ? data.person_id : existingEmail.person_id;
      const targetOrganizationId = (data as any).organization_id !== undefined ? (data as any).organization_id : existingEmail.organization_id;

      const templateContext = await fetchTemplateContext({
        lead_id: targetLeadId,
        person_id: targetPersonId,
        organization_id: targetOrganizationId,
        to_email: data.reply_to || existingEmail.reply_to,
        user,
      });

      const rawSubject = data.subject !== undefined ? data.subject : existingEmail.subject;
      const rawReply = data.reply !== undefined ? data.reply : existingEmail.reply;

      const parsedSubject = rawSubject ? parsePlaceholders(rawSubject, templateContext) : rawSubject;
      const parsedReply = rawReply ? parsePlaceholders(rawReply, templateContext) : rawReply;

      await client.query(
        `SELECT * FROM public.fn_save_email(
          $1, $2, $3, $4, $5, $6, $7::jsonb,
          $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb,
          $13, $14, $15, $16, $17, $18, $19
        )`,
        [
          parsedSubject,
          existingEmail.source || 'mail',
          existingEmail.user_type || 'admin',
          existingEmail.name,
          parsedReply,
          existingEmail.is_read,
          JSON.stringify(folders),
          JSON.stringify(existingEmail.from_email || {}),
          JSON.stringify(existingEmail.sender || {}),
          data.reply_to ? JSON.stringify(data.reply_to) : null,
          data.cc ? JSON.stringify(data.cc) : null,
          data.bcc ? JSON.stringify(data.bcc) : null,
          existingEmail.unique_id,
          existingEmail.message_id,
          targetPersonId || null,
          targetLeadId || null,
          existingEmail.parent_id || null,
          existingEmail.user_id || null,
          emailId,
        ]
      );

      // Handle new file attachments via procedural function
      if (files && files.length > 0) {
        for (const file of files) {
          const attachPath = `/uploads/mail/${file.filename}`;
          await client.query(
            'SELECT * FROM public.fn_add_email_attachment($1, $2, $3, $4, $5)',
            [file.originalname, attachPath, file.size, file.mimetype, emailId]
          );
        }
      }

      // If draft was converted to sent and is linked to a lead, log activity on lead timeline
      if (targetLeadId && data.is_draft === false) {
        await client.query(
          `SELECT * FROM public.fn_create_activity($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            `Email: ${parsedSubject || 'No Subject'}`,
            'email',
            parsedReply,
            null,
            null,
            true,
            user?.id || null,
            null,
            targetLeadId,
            targetPersonId || null,
          ]
        );
      }

      // If draft was published, dispatch real email via SMTP
      if (data.is_draft === false) {
        const attachedFiles = (files || []).map((attachedFile) => ({
          filename: attachedFile.originalname,
          path: `/uploads/mail/${attachedFile.filename}`,
        }));

        sendRealMail({
          to: data.reply_to || existingEmail.reply_to || [],
          cc: data.cc || existingEmail.cc,
          bcc: data.bcc || existingEmail.bcc,
          subject: parsedSubject || '(No Subject)',
          text: parsedReply || '',
          html: parsedReply || '',
          attachments: attachedFiles,
        }).catch((err) => logger.error(`[MailService] sendRealMail error: ${err}`));
      }

      await client.query('COMMIT');
      return await this.getEmailById(emailId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Toggle is_read status
   */
  async toggleReadStatus(emailId: number, isRead: boolean) {
    await pool.query('SELECT public.fn_update_email_read_status($1, $2)', [emailId, isRead]);
    return { success: true, is_read: isRead };
  }

  /**
   * Move email to trash or permanently delete
   */
  async deleteEmail(emailId: number, type: 'trash' | 'delete' = 'trash') {
    await pool.query('SELECT public.fn_delete_email($1, $2)', [emailId, type]);
    return { success: true, message: type === 'trash' ? 'Moved to trash' : 'Permanently deleted' };
  }

  /**
   * Mass update folders or read status
   */
  async massUpdate(data: MassUpdateMailInput) {
    const { indices, folders, is_read } = data;
    await pool.query(
      'SELECT public.fn_mass_update_emails($1, $2::jsonb, $3::boolean)',
      [indices, folders ? JSON.stringify(folders) : null, is_read ?? null]
    );
    return { success: true, count: indices.length };
  }

  /**
   * Mass destroy / move to trash
   */
  async massDestroy(data: MassDestroyMailInput) {
    const { indices, type } = data;
    await pool.query(
      'SELECT public.fn_mass_delete_emails($1, $2)',
      [indices, type || 'trash']
    );
    return { success: true, message: type === 'trash' ? 'Emails moved to trash' : 'Emails permanently deleted' };
  }

  /**
   * Get attachment details by ID
   */
  async getAttachment(attachmentId: number) {
    const result = await pool.query('SELECT * FROM public.fn_get_email_attachment_by_id($1)', [attachmentId]);
    return result.rows[0] || null;
  }

  /**
   * Link or unlink person
   */
  async linkPerson(emailId: number, personId: number | null) {
    await pool.query('SELECT public.fn_link_email($1, $2, NULL, true, false)', [emailId, personId]);
    return { success: true, person_id: personId };
  }

  /**
   * Link or unlink lead
   */
  async linkLead(emailId: number, leadId: number | null) {
    await pool.query('SELECT public.fn_link_email($1, NULL, $2, false, true)', [emailId, leadId]);
    return { success: true, lead_id: leadId };
  }
}

export const mailService = new MailService();
