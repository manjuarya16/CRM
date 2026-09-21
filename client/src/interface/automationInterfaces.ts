export interface IEmailTemplate {
  id: number;
  name: string;
  subject: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export interface IEvent {
  id: number;
  name: string;
  description: string;
  date: string;
  created_at?: string;
  updated_at?: string;
}

export interface ICampaign {
  id: number;
  name: string;
  subject: string;
  status: boolean;
  type: string;
  mail_to: string;
  spooling?: string | null;
  marketing_template_id?: number | null;
  marketing_event_id?: number | null;
  template_name?: string;
  event_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface IWebhook {
  id: number;
  name: string;
  entity_type: string;
  description?: string | null;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  end_point: string;
  query_params?: Array<{ key: string; value: string }>;
  headers?: Array<{ key: string; value: string }>;
  payload_type?: 'default' | 'x-www-form-urlencoded' | 'raw';
  raw_payload_type?: 'json' | 'text';
  payload?: any;
  created_at?: string;
  updated_at?: string;
}

export interface IWorkflowCondition {
  field: string;
  operator: string;
  value: string;
}

export interface IWorkflowAction {
  action_type: string;
  target?: string;
  value?: string;
}

export interface IWorkflow {
  id: number;
  name: string;
  description?: string | null;
  entity_type: string;
  event: string;
  condition_type: 'and' | 'or';
  conditions?: IWorkflowCondition[];
  actions?: IWorkflowAction[];
  created_at?: string;
  updated_at?: string;
}

export interface IWebFormAttribute {
  id?: number;
  web_form_id?: number;
  attribute_id: number;
  attribute_code?: string;
  attribute_name?: string;
  attribute_type?: string;
  name?: string | null;
  placeholder?: string | null;
  is_required: boolean;
  is_hidden: boolean;
  sort_order: number;
}

export interface IWebForm {
  id: number;
  form_id: string;
  title: string;
  description?: string | null;
  submit_button_label?: string;
  submit_success_action?: 'message' | 'redirect';
  submit_success_content?: string;
  create_lead?: boolean;
  lead_pipeline_id?: number | null;
  lead_pipeline_name?: string;
  background_color?: string;
  form_background_color?: string;
  form_title_color?: string;
  form_submit_button_color?: string;
  attribute_label_color?: string;
  attributes?: IWebFormAttribute[];
  created_at?: string;
  updated_at?: string;
}

export interface IImport {
  id: number;
  type: 'leads' | 'persons' | 'organizations' | 'products';
  action: 'append' | 'overwrite';
  state?: 'completed' | 'partial' | 'failed';
  summary?: {
    total: number;
    processed: number;
    errors: number;
    error_samples?: any[];
  };
  error_file?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface IGoogleContactAccount {
  id: number;
  user_id: number;
  google_email: string;
  access_token: string;
  refresh_token?: string | null;
  expires_in?: number;
  token_type?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IContactExportBatch {
  id: number;
  user_id: number;
  account_id?: number | null;
  google_email?: string;
  total_contacts: number;
  exported_count: number;
  status: string;
  details?: any;
  created_at?: string;
  updated_at?: string;
}

export interface IWebFormSubmission {
  id: number;
  web_form_id: number;
  form_id?: string;
  form_title?: string;
  data: Record<string, any>;
  ip_address?: string;
  created_at?: string;
}
