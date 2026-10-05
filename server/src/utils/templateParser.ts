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
  activity_id?: number | string | null;
  quote_id?: number | string | null;
  product_id?: number | string | null;
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
    product: {},
  };

  let leadId = params.lead_id ? Number(params.lead_id) : null;
  let personId = params.person_id ? Number(params.person_id) : null;
  let organizationId = params.organization_id ? Number(params.organization_id) : null;
  let activityId = params.activity_id ? Number(params.activity_id) : null;
  let quoteId = params.quote_id ? Number(params.quote_id) : null;
  let productId = params.product_id ? Number(params.product_id) : null;

  // 1. Fetch Activity via procedural function
  if (activityId) {
    try {
      const { rows } = await pool.query(`SELECT fn_get_template_activity_context($1) AS data`, [activityId]);
      if (rows[0]?.data) {
        context.activity = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
      }
    } catch (err) {
      logger.error({ err, activityId }, 'fetchTemplateContext: fn_get_template_activity_context failed');
    }
  }

  // 2. Fetch Quote via procedural function
  if (quoteId) {
    try {
      const { rows } = await pool.query(`SELECT fn_get_template_quote_context($1) AS data`, [quoteId]);
      if (rows[0]?.data) {
        context.quote = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
      }
    } catch (err) {
      logger.error({ err, quoteId }, 'fetchTemplateContext: fn_get_template_quote_context failed');
    }
  }

  // 3. Fetch Product via procedural function
  if (productId) {
    try {
      const { rows } = await pool.query(`SELECT fn_get_template_product_context($1) AS data`, [productId]);
      if (rows[0]?.data) {
        context.product = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
      }
    } catch (err) {
      logger.error({ err, productId }, 'fetchTemplateContext: fn_get_template_product_context failed');
    }
  }

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

  // 4. Fetch Lead via procedural function
  if (leadId) {
    try {
      const { rows } = await pool.query(`SELECT fn_get_template_lead_context($1) AS data`, [leadId]);
      if (rows[0]?.data) {
        const lData = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
        context.lead = lData;
        if (!personId && lData.person_id) {
          personId = lData.person_id;
        }
        if (!organizationId && lData.organization_id) {
          organizationId = lData.organization_id;
        }
      }
    } catch (err) {
      logger.error({ err, leadId }, 'fetchTemplateContext: fn_get_template_lead_context failed');
    }

    // Fetch latest ACTIVITY linked to this lead if not direct
    if (!context.activity?.id) {
      try {
        const { rows } = await pool.query(`SELECT fn_get_lead_latest_activity($1) AS data`, [leadId]);
        if (rows[0]?.data) {
          context.activity = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
        }
      } catch (err) {
        logger.warn({ err, leadId }, 'fetchTemplateContext: fn_get_lead_latest_activity failed');
      }
    }

    // Fetch latest QUOTE linked to this lead if not direct
    if (!context.quote?.id) {
      try {
        const { rows } = await pool.query(`SELECT fn_get_lead_latest_quote($1) AS data`, [leadId]);
        if (rows[0]?.data) {
          context.quote = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
        }
      } catch (err) {
        logger.error({ err, leadId }, 'fetchTemplateContext: fn_get_lead_latest_quote failed');
      }
    }
  }

  // 5. Fetch Person via procedural function
  if (personId) {
    try {
      const { rows } = await pool.query(`SELECT get_person($1) AS data`, [personId]);
      if (rows[0]?.data) {
        const pData = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
        context.person = pData;
        if (!organizationId && pData.organization_id) {
          organizationId = pData.organization_id;
        }
      }
    } catch (err) {
      logger.error({ err, personId }, 'fetchTemplateContext: get_person failed');
    }
  }

  // Fallback 1: If activity wasn't found by lead, search activity by person via procedural function
  if (!context.activity?.id && personId) {
    try {
      const { rows } = await pool.query(`SELECT fn_get_person_latest_activity($1) AS data`, [personId]);
      if (rows[0]?.data) {
        context.activity = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
      }
    } catch (err) {
      logger.warn({ err, personId }, 'fetchTemplateContext: fn_get_person_latest_activity failed');
    }
  }

  // Fallback 2: Check system's latest scheduled activity
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

  // 6. Fetch participants for the found activity via procedural function
  if (context.activity?.id) {
    try {
      const { rows } = await pool.query(`SELECT fn_get_activity_participants_context($1) AS participants`, [context.activity.id]);
      if (rows[0]?.participants) {
        context.activity.participants = rows[0].participants;
      }
    } catch (err) {
      logger.warn({ err, activityId: context.activity.id }, 'fetchTemplateContext: fn_get_activity_participants_context failed');
    }
  }

  // 7. Fetch Organization via procedural function
  if (!organizationId && context.person?.organization_id) {
    organizationId = context.person.organization_id;
  }
  if (!organizationId && context.lead?.organization_id) {
    organizationId = context.lead.organization_id;
  }

  if (organizationId) {
    try {
      const { rows } = await pool.query(`SELECT fn_get_template_organization_context($1) AS data`, [organizationId]);
      if (rows[0]?.data) {
        context.organization = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
      }
    } catch (err) {
      logger.error({ err, organizationId }, 'fetchTemplateContext: fn_get_template_organization_context failed');
    }
  }

  logger.info({
    leadId, personId, organizationId, activityId, quoteId, productId,
    lead_title: context.lead?.title,
    person_name: context.person?.name,
    org_name: context.organization?.name,
    activity_title: context.activity?.title,
    quote_subject: context.quote?.subject,
    product_name: context.product?.name,
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
  const product      = context.product      || {};

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
      return user.name || lead.user_name || activity.user_name || quote.user_name || '';
    case 'user.email':
    case 'users.email':
      return user.email || lead.user_email || '';

    // ── Activity / Activities ─────────────────────────────────────────────────
    case 'activity.title':
    case 'activities.title':
    case 'activity.name':
    case 'activities.name':
      return activity.title || lead.title || '';
    case 'activity.id':
    case 'activities.id':
      return activity.id != null ? String(activity.id) : '';
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
    case 'activity.description':
    case 'activities.description':
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
    case 'quote.title':
    case 'quotes.title':
      return quote.subject || '';
    case 'quote.id':
    case 'quotes.id':
      return quote.id != null ? String(quote.id) : '';
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
    case 'quote.description':
    case 'quotes.description':
      return quote.description || '';
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

    // ── Product / Products ───────────────────────────────────────────────────
    case 'product.name':
    case 'products.name':
    case 'product.title':
    case 'products.title':
      return product.name || '';
    case 'product.sku':
    case 'products.sku':
      return product.sku || '';
    case 'product.price':
    case 'products.price':
      return product.price != null ? `$${Number(product.price).toFixed(2)}` : '';
    case 'product.quantity':
    case 'products.quantity':
      return product.quantity != null ? String(product.quantity) : '';
    case 'product.description':
    case 'products.description':
      return product.description || '';

    default:
      // Return empty string for unknown tags
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
