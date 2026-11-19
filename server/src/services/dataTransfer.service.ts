import { pool } from '@/config/db';
import { IImport } from '@/interfaces/crm.interface';
import { logger } from '@/utils/logger';
import { ApiError } from '@/middleware/errorHandler';

const BUILT_IN_FIELD_CODES = new Set([
  'title',
  'name',
  'description',
  'sku',
  'price',
  'quantity',
  'subject',
  'lead_value',
  'email',
  'emails',
  'phone',
  'contact_numbers',
  'contact_name',
  'contact_person',
  'person',
  'contact_email',
  'contact_phone',
  'contact_number',
  'organization',
  'organization_id',
  'organization_name',
  'company',
  'institute',
  'person_id',
  'person_name',
  'user_id',
  'user_name',
  'sales_owner',
  'sales_owner_id',
  'lead_source',
  'source',
  'lead_source_id',
  'lead_type',
  'type',
  'lead_type_id',
  'pipeline',
  'lead_pipeline',
  'lead_pipeline_id',
  'stage',
  'lead_pipeline_stage',
  'lead_pipeline_stage_id',
  'expected_close_date',
  'expired_at',
  'job_title',
  'address',
  'country',
  'state',
  'city',
  'postcode',
  'status',
]);

export interface HeaderMatchReport {
  fileHeader: string;
  matchedField: string | null;
  matchType: 'exact' | 'alias' | 'custom' | 'unmatched';
  message: string;
}

export interface HeaderAnalysis {
  isValid: boolean;
  requiredField: string;
  hasRequiredField: boolean;
  expectedHeaders: string[];
  fileHeaders: string[];
  matchedColumns: HeaderMatchReport[];
  unmatchedColumns: HeaderMatchReport[];
  aliasColumns: HeaderMatchReport[];
  missingRequiredMessage?: string;
  mismatchMessages: string[];
}

