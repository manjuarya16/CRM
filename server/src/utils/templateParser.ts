import { pool } from '@/config/db';
import { logger } from '@/utils/logger';

function formatEmail(val: any): string {
  if (!val) return '';
  let parsed = val;
  if (typeof val === 'string') {
    try { parsed = JSON.parse(val); } catch { return val; }
  }
  if (Array.isArray(parsed) && parsed.length > 0) {
    const first = parsed[0];
    return typeof first === 'object' ? (first.value || first.email || '') : String(first);
  }
  return typeof parsed === 'string' ? parsed : '';
}

function formatPhone(val: any): string {
  if (!val) return '';
  let parsed = val;
  if (typeof val === 'string') {
    try { parsed = JSON.parse(val); } catch { return val; }
  }
  if (Array.isArray(parsed) && parsed.length > 0) {
    const first = parsed[0];
    return typeof first === 'object' ? (first.value || first.number || '') : String(first);
  }
  return typeof parsed === 'string' ? parsed : '';
}

export async function fetchTemplateContext(params: {
  lead_id?: number | string | null;
  person_id?: number | string | null;
  organization_id?: number | string | null;
  to_email?: string | string[] | null;
  user?: any;
}): Promise<Record<string, any>> {
  const context: Record<string, any> = {
    user: params.user || null,
    lead: {},
    person: {},
    organization: {},
    activity: {},
    quote: {},
  };

  let leadId = params.lead_id ? Number(params.lead_id) : null;
  let personId = params.person_id ? Number(params.person_id) : null;
  let organizationId = params.organization_id ? Number(params.organization_id) : null;

  // Auto-discover Person from recipient email if person_id was not explicitly provided
  if (!personId && params.to_email) {
    const emailList = Array.isArray(params.to_email) ? params.to_email : [params.to_email];
    const targetEmail = emailList.find((e) => typeof e === 'string' && e.includes('@'));
    if (targetEmail) {
      try {
        const personMatch = await pool.query(
          `SELECT id FROM public.persons WHERE emails::text ILIKE $1 ORDER BY id DESC LIMIT 1`,
          [`%${targetEmail.trim()}%`]
        );
        if (personMatch.rows[0]) {
          personId = personMatch.rows[0].id;
        }
      } catch (e: any) {
        logger.warn('[TemplateParser] Auto-discover person by email failed: ' + e?.message);
      }
    }
  }

  // ─── Fetch LEAD ─────────────────────────────────────────────────────────────
  if (leadId) {
    try {
      const { rows } = await pool.query(
        `SELECT
          l.id, l.title, l.description, l.lead_value, l.status,
          l.expected_close_date, l.created_at, l.person_id, l.user_id,
          p.name  AS person_name,
          p.emails AS person_emails,
          p.contact_numbers AS person_contact_numbers,
          org.name AS organization_name,
          s.name  AS source_name,
          t.name  AS type_name,
          pipe.name AS pipeline_name,
          stg.name  AS stage_name,
          u.name  AS user_name,
          u.email AS user_email
        FROM public.leads l
        LEFT JOIN public.persons        p    ON p.id   = l.person_id
        LEFT JOIN public.organizations  org  ON org.id = p.organization_id
        LEFT JOIN public.lead_sources   s    ON s.id   = l.lead_source_id
        LEFT JOIN public.lead_types     t    ON t.id   = l.lead_type_id
        LEFT JOIN public.lead_pipelines pipe ON pipe.id = l.lead_pipeline_id
        LEFT JOIN public.lead_pipeline_stages stg ON stg.id = l.lead_pipeline_stage_id
        LEFT JOIN public.users          u    ON u.id   = l.user_id
        WHERE l.id = $1`,
        [leadId]
      );
      if (rows[0]) {
        context.lead = rows[0];
        if (!personId && rows[0].person_id) {
          personId = rows[0].person_id;
        }
      }
    } catch (err) {
      logger.error({ err, leadId }, 'fetchTemplateContext: lead query failed');
    }

    // ─── Fetch latest ACTIVITY linked to this lead ───────────────────────────
    try {
      const actRes = await pool.query(
        `SELECT a.id, a.title, a.type, a.comment, a.schedule_from, a.schedule_to,
                a.location, a.is_done, a.created_at, a.user_id,
                u.name AS user_name
         FROM public.activities a
         LEFT JOIN public.users u ON u.id = a.user_id
         JOIN public.lead_activities la ON la.activity_id = a.id
         WHERE la.lead_id = $1
           AND a.type NOT IN ('email', 'file', 'system')
         ORDER BY a.id DESC LIMIT 1`,
        [leadId]
      );
      if (actRes.rows[0]) {
        context.activity = actRes.rows[0];
      }
    } catch (err) {
      logger.warn({ err, leadId }, 'fetchTemplateContext: lead activity query failed');
    }

    // ─── Fetch latest QUOTE linked to this lead ──────────────────────────────
    try {
      const qRes = await pool.query(
        `SELECT q.id, q.subject, q.description, q.grand_total, q.sub_total,
                q.expired_at, q.billing_address, q.shipping_address,
                u.name AS user_name
         FROM public.quotes q
         LEFT JOIN public.users u ON u.id = q.user_id
         WHERE q.lead_id = $1
         ORDER BY q.id DESC LIMIT 1`,
        [leadId]
      );
      if (qRes.rows[0]) {
        context.quote = qRes.rows[0];
      }
    } catch (err) {
      logger.error({ err, leadId }, 'fetchTemplateContext: quote query failed');
    }
  }

  // ─── Fetch PERSON ────────────────────────────────────────────────────────────
  if (personId) {
    try {
      const { rows } = await pool.query(
        `SELECT p.id, p.name, p.emails, p.contact_numbers,
                org.name AS organization_name
         FROM public.persons p
         LEFT JOIN public.organizations org ON org.id = p.organization_id
         WHERE p.id = $1`,
        [personId]
      );
      if (rows[0]) {
        context.person = rows[0];
      }
    } catch (err) {
      logger.error({ err, personId }, 'fetchTemplateContext: person query failed');
    }
  }

  // Fallback 1: If activity wasn't found by lead, search activity by person
  if (!context.activity?.id && personId) {
    try {
      const actRes2 = await pool.query(
        `SELECT a.id, a.title, a.type, a.comment, a.schedule_from, a.schedule_to,
                a.location, a.is_done, a.created_at, a.user_id,
                u.name AS user_name
         FROM public.activities a
         LEFT JOIN public.users u ON u.id = a.user_id
         JOIN public.person_activities pa ON pa.activity_id = a.id
         WHERE pa.person_id = $1
           AND a.type NOT IN ('email', 'file', 'system')
         ORDER BY a.id DESC LIMIT 1`,
        [personId]
      );
      if (actRes2.rows[0]) {
        context.activity = actRes2.rows[0];
      }
    } catch (err) {
      logger.warn({ err, personId }, 'fetchTemplateContext: person activity query failed');
    }
  }

  // Fallback 2: If activity still not found, check the user's latest scheduled activity
  if (!context.activity?.id && params.user?.id) {
    try {
      const actRes3 = await pool.query(
        `SELECT a.id, a.title, a.type, a.comment, a.schedule_from, a.schedule_to,
                a.location, a.is_done, a.created_at, a.user_id,
                u.name AS user_name
         FROM public.activities a
         LEFT JOIN public.users u ON u.id = a.user_id
         WHERE a.user_id = $1
           AND a.type NOT IN ('email', 'file', 'system')
         ORDER BY a.id DESC LIMIT 1`,
        [params.user.id]
      );
      if (actRes3.rows[0]) {
        context.activity = actRes3.rows[0];
      }
    } catch (err) {
      logger.warn({ err, userId: params.user.id }, 'fetchTemplateContext: user activity query failed');
    }
  }

  // Fallback 3: Check system's latest scheduled activity
  if (!context.activity?.id) {
    try {
      const actRes4 = await pool.query(
        `SELECT a.id, a.title, a.type, a.comment, a.schedule_from, a.schedule_to,
                a.location, a.is_done, a.created_at, a.user_id,
                u.name AS user_name
         FROM public.activities a
         LEFT JOIN public.users u ON u.id = a.user_id
         WHERE a.type NOT IN ('email', 'file', 'system')
         ORDER BY a.id DESC LIMIT 1`
      );
      if (actRes4.rows[0]) {
        context.activity = actRes4.rows[0];
      }
    } catch (err) {
      logger.warn({ err }, 'fetchTemplateContext: latest activity query failed');
    }
  }

  // Fetch participants for the found activity
  if (context.activity?.id) {
    try {
      const partRes = await pool.query(
        `SELECT 
           COALESCE(u.name, p.name) AS name,
           COALESCE(u.email, (
             CASE 
               WHEN jsonb_typeof(p.emails::jsonb) = 'array' THEN p.emails->0->>'value'
               ELSE p.emails::text 
             END
           )) AS email
         FROM public.activity_participants ap
         LEFT JOIN public.users u ON u.id = ap.user_id
         LEFT JOIN public.persons p ON p.id = ap.person_id
         WHERE ap.activity_id = $1`,
        [context.activity.id]
      );
      const participantNames = partRes.rows
        .map((r: any) => r.name || r.email)
        .filter(Boolean);
      context.activity.participants = participantNames.join(', ');
    } catch (err) {
      logger.warn({ err, activityId: context.activity.id }, 'fetchTemplateContext: participants query failed');
    }
  }

  // ─── Fetch ORGANIZATION ──────────────────────────────────────────────────────
  if (!organizationId && context.person?.organization_id) {
    organizationId = context.person.organization_id;
  }
  if (!organizationId && context.lead?.organization_id) {
    organizationId = context.lead.organization_id;
  }

  if (organizationId) {
    try {
      const { rows } = await pool.query(
        `SELECT id, name, address, created_at FROM public.organizations WHERE id = $1`,
        [organizationId]
      );
      if (rows[0]) {
        context.organization = rows[0];
      }
    } catch (err) {
      logger.error({ err, organizationId }, 'fetchTemplateContext: organization query failed');
    }
  }

  logger.info({
    leadId, personId, organizationId,
    lead_title: context.lead?.title,
    person_name: context.person?.name,
    org_name: context.organization?.name,
    activity_title: context.activity?.title,
    quote_subject: context.quote?.subject,
  }, '[TemplateParser] Context resolved');

  return context;
}

