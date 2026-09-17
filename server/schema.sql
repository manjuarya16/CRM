-- ==========================================================
-- PostgreSQL Database Dump & Schema for pgAdmin 4
-- Converted from MariaDB / MySQL
-- ==========================================================

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist to allow clean import
DROP TABLE IF EXISTS workflows CASCADE;
DROP TABLE IF EXISTS webhooks CASCADE;
DROP TABLE IF EXISTS web_form_attributes CASCADE;
DROP TABLE IF EXISTS web_forms CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS warehouse_tags CASCADE;
DROP TABLE IF EXISTS warehouse_locations CASCADE;
DROP TABLE IF EXISTS warehouse_activities CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS user_password_resets CASCADE;
DROP TABLE IF EXISTS user_groups CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS quote_items CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS product_tags CASCADE;
DROP TABLE IF EXISTS product_inventories CASCADE;
DROP TABLE IF EXISTS product_activities CASCADE;
DROP TABLE IF EXISTS persons CASCADE;
DROP TABLE IF EXISTS personal_access_tokens CASCADE;
DROP TABLE IF EXISTS person_tags CASCADE;
DROP TABLE IF EXISTS person_activities CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS migrations CASCADE;
DROP TABLE IF EXISTS marketing_events CASCADE;
DROP TABLE IF EXISTS marketing_campaigns CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS lead_types CASCADE;
DROP TABLE IF EXISTS lead_tags CASCADE;
DROP TABLE IF EXISTS lead_stages CASCADE;
DROP TABLE IF EXISTS lead_sources CASCADE;
DROP TABLE IF EXISTS lead_quotes CASCADE;
DROP TABLE IF EXISTS lead_products CASCADE;
DROP TABLE IF EXISTS lead_pipelines CASCADE;
DROP TABLE IF EXISTS lead_pipeline_stages CASCADE;
DROP TABLE IF EXISTS lead_activities CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS job_batches CASCADE;
DROP TABLE IF EXISTS imports CASCADE;
DROP TABLE IF EXISTS import_batches CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS google_contact_accounts CASCADE;
DROP TABLE IF EXISTS failed_jobs CASCADE;
DROP TABLE IF EXISTS emails CASCADE;
DROP TABLE IF EXISTS email_templates CASCADE;
DROP TABLE IF EXISTS email_tags CASCADE;
DROP TABLE IF EXISTS email_attachments CASCADE;
DROP TABLE IF EXISTS datagrid_saved_filters CASCADE;
DROP TABLE IF EXISTS country_states CASCADE;
DROP TABLE IF EXISTS countries CASCADE;
DROP TABLE IF EXISTS core_config CASCADE;
DROP TABLE IF EXISTS contact_export_batches CASCADE;
DROP TABLE IF EXISTS contact_export_batch_items CASCADE;
DROP TABLE IF EXISTS attributes CASCADE;
DROP TABLE IF EXISTS attribute_values CASCADE;
DROP TABLE IF EXISTS attribute_options CASCADE;
DROP TABLE IF EXISTS activity_participants CASCADE;
DROP TABLE IF EXISTS activity_files CASCADE;
DROP TABLE IF EXISTS activities CASCADE;

-- ----------------------------------------------------------
-- Table: roles
-- ----------------------------------------------------------
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    permission_type VARCHAR(255) NOT NULL,
    permissions JSONB DEFAULT NULL,
    created_by INTEGER DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: users
-- ----------------------------------------------------------
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) DEFAULT NULL,
    status BOOLEAN NOT NULL DEFAULT FALSE,
    view_permission VARCHAR(255) DEFAULT 'global',
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_by INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
    remember_token VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL,
    image VARCHAR(255) DEFAULT NULL
);

-- Add foreign key from roles(created_by) to users(id)
ALTER TABLE roles ADD CONSTRAINT roles_created_by_foreign FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- ----------------------------------------------------------
-- Table: groups
-- ----------------------------------------------------------
CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: user_groups
-- ----------------------------------------------------------
CREATE TABLE user_groups (
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------
-- Table: user_password_resets
-- ----------------------------------------------------------
CREATE TABLE user_password_resets (
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NULL
);
CREATE INDEX idx_user_password_resets_email ON user_password_resets(email);

-- ----------------------------------------------------------
-- Table: countries
-- ----------------------------------------------------------
CREATE TABLE countries (
    id SERIAL PRIMARY KEY,
    code VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL
);

-- ----------------------------------------------------------
-- Table: country_states
-- ----------------------------------------------------------
CREATE TABLE country_states (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(255) NOT NULL,
    code VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE
);
CREATE INDEX idx_country_states_country_id ON country_states(country_id);

-- ----------------------------------------------------------
-- Table: organizations
-- ----------------------------------------------------------
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    address JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL,
    user_id INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_organizations_user_id ON organizations(user_id);

-- ----------------------------------------------------------
-- Table: persons
-- ----------------------------------------------------------
CREATE TABLE persons (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    emails JSONB NOT NULL,
    contact_numbers JSONB DEFAULT NULL,
    organization_id INTEGER DEFAULT NULL REFERENCES organizations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL,
    job_title VARCHAR(255) DEFAULT NULL,
    user_id INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
    unique_id VARCHAR(255) UNIQUE DEFAULT NULL
);
CREATE INDEX idx_persons_user_id ON persons(user_id);
CREATE INDEX idx_persons_organization_id ON persons(organization_id);

-- ----------------------------------------------------------
-- Table: products
-- ----------------------------------------------------------
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) DEFAULT NULL,
    description VARCHAR(255) DEFAULT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    price NUMERIC(12,4) DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: attributes
-- ----------------------------------------------------------
CREATE TABLE attributes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    lookup_type VARCHAR(255) DEFAULT NULL,
    entity_type VARCHAR(255) NOT NULL,
    sort_order INTEGER DEFAULT NULL,
    validation VARCHAR(255) DEFAULT NULL,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    is_unique BOOLEAN NOT NULL DEFAULT FALSE,
    quick_add BOOLEAN NOT NULL DEFAULT FALSE,
    is_user_defined BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT attributes_code_entity_type_unique UNIQUE (code, entity_type)
);

-- ----------------------------------------------------------
-- Table: attribute_options
-- ----------------------------------------------------------
CREATE TABLE attribute_options (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) DEFAULT NULL,
    sort_order INTEGER DEFAULT NULL,
    attribute_id INTEGER NOT NULL REFERENCES attributes(id) ON DELETE CASCADE
);
CREATE INDEX idx_attribute_options_attribute_id ON attribute_options(attribute_id);

-- ----------------------------------------------------------
-- Table: attribute_values
-- ----------------------------------------------------------
CREATE TABLE attribute_values (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(255) NOT NULL DEFAULT 'leads',
    text_value TEXT DEFAULT NULL,
    boolean_value BOOLEAN DEFAULT NULL,
    integer_value INTEGER DEFAULT NULL,
    float_value DOUBLE PRECISION DEFAULT NULL,
    datetime_value TIMESTAMPTZ DEFAULT NULL,
    date_value DATE DEFAULT NULL,
    json_value JSONB DEFAULT NULL,
    entity_id INTEGER NOT NULL,
    attribute_id INTEGER NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
    unique_id VARCHAR(255) UNIQUE DEFAULT NULL,
    CONSTRAINT entity_type_attribute_value_index_unique UNIQUE (entity_type, entity_id, attribute_id)
);
CREATE INDEX idx_attribute_values_attribute_id ON attribute_values(attribute_id);

-- ----------------------------------------------------------
-- Table: lead_sources
-- ----------------------------------------------------------
CREATE TABLE lead_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: lead_types
-- ----------------------------------------------------------
CREATE TABLE lead_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: lead_pipelines
-- ----------------------------------------------------------
CREATE TABLE lead_pipelines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    rotten_days INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: lead_pipeline_stages
-- ----------------------------------------------------------
CREATE TABLE lead_pipeline_stages (
    id SERIAL PRIMARY KEY,
    code VARCHAR(255) DEFAULT NULL,
    name VARCHAR(255) DEFAULT NULL,
    probability INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    lead_pipeline_id INTEGER NOT NULL REFERENCES lead_pipelines(id) ON DELETE CASCADE,
    CONSTRAINT lead_pipeline_stages_code_lead_pipeline_id_unique UNIQUE (code, lead_pipeline_id),
    CONSTRAINT lead_pipeline_stages_name_lead_pipeline_id_unique UNIQUE (name, lead_pipeline_id)
);
CREATE INDEX idx_lead_pipeline_stages_pipeline_id ON lead_pipeline_stages(lead_pipeline_id);

-- ----------------------------------------------------------
-- Table: lead_stages
-- ----------------------------------------------------------
CREATE TABLE lead_stages (
    id SERIAL PRIMARY KEY,
    code VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_user_defined BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: leads
-- ----------------------------------------------------------
CREATE TABLE leads (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    lead_value NUMERIC(12,4) DEFAULT NULL,
    status BOOLEAN DEFAULT NULL,
    lost_reason TEXT DEFAULT NULL,
    closed_at TIMESTAMPTZ DEFAULT NULL,
    user_id INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
    person_id INTEGER DEFAULT NULL REFERENCES persons(id),
    lead_source_id INTEGER DEFAULT NULL REFERENCES lead_sources(id),
    lead_type_id INTEGER DEFAULT NULL REFERENCES lead_types(id),
    lead_pipeline_id INTEGER DEFAULT NULL REFERENCES lead_pipelines(id) ON DELETE CASCADE,
    lead_pipeline_stage_id INTEGER DEFAULT NULL REFERENCES lead_pipeline_stages(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL,
    expected_close_date DATE DEFAULT NULL
);
CREATE INDEX idx_leads_pipeline_id ON leads(lead_pipeline_id);
CREATE INDEX idx_leads_pipeline_stage_id ON leads(lead_pipeline_stage_id);
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_person_id ON leads(person_id);
CREATE INDEX idx_leads_lead_source_id ON leads(lead_source_id);
CREATE INDEX idx_leads_lead_type_id ON leads(lead_type_id);

-- ----------------------------------------------------------
-- Table: tags
-- ----------------------------------------------------------
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(255) DEFAULT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);
CREATE INDEX idx_tags_user_id ON tags(user_id);

-- ----------------------------------------------------------
-- Table: lead_tags
-- ----------------------------------------------------------
CREATE TABLE lead_tags (
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE
);
CREATE INDEX idx_lead_tags_tag_id ON lead_tags(tag_id);
CREATE INDEX idx_lead_tags_lead_id ON lead_tags(lead_id);

-- ----------------------------------------------------------
-- Table: lead_products
-- ----------------------------------------------------------
CREATE TABLE lead_products (
    id SERIAL PRIMARY KEY,
    quantity INTEGER NOT NULL DEFAULT 0,
    price NUMERIC(12,4) DEFAULT NULL,
    amount NUMERIC(12,4) DEFAULT NULL,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);
CREATE INDEX idx_lead_products_lead_id ON lead_products(lead_id);
CREATE INDEX idx_lead_products_product_id ON lead_products(product_id);

-- ----------------------------------------------------------
-- Table: quotes
-- ----------------------------------------------------------
CREATE TABLE quotes (
    id SERIAL PRIMARY KEY,
    subject VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    billing_address JSONB DEFAULT NULL,
    shipping_address JSONB DEFAULT NULL,
    discount_percent NUMERIC(12,4) DEFAULT 0.0000,
    discount_amount NUMERIC(12,4) DEFAULT NULL,
    tax_amount NUMERIC(12,4) DEFAULT NULL,
    adjustment_amount NUMERIC(12,4) DEFAULT NULL,
    sub_total NUMERIC(12,4) DEFAULT NULL,
    grand_total NUMERIC(12,4) DEFAULT NULL,
    expired_at TIMESTAMPTZ DEFAULT NULL,
    person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);
CREATE INDEX idx_quotes_person_id ON quotes(person_id);
CREATE INDEX idx_quotes_user_id ON quotes(user_id);

-- ----------------------------------------------------------
-- Table: quote_items
-- ----------------------------------------------------------
CREATE TABLE quote_items (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(255) DEFAULT NULL,
    name VARCHAR(255) DEFAULT NULL,
    quantity INTEGER DEFAULT 0,
    price NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
    coupon_code VARCHAR(255) DEFAULT NULL,
    discount_percent NUMERIC(12,4) DEFAULT 0.0000,
    discount_amount NUMERIC(12,4) DEFAULT 0.0000,
    tax_percent NUMERIC(12,4) DEFAULT 0.0000,
    tax_amount NUMERIC(12,4) DEFAULT 0.0000,
    total NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
    product_id INTEGER NOT NULL,
    quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);
CREATE INDEX idx_quote_items_quote_id ON quote_items(quote_id);

-- ----------------------------------------------------------
-- Table: lead_quotes
-- ----------------------------------------------------------
CREATE TABLE lead_quotes (
    quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE
);
CREATE INDEX idx_lead_quotes_quote_id ON lead_quotes(quote_id);
CREATE INDEX idx_lead_quotes_lead_id ON lead_quotes(lead_id);

-- ----------------------------------------------------------
-- Table: activities
-- ----------------------------------------------------------
CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) DEFAULT NULL,
    type VARCHAR(255) NOT NULL,
    comment TEXT DEFAULT NULL,
    additional JSONB DEFAULT NULL,
    schedule_from TIMESTAMPTZ DEFAULT NULL,
    schedule_to TIMESTAMPTZ DEFAULT NULL,
    is_done BOOLEAN NOT NULL DEFAULT FALSE,
    user_id INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL,
    location VARCHAR(255) DEFAULT NULL
);
CREATE INDEX idx_activities_user_id ON activities(user_id);

