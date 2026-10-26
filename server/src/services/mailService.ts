import { pool } from '@/config/db';
import { CreateMailInput, UpdateMailInput, MassUpdateMailInput, MassDestroyMailInput } from '@/schemas/mail.schema';
import { sendRealMail } from '@/utils/mailer';
import { logger } from '@/utils/logger';
import { fetchTemplateContext, parsePlaceholders } from '@/utils/templateParser';
import crypto from 'crypto';

const stripHtmlToText = (input: string | null | undefined): string => {
  if (!input) return '';
  return String(input)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/g, '$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6]|blockquote|section|article|header|footer|table)>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

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

    const rows = result.rows.map((r: any) => ({
      ...r,
      reply: stripHtmlToText(r.reply),
    }));
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
    email.reply = stripHtmlToText(email.reply);

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
      reply.reply = stripHtmlToText(reply.reply);
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
    const cleanReplyText = stripHtmlToText(parsedReply);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify and sanitize foreign key references (lead_id, person_id, user_id)
      let validLeadId: number | null = null;
      if (data.lead_id && Number(data.lead_id) > 0) {
        const checkLead = await client.query('SELECT id FROM leads WHERE id = $1', [Number(data.lead_id)]);
        if (checkLead.rows.length > 0) {
          validLeadId = Number(data.lead_id);
        }
      }

      let validPersonId: number | null = null;
      if (data.person_id && Number(data.person_id) > 0) {
        const checkPerson = await client.query('SELECT id FROM persons WHERE id = $1', [Number(data.person_id)]);
        if (checkPerson.rows.length > 0) {
          validPersonId = Number(data.person_id);
        }
      }

      let validUserId: number | null = null;
      if (user?.id && Number(user.id) > 0) {
        const checkUser = await client.query('SELECT id FROM users WHERE id = $1', [Number(user.id)]);
        if (checkUser.rows.length > 0) {
          validUserId = Number(user.id);
        }
      }

      const emailInsertResult = await client.query(
        `SELECT * FROM public.fn_save_email(
          $1, $2, $3, $4, $5, $6, $7::jsonb,
          $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb,
          $13, $14, $15, $16, $17, $18, $19
        )`,
        [
          parsedSubject,
          'mail',
          'admin',
          fromEmail.name,
          cleanReplyText || parsedReply,
          true,
          JSON.stringify(folders),
          JSON.stringify(fromEmail),
          JSON.stringify(fromEmail),
          JSON.stringify(data.reply_to),
          JSON.stringify(data.cc || []),
          JSON.stringify(data.bcc || []),
          uniqueId,
          messageId,
          validPersonId,
          validLeadId,
          data.parent_id || null,
          validUserId,
          null,
        ]
      );

      const createdEmail = emailInsertResult.rows[0];
      const createdEmailId = createdEmail?.id ?? createdEmail?.fn_save_email;

      // Insert file attachments via procedural function
      if (files && files.length > 0) {
        for (const file of files) {
          const attachPath = `/uploads/mail/${file.filename}`;
          await client.query(
            'SELECT * FROM public.fn_add_email_attachment($1, $2, $3, $4, $5)',
            [file.originalname, attachPath, file.size, file.mimetype, createdEmailId]
          );
        }
      }

      // If linked to lead and sent (not draft), safely log activity on lead timeline
      if (validLeadId && !isDraft) {
        try {
          await client.query('SAVEPOINT email_activity_sp');
          await client.query(
            `SELECT * FROM public.fn_create_activity($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              `Email: ${parsedSubject}`,
              'email',
              cleanReplyText,
              null,
              null,
              true,
              validUserId,
              null,
              validLeadId,
              validPersonId,
            ]
          );
          await client.query('RELEASE SAVEPOINT email_activity_sp');
        } catch (actErr) {
          await client.query('ROLLBACK TO SAVEPOINT email_activity_sp').catch(() => {});
          logger.warn({ actErr, leadId: validLeadId }, '[MailService] Could not record lead activity for sent email, proceeding');
        }
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
          text: cleanReplyText,
          html: parsedReply,
          attachments: attachedFiles,
        }).catch((err) => logger.error(`[MailService] sendRealMail error: ${err}`));
      }

      await client.query('COMMIT');
      return await this.getEmailById(createdEmailId || createdEmail?.id);
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

      const existingResult = await pool.query('SELECT * FROM public.fn_get_email_details($1)', [emailId]);
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
      const cleanReplyText = stripHtmlToText(parsedReply);

      // Verify and sanitize foreign key references (lead_id, person_id, user_id)
      let validTargetLeadId: number | null = null;
      if (targetLeadId && Number(targetLeadId) > 0) {
        const checkLead = await client.query('SELECT id FROM leads WHERE id = $1', [Number(targetLeadId)]);
        if (checkLead.rows.length > 0) {
          validTargetLeadId = Number(targetLeadId);
        }
      }

      let validTargetPersonId: number | null = null;
      if (targetPersonId && Number(targetPersonId) > 0) {
        const checkPerson = await client.query('SELECT id FROM persons WHERE id = $1', [Number(targetPersonId)]);
        if (checkPerson.rows.length > 0) {
          validTargetPersonId = Number(targetPersonId);
        }
      }

      let validUserId: number | null = null;
      const targetUserId = user?.id || existingEmail.user_id;
      if (targetUserId && Number(targetUserId) > 0) {
        const checkUser = await client.query('SELECT id FROM users WHERE id = $1', [Number(targetUserId)]);
        if (checkUser.rows.length > 0) {
          validUserId = Number(targetUserId);
        }
      }

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
          cleanReplyText || parsedReply,
          existingEmail.is_read,
          JSON.stringify(folders),
          JSON.stringify(existingEmail.from_email || {}),
          JSON.stringify(existingEmail.sender || {}),
          data.reply_to ? JSON.stringify(data.reply_to) : null,
          data.cc ? JSON.stringify(data.cc) : null,
          data.bcc ? JSON.stringify(data.bcc) : null,
          existingEmail.unique_id,
          existingEmail.message_id,
          validTargetPersonId,
          validTargetLeadId,
          existingEmail.parent_id || null,
          validUserId,
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
      if (validTargetLeadId && data.is_draft === false) {
        try {
          await client.query('SAVEPOINT email_update_activity_sp');
          await client.query(
            `SELECT * FROM public.fn_create_activity($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              `Email: ${parsedSubject || 'No Subject'}`,
              'email',
              cleanReplyText,
              null,
              null,
              true,
              validUserId,
              null,
              validTargetLeadId,
              validTargetPersonId,
            ]
          );
          await client.query('RELEASE SAVEPOINT email_update_activity_sp');
        } catch (actErr) {
          await client.query('ROLLBACK TO SAVEPOINT email_update_activity_sp').catch(() => {});
          logger.warn({ actErr, leadId: validTargetLeadId }, '[MailService] Could not record lead activity for updated email, proceeding');
        }
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
          text: cleanReplyText || '',
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
   * Toggle starred status
   */
  async toggleStarStatus(emailId: number, isStarred?: boolean) {
    const existing = await this.getEmailById(emailId);
    if (!existing) {
      throw new Error('Email not found');
    }

    let folders: string[] = Array.isArray(existing.folders) ? [...existing.folders] : [];
    const currentlyStarred = folders.includes('starred');
    const targetStarred = isStarred !== undefined ? Boolean(isStarred) : !currentlyStarred;

    if (targetStarred) {
      if (!folders.includes('starred')) {
        folders.push('starred');
      }
    } else {
      folders = folders.filter((f) => f !== 'starred');
    }

    await pool.query(
      'UPDATE public.emails SET folders = $1::jsonb, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(folders), emailId]
    );

    return { success: true, id: emailId, is_starred: targetStarred, folders };
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
