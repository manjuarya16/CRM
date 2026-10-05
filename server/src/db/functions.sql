-- ==========================================================
-- CRM PostgreSQL Stored Functions
-- Modules: Leads, Products
-- Convention: No raw SQL in services -- only fn_* calls
-- ==========================================================

-- ----------------------------------------------------------
-- LEADS FUNCTIONS
-- ----------------------------------------------------------

-- Get all leads with pagination and search
CREATE OR REPLACE FUNCTION public.fn_get_all_leads(
    p_search                character varying DEFAULT '',
    p_page                  integer DEFAULT 1,
    p_limit                 integer DEFAULT 10,
    p_id                    integer DEFAULT NULL,
    p_lead_value            numeric DEFAULT NULL,
    p_user_id               integer DEFAULT NULL,
    p_person_id             integer DEFAULT NULL,
    p_lead_type_id          integer DEFAULT NULL,
    p_lead_source_id        integer DEFAULT NULL,
    p_expected_close_date   date DEFAULT NULL,
    p_created_at            date DEFAULT NULL
)
RETURNS TABLE (
    id                      integer,
    title                   character varying,
    description             text,
    lead_value              numeric,
    status                  boolean,
    lost_reason             character varying,
    closed_at               timestamp without time zone,
    user_id                 integer,
    person_id               integer,
    lead_source_id          integer,
    lead_type_id            integer,
    lead_pipeline_id        integer,
    lead_pipeline_stage_id  integer,
    expected_close_date     date,
    created_at              timestamp without time zone,
    updated_at              timestamp without time zone,
    person_name             character varying,
    source_name             character varying,
    stage_name              character varying,
    pipeline_name           character varying,
    type_name               character varying,
    total_count             bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    v_page   integer := COALESCE(p_page, 1);
    v_limit  integer := COALESCE(p_limit, 10);
    v_offset integer;
BEGIN
    IF v_page < 1 THEN v_page := 1; END IF;
    IF v_limit < 1 THEN v_limit := 10; END IF;
    v_offset := (v_page - 1) * v_limit;

    RETURN QUERY
    SELECT
        l.id::integer,
        l.title::character varying,
        l.description::text,
        l.lead_value::numeric,
        l.status::boolean,
        l.lost_reason::character varying,
        l.closed_at::timestamp without time zone,
        l.user_id::integer,
        l.person_id::integer,
        l.lead_source_id::integer,
        l.lead_type_id::integer,
        l.lead_pipeline_id::integer,
        l.lead_pipeline_stage_id::integer,
        l.expected_close_date::date,
        l.created_at::timestamp without time zone,
        l.updated_at::timestamp without time zone,
        p.name::character varying                  AS person_name,
        ls.name::character varying                 AS source_name,
        lps.name::character varying                AS stage_name,
        lp.name::character varying                 AS pipeline_name,
        lt.name::character varying                 AS type_name,
        COUNT(*) OVER()::bigint                    AS total_count
    FROM leads l
    LEFT JOIN persons p                 ON p.id = l.person_id
    LEFT JOIN lead_sources ls           ON ls.id = l.lead_source_id
    LEFT JOIN lead_pipeline_stages lps  ON lps.id = l.lead_pipeline_stage_id
    LEFT JOIN lead_pipelines lp         ON lp.id = l.lead_pipeline_id
    LEFT JOIN lead_types lt             ON lt.id = l.lead_type_id
    WHERE
        (p_search IS NULL OR p_search = '' OR l.title ILIKE '%' || p_search || '%' OR p.name ILIKE '%' || p_search || '%')
        AND (p_id IS NULL OR l.id = p_id)
        AND (p_lead_value IS NULL OR l.lead_value >= p_lead_value)
        AND (p_user_id IS NULL OR l.user_id = p_user_id)
        AND (p_person_id IS NULL OR l.person_id = p_person_id)
        AND (p_lead_type_id IS NULL OR l.lead_type_id = p_lead_type_id)
        AND (p_lead_source_id IS NULL OR l.lead_source_id = p_lead_source_id)
        AND (p_expected_close_date IS NULL OR l.expected_close_date = p_expected_close_date)
        AND (p_created_at IS NULL OR DATE(l.created_at) = p_created_at)
    ORDER BY l.id DESC
    LIMIT v_limit
    OFFSET v_offset;
END;
$func$;


-- Get single lead by ID
CREATE OR REPLACE FUNCTION public.fn_get_lead_by_id(
    p_id integer
)
RETURNS TABLE (
    id                      integer,
    title                   character varying,
    description             text,
    lead_value              numeric,
    status                  boolean,
    lost_reason             character varying,
    closed_at               timestamp without time zone,
    user_id                 integer,
    person_id               integer,
    lead_source_id          integer,
    lead_type_id            integer,
    lead_pipeline_id        integer,
    lead_pipeline_stage_id  integer,
    expected_close_date     date,
    created_at              timestamp without time zone,
    updated_at              timestamp without time zone,
    person_name             character varying,
    source_name             character varying,
    stage_name              character varying,
    pipeline_name           character varying,
    type_name               character varying
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    RETURN QUERY
    SELECT
        l.id::integer,
        l.title::character varying,
        l.description::text,
        l.lead_value::numeric,
        l.status::boolean,
        l.lost_reason::character varying,
        l.closed_at::timestamp without time zone,
        l.user_id::integer,
        l.person_id::integer,
        l.lead_source_id::integer,
        l.lead_type_id::integer,
        l.lead_pipeline_id::integer,
        l.lead_pipeline_stage_id::integer,
        l.expected_close_date::date,
        l.created_at::timestamp without time zone,
        l.updated_at::timestamp without time zone,
        p.name::character varying                  AS person_name,
        ls.name::character varying                 AS source_name,
        lps.name::character varying                AS stage_name,
        lp.name::character varying                 AS pipeline_name,
        lt.name::character varying                 AS type_name
    FROM leads l
    LEFT JOIN persons p                 ON p.id = l.person_id
    LEFT JOIN lead_sources ls           ON ls.id = l.lead_source_id
    LEFT JOIN lead_pipeline_stages lps  ON lps.id = l.lead_pipeline_stage_id
    LEFT JOIN lead_pipelines lp         ON lp.id = l.lead_pipeline_id
    LEFT JOIN lead_types lt             ON lt.id = l.lead_type_id
    WHERE l.id = p_id;
END;
$func$;

-- Create lead
CREATE OR REPLACE FUNCTION public.fn_create_lead(
    p_title                 character varying,
    p_description           text             DEFAULT NULL,
    p_lead_value            numeric          DEFAULT NULL,
    p_user_id               integer          DEFAULT NULL,
    p_person_id             integer          DEFAULT NULL,
    p_lead_source_id        integer          DEFAULT NULL,
    p_lead_type_id          integer          DEFAULT NULL,
    p_lead_pipeline_id      integer          DEFAULT NULL,
    p_expected_close_date   date             DEFAULT NULL
)
RETURNS SETOF leads
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    v_id integer;
BEGIN
    INSERT INTO leads (
        title, description, lead_value,
        user_id, person_id, lead_source_id, lead_type_id,
        lead_pipeline_id, expected_close_date,
        status, created_at, updated_at
    ) VALUES (
        p_title, p_description, p_lead_value,
        p_user_id, p_person_id, p_lead_source_id, p_lead_type_id,
        p_lead_pipeline_id, p_expected_close_date,
        true, NOW(), NOW()
    )
    RETURNING id INTO v_id;

    RETURN QUERY SELECT * FROM leads WHERE id = v_id;
END;
$func$;

-- Update lead
CREATE OR REPLACE FUNCTION public.fn_update_lead(
    p_id                        integer,
    p_title                     character varying DEFAULT NULL,
    p_description               text             DEFAULT NULL,
    p_lead_value                numeric          DEFAULT NULL,
    p_status                    boolean          DEFAULT NULL,
    p_lost_reason               character varying DEFAULT NULL,
    p_user_id                   integer          DEFAULT NULL,
    p_person_id                 integer          DEFAULT NULL,
    p_lead_source_id            integer          DEFAULT NULL,
    p_lead_type_id              integer          DEFAULT NULL,
    p_lead_pipeline_id          integer          DEFAULT NULL,
    p_lead_pipeline_stage_id    integer          DEFAULT NULL,
    p_expected_close_date       date             DEFAULT NULL
)
RETURNS TABLE (
    id                      integer,
    title                   character varying,
    description             text,
    lead_value              numeric,
    status                  boolean,
    lost_reason             character varying,
    closed_at               timestamp without time zone,
    user_id                 integer,
    person_id               integer,
    lead_source_id          integer,
    lead_type_id            integer,
    lead_pipeline_id        integer,
    lead_pipeline_stage_id  integer,
    expected_close_date     date,
    created_at              timestamp without time zone,
    updated_at              timestamp without time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    v_rec leads%ROWTYPE;
BEGIN
    SELECT * INTO v_rec FROM leads WHERE leads.id = p_id;

    UPDATE leads SET
        title                   = COALESCE(p_title,                  v_rec.title),
        description             = COALESCE(p_description,            v_rec.description),
        lead_value              = COALESCE(p_lead_value,             v_rec.lead_value),
        status                  = COALESCE(p_status,                 v_rec.status),
        lost_reason             = COALESCE(p_lost_reason,            v_rec.lost_reason),
        user_id                 = COALESCE(p_user_id,                v_rec.user_id),
        person_id               = COALESCE(p_person_id,              v_rec.person_id),
        lead_source_id          = COALESCE(p_lead_source_id,         v_rec.lead_source_id),
        lead_type_id            = COALESCE(p_lead_type_id,           v_rec.lead_type_id),
        lead_pipeline_id        = COALESCE(p_lead_pipeline_id,       v_rec.lead_pipeline_id),
        lead_pipeline_stage_id  = COALESCE(p_lead_pipeline_stage_id, v_rec.lead_pipeline_stage_id),
        expected_close_date     = COALESCE(p_expected_close_date,    v_rec.expected_close_date),
        updated_at              = NOW()
    WHERE leads.id = p_id;

    RETURN QUERY
    SELECT
        r.id::integer,
        r.title::character varying,
        r.description::text,
        r.lead_value::numeric,
        r.status::boolean,
        r.lost_reason::character varying,
        r.closed_at::timestamp without time zone,
        r.user_id::integer,
        r.person_id::integer,
        r.lead_source_id::integer,
        r.lead_type_id::integer,
        r.lead_pipeline_id::integer,
        r.lead_pipeline_stage_id::integer,
        r.expected_close_date::date,
        r.created_at::timestamp without time zone,
        r.updated_at::timestamp without time zone
    FROM (SELECT * FROM leads WHERE leads.id = p_id) r;
END;
$func$;

-- Delete lead
CREATE OR REPLACE FUNCTION public.fn_delete_lead(
    p_id integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    v_count integer;
BEGIN
    DELETE FROM leads WHERE id = p_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count > 0;
END;
$func$;

-- Get lead sources (dropdown)
CREATE OR REPLACE FUNCTION public.fn_get_lead_sources()
RETURNS SETOF lead_sources
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    RETURN QUERY SELECT * FROM lead_sources ORDER BY name ASC;
END;
$func$;

-- Get lead types (dropdown)
CREATE OR REPLACE FUNCTION public.fn_get_lead_types()
RETURNS SETOF lead_types
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    RETURN QUERY SELECT * FROM lead_types ORDER BY name ASC;
END;
$func$;

-- Get lead pipelines (dropdown)
CREATE OR REPLACE FUNCTION public.fn_get_lead_pipelines()
RETURNS SETOF lead_pipelines
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    RETURN QUERY SELECT * FROM lead_pipelines ORDER BY is_default DESC, name ASC;
END;
$func$;

-- Get pipeline stages by pipeline id (dropdown)
CREATE OR REPLACE FUNCTION public.fn_get_pipeline_stages(
    p_pipeline_id integer DEFAULT NULL
)
RETURNS SETOF lead_pipeline_stages
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    IF p_pipeline_id IS NOT NULL THEN
        RETURN QUERY
            SELECT * FROM lead_pipeline_stages
            WHERE lead_pipeline_id = p_pipeline_id
            ORDER BY sort_order ASC;
    ELSE
        RETURN QUERY
            SELECT * FROM lead_pipeline_stages
            ORDER BY lead_pipeline_id ASC, sort_order ASC;
    END IF;
END;
$func$;

-- ----------------------------------------------------------
-- PRODUCTS FUNCTIONS
-- ----------------------------------------------------------

-- Get all products with pagination and search
CREATE OR REPLACE FUNCTION public.fn_get_all_products(
    p_search    character varying DEFAULT '',
    p_page      integer DEFAULT 1,
    p_limit     integer DEFAULT 10
)
RETURNS TABLE (
    id          integer,
    sku         character varying,
    name        character varying,
    description text,
    quantity    integer,
    price       numeric,
    created_at  timestamp without time zone,
    updated_at  timestamp without time zone,
    total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    v_page   integer := COALESCE(p_page, 1);
    v_limit  integer := COALESCE(p_limit, 10);
    v_offset integer;
BEGIN
    IF v_page < 1 THEN v_page := 1; END IF;
    IF v_limit < 1 THEN v_limit := 10; END IF;
    v_offset := (v_page - 1) * v_limit;

    RETURN QUERY
    SELECT
        p.id::integer,
        p.sku::character varying,
        p.name::character varying,
        p.description::text,
        p.quantity::integer,
        p.price::numeric,
        p.created_at::timestamp without time zone,
        p.updated_at::timestamp without time zone,
        COUNT(*) OVER()::bigint AS total_count
    FROM products p
    WHERE
        (p_search IS NULL OR p_search = ''
         OR p.name ILIKE '%' || p_search || '%'
         OR p.sku  ILIKE '%' || p_search || '%')
    ORDER BY p.id DESC
    LIMIT v_limit
    OFFSET v_offset;
END;
$func$;

-- Get single product by ID
CREATE OR REPLACE FUNCTION public.fn_get_product_by_id(
    p_id integer
)
RETURNS SETOF products
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    RETURN QUERY SELECT * FROM products WHERE id = p_id;
END;
$func$;

-- Create product
CREATE OR REPLACE FUNCTION public.fn_create_product(
    p_sku         character varying,
    p_name        character varying DEFAULT NULL,
    p_description text              DEFAULT NULL,
    p_quantity    integer           DEFAULT 0,
    p_price       numeric           DEFAULT NULL
)
RETURNS SETOF products
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    v_id integer;
BEGIN
    INSERT INTO products (sku, name, description, quantity, price, created_at, updated_at)
    VALUES (p_sku, p_name, p_description, COALESCE(p_quantity, 0), p_price, NOW(), NOW())
    RETURNING id INTO v_id;

    RETURN QUERY SELECT * FROM products WHERE id = v_id;
END;
$func$;

-- Update product
CREATE OR REPLACE FUNCTION public.fn_update_product(
    p_id          integer,
    p_sku         character varying DEFAULT NULL,
    p_name        character varying DEFAULT NULL,
    p_description text              DEFAULT NULL,
    p_quantity    integer           DEFAULT NULL,
    p_price       numeric           DEFAULT NULL
)
RETURNS SETOF products
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    UPDATE products SET
        sku         = COALESCE(p_sku, sku),
        name        = COALESCE(p_name, name),
        description = COALESCE(p_description, description),
        quantity    = COALESCE(p_quantity, quantity),
        price       = COALESCE(p_price, price),
        updated_at  = NOW()
    WHERE id = p_id;

    RETURN QUERY SELECT * FROM products WHERE id = p_id;
END;
$func$;

-- Delete product
CREATE OR REPLACE FUNCTION public.fn_delete_product(
    p_id integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    v_count integer;
BEGIN
    DELETE FROM products WHERE id = p_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count > 0;
END;
$func$;

-- ==========================================================
-- ACTIVITIES FUNCTIONS
-- ==========================================================

-- Get all activities with pagination and search
CREATE OR REPLACE FUNCTION public.fn_get_all_activities(
    p_search character varying DEFAULT NULL,
    p_page   integer           DEFAULT 1,
    p_limit  integer           DEFAULT 10,
    p_lead_id integer          DEFAULT NULL,
    p_person_id integer        DEFAULT NULL
)
RETURNS TABLE (
    id             integer,
    title          character varying,
    type           character varying,
    comment        text,
    schedule_from  timestamp without time zone,
    schedule_to    timestamp without time zone,
    is_done        boolean,
    location       character varying,
    user_id        integer,
    user_name      character varying,
    lead_id        integer,
    lead_title     character varying,
    person_id      integer,
    created_at     timestamp without time zone,
    updated_at     timestamp without time zone,
    total_count    bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    v_page   integer := COALESCE(p_page, 1);
    v_limit  integer := COALESCE(p_limit, 10);
    v_offset integer;
BEGIN
    IF v_page < 1 THEN v_page := 1; END IF;
    IF v_limit < 1 THEN v_limit := 10; END IF;
    v_offset := (v_page - 1) * v_limit;

    RETURN QUERY
    SELECT
        a.id::integer,
        a.title::character varying,
        a.type::character varying,
        a.comment::text,
        a.schedule_from::timestamp without time zone,
        a.schedule_to::timestamp without time zone,
        a.is_done::boolean,
        a.location::character varying,
        a.user_id::integer,
        u.name::character varying AS user_name,
        la.lead_id::integer,
        l.title::character varying AS lead_title,
        pa.person_id::integer,
        a.created_at::timestamp without time zone,
        a.updated_at::timestamp without time zone,
        COUNT(*) OVER()::bigint AS total_count
    FROM activities a
    LEFT JOIN users u ON u.id = a.user_id
    LEFT JOIN LATERAL (SELECT lead_activities.lead_id FROM lead_activities WHERE lead_activities.activity_id = a.id LIMIT 1) la ON true
    LEFT JOIN leads l ON l.id = la.lead_id
    LEFT JOIN LATERAL (SELECT person_activities.person_id FROM person_activities WHERE person_activities.activity_id = a.id LIMIT 1) pa ON true
    WHERE
        (p_search IS NULL OR p_search = '' OR a.title ILIKE '%' || p_search || '%' OR a.type ILIKE '%' || p_search || '%')
        AND (p_lead_id IS NULL OR la.lead_id = p_lead_id)
        AND (p_person_id IS NULL OR pa.person_id = p_person_id)
    ORDER BY a.id DESC
    LIMIT v_limit
    OFFSET v_offset;
END;
$func$;

-- Get activity by ID
CREATE OR REPLACE FUNCTION public.fn_get_activity_by_id(
    p_id integer
)
RETURNS TABLE (
    id             integer,
    title          character varying,
    type           character varying,
    comment        text,
    schedule_from  timestamp without time zone,
    schedule_to    timestamp without time zone,
    is_done        boolean,
    location       character varying,
    user_id        integer,
    user_name      character varying,
    lead_id        integer,
    person_id      integer,
    created_at     timestamp without time zone,
    updated_at     timestamp without time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    RETURN QUERY
    SELECT
        a.id::integer,
        a.title::character varying,
        a.type::character varying,
        a.comment::text,
        a.schedule_from::timestamp without time zone,
        a.schedule_to::timestamp without time zone,
        a.is_done::boolean,
        a.location::character varying,
        a.user_id::integer,
        u.name::character varying AS user_name,
        la.lead_id::integer,
        pa.person_id::integer,
        a.created_at::timestamp without time zone,
        a.updated_at::timestamp without time zone
    FROM activities a
    LEFT JOIN users u ON u.id = a.user_id
    LEFT JOIN LATERAL (SELECT lead_activities.lead_id FROM lead_activities WHERE lead_activities.activity_id = a.id LIMIT 1) la ON true
    LEFT JOIN LATERAL (SELECT person_activities.person_id FROM person_activities WHERE person_activities.activity_id = a.id LIMIT 1) pa ON true
    WHERE a.id = p_id;
END;
$func$;

-- Create activity
CREATE OR REPLACE FUNCTION public.fn_create_activity(
    p_title         character varying DEFAULT NULL,
    p_type          character varying DEFAULT 'call',
    p_comment       text              DEFAULT NULL,
    p_schedule_from timestamp without time zone DEFAULT NULL,
    p_schedule_to   timestamp without time zone DEFAULT NULL,
    p_is_done       boolean           DEFAULT false,
    p_user_id       integer           DEFAULT NULL,
    p_location      character varying DEFAULT NULL,
    p_lead_id       integer           DEFAULT NULL,
    p_person_id     integer           DEFAULT NULL
)
RETURNS TABLE (
    id             integer,
    title          character varying,
    type           character varying,
    comment        text,
    schedule_from  timestamp without time zone,
    schedule_to    timestamp without time zone,
    is_done        boolean,
    location       character varying,
    user_id        integer,
    user_name      character varying,
    lead_id        integer,
    person_id      integer,
    created_at     timestamp without time zone,
    updated_at     timestamp without time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    v_id integer;
BEGIN
    INSERT INTO activities (
        title, type, comment, schedule_from, schedule_to, is_done, user_id, location, created_at, updated_at
    ) VALUES (
        p_title, p_type, p_comment, p_schedule_from, p_schedule_to, COALESCE(p_is_done, false), p_user_id, p_location, NOW(), NOW()
    )
    RETURNING activities.id INTO v_id;

    IF p_lead_id IS NOT NULL THEN
        INSERT INTO lead_activities (activity_id, lead_id) VALUES (v_id, p_lead_id);
    END IF;

    IF p_person_id IS NOT NULL THEN
        INSERT INTO person_activities (activity_id, person_id) VALUES (v_id, p_person_id);
    END IF;

    RETURN QUERY
    SELECT * FROM public.fn_get_activity_by_id(v_id);
END;
$func$;

-- Update activity
CREATE OR REPLACE FUNCTION public.fn_update_activity(
    p_id            integer,
    p_title         character varying DEFAULT NULL,
    p_type          character varying DEFAULT NULL,
    p_comment       text              DEFAULT NULL,
    p_schedule_from timestamp without time zone DEFAULT NULL,
    p_schedule_to   timestamp without time zone DEFAULT NULL,
    p_is_done       boolean           DEFAULT NULL,
    p_user_id       integer           DEFAULT NULL,
    p_location      character varying DEFAULT NULL
)
RETURNS TABLE (
    id             integer,
    title          character varying,
    type           character varying,
    comment        text,
    schedule_from  timestamp without time zone,
    schedule_to    timestamp without time zone,
    is_done        boolean,
    location       character varying,
    user_id        integer,
    user_name      character varying,
    created_at     timestamp without time zone,
    updated_at     timestamp without time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    v_rec activities%ROWTYPE;
BEGIN
    SELECT * INTO v_rec FROM activities WHERE activities.id = p_id;

    UPDATE activities SET
        title         = COALESCE(p_title, v_rec.title),
        type          = COALESCE(p_type, v_rec.type),
        comment       = COALESCE(p_comment, v_rec.comment),
        schedule_from = COALESCE(p_schedule_from, v_rec.schedule_from),
        schedule_to   = COALESCE(p_schedule_to, v_rec.schedule_to),
        is_done       = COALESCE(p_is_done, v_rec.is_done),
        user_id       = COALESCE(p_user_id, v_rec.user_id),
        location      = COALESCE(p_location, v_rec.location),
        updated_at    = NOW()
    WHERE activities.id = p_id;

    RETURN QUERY
    SELECT
        r.id::integer,
        r.title::character varying,
        r.type::character varying,
        r.comment::text,
        r.schedule_from::timestamp without time zone,
        r.schedule_to::timestamp without time zone,
        r.is_done::boolean,
        r.location::character varying,
        r.user_id::integer,
        u.name::character varying AS user_name,
        r.created_at::timestamp without time zone,
        r.updated_at::timestamp without time zone
    FROM (SELECT * FROM activities WHERE activities.id = p_id) r
    LEFT JOIN users u ON u.id = r.user_id;
END;
$func$;

-- Delete activity
CREATE OR REPLACE FUNCTION public.fn_delete_activity(
    p_id integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    v_count integer;
BEGIN
    DELETE FROM activities WHERE id = p_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count > 0;
END;
$func$;


-- ==========================================================
-- QUOTES FUNCTIONS
-- ==========================================================

-- Get all quotes with pagination and search
CREATE OR REPLACE FUNCTION public.fn_get_all_quotes(
    p_search    character varying DEFAULT '',
    p_page      integer DEFAULT 1,
    p_limit     integer DEFAULT 10
)
RETURNS TABLE (
    id                 integer,
    subject            character varying,
    description        text,
    discount_percent   numeric,
    discount_amount    numeric,
    tax_amount         numeric,
    adjustment_amount  numeric,
    sub_total          numeric,
    grand_total        numeric,
    expired_at         timestamp without time zone,
    person_id          integer,
    user_id            integer,
    person_name        character varying,
    user_name          character varying,
    created_at         timestamp without time zone,
    updated_at         timestamp without time zone,
    total_count        bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    v_page   integer := COALESCE(p_page, 1);
    v_limit  integer := COALESCE(p_limit, 10);
    v_offset integer;
BEGIN
    IF v_page < 1 THEN v_page := 1; END IF;
    IF v_limit < 1 THEN v_limit := 10; END IF;
    v_offset := (v_page - 1) * v_limit;

    RETURN QUERY
    SELECT
        q.id::integer,
        q.subject::character varying,
        q.description::text,
        q.discount_percent::numeric,
        q.discount_amount::numeric,
        q.tax_amount::numeric,
        q.adjustment_amount::numeric,
        q.sub_total::numeric,
        q.grand_total::numeric,
        q.expired_at::timestamp without time zone,
        q.person_id::integer,
        q.user_id::integer,
        p.name::character varying AS person_name,
        u.name::character varying AS user_name,
        q.created_at::timestamp without time zone,
        q.updated_at::timestamp without time zone,
        COUNT(*) OVER()::bigint AS total_count
    FROM quotes q
    LEFT JOIN persons p ON p.id = q.person_id
    LEFT JOIN users u ON u.id = q.user_id
    WHERE
        (p_search IS NULL OR p_search = '' OR q.subject ILIKE '%' || p_search || '%')
    ORDER BY q.id DESC
    LIMIT v_limit
    OFFSET v_offset;
END;
$func$;

-- Get quote by ID
CREATE OR REPLACE FUNCTION public.fn_get_quote_by_id(
    p_id integer
)
RETURNS TABLE (
    id                 integer,
    subject            character varying,
    description        text,
    discount_percent   numeric,
    discount_amount    numeric,
    tax_amount         numeric,
    adjustment_amount  numeric,
    sub_total          numeric,
    grand_total        numeric,
    expired_at         timestamp without time zone,
    person_id          integer,
    user_id            integer,
    person_name        character varying,
    user_name          character varying,
    lead_id            integer,
    created_at         timestamp without time zone,
    updated_at         timestamp without time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    RETURN QUERY
    SELECT
        q.id::integer,
        q.subject::character varying,
        q.description::text,
        q.discount_percent::numeric,
        q.discount_amount::numeric,
        q.tax_amount::numeric,
        q.adjustment_amount::numeric,
        q.sub_total::numeric,
        q.grand_total::numeric,
        q.expired_at::timestamp without time zone,
        q.person_id::integer,
        q.user_id::integer,
        p.name::character varying AS person_name,
        u.name::character varying AS user_name,
        lq.lead_id::integer,
        q.created_at::timestamp without time zone,
        q.updated_at::timestamp without time zone
    FROM quotes q
    LEFT JOIN persons p ON p.id = q.person_id
    LEFT JOIN users u ON u.id = q.user_id
    LEFT JOIN LATERAL (SELECT lead_quotes.lead_id FROM lead_quotes WHERE lead_quotes.quote_id = q.id LIMIT 1) lq ON true
    WHERE q.id = p_id;
END;
$func$;

-- Create quote
CREATE OR REPLACE FUNCTION public.fn_create_quote(
    p_subject           character varying,
    p_description       text              DEFAULT NULL,
    p_person_id         integer           DEFAULT NULL,
    p_user_id           integer           DEFAULT NULL,
    p_discount_percent  numeric           DEFAULT 0,
    p_discount_amount   numeric           DEFAULT 0,
    p_tax_amount        numeric           DEFAULT 0,
    p_adjustment_amount numeric           DEFAULT 0,
    p_sub_total         numeric           DEFAULT 0,
    p_grand_total       numeric           DEFAULT 0,
    p_expired_at        timestamp without time zone DEFAULT NULL
)
RETURNS TABLE (
    id                 integer,
    subject            character varying,
    description        text,
    discount_percent   numeric,
    discount_amount    numeric,
    tax_amount         numeric,
    adjustment_amount  numeric,
    sub_total          numeric,
    grand_total        numeric,
    expired_at         timestamp without time zone,
    person_id          integer,
    user_id            integer,
    person_name        character varying,
    user_name          character varying,
    lead_id            integer,
    created_at         timestamp without time zone,
    updated_at         timestamp without time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    v_id integer;
BEGIN
    INSERT INTO quotes (
        subject, description, person_id, user_id, discount_percent, discount_amount,
        tax_amount, adjustment_amount, sub_total, grand_total, expired_at, created_at, updated_at
    ) VALUES (
        p_subject, p_description, p_person_id, p_user_id, COALESCE(p_discount_percent, 0), COALESCE(p_discount_amount, 0),
        COALESCE(p_tax_amount, 0), COALESCE(p_adjustment_amount, 0), COALESCE(p_sub_total, 0), COALESCE(p_grand_total, 0),
        p_expired_at, NOW(), NOW()
    )
    RETURNING quotes.id INTO v_id;

    RETURN QUERY
    SELECT * FROM public.fn_get_quote_by_id(v_id);
END;
$func$;

-- Update quote
CREATE OR REPLACE FUNCTION public.fn_update_quote(
    p_id                integer,
    p_subject           character varying DEFAULT NULL,
    p_description       text              DEFAULT NULL,
    p_person_id         integer           DEFAULT NULL,
    p_user_id           integer           DEFAULT NULL,
    p_discount_percent  numeric           DEFAULT NULL,
    p_discount_amount   numeric           DEFAULT NULL,
    p_tax_amount        numeric           DEFAULT NULL,
    p_adjustment_amount numeric           DEFAULT NULL,
    p_sub_total         numeric           DEFAULT NULL,
    p_grand_total       numeric           DEFAULT NULL,
    p_expired_at        timestamp without time zone DEFAULT NULL
)
RETURNS TABLE (
    id                 integer,
    subject            character varying,
    description        text,
    discount_percent   numeric,
    discount_amount    numeric,
    tax_amount         numeric,
    adjustment_amount  numeric,
    sub_total          numeric,
    grand_total        numeric,
    expired_at         timestamp without time zone,
    person_id          integer,
    user_id            integer,
    person_name        character varying,
    user_name          character varying,
    created_at         timestamp without time zone,
    updated_at         timestamp without time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    v_rec quotes%ROWTYPE;
BEGIN
    SELECT * INTO v_rec FROM quotes WHERE quotes.id = p_id;

    UPDATE quotes SET
        subject           = COALESCE(p_subject,           v_rec.subject),
        description       = COALESCE(p_description,       v_rec.description),
        person_id         = COALESCE(p_person_id,         v_rec.person_id),
        user_id           = COALESCE(p_user_id,           v_rec.user_id),
        discount_percent  = COALESCE(p_discount_percent,  v_rec.discount_percent),
        discount_amount   = COALESCE(p_discount_amount,   v_rec.discount_amount),
        tax_amount        = COALESCE(p_tax_amount,        v_rec.tax_amount),
        adjustment_amount = COALESCE(p_adjustment_amount, v_rec.adjustment_amount),
        sub_total         = COALESCE(p_sub_total,         v_rec.sub_total),
        grand_total       = COALESCE(p_grand_total,       v_rec.grand_total),
        expired_at        = COALESCE(p_expired_at,        v_rec.expired_at),
        updated_at        = NOW()
    WHERE quotes.id = p_id;

    RETURN QUERY
    SELECT
        r.id::integer,
        r.subject::character varying,
        r.description::text,
        r.discount_percent::numeric,
        r.discount_amount::numeric,
        r.tax_amount::numeric,
        r.adjustment_amount::numeric,
        r.sub_total::numeric,
        r.grand_total::numeric,
        r.expired_at::timestamp without time zone,
        r.person_id::integer,
        r.user_id::integer,
        p.name::character varying AS person_name,
        u.name::character varying AS user_name,
        r.created_at::timestamp without time zone,
        r.updated_at::timestamp without time zone
    FROM (SELECT * FROM quotes WHERE quotes.id = p_id) r
    LEFT JOIN persons p ON p.id = r.person_id
    LEFT JOIN users u ON u.id = r.user_id;
END;
$func$;

-- Delete quote
CREATE OR REPLACE FUNCTION public.fn_delete_quote(
    p_id integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    v_count integer;
BEGIN
    DELETE FROM quotes WHERE id = p_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count > 0;
END;
$func$;

-- Get quote items
CREATE OR REPLACE FUNCTION public.fn_get_quote_items(
    p_quote_id integer
)
RETURNS SETOF quote_items
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    RETURN QUERY SELECT * FROM quote_items WHERE quote_items.quote_id = p_quote_id ORDER BY id ASC;
END;
$func$;

-- Add quote item
CREATE OR REPLACE FUNCTION public.fn_add_quote_item(
    p_quote_id         integer,
    p_product_id       integer,
    p_sku              character varying DEFAULT NULL,
    p_name             character varying DEFAULT NULL,
    p_quantity         integer DEFAULT 1,
    p_price            numeric DEFAULT 0,
    p_discount_percent numeric DEFAULT 0,
    p_tax_percent      numeric DEFAULT 0
)
RETURNS SETOF quote_items
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    v_disc_amount numeric := 0;
    v_tax_amount  numeric := 0;
    v_subtotal    numeric := 0;
    v_total       numeric := 0;
    v_item_id     integer;
BEGIN
    v_subtotal := COALESCE(p_quantity, 1) * COALESCE(p_price, 0);
    v_disc_amount := v_subtotal * (COALESCE(p_discount_percent, 0) / 100.0);
    v_tax_amount  := (v_subtotal - v_disc_amount) * (COALESCE(p_tax_percent, 0) / 100.0);
    v_total       := (v_subtotal - v_disc_amount) + v_tax_amount;

    INSERT INTO quote_items (
        quote_id, product_id, sku, name, quantity, price, discount_percent, discount_amount, tax_percent, tax_amount, total, created_at, updated_at
    ) VALUES (
        p_quote_id, p_product_id, p_sku, p_name, COALESCE(p_quantity, 1), COALESCE(p_price, 0),
        COALESCE(p_discount_percent, 0), v_disc_amount, COALESCE(p_tax_percent, 0), v_tax_amount, v_total, NOW(), NOW()
    )
    RETURNING quote_items.id INTO v_item_id;

    RETURN QUERY SELECT * FROM quote_items WHERE quote_items.id = v_item_id;
END;
$func$;

-- Delete quote item
CREATE OR REPLACE FUNCTION public.fn_delete_quote_item(
    p_id integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    v_count integer;
BEGIN
    DELETE FROM quote_items WHERE id = p_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count > 0;
END;
$func$;

-- ==========================================================
-- LEAD PRODUCTS & STAGE STEPPER FUNCTIONS
-- ==========================================================

-- Get lead products
CREATE OR REPLACE FUNCTION public.fn_get_lead_products(
    p_lead_id integer
)
RETURNS TABLE (
    id           integer,
    lead_id      integer,
    product_id   integer,
    product_name character varying,
    sku          character varying,
    quantity     integer,
    price        numeric,
    amount       numeric,
    created_at   timestamp without time zone,
    updated_at   timestamp without time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    RETURN QUERY
    SELECT
        lp.id::integer,
        lp.lead_id::integer,
        lp.product_id::integer,
        p.name::character varying AS product_name,
        p.sku::character varying  AS sku,
        lp.quantity::integer,
        lp.price::numeric,
        lp.amount::numeric,
        lp.created_at::timestamp without time zone,
        lp.updated_at::timestamp without time zone
    FROM lead_products lp
    JOIN products p ON p.id = lp.product_id
    WHERE lp.lead_id = p_lead_id
    ORDER BY lp.id ASC;
END;
$func$;

-- Add product to lead
CREATE OR REPLACE FUNCTION public.fn_add_lead_product(
    p_lead_id    integer,
    p_product_id integer,
    p_quantity   integer DEFAULT 1,
    p_price      numeric DEFAULT NULL
)
RETURNS TABLE (
    id           integer,
    lead_id      integer,
    product_id   integer,
    product_name character varying,
    sku          character varying,
    quantity     integer,
    price        numeric,
    amount       numeric,
    created_at   timestamp without time zone,
    updated_at   timestamp without time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    v_price  numeric;
    v_qty    integer := COALESCE(p_quantity, 1);
    v_amount numeric;
    v_id     integer;
BEGIN
    IF p_price IS NULL THEN
        SELECT products.price INTO v_price FROM products WHERE products.id = p_product_id;
    ELSE
        v_price := p_price;
    END IF;
    v_price := COALESCE(v_price, 0);
    v_amount := v_qty * v_price;

    INSERT INTO lead_products (lead_id, product_id, quantity, price, amount, created_at, updated_at)
    VALUES (p_lead_id, p_product_id, v_qty, v_price, v_amount, NOW(), NOW())
    RETURNING lead_products.id INTO v_id;

    -- Update lead value
    UPDATE leads
    SET lead_value = (SELECT COALESCE(SUM(lp.amount), 0) FROM lead_products lp WHERE lp.lead_id = p_lead_id)
    WHERE leads.id = p_lead_id;

    RETURN QUERY
    SELECT
        res.id, res.lead_id, res.product_id, res.product_name, res.sku, res.quantity, res.price, res.amount, res.created_at, res.updated_at
    FROM public.fn_get_lead_products(p_lead_id) res WHERE res.id = v_id;
END;
$func$;

-- Delete product from lead
CREATE OR REPLACE FUNCTION public.fn_delete_lead_product(
    p_id integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    v_lead_id integer;
    v_count   integer;
BEGIN
    SELECT lp.lead_id INTO v_lead_id FROM lead_products lp WHERE lp.id = p_id;
    DELETE FROM lead_products WHERE lead_products.id = p_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;

    IF v_lead_id IS NOT NULL THEN
        UPDATE leads
        SET lead_value = (SELECT COALESCE(SUM(lp.amount), 0) FROM lead_products lp WHERE lp.lead_id = v_lead_id)
        WHERE leads.id = v_lead_id;
    END IF;

    RETURN v_count > 0;
END;
$func$;

-- Update lead stage (stepper navigation)
CREATE OR REPLACE FUNCTION public.fn_update_lead_stage(
    p_lead_id     integer,
    p_stage_id    integer,
    p_status      boolean           DEFAULT true,
    p_lost_reason character varying DEFAULT NULL
)
RETURNS TABLE (
    id                      integer,
    title                   character varying,
    description             text,
    lead_value              numeric,
    status                  boolean,
    lost_reason             character varying,
    closed_at               timestamp without time zone,
    user_id                 integer,
    person_id               integer,
    lead_source_id          integer,
    lead_type_id            integer,
    lead_pipeline_id        integer,
    lead_pipeline_stage_id  integer,
    expected_close_date     date,
    created_at              timestamp without time zone,
    updated_at              timestamp without time zone,
    person_name             character varying,
    source_name             character varying,
    stage_name              character varying,
    pipeline_name           character varying,
    type_name               character varying
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    v_pipeline_id integer;
BEGIN
    SELECT lps.lead_pipeline_id INTO v_pipeline_id FROM lead_pipeline_stages lps WHERE lps.id = p_stage_id;

    UPDATE leads
    SET
        lead_pipeline_stage_id = p_stage_id,
        lead_pipeline_id       = COALESCE(v_pipeline_id, leads.lead_pipeline_id),
        status                 = COALESCE(p_status, leads.status),
        lost_reason            = CASE WHEN p_status = false THEN p_lost_reason ELSE NULL END,
        closed_at              = CASE WHEN p_status = false THEN NOW() ELSE NULL END,
        updated_at             = NOW()
    WHERE leads.id = p_lead_id;

    RETURN QUERY SELECT * FROM public.fn_get_lead_by_id(p_lead_id);
END;
$func$;

-- Clear lead products
CREATE OR REPLACE FUNCTION public.fn_clear_lead_products(p_lead_id integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    DELETE FROM lead_products WHERE lead_id = p_lead_id;
    UPDATE leads
    SET lead_value = 0
    WHERE leads.id = p_lead_id;
    RETURN true;
END;
$func$;

-- Update lead custom attributes
CREATE OR REPLACE FUNCTION public.fn_update_lead_custom_attributes(p_lead_id integer, p_custom_attributes jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    UPDATE leads
    SET custom_attributes = p_custom_attributes
    WHERE id = p_lead_id;
    RETURN true;
END;
$func$;

-- Get leads for Kanban board view
CREATE OR REPLACE FUNCTION public.fn_get_leads_kanban(
    p_pipeline_id           integer DEFAULT NULL,
    p_search                character varying DEFAULT '',
    p_id                    integer DEFAULT NULL,
    p_lead_value            numeric DEFAULT NULL,
    p_user_id               integer DEFAULT NULL,
    p_person_id             integer DEFAULT NULL,
    p_lead_type_id          integer DEFAULT NULL,
    p_lead_source_id        integer DEFAULT NULL,
    p_expected_close_date   date DEFAULT NULL,
    p_created_at            date DEFAULT NULL
)
RETURNS TABLE (
    id                      integer,
    title                   character varying,
    description             text,
    lead_value              numeric,
    status                  boolean,
    lost_reason             character varying,
    closed_at               timestamp without time zone,
    user_id                 integer,
    person_id               integer,
    lead_source_id          integer,
    lead_type_id            integer,
    lead_pipeline_id        integer,
    lead_pipeline_stage_id  integer,
    expected_close_date     date,
    created_at              timestamp without time zone,
    updated_at              timestamp without time zone,
    person_name             character varying,
    source_name             character varying,
    stage_name              character varying,
    pipeline_name           character varying,
    type_name               character varying,
    user_name               character varying
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    RETURN QUERY
    SELECT
        l.id::integer,
        l.title::character varying,
        l.description::text,
        l.lead_value::numeric,
        l.status::boolean,
        l.lost_reason::character varying,
        l.closed_at::timestamp without time zone,
        l.user_id::integer,
        l.person_id::integer,
        l.lead_source_id::integer,
        l.lead_type_id::integer,
        l.lead_pipeline_id::integer,
        l.lead_pipeline_stage_id::integer,
        l.expected_close_date::date,
        l.created_at::timestamp without time zone,
        l.updated_at::timestamp without time zone,
        p.name::character varying                  AS person_name,
        ls.name::character varying                 AS source_name,
        lps.name::character varying                AS stage_name,
        lp.name::character varying                 AS pipeline_name,
        lt.name::character varying                 AS type_name,
        u.name::character varying                  AS user_name
    FROM leads l
    LEFT JOIN persons p                 ON p.id = l.person_id
    LEFT JOIN lead_sources ls           ON ls.id = l.lead_source_id
    LEFT JOIN lead_pipeline_stages lps  ON lps.id = l.lead_pipeline_stage_id
    LEFT JOIN lead_pipelines lp         ON lp.id = l.lead_pipeline_id
    LEFT JOIN lead_types lt             ON lt.id = l.lead_type_id
    LEFT JOIN users u                   ON u.id = l.user_id
    WHERE
        (p_pipeline_id IS NULL OR l.lead_pipeline_id = p_pipeline_id)
        AND (p_search IS NULL OR p_search = '' OR l.title ILIKE '%' || p_search || '%' OR p.name ILIKE '%' || p_search || '%')
        AND (p_id IS NULL OR l.id = p_id)
        AND (p_lead_value IS NULL OR l.lead_value >= p_lead_value)
        AND (p_user_id IS NULL OR l.user_id = p_user_id)
        AND (p_person_id IS NULL OR l.person_id = p_person_id)
        AND (p_lead_type_id IS NULL OR l.lead_type_id = p_lead_type_id)
        AND (p_lead_source_id IS NULL OR l.lead_source_id = p_lead_source_id)
        AND (p_expected_close_date IS NULL OR l.expected_close_date = p_expected_close_date)
        AND (p_created_at IS NULL OR DATE(l.created_at) = p_created_at)
    ORDER BY l.id DESC;
END;
$func$;


-- ----------------------------------------------------------
-- CORE CONFIG FUNCTIONS & TABLE
-- ----------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.core_config (
    id SERIAL PRIMARY KEY,
    code VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    channel VARCHAR(255) DEFAULT 'default',
    locale VARCHAR(255) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.core_config ADD COLUMN IF NOT EXISTS channel VARCHAR(255) DEFAULT 'default';
ALTER TABLE public.core_config ADD COLUMN IF NOT EXISTS locale VARCHAR(255) DEFAULT 'en';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'core_config_code_unique'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'core_config_code_key'
    ) THEN
        ALTER TABLE public.core_config ADD CONSTRAINT core_config_code_unique UNIQUE (code);
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fn_get_core_config()
RETURNS TABLE (
    id          integer,
    code        character varying,
    value       text,
    channel     character varying,
    locale      character varying,
    created_at  timestamp with time zone,
    updated_at  timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    RETURN QUERY
    SELECT 
        c.id::integer,
        c.code::character varying,
        c.value::text,
        c.channel::character varying,
        c.locale::character varying,
        c.created_at,
        c.updated_at
    FROM core_config c
    ORDER BY c.code ASC;
END;
$func$;

CREATE OR REPLACE FUNCTION public.fn_save_core_config(
    p_code      character varying,
    p_value     text,
    p_channel   character varying DEFAULT 'default',
    p_locale    character varying DEFAULT 'en'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    INSERT INTO core_config (code, value, channel, locale, updated_at)
    VALUES (p_code, p_value, p_channel, p_locale, CURRENT_TIMESTAMP)
    ON CONFLICT (code)
    DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
END;
$func$;

-- ----------------------------------------------------------
-- EMAILS & EMAIL ATTACHMENTS TABLES & FUNCTIONS
-- ----------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.emails (
    id SERIAL PRIMARY KEY,
    subject VARCHAR(255),
    source VARCHAR(50) DEFAULT 'mail',
    user_type VARCHAR(50) DEFAULT 'admin',
    name VARCHAR(255),
    reply TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    folders JSONB DEFAULT '["inbox"]'::jsonb,
    from_email JSONB,
    sender JSONB,
    reply_to JSONB,
    cc JSONB DEFAULT '[]'::jsonb,
    bcc JSONB DEFAULT '[]'::jsonb,
    unique_id VARCHAR(255) UNIQUE,
    message_id VARCHAR(255),
    reference_ids JSONB DEFAULT '[]'::jsonb,
    person_id INTEGER REFERENCES public.persons(id) ON DELETE SET NULL,
    lead_id INTEGER REFERENCES public.leads(id) ON DELETE SET NULL,
    parent_id INTEGER REFERENCES public.emails(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS subject VARCHAR(255);
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'mail';
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'admin';
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS reply TEXT;
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS folders JSONB DEFAULT '["inbox"]'::jsonb;
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS from_email JSONB;
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS sender JSONB;
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS reply_to JSONB;
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS cc JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS bcc JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS unique_id VARCHAR(255);
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS message_id VARCHAR(255);
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS reference_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS person_id INTEGER REFERENCES public.persons(id) ON DELETE SET NULL;
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS lead_id INTEGER REFERENCES public.leads(id) ON DELETE SET NULL;
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES public.emails(id) ON DELETE CASCADE;
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS public.email_attachments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    path VARCHAR(500) NOT NULL,
    size INTEGER,
    content_type VARCHAR(100),
    content_id VARCHAR(255),
    email_id INTEGER NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emails_folders ON public.emails USING gin (folders);
CREATE INDEX IF NOT EXISTS idx_emails_parent_id ON public.emails (parent_id);
CREATE INDEX IF NOT EXISTS idx_emails_lead_id ON public.emails (lead_id);
CREATE INDEX IF NOT EXISTS idx_emails_person_id ON public.emails (person_id);
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON public.emails (user_id);
CREATE INDEX IF NOT EXISTS idx_email_attachments_email_id ON public.email_attachments (email_id);

CREATE OR REPLACE FUNCTION public.fn_get_emails(
    p_folder    VARCHAR(50) DEFAULT 'inbox',
    p_search    TEXT DEFAULT NULL,
    p_limit     INTEGER DEFAULT 25,
    p_offset    INTEGER DEFAULT 0
)
RETURNS TABLE (
    id              INTEGER,
    subject         VARCHAR,
    source          VARCHAR,
    user_type       VARCHAR,
    name            VARCHAR,
    reply           TEXT,
    is_read         BOOLEAN,
    folders         JSONB,
    from_email      JSONB,
    sender          JSONB,
    reply_to        JSONB,
    cc              JSONB,
    bcc             JSONB,
    unique_id       VARCHAR,
    message_id      VARCHAR,
    person_id       INTEGER,
    person_name     VARCHAR,
    lead_id         INTEGER,
    lead_title      VARCHAR,
    parent_id       INTEGER,
    user_id         INTEGER,
    user_name       VARCHAR,
    attachments_count BIGINT,
    replies_count   BIGINT,
    created_at      TIMESTAMP WITH TIME ZONE,
    updated_at      TIMESTAMP WITH TIME ZONE,
    total_count     BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    RETURN QUERY
    WITH filtered AS (
        SELECT 
            e.id,
            e.subject,
            e.source,
            e.user_type,
            e.name,
            e.reply,
            e.is_read,
            e.folders,
            e.from_email,
            e.sender,
            e.reply_to,
            e.cc,
            e.bcc,
            e.unique_id,
            e.message_id,
            e.person_id,
            p.name AS person_name,
            e.lead_id,
            l.title AS lead_title,
            e.parent_id,
            e.user_id,
            u.name AS user_name,
            (SELECT COUNT(*) FROM public.email_attachments ea WHERE ea.email_id = e.id) AS attachments_count,
            (SELECT COUNT(*) FROM public.emails er WHERE er.parent_id = e.id) AS replies_count,
            e.created_at,
            e.updated_at
        FROM public.emails e
        LEFT JOIN public.persons p ON p.id = e.person_id
        LEFT JOIN public.leads l ON l.id = e.lead_id
        LEFT JOIN public.users u ON u.id = e.user_id
        WHERE 
            (e.parent_id IS NULL OR p_folder = 'trash')
            AND (p_folder IS NULL OR e.folders @> to_jsonb(ARRAY[p_folder]))
            AND (
                p_search IS NULL 
                OR p_search = ''
                OR e.subject ILIKE '%' || p_search || '%'
                OR e.name ILIKE '%' || p_search || '%'
                OR e.reply ILIKE '%' || p_search || '%'
                OR p.name ILIKE '%' || p_search || '%'
                OR l.title ILIKE '%' || p_search || '%'
            )
    ),
    counted AS (
        SELECT COUNT(*) AS total FROM filtered
    )
    SELECT 
        f.id,
        f.subject,
        f.source,
        f.user_type,
        f.name,
        f.reply,
        f.is_read,
        f.folders,
        f.from_email,
        f.sender,
        f.reply_to,
        f.cc,
        f.bcc,
        f.unique_id,
        f.message_id,
        f.person_id,
        f.person_name,
        f.lead_id,
        f.lead_title,
        f.parent_id,
        f.user_id,
        f.user_name,
        f.attachments_count,
        f.replies_count,
        f.created_at,
        f.updated_at,
        c.total AS total_count
    FROM filtered f
    CROSS JOIN counted c
    ORDER BY f.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$func$;

-- ==========================================================
-- TEMPLATE PARSER & WORKFLOW PROCEDURAL FUNCTIONS
-- ==========================================================

CREATE OR REPLACE FUNCTION fn_get_template_lead_context(p_lead_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', l.id,
        'title', l.title,
        'description', l.description,
        'lead_value', l.lead_value,
        'status', l.status,
        'user_id', l.user_id,
        'person_id', l.person_id,
        'organization_id', l.organization_id,
        'lead_pipeline_id', l.lead_pipeline_id,
        'lead_pipeline_stage_id', l.lead_pipeline_stage_id,
        'lead_source_id', l.lead_source_id,
        'lead_type_id', l.lead_type_id,
        'expected_close_date', l.expected_close_date,
        'created_at', l.created_at,
        'updated_at', l.updated_at,
        'person_name', p.name,
        'person_emails', p.emails,
        'person_contact_numbers', p.contact_numbers,
        'organization_name', o.name,
        'user_name', u.name,
        'user_email', u.email,
        'stage_name', s.name,
        'source_name', src.name,
        'pipeline_name', pipe.name,
        'type_name', lt.name
    ) INTO v_result
    FROM leads l
    LEFT JOIN persons p ON p.id = l.person_id
    LEFT JOIN organizations o ON o.id = l.organization_id
    LEFT JOIN users u ON u.id = l.user_id
    LEFT JOIN lead_pipeline_stages s ON s.id = l.lead_pipeline_stage_id
    LEFT JOIN lead_sources src ON src.id = l.lead_source_id
    LEFT JOIN lead_pipelines pipe ON pipe.id = l.lead_pipeline_id
    LEFT JOIN lead_types lt ON lt.id = l.lead_type_id
    WHERE l.id = p_lead_id;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_template_activity_context(p_activity_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', a.id,
        'title', a.title,
        'type', a.type,
        'comment', a.comment,
        'schedule_from', a.schedule_from,
        'schedule_to', a.schedule_to,
        'location', a.location,
        'is_done', a.is_done,
        'user_id', a.user_id,
        'created_at', a.created_at,
        'updated_at', a.updated_at,
        'user_name', u.name,
        'user_email', u.email
    ) INTO v_result
    FROM activities a
    LEFT JOIN users u ON u.id = a.user_id
    WHERE a.id = p_activity_id;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_template_quote_context(p_quote_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', q.id,
        'subject', q.subject,
        'description', q.description,
        'grand_total', q.grand_total,
        'sub_total', q.sub_total,
        'discount_amount', q.discount_amount,
        'tax_amount', q.tax_amount,
        'expired_at', q.expired_at,
        'billing_address', q.billing_address,
        'shipping_address', q.shipping_address,
        'user_id', q.user_id,
        'person_id', q.person_id,
        'lead_id', q.lead_id,
        'created_at', q.created_at,
        'updated_at', q.updated_at,
        'user_name', u.name,
        'user_email', u.email
    ) INTO v_result
    FROM quotes q
    LEFT JOIN users u ON u.id = q.user_id
    WHERE q.id = p_quote_id;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_template_product_context(p_product_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', pr.id,
        'sku', pr.sku,
        'name', pr.name,
        'description', pr.description,
        'price', pr.price,
        'quantity', pr.quantity,
        'status', pr.status,
        'created_at', pr.created_at,
        'updated_at', pr.updated_at
    ) INTO v_result
    FROM products pr
    WHERE pr.id = p_product_id;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_template_organization_context(p_org_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', o.id,
        'name', o.name,
        'address', o.address,
        'created_at', o.created_at,
        'updated_at', o.updated_at
    ) INTO v_result
    FROM organizations o
    WHERE o.id = p_org_id;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_lead_latest_activity(p_lead_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', a.id,
        'title', a.title,
        'type', a.type,
        'comment', a.comment,
        'schedule_from', a.schedule_from,
        'schedule_to', a.schedule_to,
        'location', a.location,
        'is_done', a.is_done,
        'user_id', a.user_id,
        'created_at', a.created_at,
        'user_name', u.name,
        'user_email', u.email
    ) INTO v_result
    FROM activities a
    LEFT JOIN users u ON u.id = a.user_id
    JOIN lead_activities la ON la.activity_id = a.id
    WHERE la.lead_id = p_lead_id
      AND a.type NOT IN ('email', 'file', 'system')
    ORDER BY a.id DESC LIMIT 1;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_lead_latest_quote(p_lead_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', q.id,
        'subject', q.subject,
        'description', q.description,
        'grand_total', q.grand_total,
        'sub_total', q.sub_total,
        'expired_at', q.expired_at,
        'billing_address', q.billing_address,
        'shipping_address', q.shipping_address,
        'user_id', q.user_id,
        'user_name', u.name
    ) INTO v_result
    FROM quotes q
    LEFT JOIN users u ON u.id = q.user_id
    WHERE q.lead_id = p_lead_id
    ORDER BY q.id DESC LIMIT 1;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_person_latest_activity(p_person_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', a.id,
        'title', a.title,
        'type', a.type,
        'comment', a.comment,
        'schedule_from', a.schedule_from,
        'schedule_to', a.schedule_to,
        'location', a.location,
        'is_done', a.is_done,
        'user_id', a.user_id,
        'created_at', a.created_at,
        'user_name', u.name,
        'user_email', u.email
    ) INTO v_result
    FROM activities a
    LEFT JOIN users u ON u.id = a.user_id
    JOIN person_activities pa ON pa.activity_id = a.id
    WHERE pa.person_id = p_person_id
      AND a.type NOT IN ('email', 'file', 'system')
    ORDER BY a.id DESC LIMIT 1;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_activity_participants_context(p_activity_id INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_names TEXT;
BEGIN
    SELECT string_agg(COALESCE(u.name, p.name, u.email), ', ') INTO v_names
    FROM activity_participants ap
    LEFT JOIN users u ON u.id = ap.user_id
    LEFT JOIN persons p ON p.id = ap.person_id
    WHERE ap.activity_id = p_activity_id;

    RETURN COALESCE(v_names, '');
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_entity_for_workflow(p_entity_type VARCHAR, p_entity_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_type VARCHAR := LOWER(p_entity_type);
    v_result JSONB;
BEGIN
    IF v_type = 'leads' OR v_type = 'lead' THEN
        SELECT jsonb_build_object(
            'id', l.id,
            'title', l.title,
            'description', l.description,
            'lead_value', l.lead_value,
            'status', l.status,
            'user_id', l.user_id,
            'person_id', l.person_id,
            'organization_id', l.organization_id,
            'lead_pipeline_id', l.lead_pipeline_id,
            'lead_pipeline_stage_id', l.lead_pipeline_stage_id,
            'lead_source_id', l.lead_source_id,
            'lead_type_id', l.lead_type_id,
            'created_at', l.created_at,
            'updated_at', l.updated_at,
            'person_name', p.name,
            'person_emails', p.emails,
            'person_contact_numbers', p.contact_numbers,
            'organization_name', o.name,
            'user_name', u.name,
            'user_email', u.email,
            'stage_name', s.name,
            'source_name', src.name,
            'pipeline_name', pipe.name,
            'type_name', lt.name
        ) INTO v_result
        FROM leads l
        LEFT JOIN persons p ON p.id = l.person_id
        LEFT JOIN organizations o ON o.id = l.organization_id
        LEFT JOIN users u ON u.id = l.user_id
        LEFT JOIN lead_pipeline_stages s ON s.id = l.lead_pipeline_stage_id
        LEFT JOIN lead_sources src ON src.id = l.lead_source_id
        LEFT JOIN lead_pipelines pipe ON pipe.id = l.lead_pipeline_id
        LEFT JOIN lead_types lt ON lt.id = l.lead_type_id
        WHERE l.id = p_entity_id;

    ELSIF v_type = 'persons' OR v_type = 'person' OR v_type = 'contacts' OR v_type = 'contact' THEN
        SELECT jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'emails', p.emails,
            'contact_numbers', p.contact_numbers,
            'job_title', p.job_title,
            'organization_id', p.organization_id,
            'user_id', p.user_id,
            'created_at', p.created_at,
            'updated_at', p.updated_at,
            'organization_name', o.name,
            'user_name', u.name,
            'user_email', u.email
        ) INTO v_result
        FROM persons p
        LEFT JOIN organizations o ON o.id = p.organization_id
        LEFT JOIN users u ON u.id = p.user_id
        WHERE p.id = p_entity_id;

    ELSIF v_type = 'organizations' OR v_type = 'organization' THEN
        SELECT jsonb_build_object(
            'id', o.id,
            'name', o.name,
            'address', o.address,
            'user_id', o.user_id,
            'created_at', o.created_at,
            'updated_at', o.updated_at,
            'user_name', u.name,
            'user_email', u.email
        ) INTO v_result
        FROM organizations o
        LEFT JOIN users u ON u.id = o.user_id
        WHERE o.id = p_entity_id;

    ELSIF v_type = 'quotes' OR v_type = 'quote' THEN
        SELECT jsonb_build_object(
            'id', q.id,
            'subject', q.subject,
            'description', q.description,
            'grand_total', q.grand_total,
            'sub_total', q.sub_total,
            'discount_amount', q.discount_amount,
            'tax_amount', q.tax_amount,
            'user_id', q.user_id,
            'person_id', q.person_id,
            'lead_id', q.lead_id,
            'created_at', q.created_at,
            'updated_at', q.updated_at,
            'person_name', p.name,
            'person_emails', p.emails,
            'lead_title', l.title,
            'user_name', u.name,
            'user_email', u.email
        ) INTO v_result
        FROM quotes q
        LEFT JOIN persons p ON p.id = q.person_id
        LEFT JOIN leads l ON l.id = q.lead_id
        LEFT JOIN users u ON u.id = q.user_id
        WHERE q.id = p_entity_id;

    ELSIF v_type = 'activities' OR v_type = 'activity' THEN
        SELECT jsonb_build_object(
            'id', a.id,
            'title', a.title,
            'type', a.type,
            'comment', a.comment,
            'schedule_from', a.schedule_from,
            'schedule_to', a.schedule_to,
            'location', a.location,
            'is_done', a.is_done,
            'user_id', a.user_id,
            'created_at', a.created_at,
            'updated_at', a.updated_at,
            'lead_id', la.lead_id,
            'person_id', pa.person_id,
            'user_name', u.name,
            'user_email', u.email
        ) INTO v_result
        FROM activities a
        LEFT JOIN users u ON u.id = a.user_id
        LEFT JOIN lead_activities la ON la.activity_id = a.id
        LEFT JOIN person_activities pa ON pa.activity_id = a.id
        WHERE a.id = p_entity_id;
    END IF;

    RETURN v_result;
END;
$$;





