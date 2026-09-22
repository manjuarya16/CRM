export interface IOrganization {
  id: number;
  name: string;
  address?: any;
  user_id?: number | null;
  person_count?: number;
  custom_attributes?: any;
  created_at?: string;
  updated_at?: string;
}

export interface IPerson {
  id: number;
  name: string;
  emails: any;
  contact_numbers?: any;
  organization_id?: number | null;
  job_title?: string | null;
  user_id?: number | null;
  unique_id?: string | null;
  custom_attributes?: any;
  created_at?: string;
  updated_at?: string;
}

export interface IProduct {
  id: number;
  sku: string;
  name?: string | null;
  description?: string | null;
  quantity: number;
  price?: number | null;
  custom_attributes?: any;
  created_at?: string;
  updated_at?: string;
}

export interface IQuote {
  id: number;
  subject: string;
  description?: string | null;
  billing_address?: any;
  shipping_address?: any;
  discount_percent?: number | null;
  discount_amount?: number | null;
  tax_amount?: number | null;
  adjustment_amount?: number | null;
  sub_total?: number | null;
  grand_total?: number | null;
  expired_at?: string | null;
  person_id?: number | null;
  user_id?: number | null;
  custom_attributes?: any;
  created_at?: string;
  updated_at?: string;
}

export interface IActivity {
  id: number;
  title?: string | null;
  type: string;
  comment?: string | null;
  additional?: any;
  schedule_from?: string | null;
  schedule_to?: string | null;
  is_done: boolean;
  user_id?: number | null;
  location?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface IWarehouse {
  id: number;
  name: string;
  description?: string | null;
  contact_name: string;
  contact_emails: any;
  contact_numbers: any;
  contact_address: any;
  custom_attributes?: any;
  created_at?: string;
  updated_at?: string;
}

export interface IGroup {
  id: number;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  user_count?: number;
  users?: any[];
}


export interface IPipelineStage {
  id?: number;
  code?: string | null;
  name: string;
  probability: number;
  sort_order: number;
  lead_pipeline_id?: number;
}

export interface IPipeline {
  id: number;
  name: string;
  is_default: boolean;
  rotten_days: number;
  created_at?: string;
  updated_at?: string;
  stages?: IPipelineStage[];
  leads_count?: number;
}

export interface ISource {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface IType {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}



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
  method: string;
  end_point: string;
  query_params?: any;
  headers?: any;
  payload_type?: string;
  raw_payload_type?: string;
  payload?: any;
  created_at?: string;
  updated_at?: string;
}

export interface IWorkflow {
  id: number;
  name: string;
  description?: string | null;
  entity_type: string;
  event: string;
  condition_type: string;
  conditions?: any;
  actions?: any;
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
  submit_success_action?: string;
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
  type: string;
  action: string;
  state?: string;
  summary?: any;
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
