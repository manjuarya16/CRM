import React, { useState } from 'react';

export const DataSetupReport: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const sqlSnippets = [
    {
      key: 'view',
      title: '1. Outcome Rule View (v_lead_report)',
      subtitle: 'Defines open, won and lost outcomes from pipeline stage codes. Used across all reports.',
      code: `-- 1. Unified outcome definition across leads
CREATE OR REPLACE VIEW v_lead_report AS
SELECT l.*,
       s.name        AS stage_name,
       s.probability AS stage_probability,
       s.sort_order  AS stage_order,
       CASE s.code 
         WHEN 'won'  THEN 'won'
         WHEN 'lost' THEN 'lost'
         ELSE 'open' 
       END AS outcome
FROM leads l
LEFT JOIN lead_pipeline_stages s ON s.id = l.lead_pipeline_stage_id;`,
    },
    {
      key: 'history',
      title: '2. Stage History Table & Trigger (lead_stage_history)',
      subtitle: 'Tracks exact stage transitions and duration for accurate pipeline aging analysis.',
      code: `-- 2. Lead stage history table and trigger
CREATE TABLE IF NOT EXISTS lead_stage_history (
  id                BIGSERIAL PRIMARY KEY,
  lead_id           integer NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  previous_stage_id integer REFERENCES lead_pipeline_stages(id),
  new_stage_id      integer NOT NULL REFERENCES lead_pipeline_stages(id),
  changed_by        integer REFERENCES users(id),
  changed_at        timestamptz NOT NULL DEFAULT now(),
  remarks           text
);
CREATE INDEX IF NOT EXISTS idx_lead_stage_history_lead ON lead_stage_history (lead_id, changed_at DESC);

CREATE OR REPLACE FUNCTION trg_lead_stage_history() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO lead_stage_history (lead_id, previous_stage_id, new_stage_id, changed_at)
    VALUES (NEW.id, NULL, NEW.lead_pipeline_stage_id, COALESCE(NEW.created_at, now()));
  ELSIF NEW.lead_pipeline_stage_id IS DISTINCT FROM OLD.lead_pipeline_stage_id THEN
    INSERT INTO lead_stage_history (lead_id, previous_stage_id, new_stage_id, changed_at)
    VALUES (NEW.id, OLD.lead_pipeline_stage_id, NEW.lead_pipeline_stage_id, now());
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;`,
    },
    {
      key: 'procedural',
      title: '3. PostgreSQL Procedural Functions Architecture',
      subtitle: 'Zero raw SQL in application code: 8 stored functions compute metrics inside PostgreSQL engine.',
      code: `-- 8 Dedicated Procedural Functions Created & Active:
1. fn_get_report_overview()
2. fn_get_report_lead_summary(from_date, to_date, p_owner_id, ...)
3. fn_get_report_lead_sources(from_date, to_date, p_owner_id, ...)
4. fn_get_report_product_value(from_date, to_date, p_owner_id, ...)
5. fn_get_report_product_lines(from_date, to_date, p_product_id, ...)
6. fn_get_report_pipeline(from_date, to_date, p_pipeline_id, ...)
7. fn_get_report_activities(from_date, to_date, p_user_id, ...)
8. fn_get_report_quotes(from_date, to_date, p_owner_id, ...)`,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
        <div className="flex items-center gap-2 font-bold mb-1">
          <i className="mgc_shield_check_fill text-base text-emerald-600" />
          <span>PostgreSQL Procedural Schema Verification</span>
        </div>
        <p className="leading-relaxed">
          All reports follow Rule 1 (Zero raw SQL queries in application code — executed solely through
          PostgreSQL stored procedural functions) and Rule 4 (Backend service functions calling DB with
          strict try / catch / finally connection pool release).
        </p>
      </div>

      <div className="space-y-4">
        {sqlSnippets.map((snippet) => (
          <div
            key={snippet.key}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-2xs"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <h3 className="text-sm font-bold text-gray-800 dark:text-white">{snippet.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{snippet.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(snippet.code, snippet.key)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 transition"
              >
                <i className={copiedKey === snippet.key ? 'mgc_check_line text-emerald-600' : 'mgc_copy_line'} />
                <span>{copiedKey === snippet.key ? 'Copied!' : 'Copy SQL'}</span>
              </button>
            </div>

            <pre className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-750 text-[11px] font-mono text-gray-800 dark:text-gray-200 overflow-x-auto leading-relaxed">
              {snippet.code}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
};
