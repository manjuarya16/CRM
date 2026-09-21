-- ==========================================================
-- PostgreSQL Database Schema for Krayin CRM Conversion
-- Stack: React.js + Node.js (Express + TypeScript) + PostgreSQL
-- Conventions:
--   - Dates: timestamp without time zone / date
--   - Strings: character varying(...) throughout, text only when strictly necessary
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables (in reverse dependency order)
DROP TABLE IF EXISTS workflows CASCADE;
DROP TABLE IF EXISTS webhooks CASCADE;
DROP TABLE IF EXISTS web_form_attributes CASCADE;
DROP TABLE IF EXISTS web_forms CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS warehouse_tags CASCADE;
DROP TABLE IF EXISTS warehouse_locations CASCADE;
DROP TABLE IF EXISTS warehouse_activities CASCADE;
DROP TABLE IF EXISTS user_password_resets CASCADE;
DROP TABLE IF EXISTS user_groups CASCADE;
DROP TABLE IF EXISTS role_module_access CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS quote_items CASCADE;
DROP TABLE IF EXISTS lead_quotes CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS product_inventories CASCADE;
DROP TABLE IF EXISTS product_tags CASCADE;
DROP TABLE IF EXISTS product_activities CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS person_tags CASCADE;
DROP TABLE IF EXISTS person_activities CASCADE;
DROP TABLE IF EXISTS persons CASCADE;
DROP TABLE IF EXISTS personal_access_tokens CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS migrations CASCADE;
DROP TABLE IF EXISTS marketing_campaigns CASCADE;
DROP TABLE IF EXISTS marketing_events CASCADE;
DROP TABLE IF EXISTS lead_tags CASCADE;
DROP TABLE IF EXISTS lead_products CASCADE;
DROP TABLE IF EXISTS lead_activities CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS lead_pipeline_stages CASCADE;
DROP TABLE IF EXISTS lead_pipelines CASCADE;
DROP TABLE IF EXISTS lead_stages CASCADE;
DROP TABLE IF EXISTS lead_sources CASCADE;
DROP TABLE IF EXISTS lead_types CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS job_batches CASCADE;
DROP TABLE IF EXISTS import_batches CASCADE;
DROP TABLE IF EXISTS imports CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS google_contact_accounts CASCADE;
DROP TABLE IF EXISTS failed_jobs CASCADE;
DROP TABLE IF EXISTS email_tags CASCADE;
DROP TABLE IF EXISTS email_attachments CASCADE;
DROP TABLE IF EXISTS emails CASCADE;
DROP TABLE IF EXISTS email_templates CASCADE;
DROP TABLE IF EXISTS datagrid_saved_filters CASCADE;
DROP TABLE IF EXISTS country_states CASCADE;
DROP TABLE IF EXISTS countries CASCADE;
DROP TABLE IF EXISTS core_config CASCADE;
DROP TABLE IF EXISTS contact_export_batch_items CASCADE;
DROP TABLE IF EXISTS contact_export_batches CASCADE;
DROP TABLE IF EXISTS attribute_values CASCADE;
DROP TABLE IF EXISTS attribute_options CASCADE;
DROP TABLE IF EXISTS attributes CASCADE;
DROP TABLE IF EXISTS activity_participants CASCADE;
DROP TABLE IF EXISTS activity_files CASCADE;
DROP TABLE IF EXISTS activities CASCADE;

-- ----------------------------------------------------------
-- Table: roles
-- ----------------------------------------------------------
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name character varying(255) NOT NULL,
    description character varying(500) DEFAULT NULL,
    permission_type character varying(50) NOT NULL DEFAULT 'custom',
    permissions JSONB DEFAULT NULL,
    created_by integer DEFAULT NULL,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: users
-- ----------------------------------------------------------
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL UNIQUE,
    password character varying(255) DEFAULT NULL,
    status boolean NOT NULL DEFAULT false,
    view_permission character varying(50) DEFAULT 'global',
    role_id integer NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_by integer DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
    remember_token character varying(100) DEFAULT NULL,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL,
    image character varying(255) DEFAULT NULL
);

ALTER TABLE roles ADD CONSTRAINT roles_created_by_foreign FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- ----------------------------------------------------------
-- Table: groups
-- ----------------------------------------------------------
CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    name character varying(255) NOT NULL UNIQUE,
    description character varying(500) DEFAULT NULL,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: user_groups
