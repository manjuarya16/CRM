import { pool } from '@/config/db';
import { CreateMailInput, UpdateMailInput, MassUpdateMailInput, MassDestroyMailInput } from '@/schemas/mail.schema';
import { sendRealMail } from '@/utils/mailer';
import { logger } from '@/utils/logger';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

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
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE folders @> '["inbox"]'::jsonb AND is_read = FALSE AND parent_id IS NULL) AS inbox_unread,
        COUNT(*) FILTER (WHERE folders @> '["inbox"]'::jsonb AND parent_id IS NULL) AS inbox_total,
        COUNT(*) FILTER (WHERE folders @> '["important"]'::jsonb AND parent_id IS NULL) AS important_total,
        COUNT(*) FILTER (WHERE folders @> '["starred"]'::jsonb AND parent_id IS NULL) AS starred_total,
        COUNT(*) FILTER (WHERE folders @> '["draft"]'::jsonb) AS draft_total,
        COUNT(*) FILTER (WHERE folders @> '["outbox"]'::jsonb) AS outbox_total,
        COUNT(*) FILTER (WHERE folders @> '["sent"]'::jsonb) AS sent_total,
        COUNT(*) FILTER (WHERE folders @> '["spam"]'::jsonb AND parent_id IS NULL) AS spam_total,
        COUNT(*) FILTER (WHERE folders @> '["trash"]'::jsonb) AS trash_total
      FROM public.emails
    `;
    const result = await pool.query(query);
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
  async getEmailById(id: number) {
    // 1. Fetch main email
    const emailRes = await pool.query(
      `SELECT e.*, 
              p.name AS person_name, p.emails AS person_emails,
              l.title AS lead_title,
              u.name AS user_name, u.email AS user_email
       FROM public.emails e
       LEFT JOIN public.persons p ON p.id = e.person_id
       LEFT JOIN public.leads l ON l.id = e.lead_id
       LEFT JOIN public.users u ON u.id = e.user_id
       WHERE e.id = $1`,
      [id]
    );

    if (emailRes.rows.length === 0) {
      return null;
    }

    const email = emailRes.rows[0];

    // Mark email as read automatically
    if (!email.is_read) {
      await pool.query('UPDATE public.emails SET is_read = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
      email.is_read = true;
    }

    // 2. Fetch attachments for main email
    const attachmentsRes = await pool.query(
      'SELECT * FROM public.email_attachments WHERE email_id = $1 ORDER BY id ASC',
      [id]
    );
    email.attachments = attachmentsRes.rows;

    // 3. Fetch conversation thread (all child replies where parent_id = root_id)
    const rootId = email.parent_id || email.id;
    const repliesRes = await pool.query(
      `SELECT e.*, 
              p.name AS person_name,
              l.title AS lead_title,
              u.name AS user_name
       FROM public.emails e
       LEFT JOIN public.persons p ON p.id = e.person_id
       LEFT JOIN public.leads l ON l.id = e.lead_id
       LEFT JOIN public.users u ON u.id = e.user_id
       WHERE e.parent_id = $1
       ORDER BY e.created_at ASC`,
      [rootId]
    );

    const replies = repliesRes.rows;
    for (const reply of replies) {
      const replyAttachRes = await pool.query(
        'SELECT * FROM public.email_attachments WHERE email_id = $1 ORDER BY id ASC',
        [reply.id]
      );
      reply.attachments = replyAttachRes.rows;
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

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO public.emails (
          subject, source, user_type, name, reply, is_read, folders,
          from_email, sender, reply_to, cc, bcc, unique_id, message_id,
          person_id, lead_id, parent_id, user_id, created_at, updated_at
        ) VALUES (
          $1, 'mail', 'admin', $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) RETURNING *
      `;

      const result = await client.query(insertQuery, [
        data.subject || '(No Subject)',
        fromEmail.name,
        data.reply,
        true, // User's own composed mail is marked read
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
      ]);

      const createdEmail = result.rows[0];

      // Insert file attachments
      if (files && files.length > 0) {
        for (const file of files) {
          const attachPath = `/uploads/mail/${file.filename}`;
          await client.query(
            `INSERT INTO public.email_attachments (name, path, size, content_type, email_id, created_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
            [file.originalname, attachPath, file.size, file.mimetype, createdEmail.id]
          );
        }
      }

      // If linked to lead and sent (not draft), log activity on lead timeline
      if (data.lead_id && !isDraft) {
        await client.query(
          `SELECT * FROM public.fn_create_activity($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            `Email: ${data.subject || 'No Subject'}`,
            'email',
            data.reply,              // $3: comment
            null,                    // $4: schedule_from
            null,                    // $5: schedule_to
            true,                    // $6: is_done (boolean)
            user?.id || null,        // $7: user_id
            null,                    // $8: location
            data.lead_id,            // $9: lead_id
            data.person_id || null,  // $10: person_id
          ]
        );
      }

      // If not a draft, dispatch real external email via SMTP (if configured)
      if (!isDraft) {
        const attachedFiles = (files || []).map((f) => ({
          filename: f.originalname,
          path: `/uploads/mail/${f.filename}`,
        }));

        sendRealMail({
          to: data.reply_to,
          cc: data.cc,
          bcc: data.bcc,
          subject: data.subject || '(No Subject)',
          text: data.reply,
          html: data.reply,
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
  async updateEmail(id: number, data: UpdateMailInput, files: Express.Multer.File[] = [], user?: any) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query('SELECT * FROM public.emails WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        throw new Error('Email not found');
      }

      let folders = existing.rows[0].folders;
      if (data.is_draft !== undefined) {
        folders = data.is_draft ? ['draft'] : ['sent'];
      } else if (data.folders) {
        folders = data.folders;
      }

      const updateQuery = `
        UPDATE public.emails
        SET subject = COALESCE($1, subject),
            reply = COALESCE($2, reply),
            reply_to = COALESCE($3, reply_to),
            cc = COALESCE($4, cc),
            bcc = COALESCE($5, bcc),
            folders = COALESCE($6, folders),
            person_id = COALESCE($7, person_id),
            lead_id = COALESCE($8, lead_id),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
        RETURNING *
      `;

      await client.query(updateQuery, [
        data.subject,
        data.reply,
        data.reply_to ? JSON.stringify(data.reply_to) : null,
        data.cc ? JSON.stringify(data.cc) : null,
        data.bcc ? JSON.stringify(data.bcc) : null,
        JSON.stringify(folders),
        data.person_id,
        data.lead_id,
        id,
      ]);

      // Handle new file attachments
      if (files && files.length > 0) {
        for (const file of files) {
          const attachPath = `/uploads/mail/${file.filename}`;
          await client.query(
            `INSERT INTO public.email_attachments (name, path, size, content_type, email_id, created_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
            [file.originalname, attachPath, file.size, file.mimetype, id]
          );
        }
      }

      // If draft was converted to sent and is linked to a lead, log activity on lead timeline
      const targetLeadId = data.lead_id || existing.rows[0].lead_id;
      if (targetLeadId && data.is_draft === false) {
        await client.query(
          `SELECT * FROM public.fn_create_activity($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            `Email: ${data.subject || existing.rows[0].subject || 'No Subject'}`,
            'email',
            data.reply || existing.rows[0].reply,
            null,
            null,
            true,
            user?.id || null,
            null,
            targetLeadId,
            data.person_id || existing.rows[0].person_id || null,
          ]
        );
      }

      // If draft was published (is_draft set to false), dispatch real email via SMTP
      if (data.is_draft === false) {
        const attachedFiles = (files || []).map((f) => ({
          filename: f.originalname,
          path: `/uploads/mail/${f.filename}`,
        }));

        sendRealMail({
          to: data.reply_to || existing.rows[0].reply_to || [],
          cc: data.cc || existing.rows[0].cc,
          bcc: data.bcc || existing.rows[0].bcc,
          subject: data.subject || existing.rows[0].subject || '(No Subject)',
          text: data.reply || existing.rows[0].reply || '',
          html: data.reply || existing.rows[0].reply || '',
          attachments: attachedFiles,
        }).catch((err) => logger.error(`[MailService] sendRealMail error: ${err}`));
      }

      await client.query('COMMIT');
      return await this.getEmailById(id);
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
  async toggleReadStatus(id: number, isRead: boolean) {
    await pool.query(
      'UPDATE public.emails SET is_read = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [isRead, id]
    );
    return { success: true, is_read: isRead };
  }

  /**
   * Move email to trash or permanently delete
   */
  async deleteEmail(id: number, type: 'trash' | 'delete' = 'trash') {
    if (type === 'trash') {
      await pool.query(
        `UPDATE public.emails SET folders = '["trash"]'::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id]
      );
      return { success: true, message: 'Moved to trash' };
    } else {
      await pool.query('DELETE FROM public.emails WHERE id = $1', [id]);
      return { success: true, message: 'Permanently deleted' };
    }
  }

  /**
   * Mass update folders or read status
   */
  async massUpdate(data: MassUpdateMailInput) {
    const { indices, folders, is_read } = data;
    if (folders) {
      await pool.query(
        `UPDATE public.emails SET folders = $1, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($2::int[])`,
        [JSON.stringify(folders), indices]
      );
    }
    if (is_read !== undefined) {
      await pool.query(
        `UPDATE public.emails SET is_read = $1, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($2::int[])`,
        [is_read, indices]
      );
    }
    return { success: true, count: indices.length };
  }

  /**
   * Mass destroy / move to trash
   */
  async massDestroy(data: MassDestroyMailInput) {
    const { indices, type } = data;
    if (type === 'trash') {
      await pool.query(
        `UPDATE public.emails SET folders = '["trash"]'::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($1::int[])`,
        [indices]
      );
      return { success: true, message: 'Emails moved to trash' };
    } else {
      await pool.query('DELETE FROM public.emails WHERE id = ANY($1::int[])', [indices]);
      return { success: true, message: 'Emails permanently deleted' };
    }
  }

  /**
   * Get attachment details by ID
   */
  async getAttachment(attachmentId: number) {
    const res = await pool.query('SELECT * FROM public.email_attachments WHERE id = $1', [attachmentId]);
    return res.rows[0] || null;
  }

  /**
   * Link or unlink person
   */
  async linkPerson(emailId: number, personId: number | null) {
    await pool.query('UPDATE public.emails SET person_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [personId, emailId]);
    return { success: true, person_id: personId };
  }

  /**
   * Link or unlink lead
   */
  async linkLead(emailId: number, leadId: number | null) {
    await pool.query('UPDATE public.emails SET lead_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [leadId, emailId]);
    return { success: true, lead_id: leadId };
  }
}

export const mailService = new MailService();