-- ----------------------------------------------------------
-- Table: activity_files
-- ----------------------------------------------------------
CREATE TABLE activity_files (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    path VARCHAR(255) NOT NULL,
    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);
CREATE INDEX idx_activity_files_activity_id ON activity_files(activity_id);

-- ----------------------------------------------------------
-- Table: activity_participants
-- ----------------------------------------------------------
CREATE TABLE activity_participants (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    user_id INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE CASCADE,
    person_id INTEGER DEFAULT NULL REFERENCES persons(id) ON DELETE CASCADE
);
CREATE INDEX idx_activity_participants_activity_id ON activity_participants(activity_id);
CREATE INDEX idx_activity_participants_user_id ON activity_participants(user_id);
CREATE INDEX idx_activity_participants_person_id ON activity_participants(person_id);

-- ----------------------------------------------------------
-- Table: lead_activities
-- ----------------------------------------------------------
CREATE TABLE lead_activities (
    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE
);
CREATE INDEX idx_lead_activities_activity_id ON lead_activities(activity_id);
CREATE INDEX idx_lead_activities_lead_id ON lead_activities(lead_id);

-- ----------------------------------------------------------
-- Table: person_activities
-- ----------------------------------------------------------
CREATE TABLE person_activities (
    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE
);
CREATE INDEX idx_person_activities_activity_id ON person_activities(activity_id);
CREATE INDEX idx_person_activities_person_id ON person_activities(person_id);

-- ----------------------------------------------------------
-- Table: person_tags
-- ----------------------------------------------------------
CREATE TABLE person_tags (
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE
);
CREATE INDEX idx_person_tags_tag_id ON person_tags(tag_id);
CREATE INDEX idx_person_tags_person_id ON person_tags(person_id);

-- ----------------------------------------------------------
-- Table: product_activities
-- ----------------------------------------------------------
CREATE TABLE product_activities (
    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX idx_product_activities_activity_id ON product_activities(activity_id);
CREATE INDEX idx_product_activities_product_id ON product_activities(product_id);

-- ----------------------------------------------------------
-- Table: product_tags
-- ----------------------------------------------------------
CREATE TABLE product_tags (
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX idx_product_tags_tag_id ON product_tags(tag_id);
CREATE INDEX idx_product_tags_product_id ON product_tags(product_id);

-- ----------------------------------------------------------
-- Table: warehouses
-- ----------------------------------------------------------
CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    contact_name VARCHAR(255) NOT NULL,
    contact_emails JSONB NOT NULL,
    contact_numbers JSONB NOT NULL,
    contact_address JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: warehouse_locations
-- ----------------------------------------------------------
CREATE TABLE warehouse_locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT warehouse_locations_warehouse_id_name_unique UNIQUE (warehouse_id, name)
);

-- ----------------------------------------------------------
-- Table: product_inventories
-- ----------------------------------------------------------
CREATE TABLE product_inventories (
    id SERIAL PRIMARY KEY,
    in_stock INTEGER NOT NULL DEFAULT 0,
    allocated INTEGER NOT NULL DEFAULT 0,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id INTEGER DEFAULT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    warehouse_location_id INTEGER DEFAULT NULL REFERENCES warehouse_locations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);
CREATE INDEX idx_product_inventories_product_id ON product_inventories(product_id);
CREATE INDEX idx_product_inventories_warehouse_id ON product_inventories(warehouse_id);
CREATE INDEX idx_product_inventories_location_id ON product_inventories(warehouse_location_id);

-- ----------------------------------------------------------
-- Table: warehouse_activities
-- ----------------------------------------------------------
CREATE TABLE warehouse_activities (
    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE
);
CREATE INDEX idx_warehouse_activities_activity_id ON warehouse_activities(activity_id);
CREATE INDEX idx_warehouse_activities_warehouse_id ON warehouse_activities(warehouse_id);

-- ----------------------------------------------------------
-- Table: warehouse_tags
-- ----------------------------------------------------------
CREATE TABLE warehouse_tags (
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE
);
CREATE INDEX idx_warehouse_tags_tag_id ON warehouse_tags(tag_id);
CREATE INDEX idx_warehouse_tags_warehouse_id ON warehouse_tags(warehouse_id);

-- ----------------------------------------------------------
-- Table: email_templates
-- ----------------------------------------------------------
CREATE TABLE email_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: emails
-- ----------------------------------------------------------
CREATE TABLE emails (
    id SERIAL PRIMARY KEY,
    subject VARCHAR(255) DEFAULT NULL,
    source VARCHAR(255) NOT NULL,
    user_type VARCHAR(255) NOT NULL,
    name VARCHAR(255) DEFAULT NULL,
    reply TEXT DEFAULT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    folders JSONB DEFAULT NULL,
    "from" JSONB DEFAULT NULL,
    sender JSONB DEFAULT NULL,
    reply_to JSONB DEFAULT NULL,
    cc JSONB DEFAULT NULL,
    bcc JSONB DEFAULT NULL,
    unique_id VARCHAR(255) UNIQUE DEFAULT NULL,
    message_id VARCHAR(255) NOT NULL UNIQUE,
    reference_ids JSONB DEFAULT NULL,
    person_id INTEGER DEFAULT NULL REFERENCES persons(id) ON DELETE SET NULL,
    lead_id INTEGER DEFAULT NULL REFERENCES leads(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL,
    parent_id INTEGER DEFAULT NULL REFERENCES emails(id) ON DELETE CASCADE
);
CREATE INDEX idx_emails_person_id ON emails(person_id);
CREATE INDEX idx_emails_lead_id ON emails(lead_id);
CREATE INDEX idx_emails_parent_id ON emails(parent_id);

-- ----------------------------------------------------------
-- Table: email_attachments
-- ----------------------------------------------------------
CREATE TABLE email_attachments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) DEFAULT NULL,
    path VARCHAR(255) NOT NULL,
    size INTEGER DEFAULT NULL,
    content_type VARCHAR(255) DEFAULT NULL,
    content_id VARCHAR(255) DEFAULT NULL,
    email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);
CREATE INDEX idx_email_attachments_email_id ON email_attachments(email_id);

-- ----------------------------------------------------------
-- Table: email_tags
-- ----------------------------------------------------------
CREATE TABLE email_tags (
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE
);
CREATE INDEX idx_email_tags_tag_id ON email_tags(tag_id);
CREATE INDEX idx_email_tags_email_id ON email_tags(email_id);

