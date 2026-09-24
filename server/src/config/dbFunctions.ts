import { pool } from '@/config/db';
import { logger } from '@/utils/logger';

export const DB_FUNCTIONS_SQL = `
-- ==========================================================
-- PostgreSQL Stored Functions for Settings Sub-modules
-- Complete DB Functions (get_*, get_all_*, save_*, delete_*)
-- ==========================================================

-- ==========================================================
-- 1. GROUPS DB FUNCTIONS
-- ==========================================================

CREATE OR REPLACE FUNCTION get_group(p_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', g.id,
        'name', g.name,
        'description', g.description,
        'created_at', g.created_at,
        'updated_at', g.updated_at,
        'user_count', COALESCE((SELECT COUNT(*) FROM user_groups WHERE group_id = g.id), 0),
        'users', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', u.id,
                    'name', u.name,
                    'email', u.email
                )
            )
            FROM users u
            INNER JOIN user_groups ug ON ug.user_id = u.id
            WHERE ug.group_id = g.id
        ), '[]'::jsonb)
    ) INTO v_result
    FROM groups g
    WHERE g.id = p_id;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_groups(p_search TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_result
    FROM (
        SELECT jsonb_build_object(
            'id', g.id,
            'name', g.name,
            'description', g.description,
            'created_at', g.created_at,
            'updated_at', g.updated_at,
            'user_count', COALESCE(COUNT(ug.user_id), 0)::int
        ) AS row_data
        FROM groups g
        LEFT JOIN user_groups ug ON ug.group_id = g.id
        WHERE (p_search IS NULL OR p_search = '' OR g.name ILIKE '%' || p_search || '%' OR g.description ILIKE '%' || p_search || '%')
        GROUP BY g.id
        ORDER BY g.id DESC
    ) sub;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION save_group(
    p_name VARCHAR(255),
    p_description VARCHAR(255) DEFAULT NULL,
    p_id INTEGER DEFAULT NULL,
    p_user_ids INTEGER[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_group_id INTEGER;
    v_result JSONB;
    v_user_id INTEGER;
BEGIN
    IF p_id IS NOT NULL AND p_id > 0 THEN
        -- Edit existing group
        UPDATE groups
        SET name = COALESCE(p_name, name),
            description = p_description,
            updated_at = NOW()
        WHERE id = p_id
        RETURNING id INTO v_group_id;

        IF v_group_id IS NULL THEN
            RAISE EXCEPTION 'Group with ID % not found', p_id;
        END IF;
    ELSE
        -- Add new group
        INSERT INTO groups (name, description, created_at, updated_at)
        VALUES (p_name, p_description, NOW(), NOW())
        RETURNING id INTO v_group_id;
    END IF;

    -- Sync user group associations if user_ids array is provided
    IF p_user_ids IS NOT NULL THEN
        DELETE FROM user_groups WHERE group_id = v_group_id;
        FOREACH v_user_id IN ARRAY p_user_ids
        LOOP
            INSERT INTO user_groups (group_id, user_id) VALUES (v_group_id, v_user_id);
        END LOOP;
    END IF;

    RETURN get_group(v_group_id);
END;
$$;

CREATE OR REPLACE FUNCTION delete_group(p_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM groups WHERE id = p_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
END;
$$;


-- ==========================================================
-- 2. ROLES DB FUNCTIONS
-- ==========================================================

CREATE OR REPLACE FUNCTION get_role(p_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', r.id,
        'name', r.name,
        'description', r.description,
        'permission_type', r.permission_type,
        'permissions', r.permissions,
        'created_by', r.created_by,
        'created_at', r.created_at,
        'updated_at', r.updated_at,
        'user_count', COALESCE((SELECT COUNT(*) FROM users WHERE role_id = r.id), 0)
    ) INTO v_result
    FROM roles r
    WHERE r.id = p_id;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_roles(p_search TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_result
    FROM (
        SELECT jsonb_build_object(
            'id', r.id,
            'name', r.name,
            'description', r.description,
            'permission_type', r.permission_type,
            'permissions', r.permissions,
            'created_by', r.created_by,
            'created_at', r.created_at,
            'updated_at', r.updated_at,
            'user_count', COALESCE(COUNT(u.id), 0)::int
        ) AS row_data
        FROM roles r
        LEFT JOIN users u ON u.role_id = r.id
        WHERE (p_search IS NULL OR p_search = '' OR r.name ILIKE '%' || p_search || '%' OR r.description ILIKE '%' || p_search || '%')
        GROUP BY r.id
        ORDER BY r.id ASC
    ) sub;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION save_role(
    p_name VARCHAR(255),
    p_description VARCHAR(255) DEFAULT NULL,
    p_permission_type VARCHAR(255) DEFAULT 'all',
    p_permissions JSONB DEFAULT NULL,
    p_created_by INTEGER DEFAULT NULL,
    p_id INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_role_id INTEGER;
BEGIN
    IF p_id IS NOT NULL AND p_id > 0 THEN
        -- Edit existing role
        UPDATE roles
        SET name = COALESCE(p_name, name),
            description = p_description,
            permission_type = COALESCE(p_permission_type, permission_type),
            permissions = p_permissions,
            updated_at = NOW()
        WHERE id = p_id
        RETURNING id INTO v_role_id;

        IF v_role_id IS NULL THEN
            RAISE EXCEPTION 'Role with ID % not found', p_id;
        END IF;
    ELSE
        -- Add new role
        INSERT INTO roles (name, description, permission_type, permissions, created_by, created_at, updated_at)
        VALUES (p_name, p_description, COALESCE(p_permission_type, 'all'), p_permissions, p_created_by, NOW(), NOW())
        RETURNING id INTO v_role_id;
    END IF;

    RETURN get_role(v_role_id);
END;
$$;

CREATE OR REPLACE FUNCTION delete_role(p_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_count INTEGER;
    v_deleted INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_user_count FROM users WHERE role_id = p_id;
    IF v_user_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete role because it is assigned to % user(s).', v_user_count;
    END IF;

    DELETE FROM roles WHERE id = p_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
END;
$$;


-- ==========================================================
-- 3. PIPELINES DB FUNCTIONS
-- ==========================================================

CREATE OR REPLACE FUNCTION get_pipeline(p_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'rotten_days', p.rotten_days,
        'is_default', p.is_default,
        'created_at', p.created_at,
        'updated_at', p.updated_at,
        'stages', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', s.id,
                    'name', s.name,
                    'code', s.code,
                    'probability', s.probability,
                    'sort_order', s.sort_order,
                    'lead_pipeline_id', s.lead_pipeline_id
                ) ORDER BY s.sort_order ASC, s.id ASC
            )
            FROM lead_pipeline_stages s
            WHERE s.lead_pipeline_id = p.id
        ), '[]'::jsonb),
        'leads_count', COALESCE((SELECT COUNT(*) FROM leads WHERE lead_pipeline_id = p.id), 0)
    ) INTO v_result
    FROM lead_pipelines p
    WHERE p.id = p_id;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_pipelines(p_search TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_result
    FROM (
        SELECT jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'rotten_days', p.rotten_days,
            'is_default', p.is_default,
            'created_at', p.created_at,
            'updated_at', p.updated_at,
            'stages', COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', s.id,
                        'name', s.name,
                        'code', s.code,
                        'probability', s.probability,
                        'sort_order', s.sort_order,
                        'lead_pipeline_id', s.lead_pipeline_id
                    ) ORDER BY s.sort_order ASC, s.id ASC
                )
                FROM lead_pipeline_stages s
                WHERE s.lead_pipeline_id = p.id
            ), '[]'::jsonb),
            'leads_count', COALESCE(COUNT(l.id), 0)::int
        ) AS row_data
        FROM lead_pipelines p
        LEFT JOIN leads l ON l.lead_pipeline_id = p.id
        WHERE (p_search IS NULL OR p_search = '' OR p.name ILIKE '%' || p_search || '%')
        GROUP BY p.id
        ORDER BY p.is_default DESC, p.id ASC
    ) sub;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION save_pipeline(
    p_name VARCHAR(255),
    p_rotten_days INTEGER DEFAULT 30,
    p_is_default BOOLEAN DEFAULT FALSE,
    p_stages JSONB DEFAULT '[]'::jsonb,
    p_id INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_pipeline_id INTEGER;
    v_stage JSONB;
    v_stage_id INTEGER;
    v_stage_ids INTEGER[] := ARRAY[]::INTEGER[];
    v_sort_order INTEGER := 1;
BEGIN
    IF p_is_default IS TRUE THEN
        UPDATE lead_pipelines SET is_default = FALSE WHERE id != COALESCE(p_id, -1);
    END IF;

    IF p_id IS NOT NULL AND p_id > 0 THEN
        -- Edit existing pipeline
        UPDATE lead_pipelines
        SET name = COALESCE(p_name, name),
            rotten_days = COALESCE(p_rotten_days, rotten_days),
            is_default = COALESCE(p_is_default, is_default),
            updated_at = NOW()
        WHERE id = p_id
        RETURNING id INTO v_pipeline_id;

        IF v_pipeline_id IS NULL THEN
            RAISE EXCEPTION 'Pipeline with ID % not found', p_id;
        END IF;
    ELSE
        -- Add new pipeline
        INSERT INTO lead_pipelines (name, rotten_days, is_default, created_at, updated_at)
        VALUES (p_name, COALESCE(p_rotten_days, 30), COALESCE(p_is_default, FALSE), NOW(), NOW())
        RETURNING id INTO v_pipeline_id;
    END IF;

    -- Sync stages if JSON array provided
    IF p_stages IS NOT NULL AND jsonb_array_length(p_stages) > 0 THEN
        FOR v_stage IN SELECT * FROM jsonb_array_elements(p_stages)
        LOOP
            IF (v_stage->>'id') IS NOT NULL AND (v_stage->>'id')::INTEGER > 0 THEN
                UPDATE lead_pipeline_stages
                SET name = v_stage->>'name',
                    code = COALESCE(v_stage->>'code', LOWER(REGEXP_REPLACE(v_stage->>'name', '[^a-zA-Z0-9]', '_', 'g'))),
                    probability = COALESCE((v_stage->>'probability')::INTEGER, 0),
                    sort_order = COALESCE((v_stage->>'sort_order')::INTEGER, v_sort_order)
                WHERE id = (v_stage->>'id')::INTEGER AND lead_pipeline_id = v_pipeline_id
                RETURNING id INTO v_stage_id;
                
                v_stage_ids := array_append(v_stage_ids, v_stage_id);
            ELSE
                INSERT INTO lead_pipeline_stages (lead_pipeline_id, name, code, probability, sort_order)
                VALUES (
                    v_pipeline_id,
                    v_stage->>'name',
                    COALESCE(v_stage->>'code', LOWER(REGEXP_REPLACE(v_stage->>'name', '[^a-zA-Z0-9]', '_', 'g'))),
                    COALESCE((v_stage->>'probability')::INTEGER, 0),
                    COALESCE((v_stage->>'sort_order')::INTEGER, v_sort_order)
                )
                RETURNING id INTO v_stage_id;
                
                v_stage_ids := array_append(v_stage_ids, v_stage_id);
            END IF;
            v_sort_order := v_sort_order + 1;
        END LOOP;

        -- Remove deleted stages
        IF array_length(v_stage_ids, 1) > 0 THEN
            DELETE FROM lead_pipeline_stages
            WHERE lead_pipeline_id = v_pipeline_id AND id != ALL(v_stage_ids);
        END IF;
    END IF;

    RETURN get_pipeline(v_pipeline_id);
END;
$$;

CREATE OR REPLACE FUNCTION delete_pipeline(p_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_is_default BOOLEAN;
    v_default_id INTEGER;
    v_default_stage_id INTEGER;
    v_deleted INTEGER;
BEGIN
    SELECT is_default INTO v_is_default FROM lead_pipelines WHERE id = p_id;
    IF v_is_default IS TRUE THEN
        RAISE EXCEPTION 'Default pipeline cannot be deleted.';
    END IF;

    -- Migrate leads to default pipeline
    SELECT id INTO v_default_id FROM lead_pipelines WHERE is_default = TRUE LIMIT 1;
    IF v_default_id IS NOT NULL THEN
        SELECT id INTO v_default_stage_id FROM lead_pipeline_stages WHERE lead_pipeline_id = v_default_id ORDER BY sort_order ASC LIMIT 1;
        UPDATE leads SET lead_pipeline_id = v_default_id, lead_pipeline_stage_id = v_default_stage_id WHERE lead_pipeline_id = p_id;
    END IF;

    DELETE FROM lead_pipelines WHERE id = p_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
END;
$$;


-- ==========================================================
-- 4. SOURCES DB FUNCTIONS
-- ==========================================================

CREATE OR REPLACE FUNCTION get_source(p_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'created_at', s.created_at,
        'updated_at', s.updated_at
    ) INTO v_result
    FROM lead_sources s
    WHERE s.id = p_id;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_sources(p_search TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_result
    FROM (
        SELECT jsonb_build_object(
            'id', s.id,
            'name', s.name,
            'created_at', s.created_at,
            'updated_at', s.updated_at
        ) AS row_data
        FROM lead_sources s
        WHERE (p_search IS NULL OR p_search = '' OR s.name ILIKE '%' || p_search || '%')
        ORDER BY s.id DESC
    ) sub;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION save_source(
    p_name VARCHAR(255),
    p_id INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_source_id INTEGER;
BEGIN
    IF p_id IS NOT NULL AND p_id > 0 THEN
        -- Edit existing source
        UPDATE lead_sources
        SET name = COALESCE(p_name, name),
            updated_at = NOW()
        WHERE id = p_id
        RETURNING id INTO v_source_id;

        IF v_source_id IS NULL THEN
            RAISE EXCEPTION 'Source with ID % not found', p_id;
        END IF;
    ELSE
        -- Add new source
        INSERT INTO lead_sources (name, created_at, updated_at)
        VALUES (p_name, NOW(), NOW())
        RETURNING id INTO v_source_id;
    END IF;

    RETURN get_source(v_source_id);
END;
$$;

CREATE OR REPLACE FUNCTION delete_source(p_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM lead_sources WHERE id = p_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
END;
$$;


-- ==========================================================
-- 5. TYPES DB FUNCTIONS
-- ==========================================================

CREATE OR REPLACE FUNCTION get_type(p_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'created_at', t.created_at,
        'updated_at', t.updated_at
    ) INTO v_result
    FROM lead_types t
    WHERE t.id = p_id;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_types(p_search TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_result
    FROM (
        SELECT jsonb_build_object(
            'id', t.id,
            'name', t.name,
            'created_at', t.created_at,
            'updated_at', t.updated_at
        ) AS row_data
        FROM lead_types t
        WHERE (p_search IS NULL OR p_search = '' OR t.name ILIKE '%' || p_search || '%')
        ORDER BY t.id DESC
    ) sub;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION save_type(
    p_name VARCHAR(255),
    p_id INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_type_id INTEGER;
BEGIN
    IF p_id IS NOT NULL AND p_id > 0 THEN
        -- Edit existing type
        UPDATE lead_types
        SET name = COALESCE(p_name, name),
            updated_at = NOW()
        WHERE id = p_id
        RETURNING id INTO v_type_id;

        IF v_type_id IS NULL THEN
            RAISE EXCEPTION 'Type with ID % not found', p_id;
        END IF;
    ELSE
        -- Add new type
        INSERT INTO lead_types (name, created_at, updated_at)
        VALUES (p_name, NOW(), NOW())
        RETURNING id INTO v_type_id;
    END IF;

    RETURN get_type(v_type_id);
END;
$$;

CREATE OR REPLACE FUNCTION delete_type(p_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM lead_types WHERE id = p_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
END;
$$;


-- ==========================================================
-- 6. USERS DB FUNCTIONS (Krayin CRM)
-- ==========================================================

CREATE OR REPLACE FUNCTION get_user(p_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', u.id,
        'name', u.name,
        'email', u.email,
        'status', u.status,
        'view_permission', u.view_permission,
        'role_id', u.role_id,
        'role_name', r.name,
        'image', u.image,
        'created_at', u.created_at,
        'updated_at', u.updated_at,
        'groups', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', g.id,
                    'name', g.name
                )
            )
            FROM groups g
            INNER JOIN user_groups ug ON ug.group_id = g.id
            WHERE ug.user_id = u.id
        ), '[]'::jsonb),
        'group_ids', COALESCE((
            SELECT jsonb_agg(ug.group_id)
            FROM user_groups ug
            WHERE ug.user_id = u.id
        ), '[]'::jsonb)
    ) INTO v_result
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.id = p_id;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_users(
    p_search TEXT DEFAULT NULL,
    p_status BOOLEAN DEFAULT NULL,
    p_role_id INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_result
    FROM (
        SELECT jsonb_build_object(
            'id', u.id,
            'name', u.name,
            'email', u.email,
            'status', u.status,
            'view_permission', u.view_permission,
            'role_id', u.role_id,
            'role_name', r.name,
            'image', u.image,
            'created_at', u.created_at,
            'updated_at', u.updated_at,
            'groups', COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', g.id,
                        'name', g.name
                    )
                )
            FROM groups g
            INNER JOIN user_groups ug ON ug.group_id = g.id
            WHERE ug.user_id = u.id
            ), '[]'::jsonb),
            'group_ids', COALESCE((
                SELECT jsonb_agg(ug.group_id)
                FROM user_groups ug
                WHERE ug.user_id = u.id
            ), '[]'::jsonb)
        ) AS row_data
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE (p_search IS NULL OR p_search = '' OR u.name ILIKE '%' || p_search || '%' OR u.email ILIKE '%' || p_search || '%')
          AND (p_status IS NULL OR u.status = p_status)
          AND (p_role_id IS NULL OR u.role_id = p_role_id)
        ORDER BY u.id ASC
    ) sub;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION save_user(
    p_name VARCHAR(255),
    p_email VARCHAR(255),
    p_password VARCHAR(255) DEFAULT NULL,
    p_status BOOLEAN DEFAULT TRUE,
    p_view_permission VARCHAR(255) DEFAULT 'global',
    p_role_id INTEGER DEFAULT 1,
    p_group_ids INTEGER[] DEFAULT NULL,
    p_image VARCHAR(255) DEFAULT NULL,
    p_id INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id INTEGER;
    v_group_id INTEGER;
BEGIN
    IF p_id IS NOT NULL AND p_id > 0 THEN
        -- Edit existing user
        UPDATE users
        SET name = COALESCE(p_name, name),
            email = COALESCE(p_email, email),
            password = CASE WHEN p_password IS NOT NULL AND p_password != '' THEN p_password ELSE password END,
            status = COALESCE(p_status, status),
            view_permission = COALESCE(p_view_permission, view_permission),
            role_id = COALESCE(p_role_id, role_id),
            image = COALESCE(p_image, image),
            updated_at = NOW()
        WHERE id = p_id
        RETURNING id INTO v_user_id;

        IF v_user_id IS NULL THEN
            RAISE EXCEPTION 'User with ID % not found', p_id;
        END IF;
    ELSE
        -- Add new user
        INSERT INTO users (name, email, password, status, view_permission, role_id, image, created_at, updated_at)
        VALUES (p_name, p_email, p_password, COALESCE(p_status, TRUE), COALESCE(p_view_permission, 'global'), COALESCE(p_role_id, 1), p_image, NOW(), NOW())
        RETURNING id INTO v_user_id;
    END IF;

    -- Sync groups if provided
    IF p_group_ids IS NOT NULL THEN
        DELETE FROM user_groups WHERE user_id = v_user_id;
        FOREACH v_group_id IN ARRAY p_group_ids
        LOOP
            INSERT INTO user_groups (group_id, user_id) VALUES (v_group_id, v_user_id);
        END LOOP;
    END IF;

    RETURN get_user(v_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION delete_user(p_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM users WHERE id = p_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
END;
$$;


-- ==========================================================
-- 7. WAREHOUSES DB FUNCTIONS
-- ==========================================================

CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    contact_name VARCHAR(255) NOT NULL,
    contact_emails JSONB NOT NULL DEFAULT '[]'::jsonb,
    contact_numbers JSONB NOT NULL DEFAULT '[]'::jsonb,
    contact_address JSONB NOT NULL DEFAULT '{}'::jsonb,
    custom_attributes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS custom_attributes JSONB DEFAULT '{}'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS custom_attributes JSONB DEFAULT '{}'::jsonb;
ALTER TABLE persons ADD COLUMN IF NOT EXISTS custom_attributes JSONB DEFAULT '{}'::jsonb;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS custom_attributes JSONB DEFAULT '{}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS custom_attributes JSONB DEFAULT '{}'::jsonb;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS custom_attributes JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS warehouse_locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT warehouse_locations_warehouse_id_name_unique UNIQUE (warehouse_id, name)
);

CREATE OR REPLACE FUNCTION get_warehouse(p_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', w.id,
        'name', w.name,
        'description', w.description,
        'contact_name', w.contact_name,
        'contact_emails', w.contact_emails,
        'contact_numbers', w.contact_numbers,
        'contact_address', w.contact_address,
        'custom_attributes', COALESCE(w.custom_attributes, '{}'::jsonb),
        'created_at', w.created_at,
        'updated_at', w.updated_at,
        'locations', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', wl.id,
                    'name', wl.name,
                    'created_at', wl.created_at
                ) ORDER BY wl.id ASC
            )
            FROM warehouse_locations wl
            WHERE wl.warehouse_id = w.id
        ), '[]'::jsonb),
        'location_count', COALESCE((SELECT COUNT(*) FROM warehouse_locations wl WHERE wl.warehouse_id = w.id), 0)
    ) INTO v_result
    FROM warehouses w
    WHERE w.id = p_id;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_warehouses(p_search TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_result
    FROM (
        SELECT jsonb_build_object(
            'id', w.id,
            'name', w.name,
            'description', w.description,
            'contact_name', w.contact_name,
            'contact_emails', w.contact_emails,
            'contact_numbers', w.contact_numbers,
            'contact_address', w.contact_address,
            'custom_attributes', COALESCE(w.custom_attributes, '{}'::jsonb),
            'created_at', w.created_at,
            'updated_at', w.updated_at,
            'location_count', COALESCE(COUNT(wl.id), 0)::int
        ) AS row_data
        FROM warehouses w
        LEFT JOIN warehouse_locations wl ON wl.warehouse_id = w.id
        WHERE (
            p_search IS NULL 
            OR p_search = '' 
            OR w.name ILIKE '%' || p_search || '%' 
            OR w.contact_name ILIKE '%' || p_search || '%'
            OR w.description ILIKE '%' || p_search || '%'
        )
        GROUP BY w.id
        ORDER BY w.id DESC
    ) sub;

    RETURN v_result;
END;
$$;

DROP FUNCTION IF EXISTS save_warehouse(VARCHAR, TEXT, VARCHAR, JSONB, JSONB, JSONB, INTEGER, JSONB);

CREATE OR REPLACE FUNCTION save_warehouse(
    p_name VARCHAR(255),
    p_description TEXT DEFAULT NULL,
    p_contact_name VARCHAR(255) DEFAULT '',
    p_contact_emails JSONB DEFAULT '[]'::jsonb,
    p_contact_numbers JSONB DEFAULT '[]'::jsonb,
    p_contact_address JSONB DEFAULT '{}'::jsonb,
    p_id INTEGER DEFAULT NULL,
    p_locations JSONB DEFAULT NULL,
    p_custom_attributes JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_warehouse_id INTEGER;
    v_loc RECORD;
    v_loc_name TEXT;
BEGIN
    IF p_id IS NOT NULL AND p_id > 0 THEN
        -- Edit existing warehouse
        UPDATE warehouses
        SET name = COALESCE(p_name, name),
            description = p_description,
            contact_name = COALESCE(p_contact_name, contact_name),
            contact_emails = COALESCE(p_contact_emails, contact_emails),
            contact_numbers = COALESCE(p_contact_numbers, contact_numbers),
            contact_address = COALESCE(p_contact_address, contact_address),
            custom_attributes = COALESCE(p_custom_attributes, custom_attributes),
            updated_at = NOW()
        WHERE id = p_id
        RETURNING id INTO v_warehouse_id;

        IF v_warehouse_id IS NULL THEN
            RAISE EXCEPTION 'Warehouse with ID % not found', p_id;
        END IF;
    ELSE
        -- Add new warehouse
        INSERT INTO warehouses (
            name, description, contact_name, contact_emails, contact_numbers, contact_address, custom_attributes, created_at, updated_at
        )
        VALUES (
            p_name, p_description, p_contact_name, COALESCE(p_contact_emails, '[]'::jsonb), COALESCE(p_contact_numbers, '[]'::jsonb), COALESCE(p_contact_address, '{}'::jsonb), COALESCE(p_custom_attributes, '{}'::jsonb), NOW(), NOW()
        )
        RETURNING id INTO v_warehouse_id;
    END IF;

    -- Sync locations if provided
    IF p_locations IS NOT NULL AND jsonb_typeof(p_locations) = 'array' THEN
        DELETE FROM warehouse_locations WHERE warehouse_id = v_warehouse_id;
        FOR v_loc IN SELECT * FROM jsonb_array_elements(p_locations)
        LOOP
            IF jsonb_typeof(v_loc.value) = 'string' THEN
                v_loc_name := TRIM(v_loc.value #>> '{}');
            ELSIF jsonb_typeof(v_loc.value) = 'object' THEN
                v_loc_name := TRIM(v_loc.value ->> 'name');
            ELSE
                v_loc_name := NULL;
            END IF;

            IF v_loc_name IS NOT NULL AND v_loc_name != '' THEN
                IF NOT EXISTS (SELECT 1 FROM warehouse_locations WHERE warehouse_id = v_warehouse_id AND name = v_loc_name) THEN
                    INSERT INTO warehouse_locations (warehouse_id, name, created_at, updated_at)
                    VALUES (v_warehouse_id, v_loc_name, NOW(), NOW());
                END IF;
            END IF;
        END LOOP;
    END IF;

    RETURN get_warehouse(v_warehouse_id);
END;
$$;

CREATE OR REPLACE FUNCTION delete_warehouse(p_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM warehouses WHERE id = p_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
END;
$$;

-- ==========================================================
-- 8. ATTRIBUTES DB FUNCTIONS
-- ==========================================================

CREATE TABLE IF NOT EXISTS attributes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    lookup_type VARCHAR(255) DEFAULT NULL,
    entity_type VARCHAR(255) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    validation VARCHAR(255) DEFAULT NULL,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    is_unique BOOLEAN NOT NULL DEFAULT FALSE,
    quick_add BOOLEAN NOT NULL DEFAULT FALSE,
    is_user_defined BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT attributes_code_entity_type_unique UNIQUE (code, entity_type)
);

CREATE TABLE IF NOT EXISTS attribute_options (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    attribute_id INTEGER NOT NULL REFERENCES attributes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_attribute_options_attribute_id ON attribute_options(attribute_id);

CREATE OR REPLACE FUNCTION get_attribute(p_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', a.id,
        'code', a.code,
        'name', a.name,
        'type', a.type,
        'lookup_type', a.lookup_type,
        'entity_type', a.entity_type,
        'sort_order', a.sort_order,
        'validation', a.validation,
        'is_required', a.is_required,
        'is_unique', a.is_unique,
        'quick_add', a.quick_add,
        'is_user_defined', a.is_user_defined,
        'created_at', a.created_at,
        'updated_at', a.updated_at,
        'options', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', ao.id,
                    'name', ao.name,
                    'sort_order', ao.sort_order
                ) ORDER BY ao.sort_order ASC, ao.id ASC
            )
            FROM attribute_options ao
            WHERE ao.attribute_id = a.id
        ), '[]'::jsonb)
    ) INTO v_result
    FROM attributes a
    WHERE a.id = p_id;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_attributes(
    p_search TEXT DEFAULT NULL,
    p_entity_type TEXT DEFAULT NULL,
    p_type TEXT DEFAULT NULL,
    p_quick_add BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_result
    FROM (
        SELECT jsonb_build_object(
            'id', a.id,
            'code', a.code,
            'name', a.name,
            'type', a.type,
            'lookup_type', a.lookup_type,
            'entity_type', a.entity_type,
            'sort_order', a.sort_order,
            'validation', a.validation,
            'is_required', a.is_required,
            'is_unique', a.is_unique,
            'quick_add', a.quick_add,
            'is_user_defined', a.is_user_defined,
            'created_at', a.created_at,
            'updated_at', a.updated_at,
            'options', COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', ao.id,
                        'name', ao.name,
                        'sort_order', ao.sort_order
                    ) ORDER BY ao.sort_order ASC, ao.id ASC
                )
                FROM attribute_options ao
                WHERE ao.attribute_id = a.id
            ), '[]'::jsonb)
        ) AS row_data
        FROM attributes a
        WHERE (p_search IS NULL OR p_search = '' OR a.name ILIKE '%' || p_search || '%' OR a.code ILIKE '%' || p_search || '%')
          AND (p_entity_type IS NULL OR p_entity_type = '' OR p_entity_type = 'all' OR a.entity_type = p_entity_type)
          AND (p_type IS NULL OR p_type = '' OR p_type = 'all' OR a.type = p_type)
          AND (p_quick_add IS NULL OR a.quick_add = p_quick_add)
        ORDER BY a.sort_order ASC, a.id DESC
    ) sub;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION save_attribute(
    p_code VARCHAR(255),
    p_name VARCHAR(255),
    p_type VARCHAR(255),
    p_entity_type VARCHAR(255),
    p_lookup_type VARCHAR(255) DEFAULT NULL,
    p_is_required BOOLEAN DEFAULT FALSE,
    p_is_unique BOOLEAN DEFAULT FALSE,
    p_validation VARCHAR(255) DEFAULT NULL,
    p_id INTEGER DEFAULT NULL,
    p_options JSONB DEFAULT NULL,
    p_sort_order INTEGER DEFAULT 0,
    p_quick_add BOOLEAN DEFAULT FALSE,
    p_is_user_defined BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_attr_id INTEGER;
    v_opt RECORD;
    v_opt_name TEXT;
    v_opt_sort INTEGER;
    v_idx INTEGER := 0;
BEGIN
    IF p_id IS NOT NULL AND p_id > 0 THEN
        -- Edit existing attribute
        UPDATE attributes
        SET code = COALESCE(p_code, code),
            name = COALESCE(p_name, name),
            type = COALESCE(p_type, type),
            entity_type = COALESCE(p_entity_type, entity_type),
            lookup_type = p_lookup_type,
            is_required = COALESCE(p_is_required, is_required),
            is_unique = COALESCE(p_is_unique, is_unique),
            validation = p_validation,
            sort_order = COALESCE(p_sort_order, sort_order),
            quick_add = COALESCE(p_quick_add, quick_add),
            is_user_defined = COALESCE(p_is_user_defined, is_user_defined),
            updated_at = NOW()
        WHERE id = p_id
        RETURNING id INTO v_attr_id;

        IF v_attr_id IS NULL THEN
            RAISE EXCEPTION 'Attribute with ID % not found', p_id;
        END IF;
    ELSE
        -- Add new attribute
        INSERT INTO attributes (
            code, name, type, entity_type, lookup_type, is_required, is_unique, validation, sort_order, quick_add, is_user_defined, created_at, updated_at
        )
        VALUES (
            p_code, p_name, p_type, p_entity_type, p_lookup_type, COALESCE(p_is_required, FALSE), COALESCE(p_is_unique, FALSE), p_validation, COALESCE(p_sort_order, 0), COALESCE(p_quick_add, FALSE), COALESCE(p_is_user_defined, TRUE), NOW(), NOW()
        )
        RETURNING id INTO v_attr_id;
    END IF;

    -- Sync options if provided
    IF p_options IS NOT NULL AND jsonb_typeof(p_options) = 'array' THEN
        DELETE FROM attribute_options WHERE attribute_id = v_attr_id;
        FOR v_opt IN SELECT * FROM jsonb_array_elements(p_options)
        LOOP
            v_idx := v_idx + 1;
            IF jsonb_typeof(v_opt.value) = 'string' THEN
                v_opt_name := TRIM(v_opt.value #>> '{}');
                v_opt_sort := v_idx;
            ELSIF jsonb_typeof(v_opt.value) = 'object' THEN
                v_opt_name := TRIM(v_opt.value ->> 'name');
                v_opt_sort := COALESCE((v_opt.value ->> 'sort_order')::INTEGER, v_idx);
            ELSE
                v_opt_name := NULL;
                v_opt_sort := v_idx;
            END IF;

            IF v_opt_name IS NOT NULL AND v_opt_name != '' THEN
                INSERT INTO attribute_options (attribute_id, name, sort_order)
                VALUES (v_attr_id, v_opt_name, v_opt_sort);
            END IF;
        END LOOP;
    END IF;

    RETURN get_attribute(v_attr_id);
END;
$$;

CREATE OR REPLACE FUNCTION delete_attribute(p_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM attributes WHERE id = p_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
END;
$$;

-- ==========================================================
-- 9. EMAIL TEMPLATES DB FUNCTIONS
-- ==========================================================
CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION get_email_template(p_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', e.id,
        'name', e.name,
        'subject', e.subject,
        'content', e.content,
        'created_at', e.created_at,
        'updated_at', e.updated_at
    ) INTO v_result
    FROM email_templates e
    WHERE e.id = p_id;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_email_templates(p_search TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_result
    FROM (
        SELECT jsonb_build_object(
            'id', e.id,
            'name', e.name,
            'subject', e.subject,
            'content', e.content,
            'created_at', e.created_at,
            'updated_at', e.updated_at
        ) AS row_data
        FROM email_templates e
        WHERE (p_search IS NULL OR p_search = '' OR e.name ILIKE '%' || p_search || '%' OR e.subject ILIKE '%' || p_search || '%')
        ORDER BY e.id DESC
    ) sub;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION save_email_template(
    p_name VARCHAR(255),
    p_subject VARCHAR(255),
    p_content TEXT,
    p_id INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_id INTEGER;
BEGIN
    IF p_id IS NOT NULL AND p_id > 0 THEN
        UPDATE email_templates
        SET name = COALESCE(p_name, name),
            subject = COALESCE(p_subject, subject),
            content = COALESCE(p_content, content),
            updated_at = NOW()
        WHERE id = p_id
        RETURNING id INTO v_id;

        IF v_id IS NULL THEN
            RAISE EXCEPTION 'Email template with ID % not found', p_id;
        END IF;
    ELSE
        INSERT INTO email_templates (name, subject, content, created_at, updated_at)
        VALUES (p_name, p_subject, p_content, NOW(), NOW())
        RETURNING id INTO v_id;
    END IF;

    RETURN get_email_template(v_id);
END;
$$;

CREATE OR REPLACE FUNCTION delete_email_template(p_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM email_templates WHERE id = p_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
END;
$$;

-- ==========================================================
-- 10. MARKETING EVENTS DB FUNCTIONS
-- ==========================================================
CREATE TABLE IF NOT EXISTS marketing_events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION get_event(p_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', e.id,
        'name', e.name,
        'description', e.description,
        'date', e.date,
        'created_at', e.created_at,
        'updated_at', e.updated_at
    ) INTO v_result
    FROM marketing_events e
    WHERE e.id = p_id;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_events(p_search TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_result
    FROM (
        SELECT jsonb_build_object(
            'id', e.id,
            'name', e.name,
            'description', e.description,
            'date', e.date,
            'created_at', e.created_at,
            'updated_at', e.updated_at
        ) AS row_data
        FROM marketing_events e
        WHERE (p_search IS NULL OR p_search = '' OR e.name ILIKE '%' || p_search || '%' OR e.description ILIKE '%' || p_search || '%')
        ORDER BY e.id DESC
    ) sub;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION save_event(
    p_name VARCHAR(255),
    p_description VARCHAR(255),
    p_date DATE,
    p_id INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_id INTEGER;
BEGIN
    IF p_id IS NOT NULL AND p_id > 0 THEN
        UPDATE marketing_events
        SET name = COALESCE(p_name, name),
            description = COALESCE(p_description, description),
            date = COALESCE(p_date, date),
            updated_at = NOW()
        WHERE id = p_id
        RETURNING id INTO v_id;

        IF v_id IS NULL THEN
            RAISE EXCEPTION 'Event with ID % not found', p_id;
        END IF;
    ELSE
        INSERT INTO marketing_events (name, description, date, created_at, updated_at)
        VALUES (p_name, p_description, p_date, NOW(), NOW())
        RETURNING id INTO v_id;
    END IF;

    RETURN get_event(v_id);
END;
$$;

CREATE OR REPLACE FUNCTION delete_event(p_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM marketing_events WHERE id = p_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
END;
$$;

-- ==========================================================
-- 11. MARKETING CAMPAIGNS DB FUNCTIONS
-- ==========================================================
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    status BOOLEAN DEFAULT FALSE,
    type VARCHAR(255) DEFAULT 'general',
    mail_to VARCHAR(255) DEFAULT 'leads',
    spooling VARCHAR(255),
    marketing_template_id INTEGER REFERENCES email_templates(id) ON DELETE SET NULL,
    marketing_event_id INTEGER REFERENCES marketing_events(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION get_campaign(p_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'subject', c.subject,
        'status', c.status,
        'type', c.type,
        'mail_to', c.mail_to,
        'spooling', c.spooling,
        'marketing_template_id', c.marketing_template_id,
        'marketing_event_id', c.marketing_event_id,
        'template_name', t.name,
        'event_name', e.name,
        'created_at', c.created_at,
        'updated_at', c.updated_at
    ) INTO v_result
    FROM marketing_campaigns c
    LEFT JOIN email_templates t ON c.marketing_template_id = t.id
    LEFT JOIN marketing_events e ON c.marketing_event_id = e.id
    WHERE c.id = p_id;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_campaigns(p_search TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_result
    FROM (
        SELECT jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'subject', c.subject,
            'status', c.status,
            'type', c.type,
            'mail_to', c.mail_to,
            'spooling', c.spooling,
            'marketing_template_id', c.marketing_template_id,
            'marketing_event_id', c.marketing_event_id,
            'template_name', t.name,
            'event_name', e.name,
            'created_at', c.created_at,
            'updated_at', c.updated_at
        ) AS row_data
        FROM marketing_campaigns c
        LEFT JOIN email_templates t ON c.marketing_template_id = t.id
        LEFT JOIN marketing_events e ON c.marketing_event_id = e.id
        WHERE (p_search IS NULL OR p_search = '' OR c.name ILIKE '%' || p_search || '%' OR c.subject ILIKE '%' || p_search || '%')
        ORDER BY c.id DESC
    ) sub;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION save_campaign(
    p_name VARCHAR(255),
    p_subject VARCHAR(255),
    p_status BOOLEAN,
    p_type VARCHAR(255),
    p_mail_to VARCHAR(255),
    p_spooling VARCHAR(255),
    p_marketing_template_id INTEGER,
    p_marketing_event_id INTEGER,
    p_id INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_id INTEGER;
BEGIN
    IF p_id IS NOT NULL AND p_id > 0 THEN
        UPDATE marketing_campaigns
        SET name = COALESCE(p_name, name),
            subject = COALESCE(p_subject, subject),
            status = COALESCE(p_status, status),
            type = COALESCE(p_type, type),
            mail_to = COALESCE(p_mail_to, mail_to),
            spooling = COALESCE(p_spooling, spooling),
            marketing_template_id = p_marketing_template_id,
            marketing_event_id = p_marketing_event_id,
            updated_at = NOW()
        WHERE id = p_id
        RETURNING id INTO v_id;

        IF v_id IS NULL THEN
            RAISE EXCEPTION 'Campaign with ID % not found', p_id;
        END IF;
    ELSE
        INSERT INTO marketing_campaigns (
            name, subject, status, type, mail_to, spooling, marketing_template_id, marketing_event_id, created_at, updated_at
        )
        VALUES (
            p_name, p_subject, COALESCE(p_status, false), COALESCE(p_type, 'general'), COALESCE(p_mail_to, 'leads'),
            p_spooling, p_marketing_template_id, p_marketing_event_id, NOW(), NOW()
        )
        RETURNING id INTO v_id;
    END IF;

    RETURN get_campaign(v_id);
END;
$$;

CREATE OR REPLACE FUNCTION delete_campaign(p_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM marketing_campaigns WHERE id = p_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
END;
$$;

-- ==========================================================
-- 12. WEBHOOKS DB FUNCTIONS
-- ==========================================================
CREATE TABLE IF NOT EXISTS webhooks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    entity_type VARCHAR(255) NOT NULL,
    description TEXT,
    method VARCHAR(20) NOT NULL DEFAULT 'POST',
    end_point TEXT NOT NULL,
    query_params JSONB DEFAULT '[]'::jsonb,
    headers JSONB DEFAULT '[]'::jsonb,
    payload_type VARCHAR(50) DEFAULT 'default',
    raw_payload_type VARCHAR(50) DEFAULT 'json',
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION get_webhook(p_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', w.id,
        'name', w.name,
        'entity_type', w.entity_type,
        'description', w.description,
        'method', w.method,
        'end_point', w.end_point,
        'query_params', COALESCE(w.query_params, '[]'::jsonb),
        'headers', COALESCE(w.headers, '[]'::jsonb),
        'payload_type', w.payload_type,
        'raw_payload_type', w.raw_payload_type,
        'payload', w.payload,
        'created_at', w.created_at,
        'updated_at', w.updated_at
    ) INTO v_result
    FROM webhooks w
    WHERE w.id = p_id;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_webhooks(p_search TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_result
    FROM (
        SELECT jsonb_build_object(
            'id', w.id,
            'name', w.name,
            'entity_type', w.entity_type,
            'description', w.description,
            'method', w.method,
            'end_point', w.end_point,
            'query_params', COALESCE(w.query_params, '[]'::jsonb),
            'headers', COALESCE(w.headers, '[]'::jsonb),
            'payload_type', w.payload_type,
            'raw_payload_type', w.raw_payload_type,
            'payload', w.payload,
            'created_at', w.created_at,
            'updated_at', w.updated_at
        ) AS row_data
        FROM webhooks w
        WHERE (p_search IS NULL OR p_search = '' OR w.name ILIKE '%' || p_search || '%' OR w.end_point ILIKE '%' || p_search || '%' OR w.entity_type ILIKE '%' || p_search || '%')
        ORDER BY w.id DESC
    ) sub;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION save_webhook(
    p_name VARCHAR(255),
    p_entity_type VARCHAR(255),
    p_description TEXT,
    p_method VARCHAR(20),
    p_end_point TEXT,
    p_query_params JSONB,
    p_headers JSONB,
    p_payload_type VARCHAR(50),
    p_raw_payload_type VARCHAR(50),
    p_payload JSONB,
    p_id INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_id INTEGER;
BEGIN
    IF p_id IS NOT NULL AND p_id > 0 THEN
        UPDATE webhooks
        SET name = COALESCE(p_name, name),
            entity_type = COALESCE(p_entity_type, entity_type),
            description = COALESCE(p_description, description),
            method = COALESCE(p_method, method),
            end_point = COALESCE(p_end_point, end_point),
            query_params = COALESCE(p_query_params, query_params),
            headers = COALESCE(p_headers, headers),
            payload_type = COALESCE(p_payload_type, payload_type),
            raw_payload_type = COALESCE(p_raw_payload_type, raw_payload_type),
            payload = COALESCE(p_payload, payload),
            updated_at = NOW()
        WHERE id = p_id
        RETURNING id INTO v_id;

        IF v_id IS NULL THEN
            RAISE EXCEPTION 'Webhook with ID % not found', p_id;
        END IF;
    ELSE
        INSERT INTO webhooks (
            name, entity_type, description, method, end_point, query_params, headers, payload_type, raw_payload_type, payload, created_at, updated_at
        )
        VALUES (
            p_name, p_entity_type, p_description, COALESCE(p_method, 'POST'), p_end_point,
            COALESCE(p_query_params, '[]'::jsonb), COALESCE(p_headers, '[]'::jsonb),
            COALESCE(p_payload_type, 'default'), COALESCE(p_raw_payload_type, 'json'), p_payload, NOW(), NOW()
        )
        RETURNING id INTO v_id;
    END IF;

    RETURN get_webhook(v_id);
END;
$$;

CREATE OR REPLACE FUNCTION delete_webhook(p_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM webhooks WHERE id = p_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
END;
$$;

-- ==========================================================
-- 13. WORKFLOWS DB FUNCTIONS
-- ==========================================================
CREATE TABLE IF NOT EXISTS workflows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    entity_type VARCHAR(255) NOT NULL,
    event VARCHAR(255) NOT NULL,
    condition_type VARCHAR(50) DEFAULT 'and',
    conditions JSONB DEFAULT '[]'::jsonb,
    actions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION get_workflow(p_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', w.id,
        'name', w.name,
        'description', w.description,
        'entity_type', w.entity_type,
        'event', w.event,
        'condition_type', w.condition_type,
        'conditions', COALESCE(w.conditions, '[]'::jsonb),
        'actions', COALESCE(w.actions, '[]'::jsonb),
        'created_at', w.created_at,
        'updated_at', w.updated_at
    ) INTO v_result
    FROM workflows w
    WHERE w.id = p_id;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_workflows(p_search TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_result
    FROM (
        SELECT jsonb_build_object(
            'id', w.id,
            'name', w.name,
            'description', w.description,
            'entity_type', w.entity_type,
            'event', w.event,
            'condition_type', w.condition_type,
            'conditions', COALESCE(w.conditions, '[]'::jsonb),
            'actions', COALESCE(w.actions, '[]'::jsonb),
            'created_at', w.created_at,
            'updated_at', w.updated_at
        ) AS row_data
        FROM workflows w
        WHERE (p_search IS NULL OR p_search = '' OR w.name ILIKE '%' || p_search || '%' OR w.entity_type ILIKE '%' || p_search || '%')
        ORDER BY w.id DESC
    ) sub;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION save_workflow(
    p_name VARCHAR(255),
    p_description TEXT,
    p_entity_type VARCHAR(255),
    p_event VARCHAR(255),
    p_condition_type VARCHAR(50),
    p_conditions JSONB,
    p_actions JSONB,
    p_id INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_id INTEGER;
BEGIN
    IF p_id IS NOT NULL AND p_id > 0 THEN
        UPDATE workflows
        SET name = COALESCE(p_name, name),
            description = COALESCE(p_description, description),
            entity_type = COALESCE(p_entity_type, entity_type),
            event = COALESCE(p_event, event),
            condition_type = COALESCE(p_condition_type, condition_type),
            conditions = COALESCE(p_conditions, conditions),
            actions = COALESCE(p_actions, actions),
            updated_at = NOW()
        WHERE id = p_id
        RETURNING id INTO v_id;

        IF v_id IS NULL THEN
            RAISE EXCEPTION 'Workflow with ID % not found', p_id;
        END IF;
    ELSE
        INSERT INTO workflows (
            name, description, entity_type, event, condition_type, conditions, actions, created_at, updated_at
        )
        VALUES (
            p_name, p_description, p_entity_type, p_event, COALESCE(p_condition_type, 'and'),
            COALESCE(p_conditions, '[]'::jsonb), COALESCE(p_actions, '[]'::jsonb), NOW(), NOW()
        )
        RETURNING id INTO v_id;
    END IF;

    RETURN get_workflow(v_id);
END;
$$;

CREATE OR REPLACE FUNCTION delete_workflow(p_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM workflows WHERE id = p_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
END;
$$;

-- ==========================================================
-- 14. WEB FORMS DB FUNCTIONS
-- ==========================================================
CREATE TABLE IF NOT EXISTS web_forms (
    id SERIAL PRIMARY KEY,
    form_id VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    submit_button_label VARCHAR(255) DEFAULT 'Submit',
    submit_success_action VARCHAR(50) DEFAULT 'message',
    submit_success_content TEXT DEFAULT 'Thank you for your submission.',
    create_lead BOOLEAN DEFAULT FALSE,
    lead_pipeline_id INTEGER REFERENCES lead_pipelines(id) ON DELETE SET NULL,
    background_color VARCHAR(50) DEFAULT '#ffffff',
    form_background_color VARCHAR(50) DEFAULT '#ffffff',
    form_title_color VARCHAR(50) DEFAULT '#1e293b',
    form_submit_button_color VARCHAR(50) DEFAULT '#0088cc',
    attribute_label_color VARCHAR(50) DEFAULT '#475569',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS web_form_attributes (
    id SERIAL PRIMARY KEY,
    web_form_id INTEGER NOT NULL REFERENCES web_forms(id) ON DELETE CASCADE,
    attribute_id INTEGER NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
    name VARCHAR(255),
    placeholder VARCHAR(255),
    is_required BOOLEAN DEFAULT FALSE,
    is_hidden BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION get_web_form(p_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', f.id,
        'form_id', f.form_id,
        'title', f.title,
        'description', f.description,
        'submit_button_label', f.submit_button_label,
        'submit_success_action', f.submit_success_action,
        'submit_success_content', f.submit_success_content,
        'create_lead', f.create_lead,
        'lead_pipeline_id', f.lead_pipeline_id,
        'lead_pipeline_name', lp.name,
        'background_color', f.background_color,
        'form_background_color', f.form_background_color,
        'form_title_color', f.form_title_color,
        'form_submit_button_color', f.form_submit_button_color,
        'attribute_label_color', f.attribute_label_color,
        'attributes', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', wfa.id,
                'attribute_id', wfa.attribute_id,
                'attribute_code', a.code,
                'attribute_name', a.name,
                'attribute_type', a.type,
                'lookup_type', a.lookup_type,
                'options', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                        'id', ao.id,
                        'name', ao.name,
                        'sort_order', ao.sort_order
                    ) ORDER BY ao.sort_order ASC, ao.id ASC)
                    FROM attribute_options ao
                    WHERE ao.attribute_id = a.id
                ), '[]'::jsonb),
                'name', COALESCE(wfa.name, a.name),
                'placeholder', wfa.placeholder,
                'is_required', wfa.is_required,
                'is_hidden', wfa.is_hidden,
                'sort_order', wfa.sort_order
            ) ORDER BY wfa.sort_order ASC)
            FROM web_form_attributes wfa
            LEFT JOIN attributes a ON wfa.attribute_id = a.id
            WHERE wfa.web_form_id = f.id
        ), '[]'::jsonb),
        'created_at', f.created_at,
        'updated_at', f.updated_at
    ) INTO v_result
    FROM web_forms f
    LEFT JOIN lead_pipelines lp ON f.lead_pipeline_id = lp.id
    WHERE f.id = p_id;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_web_form_by_form_id(p_form_id VARCHAR(255))
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', f.id,
        'form_id', f.form_id,
        'title', f.title,
        'description', f.description,
        'submit_button_label', f.submit_button_label,
        'submit_success_action', f.submit_success_action,
        'submit_success_content', f.submit_success_content,
        'create_lead', f.create_lead,
        'lead_pipeline_id', f.lead_pipeline_id,
        'lead_pipeline_name', lp.name,
        'background_color', f.background_color,
        'form_background_color', f.form_background_color,
        'form_title_color', f.form_title_color,
        'form_submit_button_color', f.form_submit_button_color,
        'attribute_label_color', f.attribute_label_color,
        'attributes', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', wfa.id,
                'attribute_id', wfa.attribute_id,
                'attribute_code', a.code,
                'attribute_name', a.name,
                'attribute_type', a.type,
                'lookup_type', a.lookup_type,
                'options', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                        'id', ao.id,
                        'name', ao.name,
                        'sort_order', ao.sort_order
                    ) ORDER BY ao.sort_order ASC, ao.id ASC)
                    FROM attribute_options ao
                    WHERE ao.attribute_id = a.id
                ), '[]'::jsonb),
                'name', COALESCE(wfa.name, a.name),
                'placeholder', wfa.placeholder,
                'is_required', wfa.is_required,
                'is_hidden', wfa.is_hidden,
                'sort_order', wfa.sort_order
            ) ORDER BY wfa.sort_order ASC)
            FROM web_form_attributes wfa
            LEFT JOIN attributes a ON wfa.attribute_id = a.id
            WHERE wfa.web_form_id = f.id
        ), '[]'::jsonb),
        'created_at', f.created_at,
        'updated_at', f.updated_at
    ) INTO v_result
    FROM web_forms f
    LEFT JOIN lead_pipelines lp ON f.lead_pipeline_id = lp.id
    WHERE f.form_id = p_form_id;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_web_forms(p_search TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_result
    FROM (
        SELECT jsonb_build_object(
            'id', f.id,
            'form_id', f.form_id,
            'title', f.title,
            'description', f.description,
            'submit_button_label', f.submit_button_label,
            'submit_success_action', f.submit_success_action,
            'submit_success_content', f.submit_success_content,
            'create_lead', f.create_lead,
            'lead_pipeline_id', f.lead_pipeline_id,
            'lead_pipeline_name', lp.name,
            'background_color', f.background_color,
            'form_background_color', f.form_background_color,
            'form_title_color', f.form_title_color,
            'form_submit_button_color', f.form_submit_button_color,
            'attribute_label_color', f.attribute_label_color,
            'attributes', COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'id', wfa.id,
                    'attribute_id', wfa.attribute_id,
                    'attribute_code', a.code,
                    'attribute_name', a.name,
                    'attribute_type', a.type,
                    'lookup_type', a.lookup_type,
                    'options', COALESCE((
                        SELECT jsonb_agg(jsonb_build_object(
                            'id', ao.id,
                            'name', ao.name,
                            'sort_order', ao.sort_order
                        ) ORDER BY ao.sort_order ASC, ao.id ASC)
                        FROM attribute_options ao
                        WHERE ao.attribute_id = a.id
                    ), '[]'::jsonb),
                    'name', COALESCE(wfa.name, a.name),
                    'placeholder', wfa.placeholder,
                    'is_required', wfa.is_required,
                    'is_hidden', wfa.is_hidden,
                    'sort_order', wfa.sort_order
                ) ORDER BY wfa.sort_order ASC)
                FROM web_form_attributes wfa
                LEFT JOIN attributes a ON wfa.attribute_id = a.id
                WHERE wfa.web_form_id = f.id
            ), '[]'::jsonb),
            'created_at', f.created_at,
            'updated_at', f.updated_at
        ) AS row_data
        FROM web_forms f
        LEFT JOIN lead_pipelines lp ON f.lead_pipeline_id = lp.id
        WHERE (p_search IS NULL OR p_search = '' OR f.title ILIKE '%' || p_search || '%' OR f.form_id ILIKE '%' || p_search || '%')
        ORDER BY f.id DESC
    ) sub;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION save_web_form(
    p_form_id VARCHAR(255),
    p_title VARCHAR(255),
    p_description TEXT,
    p_submit_button_label VARCHAR(255),
    p_submit_success_action VARCHAR(50),
    p_submit_success_content TEXT,
    p_create_lead BOOLEAN,
    p_lead_pipeline_id INTEGER,
    p_background_color VARCHAR(50),
    p_form_background_color VARCHAR(50),
    p_form_title_color VARCHAR(50),
    p_form_submit_button_color VARCHAR(50),
    p_attribute_label_color VARCHAR(50),
    p_attributes JSONB,
    p_id INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_id INTEGER;
    v_attr JSONB;
BEGIN
    IF p_id IS NOT NULL AND p_id > 0 THEN
        UPDATE web_forms
        SET form_id = COALESCE(p_form_id, form_id),
            title = COALESCE(p_title, title),
            description = COALESCE(p_description, description),
            submit_button_label = COALESCE(p_submit_button_label, submit_button_label),
            submit_success_action = COALESCE(p_submit_success_action, submit_success_action),
            submit_success_content = COALESCE(p_submit_success_content, submit_success_content),
            create_lead = COALESCE(p_create_lead, create_lead),
            lead_pipeline_id = p_lead_pipeline_id,
            background_color = COALESCE(p_background_color, background_color),
            form_background_color = COALESCE(p_form_background_color, form_background_color),
            form_title_color = COALESCE(p_form_title_color, form_title_color),
            form_submit_button_color = COALESCE(p_form_submit_button_color, form_submit_button_color),
            attribute_label_color = COALESCE(p_attribute_label_color, attribute_label_color),
            updated_at = NOW()
        WHERE id = p_id
        RETURNING id INTO v_id;

        IF v_id IS NULL THEN
            RAISE EXCEPTION 'Web form with ID % not found', p_id;
        END IF;

        DELETE FROM web_form_attributes WHERE web_form_id = v_id;
    ELSE
        INSERT INTO web_forms (
            form_id, title, description, submit_button_label, submit_success_action, submit_success_content,
            create_lead, lead_pipeline_id, background_color, form_background_color, form_title_color,
            form_submit_button_color, attribute_label_color, created_at, updated_at
        )
        VALUES (
            p_form_id, p_title, p_description, COALESCE(p_submit_button_label, 'Submit'),
            COALESCE(p_submit_success_action, 'message'), COALESCE(p_submit_success_content, 'Thank you for your submission.'),
            COALESCE(p_create_lead, false), p_lead_pipeline_id,
            COALESCE(p_background_color, '#ffffff'), COALESCE(p_form_background_color, '#ffffff'),
            COALESCE(p_form_title_color, '#1e293b'), COALESCE(p_form_submit_button_color, '#0088cc'),
            COALESCE(p_attribute_label_color, '#475569'), NOW(), NOW()
        )
        RETURNING id INTO v_id;
    END IF;

    IF p_attributes IS NOT NULL AND jsonb_typeof(p_attributes) = 'array' THEN
        FOR v_attr IN SELECT * FROM jsonb_array_elements(p_attributes)
        LOOP
            INSERT INTO web_form_attributes (
                web_form_id, attribute_id, name, placeholder, is_required, is_hidden, sort_order
            )
            VALUES (
                v_id,
                (v_attr->>'attribute_id')::INTEGER,
                v_attr->>'name',
                v_attr->>'placeholder',
                COALESCE((v_attr->>'is_required')::BOOLEAN, false),
                COALESCE((v_attr->>'is_hidden')::BOOLEAN, false),
                COALESCE((v_attr->>'sort_order')::INTEGER, 0)
            );
        END LOOP;
    END IF;

    RETURN get_web_form(v_id);
END;
$$;

CREATE OR REPLACE FUNCTION delete_web_form(p_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM web_forms WHERE id = p_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
END;
$$;

-- ==========================================================
-- 15. DATA TRANSFER & IMPORTS DB FUNCTIONS
-- ==========================================================
CREATE TABLE IF NOT EXISTS imports (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    validation_strategy VARCHAR(50) DEFAULT 'stop_on_errors',
    allowed_errors INTEGER DEFAULT 0,
    field_separator VARCHAR(10) DEFAULT ',',
    process_in_queue BOOLEAN DEFAULT false,
    state VARCHAR(50) DEFAULT 'completed',
    summary JSONB DEFAULT '{}'::jsonb,
    error_file TEXT DEFAULT '',
    file_path TEXT DEFAULT '',
    file_name TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE imports ADD COLUMN IF NOT EXISTS validation_strategy VARCHAR(50) DEFAULT 'stop_on_errors';
ALTER TABLE imports ALTER COLUMN validation_strategy SET DEFAULT 'stop_on_errors';
ALTER TABLE imports ADD COLUMN IF NOT EXISTS allowed_errors INTEGER DEFAULT 0;
ALTER TABLE imports ALTER COLUMN allowed_errors SET DEFAULT 0;
ALTER TABLE imports ADD COLUMN IF NOT EXISTS field_separator VARCHAR(10) DEFAULT ',';
ALTER TABLE imports ALTER COLUMN field_separator SET DEFAULT ',';
ALTER TABLE imports ADD COLUMN IF NOT EXISTS process_in_queue BOOLEAN DEFAULT false;
ALTER TABLE imports ALTER COLUMN process_in_queue SET DEFAULT false;

ALTER TABLE imports ADD COLUMN IF NOT EXISTS file_path TEXT DEFAULT '';
ALTER TABLE imports ALTER COLUMN file_path DROP NOT NULL;
ALTER TABLE imports ALTER COLUMN file_path SET DEFAULT '';

ALTER TABLE imports ADD COLUMN IF NOT EXISTS file_name TEXT DEFAULT '';
ALTER TABLE imports ALTER COLUMN file_name DROP NOT NULL;
ALTER TABLE imports ALTER COLUMN file_name SET DEFAULT '';

ALTER TABLE imports ADD COLUMN IF NOT EXISTS error_file TEXT DEFAULT '';
ALTER TABLE imports ALTER COLUMN error_file DROP NOT NULL;
ALTER TABLE imports ALTER COLUMN error_file SET DEFAULT '';

CREATE OR REPLACE FUNCTION get_all_imports()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_result
    FROM (
        SELECT jsonb_build_object(
            'id', i.id,
            'type', i.type,
            'action', i.action,
            'validation_strategy', i.validation_strategy,
            'allowed_errors', i.allowed_errors,
            'field_separator', i.field_separator,
            'process_in_queue', i.process_in_queue,
            'state', i.state,
            'summary', i.summary,
            'error_file', i.error_file,
            'file_path', i.file_path,
            'file_name', i.file_name,
            'created_at', i.created_at,
            'updated_at', i.updated_at
        ) AS row_data
        FROM imports i
        ORDER BY i.id DESC
    ) sub;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION save_import_record(
    p_type VARCHAR(50),
    p_action VARCHAR(50),
    p_state VARCHAR(50),
    p_summary JSONB,
    p_error_file TEXT DEFAULT NULL,
    p_validation_strategy VARCHAR(50) DEFAULT 'stop_on_errors',
    p_allowed_errors INTEGER DEFAULT 0,
    p_field_separator VARCHAR(10) DEFAULT ',',
    p_process_in_queue BOOLEAN DEFAULT false,
    p_file_path TEXT DEFAULT '',
    p_file_name TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_id INTEGER;
BEGIN
    INSERT INTO imports (
        type, action, validation_strategy, allowed_errors, field_separator, process_in_queue, state, summary, error_file, file_path, file_name, created_at, updated_at
    )
    VALUES (
        p_type, 
        p_action, 
        COALESCE(p_validation_strategy, 'stop_on_errors'), 
        COALESCE(p_allowed_errors, 0), 
        COALESCE(p_field_separator, ','),
        COALESCE(p_process_in_queue, false),
        COALESCE(p_state, 'completed'), 
        COALESCE(p_summary, '{}'::jsonb), 
        COALESCE(p_error_file, ''),
        COALESCE(p_file_path, ''),
        COALESCE(p_file_name, p_type || '_import.csv'),
        NOW(), 
        NOW()
    )
    RETURNING id INTO v_id;

    RETURN (SELECT jsonb_build_object('id', v_id, 'state', p_state));
END;
$$;

-- ==========================================================
-- 16. GOOGLE CONTACTS DB FUNCTIONS
-- ==========================================================
CREATE TABLE IF NOT EXISTS google_contact_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    google_email VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_in INTEGER DEFAULT 3600,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_export_batches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id INTEGER REFERENCES google_contact_accounts(id) ON DELETE SET NULL,
    total_contacts INTEGER DEFAULT 0,
    exported_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'completed',
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION get_google_accounts(p_user_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_result
    FROM (
        SELECT jsonb_build_object(
            'id', a.id,
            'user_id', a.user_id,
            'google_email', a.google_email,
            'is_active', a.is_active,
            'created_at', a.created_at,
            'updated_at', a.updated_at
        ) AS row_data
        FROM google_contact_accounts a
        WHERE a.user_id = p_user_id AND a.is_active = TRUE
        ORDER BY a.id DESC
    ) sub;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION save_google_account(
    p_user_id INTEGER,
    p_google_email VARCHAR(255),
    p_access_token TEXT,
    p_refresh_token TEXT,
    p_expires_in INTEGER,
    p_token_type VARCHAR(50)
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_id INTEGER;
BEGIN
    INSERT INTO google_contact_accounts (user_id, google_email, access_token, refresh_token, expires_in, token_type, is_active, created_at, updated_at)
    VALUES (p_user_id, p_google_email, p_access_token, p_refresh_token, COALESCE(p_expires_in, 3600), COALESCE(p_token_type, 'Bearer'), TRUE, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
    SET access_token = EXCLUDED.access_token,
        refresh_token = COALESCE(EXCLUDED.refresh_token, google_contact_accounts.refresh_token),
        is_active = TRUE,
        updated_at = NOW()
    RETURNING id INTO v_id;

    RETURN (SELECT jsonb_build_object('id', v_id, 'google_email', p_google_email, 'is_active', true));
END;
$$;

CREATE OR REPLACE FUNCTION disconnect_google_account(p_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    UPDATE google_contact_accounts SET is_active = FALSE, updated_at = NOW() WHERE id = p_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
END;
$$;

CREATE OR REPLACE FUNCTION get_google_export_batches(p_user_id INTEGER DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_result
    FROM (
        SELECT jsonb_build_object(
            'id', b.id,
            'user_id', b.user_id,
            'account_id', b.account_id,
            'google_email', a.google_email,
            'total_contacts', b.total_contacts,
            'exported_count', b.exported_count,
            'status', b.status,
            'details', b.details,
            'created_at', b.created_at
        ) AS row_data
        FROM contact_export_batches b
        LEFT JOIN google_contact_accounts a ON b.account_id = a.id
        WHERE (p_user_id IS NULL OR b.user_id = p_user_id)
        ORDER BY b.id DESC
    ) sub;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION create_google_export_batch(
    p_user_id INTEGER,
    p_account_id INTEGER,
    p_total INTEGER,
    p_details JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_id INTEGER;
BEGIN
    INSERT INTO contact_export_batches (
        user_id, account_id, total_contacts, exported_count, status, details, created_at, updated_at
    )
    VALUES (
        p_user_id, p_account_id, COALESCE(p_total, 0), COALESCE(p_total, 0), 'completed', p_details, NOW(), NOW()
    )
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('id', v_id);
END;
$$;


-- ==========================================================
-- 20. TAGS DB FUNCTIONS
-- ==========================================================
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    color VARCHAR(50) DEFAULT '#0088cc',
    user_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tags' AND column_name = 'user_id'
    ) THEN 
        ALTER TABLE tags ALTER COLUMN user_id DROP NOT NULL;
    ELSE 
        ALTER TABLE tags ADD COLUMN user_id INTEGER;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION get_tag(p_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'color', t.color,
        'user_id', t.user_id,
        'created_at', t.created_at,
        'updated_at', t.updated_at
    ) INTO v_result
    FROM tags t
    WHERE t.id = p_id;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_tags(p_search TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_result
    FROM (
        SELECT jsonb_build_object(
            'id', t.id,
            'name', t.name,
            'color', t.color,
            'user_id', t.user_id,
            'created_at', t.created_at,
            'updated_at', t.updated_at
        ) AS row_data
        FROM tags t
        WHERE (p_search IS NULL OR p_search = '' OR t.name ILIKE '%' || p_search || '%')
        ORDER BY t.name ASC
    ) sub;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION save_tag(
    p_name VARCHAR(255),
    p_color VARCHAR(50) DEFAULT '#0088cc',
    p_id INTEGER DEFAULT NULL,
    p_user_id INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_id INTEGER;
BEGIN
    IF p_id IS NOT NULL AND p_id > 0 THEN
        UPDATE tags
        SET name = COALESCE(p_name, name),
            color = COALESCE(p_color, color),
            user_id = COALESCE(p_user_id, user_id),
            updated_at = NOW()
        WHERE id = p_id
        RETURNING id INTO v_id;

        IF v_id IS NULL THEN
            RAISE EXCEPTION 'Tag with ID % not found', p_id;
        END IF;
    ELSE
        INSERT INTO tags (name, color, user_id, created_at, updated_at)
        VALUES (p_name, COALESCE(p_color, '#0088cc'), p_user_id, NOW(), NOW())
        RETURNING id INTO v_id;
    END IF;

    RETURN get_tag(v_id);
END;
$$;

CREATE OR REPLACE FUNCTION delete_tag(p_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM tags WHERE id = p_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
END;
$$;

-- ==========================================================
-- 21. PERSONS DB FUNCTIONS
-- ==========================================================

CREATE OR REPLACE FUNCTION get_person(p_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'emails', p.emails,
        'contact_numbers', p.contact_numbers,
        'organization_id', p.organization_id,
        'organization_name', o.name,
        'job_title', p.job_title,
        'user_id', p.user_id,
        'sales_owner_name', u.name,
        'custom_attributes', COALESCE(p.custom_attributes, '{}'::jsonb),
        'created_at', p.created_at,
        'updated_at', p.updated_at,
        'activities', COALESCE((
            SELECT jsonb_agg(a.*)
            FROM activities a
            INNER JOIN activity_participants ap ON ap.activity_id = a.id
            WHERE ap.person_id = p.id
        ), '[]'::jsonb),
        'leads', COALESCE((
            SELECT jsonb_agg(l.*)
            FROM leads l
            WHERE l.person_id = p.id
        ), '[]'::jsonb)
    ) INTO v_result
    FROM persons p
    LEFT JOIN organizations o ON p.organization_id = o.id
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.id = p_id;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_persons(
    p_search TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_total INTEGER;
    v_rows JSONB;
BEGIN
    SELECT COUNT(*) INTO v_total
    FROM persons p
    LEFT JOIN organizations o ON p.organization_id = o.id
    WHERE (p_search IS NULL OR p_search = '' OR p.name ILIKE '%' || p_search || '%' OR p.job_title ILIKE '%' || p_search || '%' OR o.name ILIKE '%' || p_search || '%' OR p.emails::text ILIKE '%' || p_search || '%');

    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_rows
    FROM (
        SELECT jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'emails', p.emails,
            'contact_numbers', p.contact_numbers,
            'organization_id', p.organization_id,
            'organization_name', o.name,
            'job_title', p.job_title,
            'user_id', p.user_id,
            'sales_owner_name', u.name,
            'custom_attributes', COALESCE(p.custom_attributes, '{}'::jsonb),
            'created_at', p.created_at,
            'updated_at', p.updated_at
        ) AS row_data
        FROM persons p
        LEFT JOIN organizations o ON p.organization_id = o.id
        LEFT JOIN users u ON p.user_id = u.id
        WHERE (p_search IS NULL OR p_search = '' OR p.name ILIKE '%' || p_search || '%' OR p.job_title ILIKE '%' || p_search || '%' OR o.name ILIKE '%' || p_search || '%' OR p.emails::text ILIKE '%' || p_search || '%')
        ORDER BY p.id DESC
        LIMIT p_limit OFFSET p_offset
    ) sub;

    RETURN jsonb_build_object('rows', v_rows, 'total', v_total);
END;
$$;

CREATE OR REPLACE FUNCTION save_person(
    p_name VARCHAR(255),
    p_emails JSONB DEFAULT '[]'::jsonb,
    p_contact_numbers JSONB DEFAULT '[]'::jsonb,
    p_organization_id INTEGER DEFAULT NULL,
    p_job_title VARCHAR(255) DEFAULT NULL,
    p_user_id INTEGER DEFAULT NULL,
    p_custom_attributes JSONB DEFAULT '{}'::jsonb,
    p_id INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_id INTEGER;
BEGIN
    IF p_id IS NOT NULL AND p_id > 0 THEN
        UPDATE persons
        SET name = COALESCE(p_name, name),
            emails = COALESCE(p_emails, emails),
            contact_numbers = COALESCE(p_contact_numbers, contact_numbers),
            organization_id = p_organization_id,
            job_title = p_job_title,
            user_id = p_user_id,
            custom_attributes = COALESCE(p_custom_attributes, custom_attributes),
            updated_at = NOW()
        WHERE id = p_id
        RETURNING id INTO v_id;

        IF v_id IS NULL THEN
            RAISE EXCEPTION 'Person with ID % not found', p_id;
        END IF;
    ELSE
        INSERT INTO persons (
            name, emails, contact_numbers, organization_id, job_title, user_id, custom_attributes, created_at, updated_at
        )
        VALUES (
            p_name, COALESCE(p_emails, '[]'::jsonb), COALESCE(p_contact_numbers, '[]'::jsonb),
            p_organization_id, p_job_title, p_user_id, COALESCE(p_custom_attributes, '{}'::jsonb), NOW(), NOW()
        )
        RETURNING id INTO v_id;
    END IF;

    RETURN get_person(v_id);
END;
$$;

CREATE OR REPLACE FUNCTION delete_person(p_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    -- Delete quote child records and quotes for this person
    DELETE FROM quote_items WHERE quote_id IN (SELECT id FROM quotes WHERE person_id = p_id);
    DELETE FROM lead_quotes WHERE quote_id IN (SELECT id FROM quotes WHERE person_id = p_id);
    DELETE FROM quotes WHERE person_id = p_id;

    -- Unbind or remove other related records
    UPDATE leads SET person_id = NULL WHERE person_id = p_id;
    UPDATE emails SET person_id = NULL WHERE person_id = p_id;
    DELETE FROM activity_participants WHERE person_id = p_id;
    DELETE FROM contact_export_batch_items WHERE person_id = p_id;
    DELETE FROM person_activities WHERE person_id = p_id;
    DELETE FROM person_tags WHERE person_id = p_id;

    DELETE FROM persons WHERE id = p_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
END;
$$;

CREATE OR REPLACE FUNCTION delete_all_persons()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    -- Delete quote child records and quotes
    DELETE FROM quote_items WHERE quote_id IN (SELECT id FROM quotes WHERE person_id IS NOT NULL);
    DELETE FROM lead_quotes WHERE quote_id IN (SELECT id FROM quotes WHERE person_id IS NOT NULL);
    DELETE FROM quotes WHERE person_id IS NOT NULL;

    -- Unbind or remove other related records
    UPDATE leads SET person_id = NULL WHERE person_id IS NOT NULL;
    UPDATE emails SET person_id = NULL WHERE person_id IS NOT NULL;
    DELETE FROM activity_participants WHERE person_id IS NOT NULL;
    DELETE FROM contact_export_batch_items WHERE person_id IS NOT NULL;
    DELETE FROM person_activities;
    DELETE FROM person_tags;

    DELETE FROM persons;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

CREATE OR REPLACE FUNCTION fn_clear_lead_products(p_lead_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM lead_products WHERE lead_id = p_lead_id;
    UPDATE leads SET lead_value = 0 WHERE id = p_lead_id;
    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION fn_update_lead_custom_attributes(p_lead_id INTEGER, p_custom_attributes JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE leads SET custom_attributes = p_custom_attributes WHERE id = p_lead_id;
    RETURN TRUE;
END;
$$;
`;

export async function initDbFunctions(): Promise<void> {
  try {
    await pool.query(DB_FUNCTIONS_SQL);
    logger.info('PostgreSQL stored functions for Settings sub-modules initialized successfully.');
  } catch (err) {
    logger.error({ err }, 'Failed to initialize PostgreSQL stored functions');
  }
}
