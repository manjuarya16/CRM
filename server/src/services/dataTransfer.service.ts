import { pool } from '@/config/db';
import { IImport } from '@/interfaces/crm.interface';
import { logger } from '@/utils/logger';

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
  'contact_email',
  'contact_number',
  'organization_id',
  'organization_name',
  'person_id',
  'person_name',
  'user_id',
  'user_name',
  'sales_owner',
  'sales_owner_id',
  'lead_source_id',
  'lead_type_id',
  'lead_pipeline_id',
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

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const parseField = (val: any, defaultLabel = 'work'): Array<{ label: string; value: string }> => {
  if (!val) return [];
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
        const itemVal = item.value ?? item.email ?? item.phone ?? item.contact;
        const itemLabel = item.label || defaultLabel;
        if (typeof itemVal === 'string' && (itemVal.startsWith('[') || itemVal.startsWith('{') || itemVal.includes(':') || itemVal.includes(','))) {
          res.push(...parseStr(itemVal, itemLabel));
        } else if (itemVal) {
          res.push({ label: itemLabel, value: String(itemVal).trim() });
        }
      } else if (typeof item === 'string') {
        res.push(...parseStr(item, defaultLabel));
      }
    }
    return res;
  }
  if (typeof val === 'string') return parseStr(val, defaultLabel);
  return [];
};