-- ----------------------------------------------------------
-- Table: failed_jobs
-- ----------------------------------------------------------
CREATE TABLE failed_jobs (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(255) NOT NULL UNIQUE,
    connection TEXT NOT NULL,
    queue TEXT NOT NULL,
    payload TEXT NOT NULL,
    exception TEXT NOT NULL,
    failed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------
-- Table: google_contact_accounts
-- ----------------------------------------------------------
CREATE TABLE google_contact_accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    google_email VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT DEFAULT NULL,
    expires_at TIMESTAMPTZ DEFAULT NULL,
    scopes TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: contact_export_batches
-- ----------------------------------------------------------
CREATE TABLE contact_export_batches (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    state VARCHAR(255) NOT NULL DEFAULT 'pending',
    total_count INTEGER NOT NULL DEFAULT 0,
    exported_count INTEGER NOT NULL DEFAULT 0,
    duplicate_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    error_file_path VARCHAR(255) DEFAULT NULL,
    started_at TIMESTAMPTZ DEFAULT NULL,
    completed_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);
CREATE INDEX idx_contact_export_batches_user_id ON contact_export_batches(user_id);

-- ----------------------------------------------------------
-- Table: contact_export_batch_items
-- ----------------------------------------------------------
CREATE TABLE contact_export_batch_items (
    id BIGSERIAL PRIMARY KEY,
    batch_id BIGINT NOT NULL REFERENCES contact_export_batches(id) ON DELETE CASCADE,
    person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    status VARCHAR(255) NOT NULL DEFAULT 'pending',
    google_resource_name VARCHAR(255) DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);
CREATE INDEX idx_contact_export_batch_items_batch_id ON contact_export_batch_items(batch_id);
CREATE INDEX idx_contact_export_batch_items_person_id ON contact_export_batch_items(person_id);

-- ----------------------------------------------------------
-- Table: core_config
-- ----------------------------------------------------------
CREATE TABLE core_config (
    id SERIAL PRIMARY KEY,
    code VARCHAR(255) NOT NULL,
    value TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: datagrid_saved_filters
-- ----------------------------------------------------------
CREATE TABLE datagrid_saved_filters (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    src VARCHAR(255) NOT NULL,
    applied JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT datagrid_saved_filters_user_id_name_src_unique UNIQUE (user_id, name, src)
);

-- ----------------------------------------------------------
-- Table: imports
-- ----------------------------------------------------------
CREATE TABLE imports (
    id SERIAL PRIMARY KEY,
    state VARCHAR(255) NOT NULL DEFAULT 'pending',
    process_in_queue BOOLEAN NOT NULL DEFAULT TRUE,
    type VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    validation_strategy VARCHAR(255) NOT NULL,
    allowed_errors INTEGER NOT NULL DEFAULT 0,
    processed_rows_count INTEGER NOT NULL DEFAULT 0,
    invalid_rows_count INTEGER NOT NULL DEFAULT 0,
    errors_count INTEGER NOT NULL DEFAULT 0,
    errors JSONB DEFAULT NULL,
    field_separator VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    error_file_path VARCHAR(255) DEFAULT NULL,
    summary JSONB DEFAULT NULL,
    started_at TIMESTAMPTZ DEFAULT NULL,
    completed_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: import_batches
-- ----------------------------------------------------------
CREATE TABLE import_batches (
    id SERIAL PRIMARY KEY,
    state VARCHAR(255) NOT NULL DEFAULT 'pending',
    data JSONB NOT NULL,
    summary JSONB DEFAULT NULL,
    import_id INTEGER NOT NULL REFERENCES imports(id) ON DELETE CASCADE
);
CREATE INDEX idx_import_batches_import_id ON import_batches(import_id);

-- ----------------------------------------------------------
-- Table: job_batches
-- ----------------------------------------------------------
CREATE TABLE job_batches (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    total_jobs INTEGER NOT NULL,
    pending_jobs INTEGER NOT NULL,
    failed_jobs INTEGER NOT NULL,
    failed_job_ids TEXT NOT NULL,
    options TEXT DEFAULT NULL,
    cancelled_at INTEGER DEFAULT NULL,
    created_at INTEGER NOT NULL,
    finished_at INTEGER DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: jobs
-- ----------------------------------------------------------
CREATE TABLE jobs (
    id BIGSERIAL PRIMARY KEY,
    queue VARCHAR(255) NOT NULL,
    payload TEXT NOT NULL,
    attempts SMALLINT NOT NULL,
    reserved_at INTEGER DEFAULT NULL,
    available_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE INDEX idx_jobs_queue ON jobs(queue);

-- ----------------------------------------------------------
-- Table: marketing_events
-- ----------------------------------------------------------
CREATE TABLE marketing_events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: marketing_campaigns
-- ----------------------------------------------------------
CREATE TABLE marketing_campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    status BOOLEAN NOT NULL DEFAULT FALSE,
    type VARCHAR(255) NOT NULL,
    mail_to VARCHAR(255) NOT NULL,
    spooling VARCHAR(255) DEFAULT NULL,
    marketing_template_id INTEGER DEFAULT NULL REFERENCES email_templates(id) ON DELETE SET NULL,
    marketing_event_id INTEGER DEFAULT NULL REFERENCES marketing_events(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);
CREATE INDEX idx_marketing_campaigns_template_id ON marketing_campaigns(marketing_template_id);
CREATE INDEX idx_marketing_campaigns_event_id ON marketing_campaigns(marketing_event_id);

-- ----------------------------------------------------------
-- Table: migrations
-- ----------------------------------------------------------
CREATE TABLE migrations (
    id SERIAL PRIMARY KEY,
    migration VARCHAR(255) NOT NULL,
    batch INTEGER NOT NULL
);

-- ----------------------------------------------------------
-- Table: personal_access_tokens
-- ----------------------------------------------------------
CREATE TABLE personal_access_tokens (
    id BIGSERIAL PRIMARY KEY,
    tokenable_type VARCHAR(255) NOT NULL,
    tokenable_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    abilities TEXT DEFAULT NULL,
    last_used_at TIMESTAMPTZ DEFAULT NULL,
    expires_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);
CREATE INDEX idx_personal_access_tokens_type_id ON personal_access_tokens(tokenable_type, tokenable_id);

-- ----------------------------------------------------------
-- Table: web_forms
-- ----------------------------------------------------------
CREATE TABLE web_forms (
    id SERIAL PRIMARY KEY,
    form_id VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    submit_button_label TEXT NOT NULL,
    submit_success_action VARCHAR(255) NOT NULL,
    submit_success_content VARCHAR(255) NOT NULL,
    create_lead BOOLEAN NOT NULL DEFAULT FALSE,
    lead_pipeline_id INTEGER DEFAULT NULL REFERENCES lead_pipelines(id) ON DELETE SET NULL,
    background_color VARCHAR(255) DEFAULT NULL,
    form_background_color VARCHAR(255) DEFAULT NULL,
    form_title_color VARCHAR(255) DEFAULT NULL,
    form_submit_button_color VARCHAR(255) DEFAULT NULL,
    attribute_label_color VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);
CREATE INDEX idx_web_forms_lead_pipeline_id ON web_forms(lead_pipeline_id);

-- ----------------------------------------------------------
-- Table: web_form_attributes
-- ----------------------------------------------------------
CREATE TABLE web_form_attributes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) DEFAULT NULL,
    placeholder VARCHAR(255) DEFAULT NULL,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER DEFAULT NULL,
    attribute_id INTEGER NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
    web_form_id INTEGER NOT NULL REFERENCES web_forms(id) ON DELETE CASCADE
);
CREATE INDEX idx_web_form_attributes_attr_id ON web_form_attributes(attribute_id);
CREATE INDEX idx_web_form_attributes_form_id ON web_form_attributes(web_form_id);

-- ----------------------------------------------------------
-- Table: webhooks
-- ----------------------------------------------------------
CREATE TABLE webhooks (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    entity_type VARCHAR(255) NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    method VARCHAR(255) NOT NULL,
    end_point VARCHAR(255) NOT NULL,
    query_params JSONB DEFAULT NULL,
    headers JSONB DEFAULT NULL,
    payload_type VARCHAR(255) NOT NULL,
    raw_payload_type VARCHAR(255) NOT NULL,
    payload JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: workflows
-- ----------------------------------------------------------
CREATE TABLE workflows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    entity_type VARCHAR(255) NOT NULL,
    event VARCHAR(255) NOT NULL,
    condition_type VARCHAR(255) NOT NULL DEFAULT 'and',
    conditions JSONB DEFAULT NULL,
    actions JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);

-- ==========================================================
-- DATA INSERTS
-- ==========================================================

-- Data: roles
INSERT INTO roles (id, name, description, permission_type, permissions, created_by, created_at, updated_at) VALUES
(1, 'Administrator', 'Administrator Role', 'all', NULL, NULL, NULL, NULL),
(2, 'test', '', 'custom', '[]'::jsonb, NULL, '2026-09-17 06:49:07', '2026-09-17 06:49:07'),
(3, 'test', '', 'custom', '[]'::jsonb, NULL, '2026-09-17 07:03:25', '2026-09-17 07:03:25');

-- Data: users
INSERT INTO users (id, name, email, password, status, view_permission, role_id, created_by, remember_token, created_at, updated_at, image) VALUES
(1, 'Example Admin', 'admin@example.com', '$2y$10$sj2QlpGj5iwmjbEwjULXiez364CqDUf72TFAgpQf00COpb2l88LsW', TRUE, 'global', 1, NULL, NULL, '2026-09-16 04:49:02', '2026-09-16 04:49:02', NULL);

-- Data: core_config
INSERT INTO core_config (id, code, value, created_at, updated_at) VALUES
(1, 'installation.completed', '1', '2026-09-16 04:49:42', '2026-09-16 04:49:42');

-- Data: countries
INSERT INTO countries (id, code, name) VALUES
(1,'AF','Afghanistan'),(2,'AX','Åland Islands'),(3,'AL','Albania'),(4,'DZ','Algeria'),(5,'AS','American Samoa'),
(6,'AD','Andorra'),(7,'AO','Angola'),(8,'AI','Anguilla'),(9,'AQ','Antarctica'),(10,'AG','Antigua & Barbuda'),
(11,'AR','Argentina'),(12,'AM','Armenia'),(13,'AW','Aruba'),(14,'AC','Ascension Island'),(15,'AU','Australia'),
(16,'AT','Austria'),(17,'AZ','Azerbaijan'),(18,'BS','Bahamas'),(19,'BH','Bahrain'),(20,'BD','Bangladesh'),
(21,'BB','Barbados'),(22,'BY','Belarus'),(23,'BE','Belgium'),(24,'BZ','Belize'),(25,'BJ','Benin'),
(26,'BM','Bermuda'),(27,'BT','Bhutan'),(28,'BO','Bolivia'),(29,'BA','Bosnia & Herzegovina'),(30,'BW','Botswana'),
(31,'BR','Brazil'),(32,'IO','British Indian Ocean Territory'),(33,'VG','British Virgin Islands'),(34,'BN','Brunei'),(35,'BG','Bulgaria'),
(36,'BF','Burkina Faso'),(37,'BI','Burundi'),(38,'KH','Cambodia'),(39,'CM','Cameroon'),(40,'CA','Canada'),
(41,'IC','Canary Islands'),(42,'CV','Cape Verde'),(43,'BQ','Caribbean Netherlands'),(44,'KY','Cayman Islands'),(45,'CF','Central African Republic'),
(46,'EA','Ceuta & Melilla'),(47,'TD','Chad'),(48,'CL','Chile'),(49,'CN','China'),(50,'CX','Christmas Island'),
(51,'CC','Cocos (Keeling) Islands'),(52,'CO','Colombia'),(53,'KM','Comoros'),(54,'CG','Congo - Brazzaville'),(55,'CD','Congo - Kinshasa'),
(56,'CK','Cook Islands'),(57,'CR','Costa Rica'),(58,'CI','Côte d’Ivoire'),(59,'HR','Croatia'),(60,'CU','Cuba'),
(61,'CW','Curaçao'),(62,'CY','Cyprus'),(63,'CZ','Czechia'),(64,'DK','Denmark'),(65,'DG','Diego Garcia'),
(66,'DJ','Djibouti'),(67,'DM','Dominica'),(68,'DO','Dominican Republic'),(69,'EC','Ecuador'),(70,'EG','Egypt'),
(71,'SV','El Salvador'),(72,'GQ','Equatorial Guinea'),(73,'ER','Eritrea'),(74,'EE','Estonia'),(75,'ET','Ethiopia'),
(76,'EZ','Eurozone'),(77,'FK','Falkland Islands'),(78,'FO','Faroe Islands'),(79,'FJ','Fiji'),(80,'FI','Finland'),
(81,'FR','France'),(82,'GF','French Guiana'),(83,'PF','French Polynesia'),(84,'TF','French Southern Territories'),(85,'GA','Gabon'),
(86,'GM','Gambia'),(87,'GE','Georgia'),(88,'DE','Germany'),(89,'GH','Ghana'),(90,'GI','Gibraltar'),
(91,'GR','Greece'),(92,'GL','Greenland'),(93,'GD','Grenada'),(94,'GP','Guadeloupe'),(95,'GU','Guam'),
(96,'GT','Guatemala'),(97,'GG','Guernsey'),(98,'GN','Guinea'),(99,'GW','Guinea-Bissau'),(100,'GY','Guyana'),
(101,'HT','Haiti'),(102,'HN','Honduras'),(103,'HK','Hong Kong SAR China'),(104,'HU','Hungary'),(105,'IS','Iceland'),
(106,'IN','India'),(107,'ID','Indonesia'),(108,'IR','Iran'),(109,'IQ','Iraq'),(110,'IE','Ireland'),
(111,'IM','Isle of Man'),(112,'IL','Israel'),(113,'IT','Italy'),(114,'JM','Jamaica'),(115,'JP','Japan'),
(116,'JE','Jersey'),(117,'JO','Jordan'),(118,'KZ','Kazakhstan'),(119,'KE','Kenya'),(120,'KI','Kiribati'),
(121,'XK','Kosovo'),(122,'KW','Kuwait'),(123,'KG','Kyrgyzstan'),(124,'LA','Laos'),(125,'LV','Latvia'),
(126,'LB','Lebanon'),(127,'LS','Lesotho'),(128,'LR','Liberia'),(129,'LY','Libya'),(130,'LI','Liechtenstein'),
(131,'LT','Lithuania'),(132,'LU','Luxembourg'),(133,'MO','Macau SAR China'),(134,'MK','Macedonia'),(135,'MG','Madagascar'),
(136,'MW','Malawi'),(137,'MY','Malaysia'),(138,'MV','Maldives'),(139,'ML','Mali'),(140,'MT','Malta'),
(141,'MH','Marshall Islands'),(142,'MQ','Martinique'),(143,'MR','Mauritania'),(144,'MU','Mauritius'),(145,'YT','Mayotte'),
(146,'MX','Mexico'),(147,'FM','Micronesia'),(148,'MD','Moldova'),(149,'MC','Monaco'),(150,'MN','Mongolia'),
(151,'ME','Montenegro'),(152,'MS','Montserrat'),(153,'MA','Morocco'),(154,'MZ','Mozambique'),(155,'MM','Myanmar (Burma)'),
(156,'NA','Namibia'),(157,'NR','Nauru'),(158,'NP','Nepal'),(159,'NL','Netherlands'),(160,'NC','New Caledonia'),
(161,'NZ','New Zealand'),(162,'NI','Nicaragua'),(163,'NE','Niger'),(164,'NG','Nigeria'),(165,'NU','Niue'),
(166,'NF','Norfolk Island'),(167,'KP','North Korea'),(168,'MP','Northern Mariana Islands'),(169,'NO','Norway'),(170,'OM','Oman'),
(171,'PK','Pakistan'),(172,'PW','Palau'),(173,'PS','Palestinian Territories'),(174,'PA','Panama'),(175,'PG','Papua New Guinea'),
(176,'PY','Paraguay'),(177,'PE','Peru'),(178,'PH','Philippines'),(179,'PN','Pitcairn Islands'),(180,'PL','Poland'),
(181,'PT','Portugal'),(182,'PR','Puerto Rico'),(183,'QA','Qatar'),(184,'RE','Réunion'),(185,'RO','Romania'),
(186,'RU','Russia'),(187,'RW','Rwanda'),(188,'WS','Samoa'),(189,'SM','San Marino'),(190,'ST','São Tomé & Príncipe'),
(191,'SA','Saudi Arabia'),(192,'SN','Senegal'),(193,'RS','Serbia'),(194,'SC','Seychelles'),(195,'SL','Sierra Leone'),
(196,'SG','Singapore'),(197,'SX','Sint Maarten'),(198,'SK','Slovakia'),(199,'SI','Slovenia'),(200,'SB','Solomon Islands'),
(201,'SO','Somalia'),(202,'ZA','South Africa'),(203,'GS','South Georgia & South Sandwich Islands'),(204,'KR','South Korea'),(205,'SS','South Sudan'),
(206,'ES','Spain'),(207,'LK','Sri Lanka'),(208,'BL','St. Barthélemy'),(209,'SH','St. Helena'),(210,'KN','St. Kitts & Nevis'),
(211,'LC','St. Lucia'),(212,'MF','St. Martin'),(213,'PM','St. Pierre & Miquelon'),(214,'VC','St. Vincent & Grenadines'),(215,'SD','Sudan'),
(216,'SR','Suriname'),(217,'SJ','Svalbard & Jan Mayen'),(218,'SZ','Swaziland'),(219,'SE','Sweden'),(220,'CH','Switzerland'),
(221,'SY','Syria'),(222,'TW','Taiwan'),(223,'TJ','Tajikistan'),(224,'TZ','Tanzania'),(225,'TH','Thailand'),
(226,'TL','Timor-Leste'),(227,'TG','Togo'),(228,'TK','Tokelau'),(229,'TO','Tonga'),(230,'TT','Trinidad & Tobago'),
(231,'TA','Tristan da Cunha'),(232,'TN','Tunisia'),(233,'TR','Turkey'),(234,'TM','Turkmenistan'),(235,'TC','Turks & Caicos Islands'),
(236,'TV','Tuvalu'),(237,'UM','U.S. Outlying Islands'),(238,'VI','U.S. Virgin Islands'),(239,'UG','Uganda'),(240,'UA','Ukraine'),
(241,'AE','United Arab Emirates'),(242,'GB','United Kingdom'),(243,'UN','United Nations'),(244,'US','United States'),(245,'UY','Uruguay'),
(246,'UZ','Uzbekistan'),(247,'VU','Vanuatu'),(248,'VA','Vatican City'),(249,'VE','Venezuela'),(250,'VN','Vietnam'),
(251,'WF','Wallis & Futuna'),(252,'EH','Western Sahara'),(253,'YE','Yemen'),(254,'ZM','Zambia'),(255,'ZW','Zimbabwe');

-- Data: country_states
INSERT INTO country_states (id, country_code, code, name, country_id) VALUES
(1,'US','AL','Alabama',244),(2,'US','AK','Alaska',244),(3,'US','AS','American Samoa',244),(4,'US','AZ','Arizona',244),(5,'US','AR','Arkansas',244),
(6,'US','AE','Armed Forces Africa',244),(7,'US','AA','Armed Forces Americas',244),(8,'US','AE','Armed Forces Canada',244),(9,'US','AE','Armed Forces Europe',244),(10,'US','AE','Armed Forces Middle East',244),
(11,'US','AP','Armed Forces Pacific',244),(12,'US','CA','California',244),(13,'US','CO','Colorado',244),(14,'US','CT','Connecticut',244),(15,'US','DE','Delaware',244),
(16,'US','DC','District of Columbia',244),(17,'US','FM','Federated States Of Micronesia',244),(18,'US','FL','Florida',244),(19,'US','GA','Georgia',244),(20,'US','GU','Guam',244),
(21,'US','HI','Hawaii',244),(22,'US','ID','Idaho',244),(23,'US','IL','Illinois',244),(24,'US','IN','Indiana',244),(25,'US','IA','Iowa',244),
(26,'US','KS','Kansas',244),(27,'US','KY','Kentucky',244),(28,'US','LA','Louisiana',244),(29,'US','ME','Maine',244),(30,'US','MH','Marshall Islands',244),
(31,'US','MD','Maryland',244),(32,'US','MA','Massachusetts',244),(33,'US','MI','Michigan',244),(34,'US','MN','Minnesota',244),(35,'US','MS','Mississippi',244),
(36,'US','MO','Missouri',244),(37,'US','MT','Montana',244),(38,'US','NE','Nebraska',244),(39,'US','NV','Nevada',244),(40,'US','NH','New Hampshire',244),
(41,'US','NJ','New Jersey',244),(42,'US','NM','New Mexico',244),(43,'US','NY','New York',244),(44,'US','NC','North Carolina',244),(45,'US','ND','North Dakota',244),
(46,'US','MP','Northern Mariana Islands',244),(47,'US','OH','Ohio',244),(48,'US','OK','Oklahoma',244),(49,'US','OR','Oregon',244),(50,'US','PW','Palau',244),
(51,'US','PA','Pennsylvania',244),(52,'US','PR','Puerto Rico',244),(53,'US','RI','Rhode Island',244),(54,'US','SC','South Carolina',244),(55,'US','SD','South Dakota',244),
(56,'US','TN','Tennessee',244),(57,'US','TX','Texas',244),(58,'US','UT','Utah',244),(59,'US','VT','Vermont',244),(60,'US','VI','Virgin Islands',244),
(61,'US','VA','Virginia',244),(62,'US','WA','Washington',244),(63,'US','WV','West Virginia',244),(64,'US','WI','Wisconsin',244),(65,'US','WY','Wyoming',244),
(66,'CA','AB','Alberta',40),(67,'CA','BC','British Columbia',40),(68,'CA','MB','Manitoba',40),(69,'CA','NL','Newfoundland and Labrador',40),(70,'CA','NB','New Brunswick',40),
(71,'CA','NS','Nova Scotia',40),(72,'CA','NT','Northwest Territories',40),(73,'CA','NU','Nunavut',40),(74,'CA','ON','Ontario',40),(75,'CA','PE','Prince Edward Island',40),
(76,'CA','QC','Quebec',40),(77,'CA','SK','Saskatchewan',40),(78,'CA','YT','Yukon Territory',40),(79,'DE','NDS','Niedersachsen',88),(80,'DE','BAW','Baden-Württemberg',88),
(81,'DE','BAY','Bayern',88),(82,'DE','BER','Berlin',88),(83,'DE','BRG','Brandenburg',88),(84,'DE','BRE','Bremen',88),(85,'DE','HAM','Hamburg',88),
(86,'DE','HES','Hessen',88),(87,'DE','MEC','Mecklenburg-Vorpommern',88),(88,'DE','NRW','Nordrhein-Westfalen',88),(89,'DE','RHE','Rheinland-Pfalz',88),(90,'DE','SAR','Saarland',88),
(91,'DE','SAS','Sachsen',88),(92,'DE','SAC','Sachsen-Anhalt',88),(93,'DE','SCN','Schleswig-Holstein',88),(94,'DE','THE','Thüringen',88),(95,'AT','WI','Wien',16),
(96,'AT','NO','Niederösterreich',16),(97,'AT','OO','Oberösterreich',16),(98,'AT','SB','Salzburg',16),(99,'AT','KN','Kärnten',16),(100,'AT','ST','Steiermark',16),
(101,'AT','TI','Tirol',16),(102,'AT','BL','Burgenland',16),(103,'AT','VB','Vorarlberg',16),(104,'CH','AG','Aargau',220),(105,'CH','AI','Appenzell Innerrhoden',220),
(106,'CH','AR','Appenzell Ausserrhoden',220),(107,'CH','BE','Bern',220),(108,'CH','BL','Basel-Landschaft',220),(109,'CH','BS','Basel-Stadt',220),(110,'CH','FR','Freiburg',220),
(111,'CH','GE','Genf',220),(112,'CH','GL','Glarus',220),(113,'CH','GR','Graubünden',220),(114,'CH','JU','Jura',220),(115,'CH','LU','Luzern',220),
(116,'CH','NE','Neuenburg',220),(117,'CH','NW','Nidwalden',220),(118,'CH','OW','Obwalden',220),(119,'CH','SG','St. Gallen',220),(120,'CH','SH','Schaffhausen',220),
(121,'CH','SO','Solothurn',220),(122,'CH','SZ','Schwyz',220),(123,'CH','TG','Thurgau',220),(124,'CH','TI','Tessin',220),(125,'CH','UR','Uri',220),
(126,'CH','VD','Waadt',220),(127,'CH','VS','Wallis',220),(128,'CH','ZG','Zug',220),(129,'CH','ZH','Zürich',220),(130,'ES','A Coruсa','A Coruña',206),
(131,'ES','Alava','Alava',206),(132,'ES','Albacete','Albacete',206),(133,'ES','Alicante','Alicante',206),(134,'ES','Almeria','Almeria',206),(135,'ES','Asturias','Asturias',206),
(136,'ES','Avila','Avila',206),(137,'ES','Badajoz','Badajoz',206),(138,'ES','Baleares','Baleares',206),(139,'ES','Barcelona','Barcelona',206),(140,'ES','Burgos','Burgos',206),
(141,'ES','Caceres','Caceres',206),(142,'ES','Cadiz','Cadiz',206),(143,'ES','Cantabria','Cantabria',206),(144,'ES','Castellon','Castellon',206),(145,'ES','Ceuta','Ceuta',206),
(146,'ES','Ciudad Real','Ciudad Real',206),(147,'ES','Cordoba','Cordoba',206),(148,'ES','Cuenca','Cuenca',206),(149,'ES','Girona','Girona',206),(150,'ES','Granada','Granada',206),
(151,'ES','Guadalajara','Guadalajara',206),(152,'ES','Guipuzcoa','Guipuzcoa',206),(153,'ES','Huelva','Huelva',206),(154,'ES','Huesca','Huesca',206),(155,'ES','Jaen','Jaen',206),
(156,'ES','La Rioja','La Rioja',206),(157,'ES','Las Palmas','Las Palmas',206),(158,'ES','Leon','Leon',206),(159,'ES','Lleida','Lleida',206),(160,'ES','Lugo','Lugo',206),
(161,'ES','Madrid','Madrid',206),(162,'ES','Malaga','Malaga',206),(163,'ES','Melilla','Melilla',206),(164,'ES','Murcia','Murcia',206),(165,'ES','Navarra','Navarra',206),
(166,'ES','Ourense','Ourense',206),(167,'ES','Palencia','Palencia',206),(168,'ES','Pontevedra','Pontevedra',206),(169,'ES','Salamanca','Salamanca',206),(170,'ES','Santa Cruz de Tenerife','Santa Cruz de Tenerife',206),
(171,'ES','Segovia','Segovia',206),(172,'ES','Sevilla','Sevilla',206),(173,'ES','Soria','Soria',206),(174,'ES','Tarragona','Tarragona',206),(175,'ES','Teruel','Teruel',206),
(176,'ES','Toledo','Toledo',206),(177,'ES','Valencia','Valencia',206),(178,'ES','Valladolid','Valladolid',206),(179,'ES','Vizcaya','Vizcaya',206),(180,'ES','Zamora','Zamora',206),
(181,'ES','Zaragoza','Zaragoza',206),(182,'FR','1','Ain',81),(183,'FR','2','Aisne',81),(184,'FR','3','Allier',81),(185,'FR','4','Alpes-de-Haute-Provence',81),
(186,'FR','5','Hautes-Alpes',81),(187,'FR','6','Alpes-Maritimes',81),(188,'FR','7','Ardèche',81),(189,'FR','8','Ardennes',81),(190,'FR','9','Ariège',81),
(191,'FR','10','Aube',81),(192,'FR','11','Aude',81),(193,'FR','12','Aveyron',81),(194,'FR','13','Bouches-du-Rhône',81),(195,'FR','14','Calvados',81),
(196,'FR','15','Cantal',81),(197,'FR','16','Charente',81),(198,'FR','17','Charente-Maritime',81),(199,'FR','18','Cher',81),(200,'FR','19','Corrèze',81),
(201,'FR','2A','Corse-du-Sud',81),(202,'FR','2B','Haute-Corse',81),(203,'FR','21','Côte-d''Or',81),(204,'FR','22','Côtes-d''Armor',81),(205,'FR','23','Creuse',81),
(206,'FR','24','Dordogne',81),(207,'FR','25','Doubs',81),(208,'FR','26','Drôme',81),(209,'FR','27','Eure',81),(210,'FR','28','Eure-et-Loir',81),
(211,'FR','29','Finistère',81),(212,'FR','30','Gard',81),(213,'FR','31','Haute-Garonne',81),(214,'FR','32','Gers',81),(215,'FR','33','Gironde',81),
(216,'FR','34','Hérault',81),(217,'FR','35','Ille-et-Vilaine',81),(218,'FR','36','Indre',81),(219,'FR','37','Indre-et-Loire',81),(220,'FR','38','Isère',81),
(221,'FR','39','Jura',81),(222,'FR','40','Landes',81),(223,'FR','41','Loir-et-Cher',81),(224,'FR','42','Loire',81),(225,'FR','43','Haute-Loire',81),
(226,'FR','44','Loire-Atlantique',81),(227,'FR','45','Loiret',81),(228,'FR','46','Lot',81),(229,'FR','47','Lot-et-Garonne',81),(230,'FR','48','Lozère',81),
(231,'FR','49','Maine-et-Loire',81),(232,'FR','50','Manche',81),(233,'FR','51','Marne',81),(234,'FR','52','Haute-Marne',81),(235,'FR','53','Mayenne',81),
(236,'FR','54','Meurthe-et-Moselle',81),(237,'FR','55','Meuse',81),(238,'FR','56','Morbihan',81),(239,'FR','57','Moselle',81),(240,'FR','58','Nièvre',81),
(241,'FR','59','Nord',81),(242,'FR','60','Oise',81),(243,'FR','61','Orne',81),(244,'FR','62','Pas-de-Calais',81),(245,'FR','63','Puy-de-Dôme',81),
(246,'FR','64','Pyrénées-Atlantiques',81),(247,'FR','65','Hautes-Pyrénées',81),(248,'FR','66','Pyrénées-Orientales',81),(249,'FR','67','Bas-Rhin',81),(250,'FR','68','Haut-Rhin',81),
(251,'FR','69','Rhône',81),(252,'FR','70','Haute-Saône',81),(253,'FR','71','Saône-et-Loire',81),(254,'FR','72','Sarthe',81),(255,'FR','73','Savoie',81),
(256,'FR','74','Haute-Savoie',81),(257,'FR','75','Paris',81),(258,'FR','76','Seine-Maritime',81),(259,'FR','77','Seine-et-Marne',81),(260,'FR','78','Yvelines',81),
(261,'FR','79','Deux-Sèvres',81),(262,'FR','80','Somme',81),(263,'FR','81','Tarn',81),(264,'FR','82','Tarn-et-Garonne',81),(265,'FR','83','Var',81),
(266,'FR','84','Vaucluse',81),(267,'FR','85','Vendée',81),(268,'FR','86','Vienne',81),(269,'FR','87','Haute-Vienne',81),(270,'FR','88','Vosges',81),
(271,'FR','89','Yonne',81),(272,'FR','90','Territoire-de-Belfort',81),(273,'FR','91','Essonne',81),(274,'FR','92','Hauts-de-Seine',81),(275,'FR','93','Seine-Saint-Denis',81),
(276,'FR','94','Val-de-Marne',81),(277,'FR','95','Val-d''Oise',81),(278,'RO','AB','Alba',185),(279,'RO','AR','Arad',185),(280,'RO','AG','Argeş',185),
(281,'RO','BC','Bacău',185),(282,'RO','BH','Bihor',185),(283,'RO','BN','Bistriţa-Năsăud',185),(284,'RO','BT','Botoşani',185),(285,'RO','BV','Braşov',185),
(286,'RO','BR','Brăila',185),(287,'RO','B','Bucureşti',185),(288,'RO','BZ','Buzău',185),(289,'RO','CS','Caraş-Severin',185),(290,'RO','CL','Călăraşi',185),
(291,'RO','CJ','Cluj',185),(292,'RO','CT','Constanţa',185),(293,'RO','CV','Covasna',185),(294,'RO','DB','Dâmboviţa',185),(295,'RO','DJ','Dolj',185),
(296,'RO','GL','Galaţi',185),(297,'RO','GR','Giurgiu',185),(298,'RO','GJ','Gorj',185),(299,'RO','HR','Harghita',185),(300,'RO','HD','Hunedoara',185),
(301,'RO','IL','Ialomiţa',185),(302,'RO','IS','Iaşi',185),(303,'RO','IF','Ilfov',185),(304,'RO','MM','Maramureş',185),(305,'RO','MH','Mehedinţi',185),
(306,'RO','MS','Mureş',185),(307,'RO','NT','Neamţ',185),(308,'RO','OT','Olt',185),(309,'RO','PH','Prahova',185),(310,'RO','SM','Satu-Mare',185),
(311,'RO','SJ','Sălaj',185),(312,'RO','SB','Sibiu',185),(313,'RO','SV','Suceava',185),(314,'RO','TR','Teleorman',185),(315,'RO','TM','Timiş',185),
(316,'RO','TL','Tulcea',185),(317,'RO','VS','Vaslui',185),(318,'RO','VL','Vâlcea',185),(319,'RO','VN','Vrancea',185),(320,'FI','Lappi','Lappi',80),
(321,'FI','Pohjois-Pohjanmaa','Pohjois-Pohjanmaa',80),(322,'FI','Kainuu','Kainuu',80),(323,'FI','Pohjois-Karjala','Pohjois-Karjala',80),(324,'FI','Pohjois-Savo','Pohjois-Savo',80),(325,'FI','Etelä-Savo','Etelä-Savo',80),
(326,'FI','Etelä-Pohjanmaa','Etelä-Pohjanmaa',80),(327,'FI','Pohjanmaa','Pohjanmaa',80),(328,'FI','Pirkanmaa','Pirkanmaa',80),(329,'FI','Satakunta','Satakunta',80),(330,'FI','Keski-Pohjanmaa','Keski-Pohjanmaa',80),
(331,'FI','Keski-Suomi','Keski-Suomi',80),(332,'FI','Varsinais-Suomi','Varsinais-Suomi',80),(333,'FI','Etelä-Karjala','Etelä-Karjala',80),(334,'FI','Päijät-Häme','Päijät-Häme',80),(335,'FI','Kanta-Häme','Kanta-Häme',80),
(336,'FI','Uusimaa','Uusimaa',80),(337,'FI','Itä-Uusimaa','Itä-Uusimaa',80),(338,'FI','Kymenlaakso','Kymenlaakso',80),(339,'FI','Ahvenanmaa','Ahvenanmaa',80),(340,'EE','EE-37','Harjumaa',74),
(341,'EE','EE-39','Hiiumaa',74),(342,'EE','EE-44','Ida-Virumaa',74),(343,'EE','EE-49','Jõgevamaa',74),(344,'EE','EE-51','Järvamaa',74),(345,'EE','EE-57','Läänemaa',74),
(346,'EE','EE-59','Lääne-Virumaa',74),(347,'EE','EE-65','Põlvamaa',74),(348,'EE','EE-67','Pärnumaa',74),(349,'EE','EE-70','Raplamaa',74),(350,'EE','EE-74','Saaremaa',74),
(351,'EE','EE-78','Tartumaa',74),(352,'EE','EE-82','Valgamaa',74),(353,'EE','EE-84','Viljandimaa',74),(354,'EE','EE-86','Võrumaa',74),(355,'LV','LV-DGV','Daugavpils',125),
(356,'LV','LV-JEL','Jelgava',125),(357,'LV','Jēkabpils','Jēkabpils',125),(358,'LV','LV-JUR','Jūrmala',125),(359,'LV','LV-LPX','Liepāja',125),(360,'LV','LV-LE','Liepājas novads',125),
(361,'LV','LV-REZ','Rēzekne',125),(362,'LV','LV-RIX','Rīga',125),(363,'LV','LV-RI','Rīgas novads',125),(364,'LV','Valmiera','Valmiera',125),(365,'LV','LV-VEN','Ventspils',125),
(366,'LV','Aglonas novads','Aglonas novads',125),(367,'LV','LV-AI','Aizkraukles novads',125),(368,'LV','Aizputes novads','Aizputes novads',125),(369,'LV','Aknīstes novads','Aknīstes novads',125),(370,'LV','Alojas novads','Alojas novads',125),
(371,'LV','Alsungas novads','Alsungas novads',125),(372,'LV','LV-AL','Alūksnes novads',125),(373,'LV','Amatas novads','Amatas novads',125),(374,'LV','Apes novads','Apes novads',125),(375,'LV','Auces novads','Auces novads',125),
(376,'LV','Babītes novads','Babītes novads',125),(377,'LV','Baldones novads','Baldones novads',125),(378,'LV','Baltinavas novads','Baltinavas novads',125),(379,'LV','LV-BL','Balvu novads',125),(380,'LV','LV-BU','Bauskas novads',125),
(381,'LV','Beverīnas novads','Beverīnas novads',125),(382,'LV','Brocēnu novads','Brocēnu novads',125),(383,'LV','Burtnieku novads','Burtnieku novads',125),(384,'LV','Carnikavas novads','Carnikavas novads',125),(385,'LV','Cesvaines novads','Cesvaines novads',125),
(386,'LV','Ciblas novads','Ciblas novads',125),(387,'LV','LV-CE','Cēsu novads',125),(388,'LV','Dagdas novads','Dagdas novads',125),(389,'LV','LV-DA','Daugavpils novads',125),(390,'LV','LV-DO','Dobeles novads',125),
(391,'LV','Dundagas novads','Dundagas novads',125),(392,'LV','Durbes novads','Durbes novads',125),(393,'LV','Engures novads','Engures novads',125),(394,'LV','Garkalnes novads','Garkalnes novads',125),(395,'LV','Grobiņas novads','Grobiņas novads',125),
(396,'LV','LV-GU','Gulbenes novads',125),(397,'LV','Iecavas novads','Iecavas novads',125),(398,'LV','Ikšķiles novads','Ikšķiles novads',125),(399,'LV','Ilūkstes novads','Ilūkstes novads',125),(400,'LV','Inčukalna novads','Inčukalna novads',125),
(401,'LV','Jaunjelgavas novads','Jaunjelgavas novads',125),(402,'LV','Jaunpiebalgas novads','Jaunpiebalgas novads',125),(403,'LV','Jaunpils novads','Jaunpils novads',125),(404,'LV','LV-JL','Jelgavas novads',125),(405,'LV','LV-JK','Jēkabpils novads',125),
(406,'LV','Kandavas novads','Kandavas novads',125),(407,'LV','Kokneses novads','Kokneses novads',125),(408,'LV','Krimuldas novads','Krimuldas novads',125),(409,'LV','Krustpils novads','Krustpils novads',125),(410,'LV','LV-KR','Krāslavas novads',125),
(411,'LV','LV-KU','Kuldīgas novads',125),(412,'LV','Kārsavas novads','Kārsavas novads',125),(413,'LV','Lielvārdes novads','Lielvārdes novads',125),(414,'LV','LV-LM','Limbažu novads',125),(415,'LV','Lubānas novads','Lubānas novads',125),
(416,'LV','LV-LU','Ludzas novads',125),(417,'LV','Līgatnes novads','Līgatnes novads',125),(418,'LV','Līvānu novads','Līvānu novads',125),(419,'LV','LV-MA','Madonas novads',125),(420,'LV','Mazsalacas novads','Mazsalacas novads',125),
(421,'LV','Mālpils novads','Mālpils novads',125),(422,'LV','Mārupes novads','Mārupes novads',125),(423,'LV','Naukšēnu novads','Naukšēnu novads',125),(424,'LV','Neretas novads','Neretas novads',125),(425,'LV','Nīcas novads','Nīcas novads',125),
(426,'LV','LV-OG','Ogres novads',125),(427,'LV','Olaines novads','Olaines novads',125),(428,'LV','Ozolnieku novads','Ozolnieku novads',125),(429,'LV','LV-PR','Preiļu novads',125),(430,'LV','Priekules novads','Priekules novads',125),
(431,'LV','Priekuļu novads','Priekuļu novads',125),(432,'LV','Pārgaujas novads','Pārgaujas novads',125),(433,'LV','Pāvilostas novads','Pāvilostas novads',125),(434,'LV','Pļaviņu novads','Pļaviņu novads',125),(435,'LV','Raunas novads','Raunas novads',125),
(436,'LV','Riebiņu novads','Riebiņu novads',125),(437,'LV','Rojas novads','Rojas novads',125),(438,'LV','Ropažu novads','Ropažu novads',125),(439,'LV','Rucavas novads','Rucavas novads',125),(440,'LV','Rugāju novads','Rugāju novads',125),
(441,'LV','Rundāles novads','Rundāles novads',125),(442,'LV','LV-RE','Rēzeknes novads',125),(443,'LV','Rūjienas novads','Rūjienas novads',125),(444,'LV','Salacgrīvas novads','Salacgrīvas novads',125),(445,'LV','Salas novads','Salas novads',125),
(446,'LV','Salaspils novads','Salaspils novads',125),(447,'LV','LV-SA','Saldus novads',125),(448,'LV','Saulkrastu novads','Saulkrastu novads',125),(449,'LV','Siguldas novads','Siguldas novads',125),(450,'LV','Skrundas novads','Skrundas novads',125),
(451,'LV','Skrīveru novads','Skrīveru novads',125),(452,'LV','Smiltenes novads','Smiltenes novads',125),(453,'LV','Stopiņu novads','Stopiņu novads',125),(454,'LV','Strenču novads','Strenču novads',125),(455,'LV','Sējas novads','Sējas novads',125),
(456,'LV','LV-TA','Talsu novads',125),(457,'LV','LV-TU','Tukuma novads',125),(458,'LV','Tērvetes novads','Tērvetes novads',125),(459,'LV','Vaiņodes novads','Vaiņodes novads',125),(460,'LV','LV-VK','Valkas novads',125),
(461,'LV','LV-VM','Valmieras novads',125),(462,'LV','Varakļānu novads','Varakļānu novads',125),(463,'LV','Vecpiebalgas novads','Vecpiebalgas novads',125),(464,'LV','Vecumnieku novads','Vecumnieku novads',125),(465,'LV','LV-VE','Ventspils novads',125),
(466,'LV','Viesītes novads','Viesītes novads',125),(467,'LV','Viļakas novads','Viļakas novads',125),(468,'LV','Viļānu novads','Viļānu novads',125),(469,'LV','Vārkavas novads','Vārkavas novads',125),(470,'LV','Zilupes novads','Zilupes novads',125),
(471,'LV','Ādažu novads','Ādažu novads',125),(472,'LV','Ērgļu novads','Ērgļu novads',125),(473,'LV','Ķeguma novads','Ķeguma novads',125),(474,'LV','Ķekavas novads','Ķekavas novads',125),(475,'LT','LT-AL','Alytaus Apskritis',131),
(476,'LT','LT-KU','Kauno Apskritis',131),(477,'LT','LT-KL','Klaipėdos Apskritis',131),(478,'LT','LT-MR','Marijampolės Apskritis',131),(479,'LT','LT-PN','Panevėžio Apskritis',131),(480,'LT','LT-SA','Šiaulių Apskritis',131),
(481,'LT','LT-TA','Tauragės Apskritis',131),(482,'LT','LT-TE','Telšių Apskritis',131),(483,'LT','LT-UT','Utenos Apskritis',131),(484,'LT','LT-VL','Vilniaus Apskritis',131),(485,'BR','AC','Acre',31),
(486,'BR','AL','Alagoas',31),(487,'BR','AP','Amapá',31),(488,'BR','AM','Amazonas',31),(489,'BR','BA','Bahia',31),(490,'BR','CE','Ceará',31),
(491,'BR','ES','Espírito Santo',31),(492,'BR','GO','Goiás',31),(493,'BR','MA','Maranhão',31),(494,'BR','MT','Mato Grosso',31),(495,'BR','MS','Mato Grosso do Sul',31),
(496,'BR','MG','Minas Gerais',31),(497,'BR','PA','Pará',31),(498,'BR','PB','Paraíba',31),(499,'BR','PR','Paraná',31),(500,'BR','PE','Pernambuco',31),
(501,'BR','PI','Piauí',31),(502,'BR','RJ','Rio de Janeiro',31),(503,'BR','RN','Rio Grande do Norte',31),(504,'BR','RS','Rio Grande do Sul',31),(505,'BR','RO','Rondônia',31),
(506,'BR','RR','Roraima',31),(507,'BR','SC','Santa Catarina',31),(508,'BR','SP','São Paulo',31),(509,'BR','SE','Sergipe',31),(510,'BR','TO','Tocantins',31),
(511,'BR','DF','Distrito Federal',31),(512,'HR','HR-01','Zagrebačka županija',59),(513,'HR','HR-02','Krapinsko-zagorska županija',59),(514,'HR','HR-03','Sisačko-moslavačka županija',59),(515,'HR','HR-04','Karlovačka županija',59),
(516,'HR','HR-05','Varaždinska županija',59),(517,'HR','HR-06','Koprivničko-križevačka županija',59),(518,'HR','HR-07','Bjelovarsko-bilogorska županija',59),(519,'HR','HR-08','Primorsko-goranska županija',59),(520,'HR','HR-09','Ličko-senjska županija',59),
(521,'HR','HR-10','Virovitičko-podravska županija',59),(522,'HR','HR-11','Požeško-slavonska županija',59),(523,'HR','HR-12','Brodsko-posavska županija',59),(524,'HR','HR-13','Zadarska županija',59),(525,'HR','HR-14','Osječko-baranjska županija',59),
(526,'HR','HR-15','Šibensko-kninska županija',59),(527,'HR','HR-16','Vukovarsko-srijemska županija',59),(528,'HR','HR-17','Splitsko-dalmatinska županija',59),(529,'HR','HR-18','Istarska županija',59),(530,'HR','HR-19','Dubrovačko-neretvanska županija',59),
(531,'HR','HR-20','Međimurska županija',59),(532,'HR','HR-21','Grad Zagreb',59),(533,'IN','AN','Andaman and Nicobar Islands',106),(534,'IN','AP','Andhra Pradesh',106),(535,'IN','AR','Arunachal Pradesh',106),
(536,'IN','AS','Assam',106),(537,'IN','BR','Bihar',106),(538,'IN','CH','Chandigarh',106),(539,'IN','CT','Chhattisgarh',106),(540,'IN','DN','Dadra and Nagar Haveli',106),
(541,'IN','DD','Daman and Diu',106),(542,'IN','DL','Delhi',106),(543,'IN','GA','Goa',106),(544,'IN','GJ','Gujarat',106),(545,'IN','HR','Haryana',106),
(546,'IN','HP','Himachal Pradesh',106),(547,'IN','JK','Jammu and Kashmir',106),(548,'IN','JH','Jharkhand',106),(549,'IN','KA','Karnataka',106),(550,'IN','KL','Kerala',106),
(551,'IN','LD','Lakshadweep',106),(552,'IN','MP','Madhya Pradesh',106),(553,'IN','MH','Maharashtra',106),(554,'IN','MN','Manipur',106),(555,'IN','ML','Meghalaya',106),
(556,'IN','MZ','Mizoram',106),(557,'IN','NL','Nagaland',106),(558,'IN','OR','Odisha',106),(559,'IN','PY','Puducherry',106),(560,'IN','PB','Punjab',106),
(561,'IN','RJ','Rajasthan',106),(562,'IN','SK','Sikkim',106),(563,'IN','TN','Tamil Nadu',106),(564,'IN','TG','Telangana',106),(565,'IN','TR','Tripura',106),
(566,'IN','UP','Uttar Pradesh',106),(567,'IN','UT','Uttarakhand',106),(568,'IN','WB','West Bengal',106);

-- Data: attributes
INSERT INTO attributes (id, code, name, type, lookup_type, entity_type, sort_order, validation, is_required, is_unique, quick_add, is_user_defined, created_at, updated_at) VALUES
(19,'title','Title','text',NULL,'leads',1,NULL,TRUE,FALSE,TRUE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(20,'description','Description','textarea',NULL,'leads',2,NULL,FALSE,FALSE,TRUE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(21,'lead_value','Estimated Lead Value','price',NULL,'leads',3,'decimal',FALSE,FALSE,FALSE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(22,'lead_source_id','Source','select','lead_sources','leads',4,NULL,TRUE,FALSE,FALSE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(23,'lead_type_id','Type','select','lead_types','leads',5,NULL,TRUE,FALSE,FALSE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(24,'user_id','Sales Owner','select','users','leads',7,NULL,FALSE,FALSE,FALSE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(25,'expected_close_date','Expected Close Date','date',NULL,'leads',8,NULL,FALSE,FALSE,FALSE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(26,'lead_pipeline_id','Pipeline','lookup','lead_pipelines','leads',9,NULL,TRUE,FALSE,FALSE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(27,'lead_pipeline_stage_id','Stage','lookup','lead_pipeline_stages','leads',10,NULL,TRUE,FALSE,FALSE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(28,'name','Name','text',NULL,'persons',1,NULL,TRUE,FALSE,TRUE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(29,'emails','Emails','email',NULL,'persons',2,NULL,TRUE,TRUE,TRUE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(30,'contact_numbers','Contact Numbers','phone',NULL,'persons',3,'numeric',FALSE,TRUE,TRUE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(31,'job_title','Job Title','text',NULL,'persons',4,NULL,FALSE,FALSE,FALSE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(32,'user_id','Sales Owner','lookup','users','persons',5,NULL,FALSE,FALSE,FALSE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(33,'organization_id','Organization','lookup','organizations','persons',6,NULL,FALSE,FALSE,FALSE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(34,'name','Name','text',NULL,'organizations',1,NULL,TRUE,TRUE,TRUE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(35,'address','Address','address',NULL,'organizations',2,NULL,FALSE,FALSE,TRUE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(36,'user_id','Sales Owner','lookup','users','organizations',3,NULL,FALSE,FALSE,TRUE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(37,'name','Name','text',NULL,'products',1,NULL,TRUE,FALSE,TRUE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(38,'description','Description','textarea',NULL,'products',2,NULL,FALSE,FALSE,TRUE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(39,'sku','SKU','text',NULL,'products',3,NULL,TRUE,TRUE,TRUE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(40,'quantity','Quantity','text',NULL,'products',4,'numeric',TRUE,FALSE,TRUE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(41,'price','Price','price',NULL,'products',5,'decimal',TRUE,FALSE,TRUE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(42,'user_id','Sales Owner','select','users','quotes',1,NULL,TRUE,FALSE,TRUE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(43,'subject','Subject','text',NULL,'quotes',2,NULL,TRUE,FALSE,TRUE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(44,'description','Description','textarea',NULL,'quotes',3,NULL,FALSE,FALSE,TRUE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(45,'billing_address','Billing Address','address',NULL,'quotes',4,NULL,TRUE,FALSE,TRUE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(46,'shipping_address','Shipping Address','address',NULL,'quotes',5,NULL,FALSE,FALSE,FALSE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(47,'discount_percent','Discount Percent','text',NULL,'quotes',6,'decimal',FALSE,FALSE,FALSE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(48,'discount_amount','Discount Amount','price',NULL,'quotes',7,'decimal',FALSE,FALSE,FALSE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(49,'tax_amount','Tax Amount','price',NULL,'quotes',8,'decimal',FALSE,FALSE,FALSE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(50,'adjustment_amount','Adjustment Amount','price',NULL,'quotes',9,'decimal',FALSE,FALSE,FALSE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(51,'sub_total','Sub Total','price',NULL,'quotes',10,'decimal',TRUE,FALSE,FALSE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(52,'grand_total','Grand Total','price',NULL,'quotes',11,'decimal',TRUE,FALSE,TRUE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(53,'expired_at','Expired At','date',NULL,'quotes',12,NULL,TRUE,FALSE,TRUE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(54,'person_id','Person','lookup','persons','quotes',13,NULL,TRUE,FALSE,TRUE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(55,'name','Name','text',NULL,'warehouses',1,NULL,TRUE,FALSE,TRUE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(56,'description','Description','textarea',NULL,'warehouses',2,NULL,FALSE,FALSE,TRUE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(57,'contact_name','Contact Name','text',NULL,'warehouses',3,NULL,TRUE,FALSE,TRUE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(58,'contact_emails','Contact Emails','email',NULL,'warehouses',4,NULL,TRUE,TRUE,TRUE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(59,'contact_numbers','Contact Numbers','phone',NULL,'warehouses',5,'numeric',FALSE,TRUE,TRUE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02'),
(60,'contact_address','Contact Address','address',NULL,'warehouses',6,NULL,TRUE,FALSE,FALSE,FALSE,'2026-09-16 04:49:02','2026-09-16 04:49:02');

-- Data: organizations
INSERT INTO organizations (id, name, address, created_at, updated_at, user_id) VALUES
(1, 'test organization', '{"address":"Test address","country":"IN","state":"MH","city":"nashik","postcode":null}'::jsonb, '2026-09-17 10:25:24', '2026-09-17 10:25:24', 1);

-- Data: products
INSERT INTO products (id, sku, name, description, quantity, price, created_at, updated_at) VALUES
(2, 'btb', 'test', '', 25, 100.0000, '2026-09-16 12:45:53', '2026-09-16 12:45:53');

-- Data: attribute_values
INSERT INTO attribute_values (id, entity_type, text_value, boolean_value, integer_value, float_value, datetime_value, date_value, json_value, entity_id, attribute_id, unique_id) VALUES
(6, 'products', 'NGO', NULL, NULL, NULL, NULL, NULL, NULL, 3, 37, NULL),
(7, 'products', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3, 38, NULL),
(8, 'products', 'ngo-01', NULL, NULL, NULL, NULL, NULL, NULL, 3, 39, NULL),
(9, 'products', '5', NULL, NULL, NULL, NULL, NULL, NULL, 3, 40, NULL),
(10, 'products', NULL, NULL, NULL, 50000, NULL, NULL, NULL, 3, 41, NULL),
(11, 'organizations', 'test organization', NULL, NULL, NULL, NULL, NULL, NULL, 1, 34, NULL),
(12, 'organizations', NULL, NULL, NULL, NULL, NULL, NULL, '{"address":"Test address","country":"IN","state":"MH","city":"nashik","postcode":null}'::jsonb, 1, 35, NULL),
(13, 'organizations', NULL, NULL, 1, NULL, NULL, NULL, NULL, 1, 36, NULL);

-- Data: lead_sources
INSERT INTO lead_sources (id, name, created_at, updated_at) VALUES
(1, 'Email', '2026-09-16 04:49:02', '2026-09-16 04:49:02'),
(2, 'Web', '2026-09-16 04:49:02', '2026-09-16 04:49:02'),
(3, 'Web Form', '2026-09-16 04:49:02', '2026-09-16 04:49:02'),
(4, 'Phone', '2026-09-16 04:49:02', '2026-09-16 04:49:02'),
(5, 'Direct', '2026-09-16 04:49:02', '2026-09-16 04:49:02');

-- Data: lead_types
INSERT INTO lead_types (id, name, created_at, updated_at) VALUES
(1, 'New Business', '2026-09-16 04:49:02', '2026-09-16 04:49:02'),
(2, 'Existing Business', '2026-09-16 04:49:02', '2026-09-16 04:49:02');

-- Data: lead_pipelines
INSERT INTO lead_pipelines (id, name, is_default, rotten_days, created_at, updated_at) VALUES
(1, 'Default Pipeline', TRUE, 30, '2026-09-16 04:49:02', '2026-09-16 04:49:02');

-- Data: lead_pipeline_stages
INSERT INTO lead_pipeline_stages (id, code, name, probability, sort_order, lead_pipeline_id) VALUES
(1, 'new', 'New', 100, 1, 1),
(2, 'follow-up', 'Follow Up', 100, 2, 1),
(3, 'prospect', 'Prospect', 100, 3, 1),
(4, 'negotiation', 'Negotiation', 100, 4, 1),
(5, 'won', 'Won', 100, 5, 1),
(6, 'lost', 'Lost', 0, 6, 1);

-- Data: activities
INSERT INTO activities (id, title, type, comment, additional, schedule_from, schedule_to, is_done, user_id, created_at, updated_at, location) VALUES
(7, 'Created', 'system', NULL, NULL, NULL, NULL, TRUE, 1, '2026-09-17 09:35:20', '2026-09-17 09:35:20', NULL),
(8, 'Updated Name', 'system', NULL, '{"attribute":"Name","new":{"value":"NGO","label":"NGO"},"old":{"value":null,"label":null}}'::jsonb, NULL, NULL, TRUE, 1, '2026-09-17 09:35:23', '2026-09-17 09:35:23', NULL),
(9, 'Updated SKU', 'system', NULL, '{"attribute":"SKU","new":{"value":"ngo-01","label":"ngo-01"},"old":{"value":null,"label":null}}'::jsonb, NULL, NULL, TRUE, 1, '2026-09-17 09:35:27', '2026-09-17 09:35:27', NULL),
(10, 'Updated Quantity', 'system', NULL, '{"attribute":"Quantity","new":{"value":5,"label":5},"old":{"value":null,"label":null}}'::jsonb, NULL, NULL, TRUE, 1, '2026-09-17 09:35:29', '2026-09-17 09:35:29', NULL),
(11, 'Updated Price', 'system', NULL, '{"attribute":"Price","new":{"value":50000,"label":"$50,000.00"},"old":{"value":null,"label":"$0.00"}}'::jsonb, NULL, NULL, TRUE, 1, '2026-09-17 09:35:31', '2026-09-17 09:35:31', NULL);

-- Data: email_templates
INSERT INTO email_templates (id, name, subject, content, created_at, updated_at) VALUES
(1, 'Activity created', 'Activity created: {%activities.title%}', '<p style="font-size: 16px; color: #5e5e5e;">You have a new activity, please find the details bellow:</p>
<p><strong style="font-size: 16px;">Details</strong></p>
<table style="height: 97px; width: 952px;">
    <tbody>
        <tr>
            <td style="width: 116.953px; color: #546e7a; font-size: 16px;">Title</td>
            <td style="width: 770.047px; font-size: 16px;">{%activities.title%}</td>
        </tr>
        <tr>
            <td style="width: 116.953px; color: #546e7a; font-size: 16px;">Type</td>
            <td style="width: 770.047px; font-size: 16px;">{%activities.type%}</td>
        </tr>
        <tr>
            <td style="width: 116.953px; color: #546e7a; font-size: 16px;">Date</td>
            <td style="width: 770.047px; font-size: 16px;">{%activities.schedule_from%} to&nbsp;{%activities.schedule_to%}</td>
        </tr>
        <tr>
            <td style="width: 116.953px; color: #546e7a; font-size: 16px; vertical-align: text-top;">Participants</td>
            <td style="width: 770.047px; font-size: 16px;">{%activities.participants%}</td>
        </tr>
    </tbody>
</table>', '2026-09-16 04:49:02', '2026-09-16 04:49:02'),
(2, 'Activity modified', 'Activity modified: {%activities.title%}', '<p style="font-size: 16px; color: #5e5e5e;">You have a new activity modified, please find the details bellow:</p>
<p><strong style="font-size: 16px;">Details</strong></p>
<table style="height: 97px; width: 952px;">
    <tbody>
        <tr>
            <td style="width: 116.953px; color: #546e7a; font-size: 16px;">Title</td>
            <td style="width: 770.047px; font-size: 16px;">{%activities.title%}</td>
        </tr>
        <tr>
            <td style="width: 116.953px; color: #546e7a; font-size: 16px;">Type</td>
            <td style="width: 770.047px; font-size: 16px;">{%activities.type%}</td>
        </tr>
        <tr>
            <td style="width: 116.953px; color: #546e7a; font-size: 16px;">Date</td>
            <td style="width: 770.047px; font-size: 16px;">{%activities.schedule_from%} to&nbsp;{%activities.schedule_to%}</td>
        </tr>
        <tr>
            <td style="width: 116.953px; color: #546e7a; font-size: 16px; vertical-align: text-top;">Participants</td>
            <td style="width: 770.047px; font-size: 16px;">{%activities.participants%}</td>
        </tr>
    </tbody>
</table>', '2026-09-16 04:49:02', '2026-09-16 04:49:02');

-- Data: workflows
INSERT INTO workflows (id, name, description, entity_type, event, condition_type, conditions, actions, created_at, updated_at) VALUES
(1, 'Emails to participants after activity creation', 'Emails to participants after activity creation', 'activities', 'activity.create.after', 'and', '[{"value": ["call", "meeting", "lunch"], "operator": "{}", "attribute": "type", "attribute_type": "multiselect"}]'::jsonb, '[{"id": "send_email_to_participants", "value": "1"}]'::jsonb, '2026-09-16 04:49:02', '2026-09-16 04:49:02'),
(2, 'Emails to participants after activity updation', 'Emails to participants after activity updation', 'activities', 'activity.update.after', 'and', '[{"value": ["call", "meeting", "lunch"], "operator": "{}", "attribute": "type", "attribute_type": "multiselect"}]'::jsonb, '[{"id": "send_email_to_participants", "value": "2"}]'::jsonb, '2026-09-16 04:49:02', '2026-09-16 04:49:02');

-- Data: migrations
INSERT INTO migrations (id, migration, batch) VALUES
(1,'2019_08_19_000000_create_failed_jobs_table',1),
(2,'2019_12_14_000001_create_personal_access_tokens_table',1),
(3,'2021_03_12_060658_create_core_config_table',1),
(4,'2021_03_12_074578_create_groups_table',1),
(5,'2021_03_12_074597_create_roles_table',1),
(6,'2021_03_12_074857_create_users_table',1),
(7,'2021_03_12_074867_create_user_groups_table',1),
(8,'2021_03_12_074957_create_user_password_resets_table',1),
(9,'2021_04_02_080709_create_attributes_table',1),
(10,'2021_04_02_080837_create_attribute_options_table',1),
(11,'2021_04_06_122751_create_attribute_values_table',1),
(12,'2021_04_09_051326_create_organizations_table',1),
(13,'2021_04_09_065617_create_persons_table',1),
(14,'2021_04_09_065617_create_products_table',1),
(15,'2021_04_12_173232_create_countries_table',1),
(16,'2021_04_12_173344_create_country_states_table',1),
(17,'2021_04_21_172825_create_lead_sources_table',1),
(18,'2021_04_21_172847_create_lead_types_table',1),
(19,'2021_04_22_153258_create_lead_stages_table',1),
(20,'2021_04_22_155706_create_lead_pipelines_table',1),
(21,'2021_04_22_155838_create_lead_pipeline_stages_table',1),
(22,'2021_04_22_164215_create_leads_table',1),
(23,'2021_04_22_171805_create_lead_products_table',1),
(24,'2021_05_12_150329_create_activities_table',1),
(25,'2021_05_12_150329_create_lead_activities_table',1),
(26,'2021_05_15_151855_create_activity_files_table',1),
(27,'2021_05_20_141230_create_tags_table',1),
(28,'2021_05_20_141240_create_lead_tags_table',1),
(29,'2021_05_24_075618_create_emails_table',1),
(30,'2021_05_25_072700_create_email_attachments_table',1),
(31,'2021_06_07_162808_add_lead_view_permission_column_in_users_table',1),
(32,'2021_07_01_230345_create_quotes_table',1),
(33,'2021_07_01_231317_create_quote_items_table',1),
(34,'2021_07_02_201822_create_lead_quotes_table',1),
(35,'2021_07_28_142453_create_activity_participants_table',1),
(36,'2021_08_26_133538_create_workflows_table',1),
(37,'2021_09_03_172713_create_email_templates_table',1),
(38,'2021_09_22_194103_add_unique_index_to_name_in_organizations_table',1),
(39,'2021_09_22_194622_add_unique_index_to_name_in_groups_table',1),
(40,'2021_09_23_221138_add_column_expected_close_date_in_leads_table',1),
(41,'2021_09_30_135857_add_column_rotten_days_in_lead_pipelines_table',1),
(42,'2021_09_30_154222_alter_lead_pipeline_stages_table',1),
(43,'2021_09_30_161722_alter_leads_table',1),
(44,'2021_09_30_183825_change_user_id_to_nullable_in_leads_table',1),
(45,'2021_10_02_170105_insert_expected_closed_date_column_in_attributes_table',1),
(46,'2021_11_11_180804_change_lead_pipeline_stage_id_constraint_in_leads_table',1),
(47,'2021_11_12_171510_add_image_column_in_users_table',1),
(48,'2021_11_17_190943_add_location_column_in_activities_table',1),
(49,'2021_12_14_213049_create_web_forms_table',1),
(50,'2021_12_14_214923_create_web_form_attributes_table',1),
(51,'2024_01_11_154640_create_imports_table',1),
(52,'2024_01_11_154741_create_import_batches_table',1),
(53,'2024_05_10_152848_create_saved_filters_table',1),
(54,'2024_06_21_160707_create_warehouses_table',1),
(55,'2024_06_21_160735_create_warehouse_locations_table',1),
(56,'2024_06_24_174241_insert_warehouse_attributes_in_attributes_table',1),
(57,'2024_06_28_154009_create_product_inventories_table',1),
(58,'2024_07_24_150821_create_webhooks_table',1),
(59,'2024_07_31_092951_add_job_title_in_persons_table',1),
(60,'2024_07_31_093603_add_organization_sales_owner_attribute_in_attributes_table',1),
(61,'2024_07_31_093605_add_person_job_title_attribute_in_attributes_table',1),
(62,'2024_07_31_093605_add_person_sales_owner_attribute_in_attributes_table',1),
(63,'2024_08_06_145943_create_person_tags_table',1),
(64,'2024_08_06_161212_create_person_activities_table',1),
(65,'2024_08_10_100329_create_warehouse_activities_table',1),
(66,'2024_08_10_100340_create_warehouse_tags_table',1),
(67,'2024_08_10_150329_create_product_activities_table',1),
(68,'2024_08_10_150340_create_product_tags_table',1),
(69,'2024_08_14_102116_add_user_id_column_in_persons_table',1),
(70,'2024_08_14_102136_add_user_id_column_in_organizations_table',1),
(71,'2024_08_21_153011_add_leads_stage_and_pipeline_attributes',1),
(72,'2024_08_27_091619_create_email_tags_table',1),
(73,'2024_09_06_065808_alter_product_inventories_table',1),
(74,'2024_09_09_094040_create_job_batches_table',1),
(75,'2024_09_09_094042_create_jobs_table',1),
(76,'2024_09_09_112201_add_unique_id_to_person_table',1),
(77,'2024_10_29_044744_create_marketing_events_table',1),
(78,'2024_11_04_122500_create_marketing_campaigns_table',1),
(79,'2024_11_29_120302_modify_foreign_keys_in_leads_table',1),
(80,'2025_01_17_151632_alter_activities_table',1),
(81,'2025_01_29_133500_update_text_column_type_in_core_config_table',1),
(82,'2025_03_19_132236_update_organization_id_column_in_persons_table',1),
(83,'2025_07_01_133612_alter_lead_pipelines_table',1),
(84,'2025_07_02_191710_alter_attribute_values_table',1),
(85,'2025_07_09_133553_alter_email_templates_table',1),
(86,'2026_05_29_000000_change_description_to_text_in_quotes_table',1),
(87,'2026_06_10_000000_make_value_nullable_in_core_config_table',1),
(88,'2026_07_09_000000_add_lead_pipeline_id_to_web_forms_table',1),
(89,'2026_07_30_000001_create_google_contact_accounts_table',1),
(90,'2026_07_31_000001_create_contact_export_batches_table',1),
(91,'2026_07_31_000002_create_contact_export_batch_items_table',1),
(92,'2026_08_06_000000_add_created_by_column_in_users_table',1),
(93,'2026_08_06_000001_add_created_by_column_in_roles_table',1);

-- ==========================================================
-- SEQUENCE RESET
-- Set sequences to MAX(id) + 1 for auto-increment to continue
-- ==========================================================
SELECT setval('roles_id_seq', (SELECT COALESCE(MAX(id), 1) FROM roles));
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));
SELECT setval('core_config_id_seq', (SELECT COALESCE(MAX(id), 1) FROM core_config));
SELECT setval('countries_id_seq', (SELECT COALESCE(MAX(id), 1) FROM countries));
SELECT setval('country_states_id_seq', (SELECT COALESCE(MAX(id), 1) FROM country_states));
SELECT setval('attributes_id_seq', (SELECT COALESCE(MAX(id), 1) FROM attributes));
SELECT setval('organizations_id_seq', (SELECT COALESCE(MAX(id), 1) FROM organizations));
SELECT setval('products_id_seq', (SELECT COALESCE(MAX(id), 1) FROM products));
SELECT setval('attribute_values_id_seq', (SELECT COALESCE(MAX(id), 1) FROM attribute_values));
SELECT setval('lead_sources_id_seq', (SELECT COALESCE(MAX(id), 1) FROM lead_sources));
SELECT setval('lead_types_id_seq', (SELECT COALESCE(MAX(id), 1) FROM lead_types));
SELECT setval('lead_pipelines_id_seq', (SELECT COALESCE(MAX(id), 1) FROM lead_pipelines));
SELECT setval('lead_pipeline_stages_id_seq', (SELECT COALESCE(MAX(id), 1) FROM lead_pipeline_stages));
SELECT setval('activities_id_seq', (SELECT COALESCE(MAX(id), 1) FROM activities));
SELECT setval('email_templates_id_seq', (SELECT COALESCE(MAX(id), 1) FROM email_templates));
SELECT setval('workflows_id_seq', (SELECT COALESCE(MAX(id), 1) FROM workflows));
SELECT setval('migrations_id_seq', (SELECT COALESCE(MAX(id), 1) FROM migrations));