function getValueForTag(key: string, context: Record<string, any>): string {
  const cleanKey     = key.trim().toLowerCase();
  const lead         = context.lead         || {};
  const person       = context.person       || {};
  const organization = context.organization || {};
  const user         = context.user         || {};
  const activity     = context.activity     || {};
  const quote        = context.quote        || {};

  switch (cleanKey) {
    // ── Lead / Leads ──────────────────────────────────────────────────────────
    case 'lead.title':
    case 'leads.title':
    case 'lead.name':
    case 'leads.name':
      return lead.title || '';
    case 'lead.id':
    case 'leads.id':
      return lead.id != null ? String(lead.id) : '';
    case 'lead.value':
    case 'leads.value':
    case 'lead.lead_value':
    case 'leads.lead_value':
      return lead.lead_value != null
        ? `$${Number(lead.lead_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        : '';
    case 'lead.source':
    case 'leads.source':
    case 'lead.source_name':
    case 'leads.source_name':
      return lead.source_name || '';
    case 'lead.type':
    case 'leads.type':
    case 'lead.type_name':
    case 'leads.type_name':
      return lead.type_name || '';
    case 'lead.user_name':
    case 'leads.user_name':
    case 'lead.user':
    case 'leads.user':
    case 'lead.sales_owner':
    case 'leads.sales_owner':
      return lead.user_name || '';
    case 'lead.expected_close_date':
    case 'leads.expected_close_date':
      return lead.expected_close_date
        ? new Date(lead.expected_close_date).toLocaleDateString('en-GB')
        : '';
    case 'lead.pipeline':
    case 'leads.pipeline':
    case 'lead.pipeline_name':
    case 'leads.pipeline_name':
      return lead.pipeline_name || '';
    case 'lead.stage':
    case 'leads.stage':
    case 'lead.stage_name':
    case 'leads.stage_name':
      return lead.stage_name || '';
    case 'lead.description':
    case 'leads.description':
      return lead.description || '';
    case 'lead.status':
    case 'leads.status':
      return lead.status !== undefined ? (lead.status ? 'Open' : 'Lost') : '';

    // ── Person / Persons ──────────────────────────────────────────────────────
    case 'person.name':
    case 'persons.name':
      return person.name || lead.person_name || '';
    case 'person.email':
    case 'persons.email':
    case 'person.emails':
    case 'persons.emails':
      return formatEmail(person.emails || lead.person_emails);
    case 'person.contact_numbers':
    case 'persons.contact_numbers':
    case 'person.contact_number':
    case 'persons.contact_number':
    case 'person.phone':
    case 'persons.phone':
      return formatPhone(person.contact_numbers || lead.person_contact_numbers);
    case 'person.organization':
    case 'persons.organization':
    case 'person.organization_name':
    case 'persons.organization_name':
    case 'person.company':
    case 'persons.company':
      return organization.name || person.organization_name || lead.organization_name || '';

    // ── Organization / Organizations ─────────────────────────────────────────
    case 'organization.name':
    case 'organizations.name':
    case 'organization.company':
    case 'organizations.company':
      return organization.name || person.organization_name || lead.organization_name || '';
    case 'organization.address':
    case 'organizations.address':
      return organization.address || '';

    // ── User / Users ──────────────────────────────────────────────────────────
    case 'user.name':
    case 'users.name':
      return user.name || lead.user_name || '';
    case 'user.email':
    case 'users.email':
      return user.email || lead.user_email || '';

    // ── Activity / Activities ─────────────────────────────────────────────────
    case 'activity.title':
    case 'activities.title': {
      let title = (activity.title || lead.title || 'New Activity').trim();
      title = title.replace(/\{%.*?%\}/gi, '').trim();
      if (!title) title = lead.title || 'New Activity';
      return title;
    }
    case 'activity.type':
    case 'activities.type': {
      const typeMap: Record<string, string> = {
        note: 'Note', call: 'Call', meeting: 'Meeting', lunch: 'Lunch', file: 'File', email: 'Email',
      };
      const rawType = activity.type || 'meeting';
      return typeMap[rawType.toLowerCase()] || (rawType.charAt(0).toUpperCase() + rawType.slice(1));
    }
    case 'activity.user_id':
    case 'activities.user_id':
    case 'activity.user':
    case 'activities.user':
      return activity.user_name || user.name || lead.user_name || '';
    case 'activity.schedule_from':
    case 'activities.schedule_from':
      return activity.schedule_from
        ? new Date(activity.schedule_from).toLocaleString('en-GB')
        : (activity.created_at ? new Date(activity.created_at).toLocaleString('en-GB') : new Date().toLocaleString('en-GB'));
    case 'activity.schedule_to':
    case 'activities.schedule_to':
      if (activity.schedule_to) {
        return new Date(activity.schedule_to).toLocaleString('en-GB');
      }
      if (activity.schedule_from) {
        return new Date(new Date(activity.schedule_from).getTime() + 3600000).toLocaleString('en-GB');
      }
      return new Date(Date.now() + 3600000).toLocaleString('en-GB');
    case 'activity.location':
    case 'activities.location':
      return activity.location || 'Office / Online';
    case 'activity.comment':
    case 'activities.comment':
      return activity.comment || '';
    case 'activity.participants':
    case 'activities.participants':
      return (
        activity.participants ||
        person.name ||
        lead.person_name ||
        user.name ||
        'All Participants'
      );

    // ── Quote / Quotes ────────────────────────────────────────────────────────
    case 'quote.subject':
    case 'quotes.subject':
      return quote.subject || '';
    case 'quote.grand_total':
    case 'quotes.grand_total':
      return quote.grand_total != null
        ? `$${Number(quote.grand_total).toFixed(2)}`
        : '';
    case 'quote.sub_total':
    case 'quotes.sub_total':
      return quote.sub_total != null
        ? `$${Number(quote.sub_total).toFixed(2)}`
        : '';
    case 'quote.expired_at':
    case 'quotes.expired_at':
      return quote.expired_at
        ? new Date(quote.expired_at).toLocaleDateString('en-GB')
        : '';
    case 'quote.user_name':
    case 'quotes.user_name':
      return quote.user_name || '';
    case 'quote.billing_address':
    case 'quotes.billing_address':
      return typeof quote.billing_address === 'object'
        ? JSON.stringify(quote.billing_address)
        : quote.billing_address || '';
    case 'quote.shipping_address':
    case 'quotes.shipping_address':
      return typeof quote.shipping_address === 'object'
        ? JSON.stringify(quote.shipping_address)
        : quote.shipping_address || '';

    default:
      // Strip any other placeholder tag so raw code doesn't leak into sent emails
      return '';
  }
}

export function parsePlaceholders(content: string, context: Record<string, any>): string {
  if (!content) return content;

  let result = content;

  // 1. Replace WYSIWYG editor span badges: <span ...>{%lead.title%}</span>&nbsp;
  result = result.replace(
    /<span[^>]*contenteditable="false"[^>]*>((?:&nbsp;|\s)*)\{%\s*([a-zA-Z0-9_.]+)\s*%\}((?:&nbsp;|\s)*)<\/span>(&nbsp;|\s)*/gi,
    (_match, _pre, tagKey) => getValueForTag(tagKey, context)
  );

  // 2. Replace any other span wrappers containing {%tag%}
  result = result.replace(
    /<span[^>]*>((?:&nbsp;|\s)*)\{%\s*([a-zA-Z0-9_.]+)\s*%\}((?:&nbsp;|\s)*)<\/span>(&nbsp;|\s)*/gi,
    (_match, _pre, tagKey) => getValueForTag(tagKey, context)
  );

  // 3. Replace any remaining bare {%tag%} patterns (with optional spaces inside)
  result = result.replace(/\{%\s*([a-zA-Z0-9_.]+)\s*%\}/gi, (_match, tagKey) =>
    getValueForTag(tagKey, context)
  );

  return result;
}