// Safe Foreign Key Resolvers to prevent FK Constraint Violations
const resolveOrgId = async (client: any, rawVal: any, nameVal?: any): Promise<number | null> => {
  const num = toNumberParam(rawVal);
  const n = String(nameVal || rawVal || '').trim();

  if (num || n) {
    const existing = await client.query(
      'SELECT * FROM public.fn_find_entity_for_import($1, $2, $3)',
      ['organizations', num || null, n && isNaN(Number(n)) ? n : null]
    );
    if (existing.rows.length > 0) return existing.rows[0].id;
  }

  // Auto-create organization if a non-numeric name was specified
  if (n && isNaN(Number(n))) {
    try {
      const created = await client.query(
        'SELECT save_organization($1, null, 1, \'{}\') as result',
        [n]
      );
      return created.rows[0]?.result?.id || null;
    } catch {}
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
  return null;
};

const resolvePersonId = async (client: any, rawVal: any, nameVal?: any): Promise<number | null> => {
  const num = toNumberParam(rawVal);
  const n = String(nameVal || rawVal || '').trim();
  if (num || n) {
    const existing = await client.query(
      'SELECT * FROM public.fn_find_entity_for_import($1, $2, $3)',
      ['persons', num || null, n && isNaN(Number(n)) ? n : null]
    );
    if (existing.rows.length > 0) return existing.rows[0].id;
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

  try {
    const { rows: attrResult } = await client.query(
      'SELECT get_all_attributes(null, $1) AS data',
      [entityType]
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
  } catch (attrErr) {
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
      pool.query('SELECT get_all_organizations(null) as result'),
      pool.query('SELECT get_all_users(null) as result'),
      pool.query('SELECT get_all_persons(null) as result'),
      pool.query('SELECT * FROM public.fn_get_lead_sources()'),
      pool.query('SELECT * FROM public.fn_get_lead_types()'),
      pool.query('SELECT * FROM public.fn_get_lead_pipelines()'),
    ]);

    const organizationsList = orgsDb.rows[0]?.result || [];
    const usersList = usersDb.rows[0]?.result || [];
    const personsList = personsDb.rows[0]?.result || [];
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

    let standardHeaders: string[] = [];
    let baseRows: Record<string, any>[] = [];

    if (normType === 'persons') {
      standardHeaders = ['name', 'emails', 'contact_numbers', 'job_title', 'organization_id', 'user_id'];
      baseRows = [
        {
          name: 'Wilson Fisk',
          emails: 'wilson.fisk@example.com',
          contact_numbers: '+1-555-0101',
          job_title: 'Chief Executive Officer',
          organization_id: sampleOrgId1,
          user_id: sampleUserId1,
        },
        {
          name: 'Sasha Calle',
          emails: 'sasha.calle@example.com',
          contact_numbers: '+1-555-0102',
          job_title: 'Sales Director',
          organization_id: sampleOrgId2,
          user_id: sampleUserId2,
        },
      ];
    } else if (normType === 'leads') {
      standardHeaders = [
        'title',
        'description',
        'lead_value',
        'status',
        'person_id',
        'organization_id',
        'user_id',
        'lead_source_id',
        'lead_type_id',
        'lead_pipeline_id',
        'lead_pipeline_stage_id',
        'expected_close_date',
      ];
      baseRows = [
        {
          title: 'Enterprise Cloud Migration Deal',
          description: 'Interested in CRM migration and integrations',
          lead_value: 50000,
          status: 'Open',
          person_id: samplePersonId1,
          organization_id: sampleOrgId1,
          user_id: sampleUserId1,
          lead_source_id: sampleSourceId1,
          lead_type_id: sampleTypeId1,
          lead_pipeline_id: samplePipelineId1,
          lead_pipeline_stage_id: sampleStageId1,
          expected_close_date: '2026-12-31',
        },
        {
          title: 'Annual Support & Maintenance Renewal',
          description: 'Renewal contract for 200 software seats',
          lead_value: 25000,
          status: 'Open',
          person_id: samplePersonId2,
          organization_id: sampleOrgId2,
          user_id: sampleUserId2,
          lead_source_id: sampleSourceId2,
          lead_type_id: sampleTypeId2,
          lead_pipeline_id: samplePipelineId2,
          lead_pipeline_stage_id: sampleStageId2,
          expected_close_date: '2026-11-15',
        },
      ];
    } else if (normType === 'organizations') {
      standardHeaders = ['name', 'address', 'city', 'state', 'country', 'postcode', 'user_id'];
      baseRows = [
        {
          name: 'Acme Corporation',
          address: '123 Tech Boulevard',
          city: 'San Francisco',
          state: 'California',
          country: 'USA',
          postcode: '94105',
          user_id: sampleUserId1,
        },
        {
          name: 'Global Logistics Ltd',
          address: '456 Freight Way',
          city: 'London',
          state: 'Greater London',
          country: 'UK',
          postcode: 'EC1A 1BB',
          user_id: sampleUserId2,
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

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const savepointName = `sp_${i}`;

        if (validationStrategy === 'skip_error_entries') {
          await client.query(`SAVEPOINT ${savepointName}`);
        }

        try {
          const rowCustomAttrs = extractCustomAttributes(row);

          if (type === 'leads') {
            const idVal = toNumberParam(row.id || row.Id || row['Lead ID'] || row['ID']);
            const titleVal = row.title || row.Title || row['Lead Title'] || row['Subject'] || row['Deal Name'];
            if (!idVal && !titleVal) throw new Error(`Row ${i + 1}: title or id is required`);
            const titleStr = titleVal ? String(titleVal).trim() : '';

            // Safe Foreign Key Resolutions: verify existence to prevent FK constraint errors
            const finalPersonId = await resolvePersonId(
              client,
              row.person_id || row.personId || row['Person ID'],
              row.person_name || row.person || row['Person Name'] || row.Person
            );

            const finalOrgId = await resolveOrgId(
              client,
              row.organization_id || row.organizationId || row['Organization ID'],
              row.organization_name || row.organization || row['Organization Name'] || row.Organization
            );

            const finalUserId = await resolveUserId(
              client,
              row.user_id || row.userId || row['User ID'] || row.sales_owner_id,
              row.user_name || row.sales_owner || row['Sales Owner'] || row.User
            );

            const leadSourceId = await resolveLeadSourceId(client, row.lead_source_id || row.source_id);
            const leadTypeId = await resolveLeadTypeId(client, row.lead_type_id || row.type_id);
            const leadPipelineId = await resolveLeadPipelineId(client, row.lead_pipeline_id || row.pipeline_id);
            const leadPipelineStageId = await resolveLeadPipelineStageId(
              client,
              row.lead_pipeline_stage_id || row.stage_id,
              leadPipelineId
            );

            const leadValue = row.lead_value || row.leadValue || row.Value ? Number(row.lead_value || row.leadValue || row.Value) : 0;
            const description = row.description || row.Description || null;
            const statusRaw = row.status !== undefined ? row.status : true;
            const status = typeof statusRaw === 'boolean' ? statusRaw : String(statusRaw).toLowerCase() !== 'false' && String(statusRaw) !== '0' && String(statusRaw).toLowerCase() !== 'lost';
            const expectedCloseDate = row.expected_close_date || null;

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
              const mergedAttrs = { ...(existingLead.rows[0].custom_attributes || {}), ...rowCustomAttrs };
              await client.query(
                'SELECT public.fn_import_upsert_lead($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::date, $14::jsonb)',
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
                'SELECT public.fn_import_upsert_lead($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::date, $14::jsonb) AS id',
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
            const idVal = toNumberParam(row.id || row.Id || row['Person ID'] || row['ID']);
            const nameVal = row.name || row.Name || row['Person Name'];
            if (!idVal && !nameVal) throw new Error(`Row ${i + 1}: name or id is required`);
            const nameStr = nameVal ? String(nameVal).trim() : '';

            const cleanJobTitle = (title: any) => {
              if (!title || typeof title !== 'string') return null;
              if (title.includes('{') || title.includes('[') || title.includes('"')) return null;
              return title.trim();
            };

            const newEmails = parseField(row.emails || row.email || row.Emails || row.Email, 'work');
            const newNumbers = parseField(row.contact_numbers || row.phone || row.Phone || row.Contact, 'work');

            // Safe Foreign Key Resolutions: verify existence to prevent FK constraint errors
            const finalOrgId = await resolveOrgId(
              client,
              row.organization_id || row.organizationId || row['Organization ID'],
              row.organization_name || row.organization || row['Organization Name'] || row.Organization
            );

            const finalUserId = await resolveUserId(
              client,
              row.user_id || row.userId || row['User ID'] || row.sales_owner_id,
              row.user_name || row.sales_owner || row['Sales Owner'] || row.User
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
                  cleanJobTitle(row.job_title || row.JobTitle),
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
                  cleanJobTitle(row.job_title || row.JobTitle),
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
            const idVal = toNumberParam(row.id || row.Id || row['Organization ID'] || row['ID']);
            const nameVal = row.name || row.Name || row['Organization Name'];
            if (!idVal && !nameVal) throw new Error(`Row ${i + 1}: name or id is required`);
            const nameStr = nameVal ? String(nameVal).trim() : '';

            const finalUserId = await resolveUserId(
              client,
              row.user_id || row.userId || row['User ID'] || row.sales_owner_id,
              row.user_name || row.sales_owner || row['Sales Owner'] || row.User
            );

            const addressObj = {
              address: row.address || row.Address || '',
              city: row.city || row.City || '',
              state: row.state || row.State || '',
              country: row.country || row.Country || '',
              postcode: row.postcode || row.zip || row.Postcode || '',
            };

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

            if (exists) {
              const oldAddress = existingOrg.rows[0].address || {};
              const mergedAddress = { ...oldAddress, ...addressObj };
              const mergedAttrs = { ...(existingOrg.rows[0].custom_attributes || {}), ...rowCustomAttrs };

              await client.query(
                'SELECT public.fn_import_upsert_organization($1, $2, $3::jsonb, $4, $5::jsonb)',
                [existingOrg.rows[0].id, nameStr, JSON.stringify(mergedAddress), finalUserId, JSON.stringify(mergedAttrs)]
              );
              await saveEntityAttributeValues(client, 'organizations', existingOrg.rows[0].id, mergedAttrs);
            } else {
              const ins = await client.query(
                'SELECT public.fn_import_upsert_organization($1, $2, $3::jsonb, $4, $5::jsonb) AS id',
                [null, nameStr, JSON.stringify(addressObj), finalUserId, JSON.stringify(rowCustomAttrs)]
              );
              const newOrgId = ins.rows[0]?.id;
              if (newOrgId) {
                await saveEntityAttributeValues(client, 'organizations', newOrgId, rowCustomAttrs);
              }
            }
          } else if (type === 'products') {
            const idVal = toNumberParam(row.id || row.Id || row['Product ID'] || row['ID']);
            const skuVal = row.sku || row.SKU || row.code || row['Product Code'] || row['Item Code'];
            if (!idVal && !skuVal) throw new Error(`Row ${i + 1}: sku or id is required`);
            const skuStr = skuVal ? String(skuVal).trim() : '';
            const prodName = row.name || row.Name || row['Product Name'] || skuStr;
            const description = row.description || row.Description || null;
            const quantity = Number(row.quantity || row.Quantity || 0);
            const price = Number(row.price || row.Price || 0);

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

    // 1. Header schema compatibility check against selected module type
    const firstRow = rows[0] || {};
    const firstRowKeys = Object.keys(firstRow).map((k) => k.trim().toLowerCase());
    const hasColumn = (...candidates: string[]) =>
      candidates.some((c) => firstRowKeys.includes(c.toLowerCase()));

    if (type === 'products') {
      const hasSkuCol = hasColumn('sku', 'code', 'product code', 'item code', 'id', 'product id');
      if (!hasSkuCol) {
        return {
          isValid: false,
          total: rows.length,
          validCount: 0,
          invalidCount: rows.length,
          errorsCount: 1,
          errors: [
            "Header Mismatch: Column 'sku' is required for Products import. The uploaded file appears to be formatted for another module (found: " +
              Object.keys(firstRow).join(', ') +
              ').'
          ],
          sampleErrors: [
            {
              row: 1,
              error:
                "Header Mismatch: Missing required 'sku' column for Products import. Found columns: " +
                Object.keys(firstRow).join(', ')
            }
          ],
        };
      }
    } else if (type === 'persons') {
      const hasPersonCol = hasColumn('name', 'person name', 'full name', 'id', 'person id');
      if (!hasPersonCol) {
        return {
          isValid: false,
          total: rows.length,
          validCount: 0,
          invalidCount: rows.length,
          errorsCount: 1,
          errors: [
            "Header Mismatch: Column 'name' is required for Persons import. The uploaded file appears to be formatted for another module (found: " +
              Object.keys(firstRow).join(', ') +
              ').'
          ],
          sampleErrors: [
            {
              row: 1,
              error:
                "Header Mismatch: Missing required 'name' column for Persons import. Found columns: " +
                Object.keys(firstRow).join(', ')
            }
          ],
        };
      }
    } else if (type === 'leads') {
      const hasLeadCol = hasColumn('title', 'lead title', 'deal name', 'subject', 'id', 'lead id');
      if (!hasLeadCol) {
        return {
          isValid: false,
          total: rows.length,
          validCount: 0,
          invalidCount: rows.length,
          errorsCount: 1,
          errors: [
            "Header Mismatch: Column 'title' is required for Leads import. The uploaded file appears to be formatted for another module (found: " +
              Object.keys(firstRow).join(', ') +
              ').'
          ],
          sampleErrors: [
            {
              row: 1,
              error:
                "Header Mismatch: Missing required 'title' column for Leads import. Found columns: " +
                Object.keys(firstRow).join(', ')
            }
          ],
        };
      }
    } else if (type === 'organizations') {
      const hasOrgCol = hasColumn('name', 'organization name', 'company', 'company name', 'id', 'organization id');
      if (!hasOrgCol) {
        return {
          isValid: false,
          total: rows.length,
          validCount: 0,
          invalidCount: rows.length,
          errorsCount: 1,
          errors: [
            "Header Mismatch: Column 'name' is required for Organizations import. The uploaded file appears to be formatted for another module (found: " +
              Object.keys(firstRow).join(', ') +
              ').'
          ],
          sampleErrors: [
            {
              row: 1,
              error:
                "Header Mismatch: Missing required 'name' column for Organizations import. Found columns: " +
                Object.keys(firstRow).join(', ')
            }
          ],
        };
      }
    }

    const client = await pool.connect();
    try {
      // Fetch required custom attributes for this entity type
      const { rows: reqAttrs } = await client.query(
        'SELECT * FROM public.fn_get_required_attributes($1)',
        [type]
      );

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        let rowError: string | null = null;

        // Check required custom attributes only when action !== 'delete'
        if (action !== 'delete') {
          for (const reqAttr of reqAttrs) {
            const val = row[reqAttr.code] ?? row[reqAttr.name];
            if (val === undefined || val === null || val === '') {
              rowError = `Required custom attribute "${reqAttr.name || reqAttr.code}" is missing`;
              break;
            }
          }
        }

        if (!rowError) {
          if (type === 'leads') {
            const idVal = toNumberParam(row.id || row.Id || row['Lead ID'] || row['ID']);
            const titleVal = row.title || row.Title || row['Lead Title'] || row['Subject'] || row['Deal Name'];
            if (!idVal && !titleVal) {
              rowError = 'Field "title" or "id" is required';
            } else {
              const titleStr = titleVal ? String(titleVal).trim() : '';
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
          } else if (type === 'persons') {
            const idVal = toNumberParam(row.id || row.Id || row['Person ID'] || row['ID']);
            const nameVal = row.name || row.Name || row['Person Name'] || row['Full Name'];
            if (!idVal && !nameVal) {
              rowError = 'Field "name" or "id" is required';
            } else {
              const nameStr = nameVal ? String(nameVal).trim() : '';
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
          } else if (type === 'organizations') {
            const idVal = toNumberParam(row.id || row.Id || row['Organization ID'] || row['ID']);
            const nameVal = row.name || row.Name || row['Organization Name'] || row['Company Name'] || row.Company;
            if (!idVal && !nameVal) {
              rowError = 'Field "name" or "id" is required';
            } else {
              const nameStr = nameVal ? String(nameVal).trim() : '';
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
          } else if (type === 'products') {
            const idVal = toNumberParam(row.id || row.Id || row['Product ID'] || row['ID']);
            const skuVal = row.sku || row.SKU || row.code || row['Product Code'] || row['Item Code'];
            const nameVal = row.name || row.Name || row['Product Name'] || row['Item Name'];
            if (!idVal && !skuVal) {
              rowError = 'Field "sku" is required for products';
            } else {
              const skuStr = skuVal ? String(skuVal).trim() : '';
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