const clean = (s: string) => (s || '').toLowerCase().trim().replace(/[\s_\-#]+/g, '');

export const MODULE_FIELD_DEFINITIONS: Record<
  string,
  {
    required: string;
    standardFields: Record<string, string[]>;
  }
> = {
  leads: {
    required: 'title',
    standardFields: {
      title: [
        'title', 'lead_title', 'deal_name', 'deal', 'subject', 'name', 'lead_name', 'lead',
        'heading', 'id', 'lead_id', 'trust', 'trust_name', 'ngo', 'ngo_name', 'firm',
        'agency', 'client', 'account', 'organization', 'company', 'institution'
      ],
      organization: [
        'organization', 'organization_name', 'company', 'company_name', 'institute',
        'institute_name', 'organization_id', 'org', 'firm', 'business', 'trust', 'ngo'
      ],
      contact_person: [
        'contact_person', 'person', 'contact_name', 'person_name', 'contact_person_name',
        'contact', 'person_id', 'contact_details', 'owner_name', 'representative', 'spokesperson'
      ],
      contact_email: [
        'contact_email', 'email', 'emails', 'email_address', 'email_id', 'emailid',
        'contact_mail', 'mail', 'mail_id', 'e_mail'
      ],
      contact_phone: [
        'contact_phone', 'phone', 'phone_number', 'phonenumber', 'mobile', 'mobile_number',
        'mobilenumber', 'contact_numbers', 'contact_number', 'contactnumber', 'cell',
        'telephone', 'tel', 'phone_no', 'mobile_no', 'contact_no', 'calls'
      ],
      address: [
        'address', 'street', 'location', 'full_address', 'office_address', 'registered_address',
        'city', 'state', 'pincode', 'pin_code', 'zip', 'zipcode', 'country'
      ],
      website: ['website', 'web', 'url', 'site', 'link', 'portal', 'linktree', 'web_link', 'homepage', 'home_page'],
      description: [
        'description', 'desc', 'notes', 'details', 'summary', 'comment', 'lead_description',
        'remarks', 'feedback', 'feedback_call', 'feedback_call_1', 'feedback_call_2',
        'feedback_3', 'feedback_4', 'call_feedback', 'call_notes', 'instagram', 'facebook',
        'youtube', 'linkedin', 'twitter', 'social', 'social_media'
      ],
      lead_value: ['lead_value', 'value', 'amount', 'deal_value', 'price', 'lead_amount', 'total_value', 'total_amount'],
      status: ['status', 'lead_status', 'state'],
      sales_owner: [
        'sales_owner', 'user', 'owner', 'assigned_to', 'sales_rep', 'sales_owner_name',
        'user_name', 'sales_owner_id', 'user_id', 'agent'
      ],
      lead_source: ['lead_source', 'source', 'lead_source_name', 'source_name', 'lead_source_id', 'source_id'],
      lead_type: ['lead_type', 'type', 'lead_type_name', 'type_name', 'lead_type_id', 'type_id'],
      pipeline: ['pipeline', 'lead_pipeline', 'pipeline_name', 'lead_pipeline_id', 'pipeline_id'],
      stage: ['stage', 'lead_stage', 'pipeline_stage', 'stage_name', 'lead_pipeline_stage', 'stage_id'],
      expected_close_date: ['expected_close_date', 'close_date', 'expected_date', 'due_date', 'expected_close', 'target_date'],
    },
  },
  persons: {
    required: 'name',
    standardFields: {
      name: ['name', 'person_name', 'full_name', 'contact_name', 'person', 'customer_name', 'client_name', 'id', 'person_id', 'title', 'lead_name'],
      emails: ['emails', 'email', 'contact_email', 'email_address', 'email_id', 'emailid', 'work_email', 'mail', 'mail_id', 'e_mail'],
      contact_numbers: ['contact_numbers', 'phone', 'contact_phone', 'phone_number', 'phonenumber', 'mobile', 'mobile_number', 'mobilenumber', 'contact_number', 'contactnumber', 'contact', 'cell', 'calls', 'telephone', 'phone_no', 'mobile_no'],
      job_title: ['job_title', 'title', 'designation', 'role', 'position', 'occupation'],
      organization: ['organization', 'company', 'institute', 'organization_name', 'company_name', 'organization_id', 'org', 'firm', 'business', 'trust', 'ngo'],
      address: ['address', 'street', 'location', 'city', 'state', 'pincode', 'pin_code', 'zip', 'zipcode', 'country'],
      website: ['website', 'web', 'url', 'site', 'link'],
      sales_owner: ['sales_owner', 'user', 'owner', 'assigned_to', 'sales_rep', 'user_name', 'sales_owner_id', 'user_id', 'agent'],
    },
  },
  organizations: {
    required: 'name',
    standardFields: {
      name: ['name', 'organization_name', 'company', 'company_name', 'institute', 'org_name', 'business_name', 'account_name', 'trust', 'trust_name', 'ngo', 'ngo_name', 'id', 'organization_id', 'title'],
      address: ['address', 'street', 'street_address', 'office_address', 'location'],
      phone: ['phone', 'phone_number', 'phonenumber', 'mobile', 'mobile_number', 'contact_numbers', 'contact_number', 'telephone', 'calls'],
      email: ['email', 'emails', 'email_id', 'emailid', 'contact_email', 'mail'],
      website: ['website', 'web', 'url', 'site', 'link', 'portal'],
      city: ['city', 'city_name', 'town'],
      state: ['state', 'state_name', 'province', 'region'],
      country: ['country', 'country_name', 'nation'],
      postcode: ['postcode', 'postal_code', 'pincode', 'pin_code', 'zip', 'zipcode', 'zip_code'],
      sales_owner: ['sales_owner', 'user', 'owner', 'assigned_to', 'sales_rep', 'user_name', 'sales_owner_id', 'user_id', 'agent'],
    },
  },
  products: {
    required: 'sku',
    standardFields: {
      sku: ['sku', 'product_code', 'item_code', 'code', 'sku_code', 'part_number', 'id', 'product_id'],
      name: ['name', 'product_name', 'item_name', 'title', 'product'],
      description: ['description', 'desc', 'product_description', 'details'],
      price: ['price', 'unit_price', 'rate', 'cost', 'amount', 'mrp'],
      quantity: ['quantity', 'qty', 'stock', 'stock_quantity', 'units', 'count'],
    },
  },
};

export function analyzeImportHeaders(
  typeRaw: string,
  fileHeaders: string[],
  customAttributes: any[] = []
): HeaderAnalysis {
  const normType = typeRaw.toLowerCase();
  const def = MODULE_FIELD_DEFINITIONS[normType];
  const requiredField = def?.required || 'name';
  const standardFields = def?.standardFields || {};
  const expectedHeaders = Object.keys(standardFields);

  const clean = (s: string) => (s || '').toLowerCase().trim().replace(/[\s_\-#]+/g, '');

  const customCodes = new Set(
    (customAttributes || []).map((ca: any) => clean(ca?.code || ca?.name || ''))
  );
  const customNames = new Map(
    (customAttributes || []).map((ca: any) => [clean(ca?.code || ca?.name || ''), ca?.name || ca?.code])
  );

  let hasRequiredField = false;
  const matchedColumns: HeaderMatchReport[] = [];
  const unmatchedColumns: HeaderMatchReport[] = [];
  const aliasColumns: HeaderMatchReport[] = [];
  const mismatchMessages: string[] = [];

  for (const rawHeader of fileHeaders) {
    const trimmed = String(rawHeader ?? '').trim();
    if (!trimmed || trimmed.startsWith('__col_')) continue;
    const cHeader = clean(trimmed);

    // 1. Check exact match with canonical standard field
    const exactStandard = expectedHeaders.find((eh) => clean(eh) === cHeader);
    if (exactStandard) {
      if (exactStandard === requiredField) hasRequiredField = true;
      matchedColumns.push({
        fileHeader: trimmed,
        matchedField: exactStandard,
        matchType: 'exact',
        message: `Column "${trimmed}" matches expected field "${exactStandard}".`,
      });
      continue;
    }

    // 2. Check exact match with custom attribute
    if (customCodes.has(cHeader)) {
      matchedColumns.push({
        fileHeader: trimmed,
        matchedField: customNames.get(cHeader) || trimmed,
        matchType: 'custom',
        message: `Column "${trimmed}" matches custom attribute "${customNames.get(cHeader) || trimmed}".`,
      });
      continue;
    }

    // 3. Check alias match with standard fields
    let matchedAliasField: string | null = null;
    for (const [canonical, aliases] of Object.entries(standardFields)) {
      if (aliases.some((a) => clean(a) === cHeader)) {
        matchedAliasField = canonical;
        break;
      }
    }

    if (matchedAliasField) {
      if (matchedAliasField === requiredField) hasRequiredField = true;
      const report: HeaderMatchReport = {
        fileHeader: trimmed,
        matchedField: matchedAliasField,
        matchType: 'alias',
        message: `Column "${trimmed}" matched to field "${matchedAliasField}". For this column, the name should be "${matchedAliasField}".`,
      };
      matchedColumns.push(report);
      aliasColumns.push(report);
      continue;
    }

    // 4. Unmatched column (ignored for standard field mapping; saved into custom attributes/notes)
    const report: HeaderMatchReport = {
      fileHeader: trimmed,
      matchedField: null,
      matchType: 'unmatched',
      message: `Column "${trimmed}" is an extra column and will be safely ignored / saved in extra attributes.`,
    };
    unmatchedColumns.push(report);
  }

  // Also check if an id column is present as alternate required identifier
  if (!hasRequiredField) {
    const hasId = fileHeaders.some((h) => ['id', `${normType}_id`, `${normType.slice(0, -1)}_id`].includes(clean(h)));
    if (hasId) hasRequiredField = true;
  }

  // Graceful Auto-Fallback: If no required header was explicitly found but columns exist,
  // auto-map the first column so the user is never blocked from importing their data
  if (!hasRequiredField && fileHeaders.length > 0) {
    const firstCol = fileHeaders.find((h) => !h.startsWith('__col_'));
    if (firstCol) {
      hasRequiredField = true;
      matchedColumns.push({
        fileHeader: firstCol,
        matchedField: requiredField,
        matchType: 'alias',
        message: `Column "${firstCol}" auto-mapped to required field "${requiredField}".`,
      });
    }
  }

  let missingRequiredMessage: string | undefined;
  if (!hasRequiredField) {
    missingRequiredMessage = `Column name mismatch: Required column "${requiredField}" is missing or does not match. For this column, the name should be "${requiredField}". (Found columns in file: ${fileHeaders.filter((h) => !h.startsWith('__col_')).join(', ') || 'none'}).`;
    mismatchMessages.unshift(missingRequiredMessage);
  }

  const isValid = hasRequiredField;

  return {
    isValid,
    requiredField,
    hasRequiredField,
    expectedHeaders,
    fileHeaders,
    matchedColumns,
    unmatchedColumns,
    aliasColumns,
    missingRequiredMessage,
    mismatchMessages,
  };
}

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Case-insensitive, whitespace-tolerant, and separator-tolerant key-value extractor.
 * Matches Excel headers like "ORGANIZATION", "Phone Number", "contact_email", "PHONE NUMBER", etc.
 */
const getRowField = (row: Record<string, any>, ...candidateKeys: string[]): any => {
  if (!row || typeof row !== 'object') return undefined;

  // 1. Direct match first (fastest)
  for (const k of candidateKeys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
      return row[k];
    }
  }

  // 2. Normalized match (ignores case, spaces, underscores, hyphens, and '#')
  const rowEntries = Object.entries(row);
  for (const candidate of candidateKeys) {
    const candNorm = candidate.toLowerCase().replace(/[\s_\-#]+/g, '');
    for (const [rk, val] of rowEntries) {
      if (val === undefined || val === null || String(val).trim() === '') continue;
      const rkNorm = rk.toLowerCase().replace(/[\s_\-#]+/g, '');
      if (rkNorm === candNorm) {
        return val;
      }
    }
  }

  return undefined;
};

const parseField = (val: any, defaultLabel = 'work'): Array<{ label: string; value: string }> => {
  if (val === undefined || val === null || val === '') return [];
  if (typeof val === 'number') {
    return [{ label: defaultLabel, value: String(val).trim() }];
  }
  const parseStr = (str: string, lbl = defaultLabel): Array<{ label: string; value: string }> => {
    let clean = str.trim().replace(/""/g, '"');
    if (clean.startsWith('"') && clean.endsWith('"') && clean.length > 2) clean = clean.slice(1, -1);
    if ((clean.startsWith('[') && clean.endsWith(']')) || (clean.startsWith('{') && clean.endsWith('}'))) {
      try {
        const p = JSON.parse(clean);
        return parseField(p, lbl);
      } catch {}
    }
    if (clean.includes(':') || clean.includes(',')) {
      const parts = clean.split(',');
      const res: Array<{ label: string; value: string }> = [];
      for (const p of parts) {
        const t = p.trim();
        if (!t) continue;
        if (t.includes(':')) {
          const idx = t.indexOf(':');
          const l = t.substring(0, idx).trim();
          const v = t.substring(idx + 1).trim();
          if (v) res.push({ label: l || lbl, value: v });
        } else {
          res.push({ label: lbl, value: t });
        }
      }
      if (res.length > 0) return res;
    }
    return [{ label: lbl, value: clean }];
  };

  if (Array.isArray(val)) {
    const res: Array<{ label: string; value: string }> = [];
    for (const item of val) {
      if (typeof item === 'object' && item !== null) {
        const itemVal =
          item.value ??
          item.number ??
          item.phone ??
          item.contact ??
          item.mobile ??
          item.contact_number ??
          item.contactNumber ??
          item.phone_number ??
          item.phoneNumber ??
          item.tel ??
          item.email;
        const itemLabel = item.label || defaultLabel;
        if (typeof itemVal === 'string' && (itemVal.startsWith('[') || itemVal.startsWith('{') || itemVal.includes(':') || itemVal.includes(','))) {
          res.push(...parseStr(itemVal, itemLabel));
        } else if (itemVal !== undefined && itemVal !== null && String(itemVal).trim() !== '') {
          res.push({ label: itemLabel, value: String(itemVal).trim() });
        }
      } else if (typeof item === 'string') {
        res.push(...parseStr(item, defaultLabel));
      } else if (typeof item === 'number') {
        res.push({ label: defaultLabel, value: String(item) });
      }
    }
    return res;
  }
  if (typeof val === 'object' && val !== null) {
    return parseField([val], defaultLabel);
  }
  if (typeof val === 'string') return parseStr(val, defaultLabel);
  return [];
};

const updatePersonContactInfo = async (
  client: any,
  personId: number,
  emailVal?: any,
  phoneVal?: any,
  orgId?: number | null
) => {
  if (!personId) return;
  try {
    const pRes = await client.query('SELECT emails, contact_numbers, organization_id FROM persons WHERE id = $1', [personId]);
    if (pRes.rows.length === 0) return;

    const curEmails = parseField(pRes.rows[0].emails, 'work');
    const curNumbers = parseField(pRes.rows[0].contact_numbers, 'work');
    const newEmails = parseField(emailVal, 'work');
    const newNumbers = parseField(phoneVal, 'work');

    // Merge emails without duplicates
    const emailMap = new Map<string, string>();
    for (const e of [...curEmails, ...newEmails]) {
      const val = (e.value || '').trim();
      if (val && !emailMap.has(val.toLowerCase())) {
        emailMap.set(val.toLowerCase(), e.label || 'work');
      }
    }
    const mergedEmails = Array.from(emailMap.entries()).map(([value, label]) => ({ label, value }));

    // Merge contact numbers without duplicates
    const phoneMap = new Map<string, string>();
    for (const p of [...curNumbers, ...newNumbers]) {
      const val = (p.value || '').trim();
      if (val && !phoneMap.has(val.toLowerCase())) {
        phoneMap.set(val.toLowerCase(), p.label || 'work');
      }
    }
    const mergedNumbers = Array.from(phoneMap.entries()).map(([value, label]) => ({ label, value }));

    const targetOrgId = orgId || pRes.rows[0].organization_id || null;

    await client.query(
      `UPDATE persons 
       SET emails = $1::jsonb, 
           contact_numbers = $2::jsonb, 
           organization_id = COALESCE($3, organization_id),
           updated_at = NOW() 
       WHERE id = $4`,
      [JSON.stringify(mergedEmails), JSON.stringify(mergedNumbers), targetOrgId, personId]
    );
  } catch (err) {
    // Non-blocking update failure
  }
};

const updateOrgInfo = async (
  client: any,
  orgId: number,
  addressVal?: any,
  websiteVal?: any
) => {
  if (!orgId) return;
  try {
    const oRes = await client.query('SELECT address, custom_attributes FROM organizations WHERE id = $1', [orgId]);
    if (oRes.rows.length === 0) return;

    let existingAddress = oRes.rows[0].address || {};
    if (typeof existingAddress === 'string') {
      try { existingAddress = JSON.parse(existingAddress); } catch { existingAddress = { street: existingAddress }; }
    }

    let newAddressObj: any = null;
    if (addressVal && String(addressVal).trim()) {
      const addrStr = String(addressVal).trim();
      newAddressObj = {
        street: addrStr,
        city: addrStr.toLowerCase().includes('nagpur') ? 'Nagpur' : (existingAddress.city || ''),
        state: addrStr.toLowerCase().includes('maharashtra') ? 'Maharashtra' : (existingAddress.state || ''),
        country: 'India',
        ...existingAddress
      };
      newAddressObj.street = addrStr;
    }

    const existingAttrs = oRes.rows[0].custom_attributes || {};
    const mergedAttrs = { ...existingAttrs };
    if (websiteVal && String(websiteVal).trim()) {
      mergedAttrs.website = String(websiteVal).trim();
    }

    await client.query(
      `UPDATE organizations 
       SET address = COALESCE($1::jsonb, address),
           custom_attributes = $2::jsonb,
           updated_at = NOW() 
       WHERE id = $3`,
      [newAddressObj ? JSON.stringify(newAddressObj) : null, JSON.stringify(mergedAttrs), orgId]
    );
  } catch (err) {
    // Non-blocking update failure
  }
};

// Safe Foreign Key Resolvers to prevent FK Constraint Violations
const resolveOrgId = async (
  client: any,
  rawVal: any,
  nameVal?: any,
  userId?: number | null,
  addressVal?: any,
  websiteVal?: any
): Promise<number | null> => {
  const num = toNumberParam(rawVal);
  const n = String(nameVal || rawVal || '').trim();
  let foundOrgId: number | null = null;

  if (num || n) {
    const existing = await client.query(
      'SELECT * FROM public.fn_find_entity_for_import($1, $2, $3)',
      ['organizations', num || null, n && isNaN(Number(n)) ? n : null]
    );
    if (existing.rows.length > 0) foundOrgId = existing.rows[0].id;
  }

  // Also query directly by name case-insensitively
  if (!foundOrgId && n && isNaN(Number(n))) {
    const directOrg = await client.query('SELECT id FROM organizations WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1', [n]);
    if (directOrg.rows.length > 0) foundOrgId = directOrg.rows[0].id;
  }

  if (foundOrgId) {
    if (addressVal || websiteVal) {
      await updateOrgInfo(client, foundOrgId, addressVal, websiteVal);
    }
    return foundOrgId;
  }

  // Auto-create organization if a non-numeric name was specified
  if (n && isNaN(Number(n))) {
    const addrObj = addressVal ? { street: String(addressVal).trim(), country: 'India' } : null;
    const customAttrs: any = {};
    if (websiteVal) customAttrs.website = String(websiteVal).trim();

    try {
      const insOrg = await client.query(
        'SELECT public.fn_import_upsert_organization($1, $2, $3::jsonb, $4, $5::jsonb) AS id',
        [null, n, addrObj ? JSON.stringify(addrObj) : null, userId || null, JSON.stringify(customAttrs)]
      );
      return insOrg.rows[0]?.id || null;
    } catch {
      try {
        const insOrg = await client.query(
          'INSERT INTO organizations (name, address, user_id, custom_attributes, created_at, updated_at) VALUES ($1, $2::jsonb, $3, $4::jsonb, NOW(), NOW()) RETURNING id',
          [n, addrObj ? JSON.stringify(addrObj) : null, userId || null, JSON.stringify(customAttrs)]
        );
        return insOrg.rows[0]?.id || null;
      } catch {}
    }
  }
  return null;
};

const resolveUserId = async (client: any, rawVal: any, nameVal?: any): Promise<number | null> => {
  const num = toNumberParam(rawVal);
  if (num) {
    const userRes = await client.query('SELECT get_user($1) as result', [num]);
    if (userRes.rows[0]?.result) return num;
  }
  const n = String(nameVal || rawVal || '').trim();
  if (n && isNaN(Number(n))) {
    const usersRes = await client.query('SELECT get_all_users($1) as result', [n]);
    const users: any[] = usersRes.rows[0]?.result || [];
    const match = users.find((u) => (u.name || '').trim().toLowerCase() === n.toLowerCase() || (u.email || '').trim().toLowerCase() === n.toLowerCase());
    if (match) return match.id;
  }
  // Default to active tenant user if available
  try {
    const defaultUser = await client.query('SELECT id FROM users LIMIT 1');
    return defaultUser.rows[0]?.id || null;
  } catch {
    return null;
  }
};

const resolvePersonId = async (
  client: any,
  rawVal: any,
  nameVal?: any,
  emailVal?: any,
  phoneVal?: any,
  orgId?: number | null,
  userId?: number | null
): Promise<number | null> => {
  const num = toNumberParam(rawVal);
  const n = String(nameVal || rawVal || '').trim();
  let foundPersonId: number | null = null;

  if (num || n) {
    const existing = await client.query(
      'SELECT * FROM public.fn_find_entity_for_import($1, $2, $3)',
      ['persons', num || null, n && isNaN(Number(n)) ? n : null]
    );
    if (existing.rows.length > 0) foundPersonId = existing.rows[0].id;
  }

  // Also query directly by name case-insensitively
  if (!foundPersonId && n && isNaN(Number(n))) {
    const directPerson = await client.query('SELECT id FROM persons WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1', [n]);
    if (directPerson.rows.length > 0) foundPersonId = directPerson.rows[0].id;
  }

  if (foundPersonId) {
    await updatePersonContactInfo(client, foundPersonId, emailVal, phoneVal, orgId);
    return foundPersonId;
  }

  // Auto-create person with email and contact numbers if provided
  if (n && isNaN(Number(n))) {
    try {
      const newEmails = parseField(emailVal, 'work');
      const newNumbers = parseField(phoneVal, 'work');
      const insPerson = await client.query(
        'SELECT public.fn_import_upsert_person($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8::jsonb) AS id',
        [null, n, JSON.stringify(newEmails), JSON.stringify(newNumbers), null, orgId || null, userId || null, '{}']
      );
      return insPerson.rows[0]?.id || null;
    } catch {}
  }
  return null;
};

const resolveLeadSourceId = async (client: any, rawVal: any): Promise<number | null> => {
  const sourcesRes = await client.query('SELECT * FROM public.fn_get_lead_sources()');
  const sources: any[] = sourcesRes.rows || [];

  const num = toNumberParam(rawVal);
  if (num) {
    const match = sources.find((s) => Number(s.id) === num);
    if (match) return match.id;
  }
  const n = String(rawVal || '').trim();
  if (n && isNaN(Number(n))) {
    const match = sources.find((s) => (s.name || '').trim().toLowerCase() === n.toLowerCase());
    if (match) return match.id;
  }
  return null;
};

const resolveLeadTypeId = async (client: any, rawVal: any): Promise<number | null> => {
  const typesRes = await client.query('SELECT * FROM public.fn_get_lead_types()');
  const types: any[] = typesRes.rows || [];

  const num = toNumberParam(rawVal);
  if (num) {
    const match = types.find((t) => Number(t.id) === num);
    if (match) return match.id;
  }
  const n = String(rawVal || '').trim();
  if (n && isNaN(Number(n))) {
    const match = types.find((t) => (t.name || '').trim().toLowerCase() === n.toLowerCase());
    if (match) return match.id;
  }
  return null;
};

const resolveLeadPipelineId = async (client: any, rawVal: any): Promise<number | null> => {
  const pipelinesRes = await client.query('SELECT * FROM public.fn_get_lead_pipelines()');
  const pipelines: any[] = pipelinesRes.rows || [];

  const num = toNumberParam(rawVal);
  if (num) {
    const match = pipelines.find((p) => Number(p.id) === num);
    if (match) return match.id;
  }
  const n = String(rawVal || '').trim();
  if (n && isNaN(Number(n))) {
    const match = pipelines.find((p) => (p.name || '').trim().toLowerCase() === n.toLowerCase());
    if (match) return match.id;
  }
  const defaultPipeline = pipelines.find((p) => p.is_default) || pipelines[0];
  return defaultPipeline?.id || null;
};

const resolveLeadPipelineStageId = async (
  client: any,
  rawVal: any,
  pipelineId?: number | null
): Promise<number | null> => {
  const stagesRes = await client.query('SELECT * FROM public.fn_get_pipeline_stages($1)', [pipelineId || null]);
  const stages: any[] = stagesRes.rows || [];

  const num = toNumberParam(rawVal);
  if (num) {
    const match = stages.find((s) => Number(s.id) === num);
    if (match) return match.id;
  }

  const n = String(rawVal || '').trim();
  if (n && isNaN(Number(n))) {
    const match = stages.find((s) => (s.name || '').trim().toLowerCase() === n.toLowerCase());
    if (match) return match.id;
  }

  // Fallback: Default to first stage of the resolved pipeline
  if (stages.length > 0) {
    return stages[0].id;
  }

  return null;
};

const resolveAttributeOption = (
  rawVal: any,
  options: Array<{ id: number; name: string; sort_order?: number }>
): { name: string; id: number | null } | null => {
  if (rawVal === undefined || rawVal === null || rawVal === '') return null;
  const str = String(rawVal).trim();
  const strLower = str.toLowerCase();

  if (!Array.isArray(options) || options.length === 0) {
    return { name: str, id: null };
  }

  // 1. Direct match by option name
  for (const opt of options) {
    if (opt.name === str || opt.name.toLowerCase() === strLower) {
      return { name: opt.name, id: opt.id };
    }
  }

  // 2. Direct match by option id
  for (const opt of options) {
    if (String(opt.id) === str) {
      return { name: opt.name, id: opt.id };
    }
  }

  // 3. Match "Option X" (e.g. Option 1 -> index 0, Option 2 -> index 1)
  const optMatch = strLower.match(/option\s*(\d+)/);
  if (optMatch) {
    const idx = parseInt(optMatch[1], 10) - 1;
    if (idx >= 0 && idx < options.length) {
      return { name: options[idx].name, id: options[idx].id };
    }
  }

  // 4. 1-based index (e.g. 1 -> options[0], 2 -> options[1])
  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 1 && num <= options.length) {
    return { name: options[num - 1].name, id: options[num - 1].id };
  }

  return { name: str, id: null };
};

const resolveMultiselectOptions = (
  rawVal: any,
  options: Array<{ id: number; name: string; sort_order?: number }>
): { names: string[]; ids: number[] } => {
  if (rawVal === undefined || rawVal === null || rawVal === '') return { names: [], ids: [] };
  let rawList: string[] = [];

  if (Array.isArray(rawVal)) {
    rawList = rawVal.map(String);
  } else if (typeof rawVal === 'string') {
    const trimmed = rawVal.trim();
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) rawList = parsed.map(String);
        else rawList = [String(parsed)];
      } catch {
        rawList = trimmed.split(',').map((s) => s.trim());
      }
    } else if (trimmed.includes(',')) {
      rawList = trimmed.split(',').map((s) => s.trim());
    } else {
      rawList = [trimmed];
    }
  } else {
    rawList = [String(rawVal)];
  }

  const names: string[] = [];
  const ids: number[] = [];

  for (const item of rawList) {
    if (!item) continue;
    const resolved = resolveAttributeOption(item, options);
    if (resolved) {
      names.push(resolved.name);
      if (resolved.id) ids.push(resolved.id);
    }
  }

  return { names, ids };
};

export const saveEntityAttributeValues = async (
  client: any,
  entityType: string,
  entityId: number,
  customAttrs: Record<string, any>
): Promise<void> => {
  if (!customAttrs || typeof customAttrs !== 'object' || Object.keys(customAttrs).length === 0) return;

  const spName = `sp_attr_${entityType}_${entityId}`.replace(/[^a-zA-Z0-9_]/g, '_');

  try {
    await client.query(`SAVEPOINT ${spName}`);
    const { rows: attrResult } = await client.query(
      'SELECT get_all_attributes($1, $2, $3, $4) AS data',
      [null, entityType, null, null]
    );
    const dbAttrs: any[] = attrResult[0]?.data || [];

    for (const [code, rawVal] of Object.entries(customAttrs)) {
      if (rawVal === undefined || rawVal === null || rawVal === '') continue;

      const attr = dbAttrs.find((a: any) => a.code.toLowerCase() === code.toLowerCase());
      if (!attr) continue;

      const attrOpts = attr.options || [];

      let textVal: string | null = null;
      let boolVal: boolean | null = null;
      let intVal: number | null = null;
      let floatVal: number | null = null;
      let dateVal: string | null = null;
      let datetimeVal: string | null = null;
      let jsonVal: any = null;

      const t = (attr.type || 'text').toLowerCase();
      if (t === 'boolean' || t === 'checkbox') {
        boolVal = rawVal === true || rawVal === 1 || rawVal === 'true' || rawVal === '1' || rawVal === 'yes' || rawVal === 'y';
        textVal = boolVal ? '1' : '0';
      } else if (t === 'price' || t === 'float' || t === 'decimal') {
        const num = parseFloat(String(rawVal).replace(/[^0-9.-]+/g, ''));
        floatVal = isNaN(num) ? null : num;
        textVal = String(rawVal);
      } else if (t === 'select' || t === 'lookup') {
        const resolved = resolveAttributeOption(rawVal, attrOpts);
        textVal = resolved ? resolved.name : String(rawVal);
        intVal = resolved && resolved.id ? resolved.id : toNumberParam(rawVal);
      } else if (t === 'multiselect') {
        const resolved = resolveMultiselectOptions(rawVal, attrOpts);
        textVal = resolved.names.join(', ');
        jsonVal = resolved.names;
        intVal = resolved.ids.length > 0 ? resolved.ids[0] : null;
      } else if (t === 'integer') {
        const num = parseInt(String(rawVal), 10);
        intVal = isNaN(num) ? null : num;
        textVal = String(rawVal);
      } else if (t === 'date') {
        dateVal = String(rawVal);
        textVal = String(rawVal);
      } else if (t === 'datetime') {
        datetimeVal = String(rawVal);
        textVal = String(rawVal);
      } else if (t === 'address' || t === 'json') {
        jsonVal = typeof rawVal === 'object' ? JSON.stringify(rawVal) : String(rawVal);
        textVal = typeof rawVal === 'object' ? JSON.stringify(rawVal) : String(rawVal);
      } else {
        textVal = typeof rawVal === 'object' ? JSON.stringify(rawVal) : String(rawVal);
      }

      const uniqueId = `${entityId}|${attr.id}`;

      await client.query(
        'SELECT public.fn_save_attribute_value($1, $2, $3, $4, $5, $6, $7, $8, $9::date, $10::timestamp, $11::jsonb)',
        [
          entityType,
          entityId,
          attr.id,
          uniqueId,
          textVal,
          boolVal,
          intVal,
          floatVal,
          dateVal,
          datetimeVal,
          jsonVal ? JSON.stringify(jsonVal) : null,
        ]
      );
    }
    await client.query(`RELEASE SAVEPOINT ${spName}`);
  } catch (attrErr) {
    await client.query(`ROLLBACK TO SAVEPOINT ${spName}`).catch(() => {});
    logger.warn({ attrErr, entityType, entityId }, 'Failed to save entity attribute_values');
  }
};

export class DataTransferService {
  public static async getAllImports(): Promise<IImport[]> {
    try {
      const { rows } = await pool.query('SELECT get_all_imports() as result');
      return rows[0]?.result || [];
    } catch (error: any) {
      logger.error({ error }, 'DataTransferService.getAllImports failed');
      throw error;
    }
  }

  public static async deleteImport(id: number): Promise<boolean> {
    try {
      const { rows } = await pool.query('SELECT delete_import_record($1::integer) as result', [id]);
      return Boolean(rows[0]?.result);
    } catch (error: any) {
      logger.error({ error, id }, 'DataTransferService.deleteImport failed');
      throw error;
    }
  }

  public static async getSample(type: string): Promise<{
    type: string;
    headers: string[];
    sampleRows: Record<string, any>[];
    customAttributes: any[];
  }> {
    const normType = type.toLowerCase();

    // Query active custom attributes from database
    const { rows: attrRows } = await pool.query(
      `SELECT id, code, name, type, entity_type, is_required, is_user_defined
       FROM attributes 
       WHERE entity_type = $1 
       ORDER BY sort_order ASC, id ASC`,
      [normType]
    );

    const attrIds = attrRows.map((a: any) => a.id);
    let optRows: any[] = [];
    if (attrIds.length > 0) {
      const placeholders = attrIds.map((_: any, i: number) => `$${i + 1}`).join(',');
      const optRes = await pool.query(
        `SELECT id, attribute_id, name, sort_order 
         FROM attribute_options 
         WHERE attribute_id IN (${placeholders}) 
         ORDER BY sort_order ASC, id ASC`,
        attrIds
      );
      optRows = optRes.rows;
    }

    for (const a of attrRows) {
      a.options = optRows.filter((o: any) => o.attribute_id === a.id);
    }

    const customAttrs = attrRows.filter(
      (a: any) => a.is_user_defined || !BUILT_IN_FIELD_CODES.has(a.code.toLowerCase())
    );

    // Fetch real existing IDs from the database to ensure the sample is 100% valid for immediate re-import
    // Fetch real existing IDs from the database via procedural functions
    const [orgsDb, usersDb, personsDb, sourcesDb, typesDb, defaultPipelineDb] = await Promise.all([
      pool.query('SELECT public.get_all_organizations($1::text, $2::int, $3::int) as result', [null, 10, 0]),
      pool.query('SELECT get_all_users(null) as result'),
      pool.query('SELECT get_all_persons(null) as result'),
      pool.query('SELECT * FROM public.fn_get_lead_sources()'),
      pool.query('SELECT * FROM public.fn_get_lead_types()'),
      pool.query('SELECT * FROM public.fn_get_lead_pipelines()'),
    ]);

    const organizationsList = orgsDb.rows[0]?.result?.rows || orgsDb.rows[0]?.result || [];
    const usersList = Array.isArray(usersDb.rows[0]?.result) ? usersDb.rows[0]?.result : (usersDb.rows[0]?.result?.rows || []);
    const personsList = personsDb.rows[0]?.result?.rows || personsDb.rows[0]?.result || [];
    const sourcesList = sourcesDb.rows || [];
    const typesList = typesDb.rows || [];
    const pipelinesList = defaultPipelineDb.rows || [];

    const sampleOrgId1 = organizationsList[0]?.id ?? null;
    const sampleOrgId2 = organizationsList[1]?.id ?? sampleOrgId1;
    const sampleUserId1 = usersList[0]?.id ?? null;
    const sampleUserId2 = usersList[1]?.id ?? sampleUserId1;
    const samplePersonId1 = personsList[0]?.id ?? null;
    const samplePersonId2 = personsList[1]?.id ?? samplePersonId1;
    const sampleSourceId1 = sourcesList[0]?.id ?? null;
    const sampleSourceId2 = sourcesList[1]?.id ?? sampleSourceId1;
    const sampleTypeId1 = typesList[0]?.id ?? null;
    const sampleTypeId2 = typesList[1]?.id ?? sampleTypeId1;

    // Both sample leads belong to the active default pipeline
    const defaultPipeline = pipelinesList.find((pipelineItem: any) => pipelineItem.is_default) || pipelinesList[0];
    const samplePipelineId1 = defaultPipeline?.id ?? 1;
    const samplePipelineId2 = samplePipelineId1;

    // Fetch valid stages belonging strictly to this pipeline via procedural function
    const stagesDb = await pool.query(
      'SELECT * FROM public.fn_get_pipeline_stages($1)',
      [samplePipelineId1]
    );
    const stagesList = stagesDb.rows || [];
    const sampleStageId1 = stagesList[0]?.id ?? null;
    const sampleStageId2 = stagesList[1]?.id ?? sampleStageId1;

    const sampleOrgName1 = organizationsList[0]?.name || 'Acme Global Corp';
    const sampleOrgName2 = organizationsList[1]?.name || 'Global Logistics Ltd';

    const samplePersonName1 = personsList[0]?.name || 'John Doe';
    const samplePersonName2 = personsList[1]?.name || 'Sarah Connor';

    const sampleUserName1 = usersList[0]?.name || 'Admin User';
    const sampleUserName2 = usersList[1]?.name || sampleUserName1;

    const sampleSourceName1 = sourcesList[0]?.name || 'Website';
    const sampleSourceName2 = sourcesList[1]?.name || 'Referral';

    const sampleTypeName1 = typesList[0]?.name || 'New Business';
    const sampleTypeName2 = typesList[1]?.name || 'Existing Customer';

    const samplePipelineName1 = defaultPipeline?.name || 'Sales Pipeline';
    const sampleStageName1 = stagesList[0]?.name || 'New';
    const sampleStageName2 = stagesList[1]?.name || sampleStageName1;

    let standardHeaders: string[] = [];
    let baseRows: Record<string, any>[] = [];

    if (normType === 'persons') {
      standardHeaders = ['name', 'organization', 'emails', 'contact_numbers', 'job_title', 'sales_owner'];
      baseRows = [
        {
          name: 'Wilson Fisk',
          organization: sampleOrgName1,
          emails: 'wilson.fisk@example.com',
          contact_numbers: '+1-555-0101',
          job_title: 'Chief Executive Officer',
          sales_owner: sampleUserName1,
        },
        {
          name: 'Sasha Calle',
          organization: sampleOrgName2,
          emails: 'sasha.calle@example.com',
          contact_numbers: '+1-555-0102',
          job_title: 'Sales Director',
          sales_owner: sampleUserName2,
        },
      ];
    } else if (normType === 'leads') {
      standardHeaders = [
        'title',
        'organization',
        'contact_person',
        'contact_email',
        'contact_phone',
        'description',
        'lead_value',
        'status',
        'sales_owner',
        'lead_source',
        'lead_type',
        'pipeline',
        'stage',
        'expected_close_date',
      ];
      baseRows = [
        {
          title: 'Enterprise Cloud Migration Deal',
          organization: sampleOrgName1,
          contact_person: samplePersonName1,
          contact_email: 'john.doe@example.com',
          contact_phone: '+91 98765 43210',
          description: 'Interested in CRM migration and integrations',
          lead_value: 50000,
          status: 'Open',
          sales_owner: sampleUserName1,
          lead_source: sampleSourceName1,
          lead_type: sampleTypeName1,
          pipeline: samplePipelineName1,
          stage: sampleStageName1,
          expected_close_date: '2026-12-31',
        },
        {
          title: 'Annual Support & Maintenance Renewal',
          organization: sampleOrgName2,
          contact_person: samplePersonName2,
          contact_email: 'sarah.connor@example.com',
          contact_phone: '+91 98765 43211',
          description: 'Renewal contract for 200 software seats',
          lead_value: 25000,
          status: 'Open',
          sales_owner: sampleUserName2,
          lead_source: sampleSourceName2,
          lead_type: sampleTypeName2,
          pipeline: samplePipelineName1,
          stage: sampleStageName2,
          expected_close_date: '2026-11-15',
        },
      ];
    } else if (normType === 'organizations') {
      standardHeaders = ['name', 'address', 'city', 'state', 'country', 'postcode', 'sales_owner'];
      baseRows = [
        {
          name: 'Acme Corporation',
          address: '123 Tech Boulevard',
          city: 'San Francisco',
          state: 'California',
          country: 'USA',
          postcode: '94105',
          sales_owner: sampleUserName1,
        },
        {
          name: 'Global Logistics Ltd',
          address: '456 Freight Way',
          city: 'London',
          state: 'Greater London',
          country: 'UK',
          postcode: 'EC1A 1BB',
          sales_owner: sampleUserName2,
        },
      ];
    } else if (normType === 'products') {
      standardHeaders = ['sku', 'name', 'description', 'quantity', 'price'];
      baseRows = [
        {
          sku: 'PROD-101',
          name: 'Enterprise License',
          description: 'Annual enterprise subscription tier',
          quantity: 50,
          price: 999.0,
        },
        {
          sku: 'PROD-102',
          name: 'Standard Support Pack',
          description: '24/7 dedicated support package',
          quantity: 10,
          price: 299.0,
        },
      ];
    }

    // Append custom attributes to headers
    const customHeaders = customAttrs.map((a) => a.code);
    const headers = [...standardHeaders];
    for (const ch of customHeaders) {
      if (!headers.includes(ch)) {
        headers.push(ch);
      }
    }

    // Ensure all attributes in the attributes table are in the headers
    for (const attr of attrRows) {
      if (!headers.includes(attr.code)) {
        headers.push(attr.code);
        if (!customAttrs.some((ca) => ca.code === attr.code)) {
          customAttrs.push(attr);
        }
      }
    }

    const generateAttrSampleValue = (attr: any, index: number) => {
      const typeLower = (attr.type || 'text').toLowerCase();
      const codeLower = (attr.code || '').toLowerCase();

      if (codeLower.includes('email')) {
        return index === 0 ? 'alex.smith@example.com' : 'jordan.lee@example.com';
      }
      if (codeLower.includes('phone') || codeLower.includes('contact')) {
        return index === 0 ? '+1-555-0145' : '+1-555-0146';
      }
      if (typeLower === 'price' || typeLower === 'numeric' || typeLower === 'decimal' || codeLower.includes('price') || codeLower.includes('value')) {
        return index === 0 ? 150.0 : 350.0;
      }
      if (typeLower === 'boolean' || typeLower === 'checkbox') {
        return index === 0 ? true : false;
      }
      if (typeLower === 'select' || typeLower === 'multiselect') {
        if (Array.isArray(attr.options) && attr.options.length > 0) {
          const opt = attr.options[index % attr.options.length];
          return typeof opt === 'object' && opt !== null ? opt.name : String(opt);
        }
        return index === 0 ? 'Option 1' : 'Option 2';
      }
      if (typeLower === 'date' || codeLower === 'date') {
        return index === 0 ? '2026-10-15' : '2026-11-20';
      }
      if (typeLower === 'datetime') {
        return index === 0 ? '2026-10-15 10:00:00' : '2026-11-20 14:30:00';
      }
      if (typeLower === 'image' || codeLower.includes('image') || codeLower.includes('logo')) {
        return index === 0 ? 'https://example.com/assets/sample1.png' : 'https://example.com/assets/sample2.png';
      }
      if (typeLower === 'file') {
        return index === 0 ? 'attachment_doc1.pdf' : 'attachment_doc2.pdf';
      }
      if (typeLower === 'lookup' || codeLower.includes('lookup')) {
        if (Array.isArray(attr.options) && attr.options.length > 0) {
          const opt = attr.options[index % attr.options.length];
          return typeof opt === 'object' && opt !== null ? opt.name : String(opt);
        }
        return index === 0 ? 1 : 2;
      }
      if (typeLower === 'textarea' || codeLower.includes('area') || codeLower.includes('note') || codeLower.includes('comment')) {
        return index === 0 ? 'Detailed note for entry 1' : 'Detailed note for entry 2';
      }
      if (codeLower.includes('full_name') || codeLower.includes('name')) {
        return index === 0 ? 'Alex Smith' : 'Jordan Lee';
      }
      return `${attr.name || attr.code} sample ${index + 1}`;
    };

    const sampleRows = baseRows.map((row, idx) => {
      const fullRow = { ...row };
      headers.forEach((h) => {
        if (fullRow[h] === undefined || fullRow[h] === null) {
          const foundAttr = attrRows.find((a) => a.code === h);
          if (foundAttr) {
            fullRow[h] = generateAttrSampleValue(foundAttr, idx);
          } else {
            fullRow[h] = `Sample ${h} ${idx + 1}`;
          }
        }
      });
      return fullRow;
    });

    return {
      type: normType,
      headers,
      sampleRows,
      customAttributes: customAttrs,
    };
  }

  public static async processImport(
    typeRaw: string,
    actionRaw: string,
    validationStrategyRaw: string,
    allowedErrors: number,
    rows: any[],
    fileName?: string,
    fieldSeparator: string = ',',
    processInQueue: boolean = false
  ): Promise<{ importId: number; total: number; processed: number; errors: number; details: any }> {
    const type = typeRaw.toLowerCase() as 'leads' | 'persons' | 'organizations' | 'products';

    // Normalize action:
    let action = 'append';
    const aLower = (actionRaw || 'append').toLowerCase();
    if (aLower === 'delete') {
      action = 'delete';
    } else if (aLower === 'create' || aLower === 'create_only' || aLower === 'create only') {
      action = 'create_only';
    } else if (aLower === 'update' || aLower === 'update_only' || aLower === 'update only' || aLower === 'overwrite') {
      action = 'update_only';
    } else {
      action = 'append';
    }

    // Normalize validation strategy:
    const validationStrategy =
      validationStrategyRaw && validationStrategyRaw.toLowerCase().includes('skip')
        ? 'skip_error_entries'
        : 'stop_on_errors';

    const client = await pool.connect();
    let processed = 0;
    let errorCount = 0;
    const errorDetails: any[] = [];
    let aborted = false;

    try {
      await client.query('BEGIN');

      // Fetch defined attributes for this entity type
      const { rows: attrRows } = await client.query(
        `SELECT id, code, name, type, entity_type, is_required, is_user_defined
         FROM attributes 
         WHERE entity_type = $1 
         ORDER BY sort_order ASC, id ASC`,
        [type]
      );

      const attrIds = attrRows.map((a: any) => a.id);
      let optRows: any[] = [];
      if (attrIds.length > 0) {
        const placeholders = attrIds.map((_: any, i: number) => `$${i + 1}`).join(',');
        const optRes = await client.query(
          `SELECT id, attribute_id, name, sort_order 
           FROM attribute_options 
           WHERE attribute_id IN (${placeholders}) 
           ORDER BY sort_order ASC, id ASC`,
          attrIds
        );
        optRows = optRes.rows;
      }

      for (const a of attrRows) {
        a.options = optRows.filter((o: any) => o.attribute_id === a.id);
      }

      const customAttrs = attrRows.filter(
        (a: any) => a.is_user_defined || !BUILT_IN_FIELD_CODES.has(a.code.toLowerCase())
      );

      // Header validation check upfront
      if (Array.isArray(rows) && rows.length > 0) {
        const firstRow = rows[0] || {};
        const fileHeaders = Object.keys(firstRow);
        const headerAnalysis = analyzeImportHeaders(type, fileHeaders, customAttrs);
        if (!headerAnalysis.hasRequiredField) {
          await client.query('ROLLBACK');
          throw new ApiError(
            400,
            headerAnalysis.missingRequiredMessage ||
              `Column name mismatch: Required column "${headerAnalysis.requiredField}" is missing or does not match. For this column, the name should be "${headerAnalysis.requiredField}".`
          );
        }
      }

      // Helper to extract and cast custom attributes from a row
      const extractCustomAttributes = (row: any): Record<string, any> => {
        const custom: Record<string, any> = {};

        // 1. Map registered custom attributes
        for (const attr of customAttrs) {
          const matchingKey = Object.keys(row).find((k) => {
            const clean = k.trim().toLowerCase();
            return (
              clean === attr.code.toLowerCase() ||
              clean === attr.name.toLowerCase() ||
              clean === attr.code.replace(/_/g, ' ').toLowerCase() ||
              clean === attr.code.replace(/_/g, '').toLowerCase()
            );
          });

          let val = matchingKey !== undefined ? row[matchingKey] : undefined;

          if (val !== undefined && val !== null && val !== '') {
            const tLower = (attr.type || '').toLowerCase();
            if (tLower === 'price' || tLower === 'numeric' || tLower === 'decimal') {
              const n = Number(val);
              custom[attr.code] = isNaN(n) ? val : n;
            } else if (tLower === 'boolean' || tLower === 'checkbox') {
              const s = String(val).trim().toLowerCase();
              custom[attr.code] = s === 'true' || s === '1' || s === 'yes' || s === 'y' || s === 't';
            } else if (tLower === 'select' || tLower === 'lookup') {
              const resolved = resolveAttributeOption(val, attr.options || []);
              custom[attr.code] = resolved ? resolved.name : val;
            } else if (tLower === 'multiselect') {
              const resolved = resolveMultiselectOptions(val, attr.options || []);
              custom[attr.code] = resolved.names;
            } else if (typeof val === 'string') {
              const strVal = val.trim();
              if ((strVal.startsWith('[') && strVal.endsWith(']')) || (strVal.startsWith('{') && strVal.endsWith('}'))) {
                try {
                  custom[attr.code] = JSON.parse(strVal);
                } catch {
                  custom[attr.code] = strVal;
                }
              } else {
                custom[attr.code] = strVal;
              }
            } else {
              custom[attr.code] = val;
            }
          } else if (attr.is_required && action !== 'delete') {
            throw new Error(`Custom attribute '${attr.name}' (${attr.code}) is required`);
          }
        }

        // 2. Also preserve any extra unknown columns not in built-in fields
        for (const [k, v] of Object.entries(row)) {
          const cleanK = k.trim().toLowerCase();
          if (
            !BUILT_IN_FIELD_CODES.has(cleanK) &&
            !customAttrs.some((a) => a.code.toLowerCase() === cleanK || a.name.toLowerCase() === cleanK) &&
            v !== undefined &&
            v !== null &&
            v !== ''
          ) {
            custom[k.trim()] = v;
          }
        }

        return custom;
      };

      const seenInFile = new Map<string, number>();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const savepointName = `sp_${i}`;

        if (validationStrategy === 'skip_error_entries') {
          await client.query(`SAVEPOINT ${savepointName}`);
        }

        try {
          const rowCustomAttrs = extractCustomAttributes(row);

          if (type === 'leads') {
            const idVal = toNumberParam(getRowField(row, 'id', 'lead_id', 'deal_id'));
            const addressVal = getRowField(
              row,
              'address',
              'street',
              'location',
              'full_address',
              'office_address',
              'registered_address',
              'city',
              'state',
              'pincode',
              'pin_code'
            );
            const websiteVal = getRowField(
              row,
              'website',
              'web',
              'url',
              'site',
              'link',
              'portal',
              'linktree',
              'web_link'
            );
            const contactPhone = getRowField(
              row,
              'contact_phone',
              'contact_number',
              'contact_numbers',
              'phone',
              'phone_number',
              'phonenumber',
              'contactnumber',
              'contact_no',
              'phone_no',
              'mobile',
              'mobile_number',
              'mobilenumber',
              'mobile_no',
              'cell',
              'calls',
              'telephone',
              'tel'
            );
            const contactEmail = getRowField(
              row,
              'contact_email',
              'email',
              'emails',
              'email_address',
              'email_id',
              'emailid',
              'contact_mail',
              'mail',
              'mail_id',
              'e_mail'
            );

            const orgCandidate = getRowField(
              row,
              'organization',
              'organization_name',
              'company',
              'company_name',
              'institute',
              'institute_name',
              'college',
              'academy',
              'org',
              'firm',
              'business',
              'trust',
              'trust_name',
              'ngo',
              'ngo_name',
              'foundation',
              'sanstha',
              'ashram',
              'association'
            );
            const titleVal =
              getRowField(
                row,
                'title',
                'lead_title',
                'deal_name',
                'subject',
                'name',
                'lead_name',
                'trust',
                'trust_name',
                'ngo',
                'firm'
              ) || orgCandidate;
            const fallbackTitle = Object.values(row).find((v) => v !== undefined && v !== null && String(v).trim().length > 0);
            const titleStr = (titleVal || fallbackTitle ? String(titleVal || fallbackTitle).trim() : `Lead ${i + 1}`);

            const fileKey = idVal
              ? `id:${idVal}`
              : action === 'append'
              ? `title:${titleStr.toLowerCase()}:${contactEmail || contactPhone || i + 1}`
              : `title:${titleStr.toLowerCase()}`;
            if (action === 'create_only' && titleStr && fileKey && seenInFile.has(fileKey)) {
              throw new Error(`Row ${i + 1}: duplicate entry in file (matches row ${seenInFile.get(fileKey)})`);
            }
            if (titleStr && fileKey) seenInFile.set(fileKey, i + 1);

            // Safe Foreign Key Resolutions: verify existence to prevent FK constraint errors
            const finalUserId = await resolveUserId(
              client,
              getRowField(row, 'user_id', 'sales_owner_id'),
              getRowField(row, 'sales_owner', 'user_name', 'user', 'owner')
            );

            // Infer organization name if not explicitly given
            let inferredOrgName = orgCandidate ? String(orgCandidate).trim() : null;
            if (!inferredOrgName && titleStr && titleStr.length > 2) {
              const lowerT = titleStr.toLowerCase();
              if (
                lowerT.includes('trust') ||
                lowerT.includes('foundation') ||
                lowerT.includes('ngo') ||
                lowerT.includes('sanstha') ||
                lowerT.includes('ashram') ||
                lowerT.includes('society') ||
                lowerT.includes('association') ||
                lowerT.includes('institute') ||
                lowerT.includes('college') ||
                lowerT.includes('academy') ||
                lowerT.includes('classes') ||
                lowerT.includes('ltd') ||
                lowerT.includes('pvt') ||
                lowerT.includes('corp') ||
                lowerT.includes('center') ||
                lowerT.includes('centre') ||
                lowerT.includes('school') ||
                lowerT.includes('tutorials') ||
                lowerT.includes('hospital') ||
                lowerT.includes('clinic') ||
                lowerT.includes('mandir') ||
                lowerT.includes('bhavan') ||
                lowerT.includes('kendra') ||
                lowerT.includes('club') ||
                addressVal ||
                websiteVal
              ) {
                inferredOrgName = titleStr.split(',')[0].trim();
              }
            }

            let finalOrgId = await resolveOrgId(
              client,
              getRowField(row, 'organization_id'),
              inferredOrgName,
              finalUserId,
              addressVal,
              websiteVal
            );

            const contactPersonName = getRowField(
              row,
              'contact_person',
              'contact_name',
              'person',
              'person_name',
              'contact_person_name',
              'contact',
              'person_id',
              'owner_name',
              'representative'
            );

            let targetPersonName = contactPersonName ? String(contactPersonName).trim() : null;
            if (!targetPersonName && titleStr.includes(',')) {
              const afterComma = titleStr.split(',')[1].trim();
              if (
                afterComma.length > 2 &&
                afterComma.length < 40 &&
                !afterComma.toLowerCase().includes('nagpur') &&
                !afterComma.toLowerCase().includes('ltd') &&
                !afterComma.toLowerCase().includes('rd') &&
                !afterComma.toLowerCase().includes('road')
              ) {
                targetPersonName = afterComma;
              }
            }
            if (!targetPersonName && (contactPhone || contactEmail)) {
              targetPersonName = `${(inferredOrgName || titleStr).slice(0, 30)} Contact`;
            }

            let finalPersonId = await resolvePersonId(
              client,
              getRowField(row, 'person_id'),
              targetPersonName,
              contactEmail,
              contactPhone,
              finalOrgId,
              finalUserId
            );

            const leadSourceId = await resolveLeadSourceId(
              client,
              getRowField(row, 'lead_source_id', 'source_id', 'lead_source', 'source')
            );
            const leadTypeId = await resolveLeadTypeId(
              client,
              getRowField(row, 'lead_type_id', 'type_id', 'lead_type', 'type')
            );
            const leadPipelineId = await resolveLeadPipelineId(
              client,
              getRowField(row, 'lead_pipeline_id', 'pipeline_id', 'lead_pipeline', 'pipeline')
            );
            const leadPipelineStageId = await resolveLeadPipelineStageId(
              client,
              getRowField(row, 'lead_pipeline_stage_id', 'stage_id', 'lead_pipeline_stage', 'stage'),
              leadPipelineId
            );

            const rawLeadVal = getRowField(row, 'lead_value', 'value', 'amount', 'price');
            const leadValue = rawLeadVal ? Number(rawLeadVal) : 0;
            const rawDesc = getRowField(row, 'description', 'desc', 'notes', 'details', 'summary', 'comment', 'remarks') || '';
            const descParts: string[] = [];
            if (rawDesc) descParts.push(rawDesc);
            if (addressVal && !rawDesc.includes(addressVal)) descParts.push(`Address: ${addressVal}`);
            if (websiteVal && !rawDesc.includes(websiteVal)) descParts.push(`Website: ${websiteVal}`);
            for (const [k, v] of Object.entries(row)) {
              const cleanK = clean(k);
              if (cleanK.includes('feedback') || cleanK.includes('call') || cleanK.includes('status')) {
                if (v && String(v).trim()) descParts.push(`${k}: ${String(v).trim()}`);
              }
            }
            const description = descParts.join(' | ') || null;
            const statusRaw = getRowField(row, 'status') !== undefined ? getRowField(row, 'status') : true;
            const status = typeof statusRaw === 'boolean' ? statusRaw : String(statusRaw).toLowerCase() !== 'false' && String(statusRaw) !== '0' && String(statusRaw).toLowerCase() !== 'lost';
            const expectedCloseDate = getRowField(row, 'expected_close_date', 'close_date', 'due_date') || null;

            // Existing record check by id or title via procedural function
            const existingLead = await client.query(
              'SELECT * FROM public.fn_find_entity_for_import($1, $2, $3)',
              ['leads', idVal || null, titleStr || null]
            );
            const exists = existingLead.rows.length > 0;

            if (action === 'delete') {
              if (!exists) {
                throw new Error(`Row ${i + 1}: Lead with title "${titleStr}" not found for deletion`);
              }
              const leadId = existingLead.rows[0].id;
              await client.query('SELECT public.fn_delete_lead($1)', [leadId]);
              if (validationStrategy === 'skip_error_entries') {
                await client.query(`RELEASE SAVEPOINT ${savepointName}`);
              }
              processed++;
              continue;
            }
            if (action === 'create_only' && exists) {
              throw new Error(`Row ${i + 1}: Lead with title "${titleStr}" already exists`);
            }
            if (action === 'update_only' && !exists) {
              throw new Error(`Row ${i + 1}: Lead with title "${titleStr}" not found for update`);
            }

            if (exists) {
              // Retrieve full existing lead row to access linked person_id and organization_id
              const fullLeadRes = await client.query(
                'SELECT id, person_id, organization_id, user_id, custom_attributes, description FROM leads WHERE id = $1',
                [existingLead.rows[0].id]
              );
              const existingLeadRow = fullLeadRes.rows[0];

              if (!finalPersonId && existingLeadRow?.person_id) {
                finalPersonId = existingLeadRow.person_id;
              }
              if (!finalOrgId && existingLeadRow?.organization_id) {
                finalOrgId = existingLeadRow.organization_id;
              }

              // Always update linked Person with contact numbers, emails, and organization link!
              if (finalPersonId) {
                await updatePersonContactInfo(client, finalPersonId, contactEmail, contactPhone, finalOrgId);
              }

              // Always update linked Organization with address and website!
              if (finalOrgId) {
                await updateOrgInfo(client, finalOrgId, addressVal, websiteVal);
              }

              const mergedAttrs = { ...(existingLeadRow?.custom_attributes || {}), ...rowCustomAttrs };
              await client.query(
                'SELECT public.fn_import_upsert_lead($1, $2, $3, $4, $5, $6, $7, $8::boolean, $9, $10, $11, $12, $13::date, $14::jsonb)',
                [
                  existingLead.rows[0].id,
                  titleStr,
                  description,
                  leadValue,
                  finalPersonId,
                  finalOrgId,
                  finalUserId,
                  status,
                  leadSourceId,
                  leadTypeId,
                  leadPipelineId,
                  leadPipelineStageId,
                  expectedCloseDate,
                  JSON.stringify(mergedAttrs),
                ]
              );
              await saveEntityAttributeValues(client, 'leads', existingLead.rows[0].id, mergedAttrs);
            } else {
              const ins = await client.query(
                'SELECT public.fn_import_upsert_lead($1, $2, $3, $4, $5, $6, $7, $8::boolean, $9, $10, $11, $12, $13::date, $14::jsonb) AS id',
                [
                  null,
                  titleStr,
                  description,
                  leadValue,
                  finalPersonId,
                  finalOrgId,
                  finalUserId,
                  status,
                  leadSourceId,
                  leadTypeId,
                  leadPipelineId,
                  leadPipelineStageId,
                  expectedCloseDate,
                  JSON.stringify(rowCustomAttrs),
                ]
              );
              const newLeadId = ins.rows[0]?.id;
              if (newLeadId) {
                await saveEntityAttributeValues(client, 'leads', newLeadId, rowCustomAttrs);
              }
            }
          } else if (type === 'persons') {
            const idVal = toNumberParam(getRowField(row, 'id', 'person_id', 'person id'));
            const nameVal = getRowField(row, 'name', 'person_name', 'person name', 'full_name', 'full name', 'contact_name', 'contact name');
            if (!idVal && !nameVal) throw new Error(`Row ${i + 1}: name or id is required`);
            const nameStr = nameVal ? String(nameVal).trim() : '';

            const emailVal = getRowField(
              row,
              'emails',
              'email',
              'contact_email',
              'email_address',
              'email_id',
              'emailid',
              'mail',
              'mail_id',
              'e_mail'
            );
            const phoneVal = getRowField(
              row,
              'contact_numbers',
              'contact_number',
              'phone',
              'phone_number',
              'phonenumber',
              'mobile',
              'mobile_number',
              'mobilenumber',
              'contact',
              'cell',
              'calls',
              'telephone',
              'tel',
              'phone_no',
              'mobile_no',
              'contact_no'
            );

            const fileKey = idVal
              ? `id:${idVal}`
              : action === 'append'
              ? `name:${nameStr.toLowerCase()}:${emailVal || phoneVal || i + 1}`
              : `name:${nameStr.toLowerCase()}`;
            if (action === 'create_only' && nameStr && fileKey && seenInFile.has(fileKey)) {
              throw new Error(`Row ${i + 1}: duplicate entry in file (matches row ${seenInFile.get(fileKey)})`);
            }
            if (nameStr && fileKey) seenInFile.set(fileKey, i + 1);

            const cleanJobTitle = (title: any) => {
              if (!title || typeof title !== 'string') return null;
              if (title.includes('{') || title.includes('[') || title.includes('"')) return null;
              return title.trim();
            };

            const newEmails = parseField(emailVal, 'work');
            const newNumbers = parseField(phoneVal, 'work');

            const finalUserId = await resolveUserId(
              client,
              getRowField(row, 'user_id', 'sales_owner_id'),
              getRowField(row, 'user_name', 'sales_owner', 'user', 'owner')
            );

            // Safe Foreign Key Resolutions: verify existence to prevent FK constraint errors
            const finalOrgId = await resolveOrgId(
              client,
              getRowField(row, 'organization_id'),
              getRowField(row, 'organization_name', 'organization', 'company', 'company_name', 'institute'),
              finalUserId
            );

            // Duplicate entry check by id or name via procedural function
            const existing = await client.query(
              'SELECT * FROM public.fn_find_entity_for_import($1, $2, $3)',
              ['persons', idVal || null, nameStr || null]
            );
            const exists = existing.rows.length > 0;

            if (action === 'delete') {
              if (!exists) {
                throw new Error(`Row ${i + 1}: Person "${nameStr}" not found for deletion`);
              }
              const personId = existing.rows[0].id;
              await client.query('SELECT delete_person($1)', [personId]);
              if (validationStrategy === 'skip_error_entries') {
                await client.query(`RELEASE SAVEPOINT ${savepointName}`);
              }
              processed++;
              continue;
            }
            if (action === 'create_only' && exists) {
              throw new Error(`Row ${i + 1}: Person "${nameStr}" already exists`);
            }
            if (action === 'update_only' && !exists) {
              throw new Error(`Row ${i + 1}: Person "${nameStr}" not found for update`);
            }

            if (exists) {
              const existingPerson = existing.rows[0];
              const oldEmails = parseField(existingPerson.emails, 'work');
              const oldNumbers = parseField(existingPerson.contact_numbers, 'work');

              const mergedEmailsMap = new Map<string, string>();
              for (const e of [...oldEmails, ...newEmails]) {
                if (e.value && !mergedEmailsMap.has(e.value.toLowerCase())) {
                  mergedEmailsMap.set(e.value.toLowerCase(), e.label || 'work');
                }
              }
              const mergedEmails = Array.from(mergedEmailsMap.entries()).map(([value, label]) => ({ label, value }));

              const mergedNumbersMap = new Map<string, string>();
              for (const n of [...oldNumbers, ...newNumbers]) {
                if (n.value && !mergedNumbersMap.has(n.value.toLowerCase())) {
                  mergedNumbersMap.set(n.value.toLowerCase(), n.label || 'work');
                }
              }
              const mergedNumbers = Array.from(mergedNumbersMap.entries()).map(([value, label]) => ({ label, value }));

              const mergedAttrs = { ...(existingPerson.custom_attributes || {}), ...rowCustomAttrs };

              await client.query(
                'SELECT public.fn_import_upsert_person($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8::jsonb)',
                [
                  existingPerson.id,
                  nameStr,
                  JSON.stringify(mergedEmails),
                  JSON.stringify(mergedNumbers),
                  cleanJobTitle(getRowField(row, 'job_title', 'designation', 'role')),
                  finalOrgId,
                  finalUserId,
                  JSON.stringify(mergedAttrs),
                ]
              );
              await saveEntityAttributeValues(client, 'persons', existingPerson.id, mergedAttrs);
            } else {
              const uniqueEmailsMap = new Map<string, string>();
              for (const e of newEmails) {
                if (e.value && !uniqueEmailsMap.has(e.value.toLowerCase())) {
                  uniqueEmailsMap.set(e.value.toLowerCase(), e.label || 'work');
                }
              }
              const uniqueEmails = Array.from(uniqueEmailsMap.entries()).map(([value, label]) => ({ label, value }));

              const uniqueNumbersMap = new Map<string, string>();
              for (const n of newNumbers) {
                if (n.value && !uniqueNumbersMap.has(n.value.toLowerCase())) {
                  uniqueNumbersMap.set(n.value.toLowerCase(), n.label || 'work');
                }
              }
              const uniqueNumbers = Array.from(uniqueNumbersMap.entries()).map(([value, label]) => ({ label, value }));

              const ins = await client.query(
                'SELECT public.fn_import_upsert_person($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8::jsonb) AS id',
                [
                  null,
                  nameStr,
                  JSON.stringify(uniqueEmails),
                  JSON.stringify(uniqueNumbers),
                  cleanJobTitle(getRowField(row, 'job_title', 'designation', 'role')),
                  finalOrgId,
                  finalUserId,
                  JSON.stringify(rowCustomAttrs),
                ]
              );
              const newPersonId = ins.rows[0]?.id;
              if (newPersonId) {
                await saveEntityAttributeValues(client, 'persons', newPersonId, rowCustomAttrs);
              }
            }
          } else if (type === 'organizations') {
            const idVal = toNumberParam(getRowField(row, 'id', 'organization_id', 'organization id'));
            const nameVal = getRowField(
              row,
              'name',
              'organization_name',
              'organization name',
              'company',
              'company_name',
              'institute',
              'organization',
              'trust',
              'trust_name',
              'ngo',
              'ngo_name',
              'foundation',
              'sanstha',
              'ashram',
              'association',
              'title'
            );
            if (!idVal && !nameVal) throw new Error(`Row ${i + 1}: name or id is required`);
            const nameStr = nameVal ? String(nameVal).trim() : '';

            const fileKey = idVal ? `id:${idVal}` : `name:${nameStr.toLowerCase()}`;
            if (action === 'create_only' && nameStr && fileKey && seenInFile.has(fileKey)) {
              throw new Error(`Row ${i + 1}: duplicate entry in file (matches row ${seenInFile.get(fileKey)})`);
            }
            if (nameStr && fileKey) seenInFile.set(fileKey, i + 1);

            const finalUserId = await resolveUserId(
              client,
              getRowField(row, 'user_id', 'sales_owner_id'),
              getRowField(row, 'user_name', 'sales_owner', 'user', 'owner')
            );

            const addressObj = {
              address: getRowField(row, 'address', 'street_address', 'street address', 'street', 'location', 'full_address', 'office_address') || '',
              city: getRowField(row, 'city', 'town') || '',
              state: getRowField(row, 'state', 'province', 'region') || '',
              country: getRowField(row, 'country', 'nation') || '',
              postcode: getRowField(row, 'postcode', 'postal_code', 'postal code', 'zip', 'zip_code', 'pincode', 'pin_code') || '',
            };

            const orgPhone = getRowField(row, 'phone', 'contact_number', 'contact_numbers', 'contact_phone', 'phone_number', 'mobile', 'calls', 'telephone');
            const orgEmail = getRowField(row, 'email', 'emails', 'contact_email', 'email_id', 'emailid', 'mail');
            const orgContactPerson = getRowField(row, 'contact_person', 'person', 'contact_name', 'person_name');
            const orgWebsite = getRowField(row, 'website', 'web', 'url', 'site', 'link');
            if (orgWebsite) {
              rowCustomAttrs.website = orgWebsite;
            }

            const existingOrg = await client.query(
              'SELECT * FROM public.fn_find_entity_for_import($1, $2, $3)',
              ['organizations', idVal || null, nameStr || null]
            );
            const exists = existingOrg.rows.length > 0;

            if (action === 'delete') {
              if (!exists) {
                throw new Error(`Row ${i + 1}: Organization "${nameStr}" not found for deletion`);
              }
              const orgId = existingOrg.rows[0].id;
              await client.query('SELECT delete_organization($1)', [orgId]);
              if (validationStrategy === 'skip_error_entries') {
                await client.query(`RELEASE SAVEPOINT ${savepointName}`);
              }
              processed++;
              continue;
            }
            if (action === 'create_only' && exists) {
              throw new Error(`Row ${i + 1}: Organization "${nameStr}" already exists`);
            }
            if (action === 'update_only' && !exists) {
              throw new Error(`Row ${i + 1}: Organization "${nameStr}" not found for update`);
            }

            let savedOrgId: number | null = null;
            if (exists) {
              const oldAddress = existingOrg.rows[0].address || {};
              const mergedAddress = { ...oldAddress, ...addressObj };
              const mergedAttrs = { ...(existingOrg.rows[0].custom_attributes || {}), ...rowCustomAttrs };
              savedOrgId = existingOrg.rows[0].id;

              await client.query(
                'SELECT public.fn_import_upsert_organization($1, $2, $3::jsonb, $4, $5::jsonb)',
                [savedOrgId, nameStr, JSON.stringify(mergedAddress), finalUserId, JSON.stringify(mergedAttrs)]
              );
              if (savedOrgId) {
                await saveEntityAttributeValues(client, 'organizations', savedOrgId, mergedAttrs);
              }
            } else {
              const ins = await client.query(
                'SELECT public.fn_import_upsert_organization($1, $2, $3::jsonb, $4, $5::jsonb) AS id',
                [null, nameStr, JSON.stringify(addressObj), finalUserId, JSON.stringify(rowCustomAttrs)]
              );
              savedOrgId = ins.rows[0]?.id || null;
              if (savedOrgId) {
                await saveEntityAttributeValues(client, 'organizations', savedOrgId, rowCustomAttrs);
              }
            }

            if (savedOrgId && (orgPhone || orgEmail || orgContactPerson)) {
              const personName = orgContactPerson || `${nameStr.slice(0, 30)} Contact`;
              await resolvePersonId(client, null, personName, orgEmail, orgPhone, savedOrgId, finalUserId);
            }
          } else if (type === 'products') {
            const idVal = toNumberParam(getRowField(row, 'id', 'product_id', 'product id'));
            const skuVal = getRowField(row, 'sku', 'code', 'product_code', 'product code', 'item_code', 'item code');
            if (!idVal && !skuVal) throw new Error(`Row ${i + 1}: sku or id is required`);
            const skuStr = skuVal ? String(skuVal).trim() : '';
            const prodName = getRowField(row, 'name', 'product_name', 'product name', 'item_name', 'item name') || skuStr;

            const fileKey = idVal ? `id:${idVal}` : `sku:${skuStr.toLowerCase()}`;
            if (action === 'create_only' && skuStr && fileKey && seenInFile.has(fileKey)) {
              throw new Error(`Row ${i + 1}: duplicate entry in file (matches row ${seenInFile.get(fileKey)})`);
            }
            if (skuStr && fileKey) seenInFile.set(fileKey, i + 1);

            const description = getRowField(row, 'description', 'product_description', 'product description', 'desc') || null;
            const quantity = Number(getRowField(row, 'quantity', 'qty', 'stock', 'units') || 0);
            const price = Number(getRowField(row, 'price', 'unit_price', 'unit price', 'cost', 'rate') || 0);

            const existingProd = await client.query(
              'SELECT * FROM public.fn_find_entity_for_import($1, $2, $3, $4)',
              ['products', idVal || null, skuStr || null, String(prodName).trim() || null]
            );
            const exists = existingProd.rows.length > 0;

            if (action === 'delete') {
              if (!exists) {
                throw new Error(`Row ${i + 1}: Product with SKU "${skuStr}" not found for deletion`);
              }
              const prodId = existingProd.rows[0].id;
              await client.query('SELECT public.fn_delete_product($1)', [prodId]);
              if (validationStrategy === 'skip_error_entries') {
                await client.query(`RELEASE SAVEPOINT ${savepointName}`);
              }
              processed++;
              continue;
            }
            if (action === 'create_only' && exists) {
              throw new Error(`Row ${i + 1}: Product with SKU "${skuStr}" already exists`);
            }
            if (action === 'update_only' && !exists) {
              throw new Error(`Row ${i + 1}: Product with SKU "${skuStr}" not found for update`);
            }

            if (exists) {
              const mergedAttrs = { ...(existingProd.rows[0].custom_attributes || {}), ...rowCustomAttrs };
              await client.query(
                'SELECT public.fn_import_upsert_product($1, $2, $3, $4, $5, $6, $7::jsonb)',
                [existingProd.rows[0].id, skuStr, prodName, description, quantity, price, JSON.stringify(mergedAttrs)]
              );
              await saveEntityAttributeValues(client, 'products', existingProd.rows[0].id, mergedAttrs);
            } else {
              const ins = await client.query(
                'SELECT public.fn_import_upsert_product($1, $2, $3, $4, $5, $6, $7::jsonb) AS id',
                [null, skuStr, prodName, description, quantity, price, JSON.stringify(rowCustomAttrs)]
              );
              const newProdId = ins.rows[0]?.id;
              if (newProdId) {
                await saveEntityAttributeValues(client, 'products', newProdId, rowCustomAttrs);
              }
            }
          }

          if (validationStrategy === 'skip_error_entries') {
            await client.query(`RELEASE SAVEPOINT ${savepointName}`);
          }
          processed++;
        } catch (err: any) {
          if (validationStrategy === 'skip_error_entries') {
            await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
          }
          errorCount++;
          errorDetails.push({ row: i + 1, error: err.message, data: row });

          if (validationStrategy === 'stop_on_errors' && errorCount > allowedErrors) {
            aborted = true;
            break;
          }
          if (validationStrategy === 'skip_error_entries' && allowedErrors > 0 && errorCount > allowedErrors) {
            aborted = true;
            break;
          }
        }
      }

      if (aborted && validationStrategy === 'stop_on_errors') {
        // Rollback all changes so no partial corrupted data is committed
        await client.query('ROLLBACK');
        processed = 0;
      } else {
        await client.query('COMMIT');
      }
    } catch (txError: any) {
      await client.query('ROLLBACK');
      logger.error({ txError }, 'DataTransferService.processImport transaction failed');
      throw txError;
    } finally {
      client.release();
    }

    const state =
      errorCount === 0 ? 'completed' : processed > 0 ? 'partial' : 'failed';

    const summary = {
      total: rows.length,
      processed,
      errors: errorCount,
      fileName: fileName || `${type}_import.csv`,
      error_samples: errorDetails.slice(0, 10),
    };

    // Record import job in imports table
    try {
      const { rows: res } = await pool.query(
        'SELECT save_import_record($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11) as result',
        [
          type,
          action,
          state,
          JSON.stringify(summary),
          errorDetails.length ? JSON.stringify(errorDetails) : '',
          validationStrategy,
          allowedErrors || 0,
          fieldSeparator || ',',
          processInQueue || false,
          '',
          fileName || `${type}_import.csv`,
        ]
      );

      return {
        importId: res[0]?.result?.id,
        total: rows.length,
        processed,
        errors: errorCount,
        details: summary,
      };
    } catch (saveRecErr) {
      logger.error({ saveRecErr }, 'Failed to save import record log');
      return {
        importId: 0,
        total: rows.length,
        processed,
        errors: errorCount,
        details: summary,
      };
    }
  }

  public static async validateImport(
    typeRaw: string,
    actionRaw: string,
    validationStrategyRaw: string,
    allowedErrors: number,
    rows: any[]
  ): Promise<{
    isValid: boolean;
    total: number;
    validCount: number;
    invalidCount: number;
    errorsCount: number;
    errors: string[];
    sampleErrors: Array<{ row: number; error: string }>;
    headerAnalysis?: HeaderAnalysis;
  }> {
    const type = typeRaw.toLowerCase() as 'leads' | 'persons' | 'organizations' | 'products';
    let action = 'append';
    const aLower = (actionRaw || '').toLowerCase();
    if (aLower === 'delete') action = 'delete';
    else if (aLower.includes('create') && !aLower.includes('update')) action = 'create_only';
    else if (aLower.includes('update') && !aLower.includes('create')) action = 'update_only';

    const errors: string[] = [];
    const sampleErrors: Array<{ row: number; error: string }> = [];
    let validCount = 0;
    let invalidCount = 0;
    let headerAnalysis: HeaderAnalysis | undefined;

    if (!Array.isArray(rows) || rows.length === 0) {
      return {
        isValid: false,
        total: 0,
        validCount: 0,
        invalidCount: 0,
        errorsCount: 1,
        errors: ['No data rows found in the uploaded file to validate.'],
        sampleErrors: [{ row: 0, error: 'No data rows found in the uploaded file to validate.' }],
      };
    }

    const client = await pool.connect();
    try {
      // Fetch required custom attributes for this entity type
      const { rows: reqAttrs } = await client.query(
        'SELECT * FROM public.fn_get_required_attributes($1)',
        [type]
      );

      // 1. Header schema compatibility check against selected module type
      const firstRow = rows[0] || {};
      const fileHeaders = Object.keys(firstRow);
      headerAnalysis = analyzeImportHeaders(type, fileHeaders, reqAttrs);

      if (!headerAnalysis.hasRequiredField) {
        const errorMsg = headerAnalysis.missingRequiredMessage || `Required column "${headerAnalysis.requiredField}" is missing`;
        return {
          isValid: false,
          total: rows.length,
          validCount: 0,
          invalidCount: rows.length,
          errorsCount: 1,
          errors: [errorMsg],
          sampleErrors: [{ row: 1, error: errorMsg }],
          headerAnalysis,
        } as any;
      }

      // Note: Unmatched columns are preserved in headerAnalysis and custom_attributes,
      // and do NOT block or fail row validation.

      const seenInFile = new Map<string, number>();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        let rowError: string | null = null;

        // Check required custom attributes only when action !== 'delete'
        if (action !== 'delete') {
          for (const reqAttr of reqAttrs) {
            const val = getRowField(row, reqAttr.code, reqAttr.name);
            if (val === undefined || val === null || String(val).trim() === '') {
              rowError = `Required custom attribute "${reqAttr.name || reqAttr.code}" is missing`;
              break;
            }
          }
        }

        if (!rowError) {
          if (type === 'leads') {
            const idVal = toNumberParam(getRowField(row, 'id', 'lead_id', 'deal_id'));
            const orgVal = getRowField(
              row,
              'organization',
              'organization_name',
              'company',
              'company_name',
              'institute',
              'institute_name',
              'college',
              'academy'
            );
            const personVal = getRowField(row, 'contact_person', 'person', 'contact_name', 'person_name');
            let titleVal =
              getRowField(
                row,
                'title',
                'lead_title',
                'deal_name',
                'subject',
                'name',
                'lead_name',
                'trust',
                'trust_name',
                'ngo',
                'firm'
              ) || orgVal || personVal;

            if (!titleVal && !idVal) {
              const firstVal = Object.values(row).find((v) => v !== undefined && v !== null && String(v).trim().length > 0);
              if (firstVal) {
                titleVal = String(firstVal).trim();
              }
            }

            if (!idVal && !titleVal) {
              rowError = 'Field "title" or "id" is required';
            } else {
              const titleStr = titleVal ? String(titleVal).trim() : '';
              const phoneVal = getRowField(row, 'contact_phone', 'phone', 'phone_number', 'contact_numbers', 'mobile');
              const emailVal = getRowField(row, 'contact_email', 'email', 'emails', 'email_id');

              const fileKey = idVal
                ? `id:${idVal}`
                : action === 'append'
                ? `title:${titleStr.toLowerCase()}:${emailVal || phoneVal || i + 1}`
                : `title:${titleStr.toLowerCase()}`;

              if (action === 'create_only' && titleStr && fileKey && seenInFile.has(fileKey)) {
                rowError = `Duplicate entry in file: row ${i + 1} has duplicate ${idVal ? 'ID' : 'title'} matching row ${seenInFile.get(fileKey)}`;
              } else {
                if (titleStr && fileKey) seenInFile.set(fileKey, i + 1);
                const existingLead = await client.query(
                  'SELECT * FROM public.fn_find_entity_for_import($1, $2, $3)',
                  ['leads', idVal || null, titleStr || null]
                );
                const exists = existingLead.rows.length > 0;
                if (action === 'delete' && !exists) {
                  rowError = `Lead ${idVal ? `with ID ${idVal}` : `with title "${titleStr}"`} not found for deletion`;
                } else if (action === 'create_only' && exists) {
                  rowError = `Lead with title "${titleStr}" already exists`;
                } else if (action === 'update_only' && !exists) {
                  rowError = `Lead ${idVal ? `with ID ${idVal}` : `with title "${titleStr}"`} not found for update`;
                }
              }
            }
          } else if (type === 'persons') {
            const idVal = toNumberParam(getRowField(row, 'id', 'person_id'));
            let nameVal = getRowField(row, 'name', 'person_name', 'full_name', 'contact_name', 'title', 'lead_name');
            if (!nameVal && !idVal) {
              const firstVal = Object.values(row).find((v) => v !== undefined && v !== null && String(v).trim().length > 0);
              if (firstVal) {
                nameVal = String(firstVal).trim();
              }
            }

            if (!idVal && !nameVal) {
              rowError = 'Field "name" or "id" is required';
            } else {
              const nameStr = nameVal ? String(nameVal).trim() : '';
              const emailVal = getRowField(row, 'emails', 'email', 'contact_email', 'email_id');
              const phoneVal = getRowField(row, 'contact_numbers', 'phone', 'phone_number', 'mobile');

              const fileKey = idVal
                ? `id:${idVal}`
                : action === 'append'
                ? `name:${nameStr.toLowerCase()}:${emailVal || phoneVal || i + 1}`
                : `name:${nameStr.toLowerCase()}`;

              if (action === 'create_only' && nameStr && fileKey && seenInFile.has(fileKey)) {
                rowError = `Duplicate entry in file: row ${i + 1} has duplicate ${idVal ? 'ID' : 'name'} matching row ${seenInFile.get(fileKey)}`;
              } else {
                if (nameStr && fileKey) seenInFile.set(fileKey, i + 1);
                const existing = await client.query(
                  'SELECT * FROM public.fn_find_entity_for_import($1, $2, $3)',
                  ['persons', idVal || null, nameStr || null]
                );
                const exists = existing.rows.length > 0;
                if (action === 'delete' && !exists) {
                  rowError = `Person ${idVal ? `with ID ${idVal}` : `"${nameStr}"`} not found for deletion`;
                } else if (action === 'create_only' && exists) {
                  rowError = `Person "${nameStr}" already exists`;
                } else if (action === 'update_only' && !exists) {
                  rowError = `Person ${idVal ? `with ID ${idVal}` : `"${nameStr}"`} not found for update`;
                }
              }
            }
          } else if (type === 'organizations') {
            const idVal = toNumberParam(getRowField(row, 'id', 'organization_id'));
            let nameVal = getRowField(row, 'name', 'organization_name', 'company', 'company_name', 'institute', 'organization', 'title', 'trust');
            if (!nameVal && !idVal) {
              const firstVal = Object.values(row).find((v) => v !== undefined && v !== null && String(v).trim().length > 0);
              if (firstVal) {
                nameVal = String(firstVal).trim();
              }
            }

            if (!idVal && !nameVal) {
              rowError = 'Field "name" or "id" is required';
            } else {
              const nameStr = nameVal ? String(nameVal).trim() : '';
              const fileKey = idVal ? `id:${idVal}` : `name:${nameStr.toLowerCase()}`;
              if (action === 'create_only' && nameStr && fileKey && seenInFile.has(fileKey)) {
                rowError = `Duplicate entry in file: row ${i + 1} has duplicate ${idVal ? 'ID' : 'name'} matching row ${seenInFile.get(fileKey)}`;
              } else {
                if (nameStr && fileKey) seenInFile.set(fileKey, i + 1);
                const existingOrg = await client.query(
                  'SELECT * FROM public.fn_find_entity_for_import($1, $2, $3)',
                  ['organizations', idVal || null, nameStr || null]
                );
                const exists = existingOrg.rows.length > 0;
                if (action === 'delete' && !exists) {
                  rowError = `Organization ${idVal ? `with ID ${idVal}` : `"${nameStr}"`} not found for deletion`;
                } else if (action === 'create_only' && exists) {
                  rowError = `Organization "${nameStr}" already exists`;
                } else if (action === 'update_only' && !exists) {
                  rowError = `Organization ${idVal ? `with ID ${idVal}` : `"${nameStr}"`} not found for update`;
                }
              }
            }
          } else if (type === 'products') {
            const idVal = toNumberParam(getRowField(row, 'id', 'product_id'));
            let skuVal = getRowField(row, 'sku', 'code', 'product_code', 'item_code');
            const nameVal = getRowField(row, 'name', 'product_name', 'item_name');
            if (!skuVal && !idVal) {
              const firstVal = Object.values(row).find((v) => v !== undefined && v !== null && String(v).trim().length > 0);
              if (firstVal) {
                skuVal = String(firstVal).trim();
              }
            }

            if (!idVal && !skuVal) {
              rowError = 'Field "sku" is required for products';
            } else {
              const skuStr = skuVal ? String(skuVal).trim() : '';
              const fileKey = idVal ? `id:${idVal}` : `sku:${skuStr.toLowerCase()}`;
              if (action === 'create_only' && skuStr && fileKey && seenInFile.has(fileKey)) {
                rowError = `Duplicate entry in file: row ${i + 1} has duplicate SKU matching row ${seenInFile.get(fileKey)}`;
              } else {
                if (skuStr && fileKey) seenInFile.set(fileKey, i + 1);
                const prodName = nameVal ? String(nameVal).trim() : skuStr;
                const existingProd = await client.query(
                  'SELECT * FROM public.fn_find_entity_for_import($1, $2, $3, $4)',
                  ['products', idVal || null, skuStr || null, prodName || null]
                );
                const exists = existingProd.rows.length > 0;
                if (action === 'delete' && !exists) {
                  rowError = `Product ${idVal ? `with ID ${idVal}` : `with SKU "${skuStr}"`} not found for deletion`;
                } else if (action === 'create_only' && exists) {
                  rowError = `Product with SKU "${skuStr}" already exists`;
                } else if (action === 'update_only' && !exists) {
                  rowError = `Product ${idVal ? `with ID ${idVal}` : `with SKU "${skuStr}"`} not found for update`;
                }
              }
            }
          }
        }

        if (rowError) {
          invalidCount++;
          const msg = `Row ${i + 1}: ${rowError}`;
          errors.push(msg);
          if (sampleErrors.length < 20) {
            sampleErrors.push({ row: i + 1, error: rowError });
          }
        } else {
          validCount++;
        }
      }
    } finally {
      client.release();
    }

    const strat = (validationStrategyRaw || '').toLowerCase();
    const isSkipErrors = strat.includes('skip');
    const isValid = invalidCount === 0 || (isSkipErrors && invalidCount <= (allowedErrors || 0));

    return {
      isValid,
      total: rows.length,
      validCount,
      invalidCount,
      errorsCount: invalidCount,
      errors,
      sampleErrors,
      headerAnalysis,
    };
  }

  public static async exportData(type: string): Promise<any[]> {
    try {
      if (type === 'leads') {
        const { rows } = await pool.query(
          "SELECT * FROM public.fn_get_all_leads('', 1, 100000)"
        );
        return rows;
      } else if (type === 'persons') {
        const { rows } = await pool.query('SELECT get_all_persons(null) as result');
        return rows[0]?.result || [];
      } else if (type === 'organizations') {
        const { rows } = await pool.query('SELECT get_all_organizations(null::text, 100000, 0) as result');
        return rows[0]?.result?.rows || [];
      } else if (type === 'products') {
        const { rows } = await pool.query(
          "SELECT * FROM public.fn_get_all_products('', 1, 100000)"
        );
        return rows;
      }
      return [];
    } catch (error: any) {
      logger.error({ error, type }, 'DataTransferService.exportData failed');
      throw error;
    }
  }
}