-- ----------------------------------------------------------
CREATE TABLE user_groups (
    group_id integer NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_user_groups_group_id ON user_groups(group_id);
CREATE INDEX idx_user_groups_user_id ON user_groups(user_id);

-- ----------------------------------------------------------
-- Table: user_password_resets
-- ----------------------------------------------------------
CREATE TABLE user_password_resets (
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT NULL
);
CREATE INDEX idx_user_password_resets_email ON user_password_resets(email);

-- ----------------------------------------------------------
-- Table: role_module_access (Granular RBAC)
-- ----------------------------------------------------------
CREATE TABLE role_module_access (
    id SERIAL PRIMARY KEY,
    role_id integer NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    module_key character varying(100) NOT NULL,
    can_view boolean NOT NULL DEFAULT false,
    can_add boolean NOT NULL DEFAULT false,
    can_update boolean NOT NULL DEFAULT false,
    can_delete boolean NOT NULL DEFAULT false,
    status boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL,
    deleted_at timestamp without time zone DEFAULT NULL,
    CONSTRAINT role_module_access_role_module_unique UNIQUE (role_id, module_key)
);

-- ----------------------------------------------------------
-- Table: countries
-- ----------------------------------------------------------
CREATE TABLE countries (
    id SERIAL PRIMARY KEY,
    code character varying(10) NOT NULL,
    name character varying(255) NOT NULL
);

-- ----------------------------------------------------------
-- Table: country_states
-- ----------------------------------------------------------
CREATE TABLE country_states (
    id SERIAL PRIMARY KEY,
    country_code character varying(10) NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    country_id integer NOT NULL REFERENCES countries(id) ON DELETE CASCADE
);
CREATE INDEX idx_country_states_country_id ON country_states(country_id);

-- ----------------------------------------------------------
-- Table: organizations
-- ----------------------------------------------------------
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name character varying(255) NOT NULL UNIQUE,
    address JSONB DEFAULT NULL,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL,
    user_id integer DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_organizations_user_id ON organizations(user_id);

-- ----------------------------------------------------------
-- Table: persons (Contacts)
-- ----------------------------------------------------------
CREATE TABLE persons (
    id SERIAL PRIMARY KEY,
    name character varying(255) NOT NULL,
    emails JSONB NOT NULL,
    contact_numbers JSONB DEFAULT NULL,
    organization_id integer DEFAULT NULL REFERENCES organizations(id) ON DELETE SET NULL,
    job_title character varying(255) DEFAULT NULL,
    user_id integer DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
    unique_id character varying(255) UNIQUE DEFAULT NULL,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);
CREATE INDEX idx_persons_user_id ON persons(user_id);
CREATE INDEX idx_persons_organization_id ON persons(organization_id);

-- ----------------------------------------------------------
-- Table: products
-- ----------------------------------------------------------
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku character varying(255) NOT NULL UNIQUE,
    name character varying(255) DEFAULT NULL,
    description text DEFAULT NULL,
    quantity integer NOT NULL DEFAULT 0,
    price numeric(12,4) DEFAULT NULL,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: attributes (Custom Fields)
-- ----------------------------------------------------------
CREATE TABLE attributes (
    id SERIAL PRIMARY KEY,
    code character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    lookup_type character varying(100) DEFAULT NULL,
    entity_type character varying(100) NOT NULL,
    sort_order integer DEFAULT NULL,
    validation character varying(255) DEFAULT NULL,
    is_required boolean NOT NULL DEFAULT false,
    is_unique boolean NOT NULL DEFAULT false,
    quick_add boolean NOT NULL DEFAULT false,
    is_user_defined boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL,
    CONSTRAINT attributes_code_entity_type_unique UNIQUE (code, entity_type)
);

-- ----------------------------------------------------------
-- Table: attribute_options
-- ----------------------------------------------------------
CREATE TABLE attribute_options (
    id SERIAL PRIMARY KEY,
    name character varying(255) DEFAULT NULL,
    sort_order integer DEFAULT NULL,
    attribute_id integer NOT NULL REFERENCES attributes(id) ON DELETE CASCADE
);
CREATE INDEX idx_attribute_options_attribute_id ON attribute_options(attribute_id);

-- ----------------------------------------------------------
-- Table: attribute_values
-- ----------------------------------------------------------
CREATE TABLE attribute_values (
    id SERIAL PRIMARY KEY,
    entity_type character varying(100) NOT NULL DEFAULT 'leads',
    text_value text DEFAULT NULL,
    boolean_value boolean DEFAULT NULL,
    integer_value integer DEFAULT NULL,
    float_value double precision DEFAULT NULL,
    datetime_value timestamp without time zone DEFAULT NULL,
    date_value date DEFAULT NULL,
    json_value JSONB DEFAULT NULL,
    entity_id integer NOT NULL,
    attribute_id integer NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
    unique_id character varying(255) UNIQUE DEFAULT NULL,
    CONSTRAINT entity_type_attribute_value_index_unique UNIQUE (entity_type, entity_id, attribute_id)
);
CREATE INDEX idx_attribute_values_attribute_id ON attribute_values(attribute_id);

-- ----------------------------------------------------------
-- Table: lead_sources
-- ----------------------------------------------------------
CREATE TABLE lead_sources (
    id SERIAL PRIMARY KEY,
    name character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: lead_types
-- ----------------------------------------------------------
CREATE TABLE lead_types (
    id SERIAL PRIMARY KEY,
    name character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: lead_pipelines
-- ----------------------------------------------------------
CREATE TABLE lead_pipelines (
    id SERIAL PRIMARY KEY,
    name character varying(255) NOT NULL UNIQUE,
    is_default boolean NOT NULL DEFAULT false,
    rotten_days integer NOT NULL DEFAULT 30,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: lead_pipeline_stages
-- ----------------------------------------------------------
CREATE TABLE lead_pipeline_stages (
    id SERIAL PRIMARY KEY,
    code character varying(100) DEFAULT NULL,
    name character varying(255) DEFAULT NULL,
    probability integer NOT NULL DEFAULT 0,
    sort_order integer NOT NULL DEFAULT 0,
    lead_pipeline_id integer NOT NULL REFERENCES lead_pipelines(id) ON DELETE CASCADE,
    CONSTRAINT lead_pipeline_stages_code_lead_pipeline_id_unique UNIQUE (code, lead_pipeline_id),
    CONSTRAINT lead_pipeline_stages_name_lead_pipeline_id_unique UNIQUE (name, lead_pipeline_id)
);
CREATE INDEX idx_lead_pipeline_stages_pipeline_id ON lead_pipeline_stages(lead_pipeline_id);

-- ----------------------------------------------------------
-- Table: lead_stages
-- ----------------------------------------------------------
CREATE TABLE lead_stages (
    id SERIAL PRIMARY KEY,
    code character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    is_user_defined boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: leads
-- ----------------------------------------------------------
CREATE TABLE leads (
    id SERIAL PRIMARY KEY,
    title character varying(255) NOT NULL,
    description text DEFAULT NULL,
    lead_value numeric(12,4) DEFAULT NULL,
    status boolean DEFAULT NULL,
    lost_reason character varying(500) DEFAULT NULL,
    closed_at timestamp without time zone DEFAULT NULL,
    user_id integer DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
    person_id integer DEFAULT NULL REFERENCES persons(id) ON DELETE SET NULL,
    lead_source_id integer DEFAULT NULL REFERENCES lead_sources(id) ON DELETE SET NULL,
    lead_type_id integer DEFAULT NULL REFERENCES lead_types(id) ON DELETE SET NULL,
    lead_pipeline_id integer DEFAULT NULL REFERENCES lead_pipelines(id) ON DELETE CASCADE,
    lead_pipeline_stage_id integer DEFAULT NULL REFERENCES lead_pipeline_stages(id) ON DELETE SET NULL,
    expected_close_date date DEFAULT NULL,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
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
    name character varying(255) NOT NULL,
    color character varying(50) DEFAULT NULL,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);
CREATE INDEX idx_tags_user_id ON tags(user_id);

-- ----------------------------------------------------------
-- Table: lead_tags
-- ----------------------------------------------------------
CREATE TABLE lead_tags (
    tag_id integer NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    lead_id integer NOT NULL REFERENCES leads(id) ON DELETE CASCADE
);
CREATE INDEX idx_lead_tags_tag_id ON lead_tags(tag_id);
CREATE INDEX idx_lead_tags_lead_id ON lead_tags(lead_id);

-- ----------------------------------------------------------
-- Table: lead_products
-- ----------------------------------------------------------
CREATE TABLE lead_products (
    id SERIAL PRIMARY KEY,
    quantity integer NOT NULL DEFAULT 0,
    price numeric(12,4) DEFAULT NULL,
    amount numeric(12,4) DEFAULT NULL,
    lead_id integer NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    product_id integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);
CREATE INDEX idx_lead_products_lead_id ON lead_products(lead_id);
CREATE INDEX idx_lead_products_product_id ON lead_products(product_id);

-- ----------------------------------------------------------
-- Table: quotes
-- ----------------------------------------------------------
CREATE TABLE quotes (
    id SERIAL PRIMARY KEY,
    subject character varying(255) NOT NULL,
    description text DEFAULT NULL,
    billing_address JSONB DEFAULT NULL,
    shipping_address JSONB DEFAULT NULL,
    discount_percent numeric(12,4) DEFAULT 0.0000,
    discount_amount numeric(12,4) DEFAULT NULL,
    tax_amount numeric(12,4) DEFAULT NULL,
    adjustment_amount numeric(12,4) DEFAULT NULL,
    sub_total numeric(12,4) DEFAULT NULL,
    grand_total numeric(12,4) DEFAULT NULL,
    expired_at timestamp without time zone DEFAULT NULL,
    person_id integer NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);
CREATE INDEX idx_quotes_person_id ON quotes(person_id);
CREATE INDEX idx_quotes_user_id ON quotes(user_id);

-- ----------------------------------------------------------
-- Table: quote_items
-- ----------------------------------------------------------
CREATE TABLE quote_items (
    id SERIAL PRIMARY KEY,
    sku character varying(255) DEFAULT NULL,
    name character varying(255) DEFAULT NULL,
    quantity integer DEFAULT 0,
    price numeric(12,4) NOT NULL DEFAULT 0.0000,
    coupon_code character varying(100) DEFAULT NULL,
    discount_percent numeric(12,4) DEFAULT 0.0000,
    discount_amount numeric(12,4) DEFAULT 0.0000,
    tax_percent numeric(12,4) DEFAULT 0.0000,
    tax_amount numeric(12,4) DEFAULT 0.0000,
    total numeric(12,4) NOT NULL DEFAULT 0.0000,
    product_id integer NOT NULL,
    quote_id integer NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);
CREATE INDEX idx_quote_items_quote_id ON quote_items(quote_id);

-- ----------------------------------------------------------
-- Table: lead_quotes
-- ----------------------------------------------------------
CREATE TABLE lead_quotes (
    quote_id integer NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    lead_id integer NOT NULL REFERENCES leads(id) ON DELETE CASCADE
);
CREATE INDEX idx_lead_quotes_quote_id ON lead_quotes(quote_id);
CREATE INDEX idx_lead_quotes_lead_id ON lead_quotes(lead_id);

-- ----------------------------------------------------------
-- Table: activities
-- ----------------------------------------------------------
CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    title character varying(255) DEFAULT NULL,
    type character varying(100) NOT NULL,
    comment text DEFAULT NULL,
    additional JSONB DEFAULT NULL,
    schedule_from timestamp without time zone DEFAULT NULL,
    schedule_to timestamp without time zone DEFAULT NULL,
    is_done boolean NOT NULL DEFAULT false,
    user_id integer DEFAULT NULL REFERENCES users(id) ON DELETE CASCADE,
    location character varying(255) DEFAULT NULL,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);
CREATE INDEX idx_activities_user_id ON activities(user_id);

-- ----------------------------------------------------------
-- Table: activity_files
-- ----------------------------------------------------------
CREATE TABLE activity_files (
    id SERIAL PRIMARY KEY,
    name character varying(255) NOT NULL,
    path character varying(500) NOT NULL,
    activity_id integer NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);
CREATE INDEX idx_activity_files_activity_id ON activity_files(activity_id);

-- ----------------------------------------------------------
-- Table: activity_participants
-- ----------------------------------------------------------
CREATE TABLE activity_participants (
    id SERIAL PRIMARY KEY,
    activity_id integer NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    user_id integer DEFAULT NULL REFERENCES users(id) ON DELETE CASCADE,
    person_id integer DEFAULT NULL REFERENCES persons(id) ON DELETE CASCADE
);
CREATE INDEX idx_activity_participants_activity_id ON activity_participants(activity_id);
CREATE INDEX idx_activity_participants_user_id ON activity_participants(user_id);
CREATE INDEX idx_activity_participants_person_id ON activity_participants(person_id);

-- ----------------------------------------------------------
-- Table: lead_activities
-- ----------------------------------------------------------
CREATE TABLE lead_activities (
    activity_id integer NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    lead_id integer NOT NULL REFERENCES leads(id) ON DELETE CASCADE
);
CREATE INDEX idx_lead_activities_activity_id ON lead_activities(activity_id);
CREATE INDEX idx_lead_activities_lead_id ON lead_activities(lead_id);

-- ----------------------------------------------------------
-- Table: person_activities
-- ----------------------------------------------------------
CREATE TABLE person_activities (
    activity_id integer NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    person_id integer NOT NULL REFERENCES persons(id) ON DELETE CASCADE
);
CREATE INDEX idx_person_activities_activity_id ON person_activities(activity_id);
CREATE INDEX idx_person_activities_person_id ON person_activities(person_id);

-- ----------------------------------------------------------
-- Table: person_tags
-- ----------------------------------------------------------
CREATE TABLE person_tags (
    tag_id integer NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    person_id integer NOT NULL REFERENCES persons(id) ON DELETE CASCADE
);
CREATE INDEX idx_person_tags_tag_id ON person_tags(tag_id);
CREATE INDEX idx_person_tags_person_id ON person_tags(person_id);

-- ----------------------------------------------------------
-- Table: product_activities
-- ----------------------------------------------------------
CREATE TABLE product_activities (
    activity_id integer NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    product_id integer NOT NULL REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX idx_product_activities_activity_id ON product_activities(activity_id);
CREATE INDEX idx_product_activities_product_id ON product_activities(product_id);

-- ----------------------------------------------------------
-- Table: product_tags
-- ----------------------------------------------------------
CREATE TABLE product_tags (
    tag_id integer NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    product_id integer NOT NULL REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX idx_product_tags_tag_id ON product_tags(tag_id);
CREATE INDEX idx_product_tags_product_id ON product_tags(product_id);

-- ----------------------------------------------------------
-- Table: warehouses
-- ----------------------------------------------------------
CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    name character varying(255) NOT NULL,
    description character varying(500) DEFAULT NULL,
    contact_name character varying(255) NOT NULL,
    contact_emails JSONB NOT NULL,
    contact_numbers JSONB NOT NULL,
    contact_address JSONB NOT NULL,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: warehouse_locations
-- ----------------------------------------------------------
CREATE TABLE warehouse_locations (
    id SERIAL PRIMARY KEY,
    name character varying(255) NOT NULL,
    warehouse_id integer NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL,
    CONSTRAINT warehouse_locations_warehouse_id_name_unique UNIQUE (warehouse_id, name)
);

-- ----------------------------------------------------------
-- Table: product_inventories
-- ----------------------------------------------------------
CREATE TABLE product_inventories (
    id SERIAL PRIMARY KEY,
    in_stock integer NOT NULL DEFAULT 0,
    allocated integer NOT NULL DEFAULT 0,
    product_id integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id integer DEFAULT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    warehouse_location_id integer DEFAULT NULL REFERENCES warehouse_locations(id) ON DELETE CASCADE,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);
CREATE INDEX idx_product_inventories_product_id ON product_inventories(product_id);
CREATE INDEX idx_product_inventories_warehouse_id ON product_inventories(warehouse_id);
CREATE INDEX idx_product_inventories_location_id ON product_inventories(warehouse_location_id);

-- ----------------------------------------------------------
-- Table: warehouse_activities
-- ----------------------------------------------------------
CREATE TABLE warehouse_activities (
    activity_id integer NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    warehouse_id integer NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE
);
CREATE INDEX idx_warehouse_activities_activity_id ON warehouse_activities(activity_id);
CREATE INDEX idx_warehouse_activities_warehouse_id ON warehouse_activities(warehouse_id);

-- ----------------------------------------------------------
-- Table: warehouse_tags
-- ----------------------------------------------------------
CREATE TABLE warehouse_tags (
    tag_id integer NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    warehouse_id integer NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE
);
CREATE INDEX idx_warehouse_tags_tag_id ON warehouse_tags(tag_id);
CREATE INDEX idx_warehouse_tags_warehouse_id ON warehouse_tags(warehouse_id);

-- ----------------------------------------------------------
-- Table: email_templates
-- ----------------------------------------------------------
CREATE TABLE email_templates (
    id SERIAL PRIMARY KEY,
    name character varying(255) NOT NULL UNIQUE,
    subject character varying(255) NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: emails
-- ----------------------------------------------------------
CREATE TABLE emails (
    id SERIAL PRIMARY KEY,
    subject character varying(255) DEFAULT NULL,
    source character varying(100) NOT NULL,
    user_type character varying(100) NOT NULL,
    name character varying(255) DEFAULT NULL,
    reply text DEFAULT NULL,
    is_read boolean NOT NULL DEFAULT false,
    folders JSONB DEFAULT NULL,
    "from" JSONB DEFAULT NULL,
    sender JSONB DEFAULT NULL,
    reply_to JSONB DEFAULT NULL,
    cc JSONB DEFAULT NULL,
    bcc JSONB DEFAULT NULL,
    unique_id character varying(255) UNIQUE DEFAULT NULL,
    message_id character varying(255) NOT NULL UNIQUE,
    reference_ids JSONB DEFAULT NULL,
    person_id integer DEFAULT NULL REFERENCES persons(id) ON DELETE SET NULL,
    lead_id integer DEFAULT NULL REFERENCES leads(id) ON DELETE SET NULL,
    parent_id integer DEFAULT NULL REFERENCES emails(id) ON DELETE CASCADE,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);
CREATE INDEX idx_emails_person_id ON emails(person_id);
CREATE INDEX idx_emails_lead_id ON emails(lead_id);
CREATE INDEX idx_emails_parent_id ON emails(parent_id);

-- ----------------------------------------------------------
-- Table: email_attachments
-- ----------------------------------------------------------
CREATE TABLE email_attachments (
    id SERIAL PRIMARY KEY,
    name character varying(255) DEFAULT NULL,
    path character varying(500) NOT NULL,
    size integer DEFAULT NULL,
    content_type character varying(100) DEFAULT NULL,
    content_id character varying(255) DEFAULT NULL,
    email_id integer NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);
CREATE INDEX idx_email_attachments_email_id ON email_attachments(email_id);

-- ----------------------------------------------------------
-- Table: email_tags
-- ----------------------------------------------------------
CREATE TABLE email_tags (
    tag_id integer NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    email_id integer NOT NULL REFERENCES emails(id) ON DELETE CASCADE
);
CREATE INDEX idx_email_tags_tag_id ON email_tags(tag_id);
CREATE INDEX idx_email_tags_email_id ON email_tags(email_id);

-- ----------------------------------------------------------
-- Table: failed_jobs
-- ----------------------------------------------------------
CREATE TABLE failed_jobs (
    id BIGSERIAL PRIMARY KEY,
    uuid character varying(255) NOT NULL UNIQUE,
    connection character varying(100) NOT NULL,
    queue character varying(100) NOT NULL,
    payload text NOT NULL,
    exception text NOT NULL,
    failed_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------
-- Table: google_contact_accounts
-- ----------------------------------------------------------
CREATE TABLE google_contact_accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id integer NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    google_email character varying(255) NOT NULL,
    access_token text NOT NULL,
    refresh_token text DEFAULT NULL,
    expires_at timestamp without time zone DEFAULT NULL,
    scopes character varying(500) DEFAULT NULL,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: contact_export_batches
-- ----------------------------------------------------------
CREATE TABLE contact_export_batches (
    id BIGSERIAL PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    state character varying(50) NOT NULL DEFAULT 'pending',
    total_count integer NOT NULL DEFAULT 0,
    exported_count integer NOT NULL DEFAULT 0,
    duplicate_count integer NOT NULL DEFAULT 0,
    failed_count integer NOT NULL DEFAULT 0,
    error_file_path character varying(500) DEFAULT NULL,
    started_at timestamp without time zone DEFAULT NULL,
    completed_at timestamp without time zone DEFAULT NULL,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);
CREATE INDEX idx_contact_export_batches_user_id ON contact_export_batches(user_id);

-- ----------------------------------------------------------
-- Table: contact_export_batch_items
-- ----------------------------------------------------------
CREATE TABLE contact_export_batch_items (
    id BIGSERIAL PRIMARY KEY,
    batch_id bigint NOT NULL REFERENCES contact_export_batches(id) ON DELETE CASCADE,
    person_id integer NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    status character varying(50) NOT NULL DEFAULT 'pending',
    google_resource_name character varying(255) DEFAULT NULL,
    error_message character varying(1000) DEFAULT NULL,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);
CREATE INDEX idx_contact_export_batch_items_batch_id ON contact_export_batch_items(batch_id);
CREATE INDEX idx_contact_export_batch_items_person_id ON contact_export_batch_items(person_id);

-- ----------------------------------------------------------
-- Table: core_config
-- ----------------------------------------------------------
CREATE TABLE core_config (
    id SERIAL PRIMARY KEY,
    code character varying(255) NOT NULL,
    value text DEFAULT NULL,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: datagrid_saved_filters
-- ----------------------------------------------------------
CREATE TABLE datagrid_saved_filters (
    id BIGSERIAL PRIMARY KEY,
    user_id integer NOT NULL,
    name character varying(255) NOT NULL,
    src character varying(255) NOT NULL,
    applied JSONB NOT NULL,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL,
    CONSTRAINT datagrid_saved_filters_user_id_name_src_unique UNIQUE (user_id, name, src)
);

-- ----------------------------------------------------------
-- Table: imports
-- ----------------------------------------------------------
CREATE TABLE imports (
    id SERIAL PRIMARY KEY,
    state character varying(50) NOT NULL DEFAULT 'pending',
    process_in_queue boolean NOT NULL DEFAULT true,
    type character varying(100) NOT NULL,
    action character varying(100) NOT NULL,
    validation_strategy character varying(100) NOT NULL,
    allowed_errors integer NOT NULL DEFAULT 0,
    processed_rows_count integer NOT NULL DEFAULT 0,
    invalid_rows_count integer NOT NULL DEFAULT 0,
    errors_count integer NOT NULL DEFAULT 0,
    errors JSONB DEFAULT NULL,
    field_separator character varying(10) NOT NULL,
    file_path character varying(500) NOT NULL,
    error_file_path character varying(500) DEFAULT NULL,
    summary JSONB DEFAULT NULL,
    started_at timestamp without time zone DEFAULT NULL,
    completed_at timestamp without time zone DEFAULT NULL,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: import_batches
-- ----------------------------------------------------------
CREATE TABLE import_batches (
    id SERIAL PRIMARY KEY,
    state character varying(50) NOT NULL DEFAULT 'pending',
    data JSONB NOT NULL,
    summary JSONB DEFAULT NULL,
    import_id integer NOT NULL REFERENCES imports(id) ON DELETE CASCADE
);
CREATE INDEX idx_import_batches_import_id ON import_batches(import_id);

-- ----------------------------------------------------------
-- Table: job_batches
-- ----------------------------------------------------------
CREATE TABLE job_batches (
    id character varying(255) PRIMARY KEY,
    name character varying(255) NOT NULL,
    total_jobs integer NOT NULL,
    pending_jobs integer NOT NULL,
    failed_jobs integer NOT NULL,
    failed_job_ids text NOT NULL,
    options text DEFAULT NULL,
    cancelled_at integer DEFAULT NULL,
    created_at integer NOT NULL,
    finished_at integer DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: jobs
-- ----------------------------------------------------------
CREATE TABLE jobs (
    id BIGSERIAL PRIMARY KEY,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    attempts smallint NOT NULL,
    reserved_at integer DEFAULT NULL,
    available_at integer NOT NULL,
    created_at integer NOT NULL
);
CREATE INDEX idx_jobs_queue ON jobs(queue);

-- ----------------------------------------------------------
-- Table: marketing_events
-- ----------------------------------------------------------
CREATE TABLE marketing_events (
    id SERIAL PRIMARY KEY,
    name character varying(255) NOT NULL,
    description character varying(500) NOT NULL,
    date date NOT NULL,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: marketing_campaigns
-- ----------------------------------------------------------
CREATE TABLE marketing_campaigns (
    id SERIAL PRIMARY KEY,
    name character varying(255) NOT NULL,
    subject character varying(255) NOT NULL,
    status boolean NOT NULL DEFAULT false,
    type character varying(100) NOT NULL,
    mail_to character varying(255) NOT NULL,
    spooling character varying(100) DEFAULT NULL,
    marketing_template_id integer DEFAULT NULL REFERENCES email_templates(id) ON DELETE SET NULL,
    marketing_event_id integer DEFAULT NULL REFERENCES marketing_events(id) ON DELETE SET NULL,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);
CREATE INDEX idx_marketing_campaigns_template_id ON marketing_campaigns(marketing_template_id);
CREATE INDEX idx_marketing_campaigns_event_id ON marketing_campaigns(marketing_event_id);

-- ----------------------------------------------------------
-- Table: migrations
-- ----------------------------------------------------------
CREATE TABLE migrations (
    id SERIAL PRIMARY KEY,
    migration character varying(255) NOT NULL,
    batch integer NOT NULL
);

-- ----------------------------------------------------------
-- Table: personal_access_tokens
-- ----------------------------------------------------------
CREATE TABLE personal_access_tokens (
    id BIGSERIAL PRIMARY KEY,
    tokenable_type character varying(255) NOT NULL,
    tokenable_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    token character varying(64) NOT NULL UNIQUE,
    abilities character varying(500) DEFAULT NULL,
    last_used_at timestamp without time zone DEFAULT NULL,
    expires_at timestamp without time zone DEFAULT NULL,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);
CREATE INDEX idx_personal_access_tokens_type_id ON personal_access_tokens(tokenable_type, tokenable_id);

-- ----------------------------------------------------------
-- Table: web_forms
-- ----------------------------------------------------------
CREATE TABLE web_forms (
    id SERIAL PRIMARY KEY,
    form_id character varying(255) NOT NULL UNIQUE,
    title character varying(255) NOT NULL,
    description character varying(500) DEFAULT NULL,
    submit_button_label character varying(255) NOT NULL,
    submit_success_action character varying(255) NOT NULL,
    submit_success_content character varying(500) NOT NULL,
    create_lead boolean NOT NULL DEFAULT false,
    lead_pipeline_id integer DEFAULT NULL REFERENCES lead_pipelines(id) ON DELETE SET NULL,
    background_color character varying(50) DEFAULT NULL,
    form_background_color character varying(50) DEFAULT NULL,
    form_title_color character varying(50) DEFAULT NULL,
    form_submit_button_color character varying(50) DEFAULT NULL,
    attribute_label_color character varying(50) DEFAULT NULL,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);
CREATE INDEX idx_web_forms_lead_pipeline_id ON web_forms(lead_pipeline_id);

-- ----------------------------------------------------------
-- Table: web_form_attributes
-- ----------------------------------------------------------
CREATE TABLE web_form_attributes (
    id SERIAL PRIMARY KEY,
    name character varying(255) DEFAULT NULL,
    placeholder character varying(255) DEFAULT NULL,
    is_required boolean NOT NULL DEFAULT false,
    is_hidden boolean NOT NULL DEFAULT false,
    sort_order integer DEFAULT NULL,
    attribute_id integer NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
    web_form_id integer NOT NULL REFERENCES web_forms(id) ON DELETE CASCADE
);
CREATE INDEX idx_web_form_attributes_attr_id ON web_form_attributes(attribute_id);
CREATE INDEX idx_web_form_attributes_form_id ON web_form_attributes(web_form_id);

-- ----------------------------------------------------------
-- Table: webhooks
-- ----------------------------------------------------------
CREATE TABLE webhooks (
    id BIGSERIAL PRIMARY KEY,
    name character varying(255) NOT NULL,
    entity_type character varying(100) NOT NULL,
    description character varying(500) DEFAULT NULL,
    method character varying(10) NOT NULL,
    end_point character varying(500) NOT NULL,
    query_params JSONB DEFAULT NULL,
    headers JSONB DEFAULT NULL,
    payload_type character varying(50) NOT NULL,
    raw_payload_type character varying(50) NOT NULL,
    payload JSONB DEFAULT NULL,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);

-- ----------------------------------------------------------
-- Table: workflows
-- ----------------------------------------------------------
CREATE TABLE workflows (
    id SERIAL PRIMARY KEY,
    name character varying(255) NOT NULL,
    description character varying(500) DEFAULT NULL,
    entity_type character varying(100) NOT NULL,
    event character varying(100) NOT NULL,
    condition_type character varying(20) NOT NULL DEFAULT 'and',
    conditions JSONB DEFAULT NULL,
    actions JSONB DEFAULT NULL,
    created_at timestamp without time zone DEFAULT NULL,
    updated_at timestamp without time zone DEFAULT NULL
);
