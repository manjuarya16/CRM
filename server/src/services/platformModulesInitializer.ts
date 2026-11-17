import { pool } from '@/config/db';

/**
 * Idempotent storage for platform-only modules. Kept separate from schema.sql,
 * which is a destructive development/reset schema.
 */
export async function initializePlatformModuleTables(): Promise<void> {
  await pool.query(`
    ALTER TABLE public.roles
      ADD COLUMN IF NOT EXISTS parent_role_id INTEGER REFERENCES public.roles(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS roles_parent_role_id_idx
      ON public.roles (tenant_id, parent_role_id);

    CREATE TABLE IF NOT EXISTS public.platform_roles (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL UNIQUE,
      description VARCHAR(500),
      parent_role_id BIGINT REFERENCES public.platform_roles(id) ON DELETE SET NULL,
      permission_type VARCHAR(20) NOT NULL DEFAULT 'custom'
        CHECK (permission_type IN ('all', 'custom')),
      permissions JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS platform_roles_parent_idx
      ON public.platform_roles (parent_role_id);
    ALTER TABLE public.saas_super_admins
      ADD COLUMN IF NOT EXISTS platform_role_id BIGINT
      REFERENCES public.platform_roles(id) ON DELETE SET NULL;
    ALTER TABLE public.saas_super_admins
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
    ALTER TABLE public.saas_super_admins
      ADD COLUMN IF NOT EXISTS is_platform_owner BOOLEAN;
    UPDATE public.saas_super_admins
       SET is_platform_owner = (platform_role_id IS NULL)
     WHERE is_platform_owner IS NULL;
    ALTER TABLE public.saas_super_admins
      ALTER COLUMN is_platform_owner SET DEFAULT FALSE,
      ALTER COLUMN is_platform_owner SET NOT NULL;

    CREATE OR REPLACE FUNCTION public.resolve_platform_role_permissions(
      p_platform_role_id BIGINT,
      p_all_permissions TEXT[]
    )
    RETURNS TEXT[]
    LANGUAGE SQL
    STABLE
    AS $function$
      WITH RECURSIVE role_hierarchy AS (
        SELECT id, parent_role_id, permission_type, permissions
          FROM public.platform_roles
         WHERE id = p_platform_role_id
        UNION
        SELECT parent.id, parent.parent_role_id, parent.permission_type, parent.permissions
          FROM public.platform_roles parent
          JOIN role_hierarchy child ON child.parent_role_id = parent.id
      ),
      permission_rows AS (
        SELECT permission_value.permission
          FROM role_hierarchy role
          CROSS JOIN LATERAL (
          SELECT jsonb_array_elements_text(
            CASE WHEN jsonb_typeof(role.permissions) = 'array'
              THEN role.permissions ELSE '[]'::JSONB END
          ) AS permission
          UNION ALL
          SELECT permission.key
            FROM jsonb_each(
              CASE WHEN jsonb_typeof(role.permissions) = 'object'
                THEN role.permissions ELSE '{}'::JSONB END
            ) permission
           WHERE permission.value = 'true'::jsonb
          ) permission_value
      )
      SELECT CASE
        WHEN EXISTS (SELECT 1 FROM role_hierarchy WHERE permission_type = 'all')
          THEN COALESCE(p_all_permissions, ARRAY[]::TEXT[])
        ELSE ARRAY(
          SELECT DISTINCT permission
            FROM permission_rows
           WHERE permission = ANY(COALESCE(p_all_permissions, ARRAY[]::TEXT[]))
           ORDER BY permission
        )
      END;
    $function$;

    CREATE OR REPLACE FUNCTION public.get_platform_role_descendant_ids(p_platform_role_id BIGINT)
    RETURNS TABLE(id BIGINT)
    LANGUAGE SQL
    STABLE
    AS $function$
      WITH RECURSIVE descendants(id) AS (
        SELECT role.id FROM public.platform_roles role WHERE role.id = p_platform_role_id
        UNION
        SELECT child.id
          FROM public.platform_roles child
          JOIN descendants parent ON child.parent_role_id = parent.id
      )
      SELECT descendants.id FROM descendants;
    $function$;

    CREATE OR REPLACE FUNCTION public.get_all_platform_role_ids()
    RETURNS TABLE(id BIGINT)
    LANGUAGE SQL
    STABLE
    AS $function$
      SELECT role.id FROM public.platform_roles role;
    $function$;

    CREATE OR REPLACE FUNCTION public.load_super_admin_access(p_admin_id BIGINT)
    RETURNS TABLE(
      id BIGINT,
      name TEXT,
      email TEXT,
      status TEXT,
      platform_role_id BIGINT,
      is_platform_owner BOOLEAN,
      role_name TEXT
    )
    LANGUAGE SQL
    STABLE
    AS $function$
      SELECT admin.id::BIGINT,
             admin.name::TEXT,
             admin.email::TEXT,
             admin.status::TEXT,
             admin.platform_role_id::BIGINT,
             (admin.is_platform_owner OR LOWER(admin.email) = 'superadmin@crm.com'),
             role.name::TEXT
        FROM public.saas_super_admins admin
        LEFT JOIN public.platform_roles role ON role.id = admin.platform_role_id
       WHERE admin.id = p_admin_id;
    $function$;

    CREATE OR REPLACE FUNCTION public.find_super_admin_for_login(p_email TEXT)
    RETURNS TABLE(id BIGINT, name TEXT, email TEXT, password_hash TEXT, status TEXT)
    LANGUAGE SQL
    STABLE
    AS $function$
      SELECT admin.id::BIGINT, admin.name::TEXT, admin.email::TEXT,
             admin.password_hash::TEXT, admin.status::TEXT
        FROM public.saas_super_admins admin
       WHERE admin.email = p_email
       LIMIT 1;
    $function$;

    CREATE OR REPLACE FUNCTION public.list_saas_tenants_with_stats()
    RETURNS TABLE(
      id BIGINT,
      name TEXT,
      slug TEXT,
      domain TEXT,
      status TEXT,
      plan TEXT,
      logo_url TEXT,
      settings JSONB,
      created_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ,
      user_count INTEGER,
      lead_count INTEGER
    )
    LANGUAGE SQL
    STABLE
    AS $function$
      SELECT tenant.id::BIGINT,
             tenant.name::TEXT,
             tenant.slug::TEXT,
             tenant.domain::TEXT,
             tenant.status::TEXT,
             tenant.plan::TEXT,
             tenant.logo_url::TEXT,
             tenant.settings::JSONB,
             tenant.created_at::TIMESTAMPTZ,
             tenant.updated_at::TIMESTAMPTZ,
             COALESCE(users.user_count, 0)::INTEGER,
             COALESCE(leads.lead_count, 0)::INTEGER
        FROM public.saas_tenants tenant
        LEFT JOIN (
          SELECT app_user.tenant_id, COUNT(*)::INTEGER AS user_count
            FROM public.users app_user
           GROUP BY app_user.tenant_id
        ) users ON users.tenant_id = tenant.id
        LEFT JOIN (
          SELECT lead.tenant_id, COUNT(*)::INTEGER AS lead_count
            FROM public.leads lead
           GROUP BY lead.tenant_id
        ) leads ON leads.tenant_id = tenant.id
       ORDER BY tenant.id DESC;
    $function$;

    CREATE OR REPLACE FUNCTION public.saas_tenant_slug_exists(p_slug TEXT)
    RETURNS BOOLEAN
    LANGUAGE SQL
    STABLE
    AS $function$
      SELECT EXISTS (
        SELECT 1 FROM public.saas_tenants tenant WHERE tenant.slug = p_slug
      );
    $function$;

    CREATE OR REPLACE FUNCTION public.saas_tenant_slug_conflicts(
      p_slug TEXT,
      p_exclude_tenant_id BIGINT
    )
    RETURNS BOOLEAN
    LANGUAGE SQL
    STABLE
    AS $function$
      SELECT EXISTS (
        SELECT 1
          FROM public.saas_tenants tenant
         WHERE tenant.slug = p_slug
           AND tenant.id <> p_exclude_tenant_id
      );
    $function$;

    CREATE OR REPLACE FUNCTION public.get_saas_tenant(p_tenant_id BIGINT)
    RETURNS JSONB
    LANGUAGE SQL
    STABLE
    AS $function$
      SELECT to_jsonb(tenant)
        FROM public.saas_tenants tenant
       WHERE tenant.id = p_tenant_id;
    $function$;

    CREATE OR REPLACE FUNCTION public.update_saas_tenant(
      p_tenant_id BIGINT,
      p_tenant JSONB,
      p_admin JSONB DEFAULT NULL
    )
    RETURNS JSONB
    LANGUAGE plpgsql
    AS $function$
    DECLARE
      tenant_row public.saas_tenants%ROWTYPE;
    BEGIN
      PERFORM set_config('app.current_tenant_id', p_tenant_id::TEXT, TRUE);
      PERFORM set_config('app.is_super_admin', 'true', TRUE);

      UPDATE public.saas_tenants tenant
         SET name = p_tenant->>'name',
             slug = p_tenant->>'slug',
             plan = p_tenant->>'plan',
             status = p_tenant->>'status',
             logo_url = NULLIF(p_tenant->>'logo_url', ''),
             settings = p_tenant->'settings',
             updated_at = NOW()
       WHERE tenant.id = p_tenant_id
       RETURNING tenant.* INTO tenant_row;

      IF NOT FOUND THEN
        RETURN NULL;
      END IF;

      IF p_admin IS NOT NULL THEN
        UPDATE public.users app_user
           SET name = COALESCE(NULLIF(p_admin->>'name', ''), app_user.name),
               email = COALESCE(NULLIF(p_admin->>'email', ''), app_user.email),
               password = COALESCE(NULLIF(p_admin->>'password_hash', ''), app_user.password)
         WHERE app_user.id = (
           SELECT primary_user.id
             FROM public.users primary_user
            WHERE primary_user.tenant_id = p_tenant_id
            ORDER BY primary_user.id ASC
            LIMIT 1
         );
      END IF;

      RETURN to_jsonb(tenant_row);
    END;
    $function$;

    CREATE OR REPLACE FUNCTION public.update_saas_tenant_status(
      p_tenant_id BIGINT,
      p_status TEXT
    )
    RETURNS JSONB
    LANGUAGE SQL
    AS $function$
      UPDATE public.saas_tenants tenant
         SET status = p_status,
             updated_at = NOW()
       WHERE tenant.id = p_tenant_id
       RETURNING to_jsonb(tenant);
    $function$;

    CREATE OR REPLACE FUNCTION public.delete_saas_tenant(p_tenant_id BIGINT)
    RETURNS TABLE(
      id BIGINT,
      name TEXT,
      slug TEXT
    )
    LANGUAGE plpgsql
    AS $function$
    DECLARE
      v_tenant RECORD;
    BEGIN
      DELETE FROM public.platform_payments WHERE tenant_id = p_tenant_id;
      DELETE FROM public.platform_subscriptions WHERE tenant_id = p_tenant_id;
      DELETE FROM public.leads WHERE tenant_id = p_tenant_id;
      DELETE FROM public.persons WHERE tenant_id = p_tenant_id;
      DELETE FROM public.users WHERE tenant_id = p_tenant_id;
      DELETE FROM public.roles WHERE tenant_id = p_tenant_id;
      DELETE FROM public.saas_tenants WHERE saas_tenants.id = p_tenant_id
        RETURNING saas_tenants.id::BIGINT, saas_tenants.name::TEXT, saas_tenants.slug::TEXT INTO v_tenant;

      IF v_tenant.id IS NOT NULL THEN
        RETURN QUERY SELECT v_tenant.id, v_tenant.name, v_tenant.slug;
      END IF;
    END;
    $function$;

    CREATE OR REPLACE FUNCTION public.get_super_admin_metrics()
    RETURNS TABLE(
      total_tenants INTEGER,
      active_tenants INTEGER,
      total_users INTEGER,
      total_leads INTEGER
    )
    LANGUAGE SQL
    STABLE
    AS $function$
      SELECT (SELECT COUNT(*)::INTEGER FROM public.saas_tenants),
             (SELECT COUNT(*)::INTEGER FROM public.saas_tenants WHERE status = 'active'),
             (SELECT COUNT(*)::INTEGER FROM public.users),
             (SELECT COUNT(*)::INTEGER FROM public.leads);
    $function$;

    CREATE OR REPLACE FUNCTION public.get_saas_tenant_for_impersonation(p_tenant_id BIGINT)
    RETURNS TABLE(
      id BIGINT,
      name TEXT,
      slug TEXT,
      domain TEXT,
      status TEXT,
      settings JSONB,
      subscription_expiry_date TIMESTAMPTZ
    )
    LANGUAGE plpgsql
    AS $function$
    BEGIN
      RETURN QUERY
      SELECT t.id,
             t.name::TEXT,
             t.slug::TEXT,
             t.domain::TEXT,
             t.status::TEXT,
             t.settings,
             COALESCE(sub.ends_at, (t.settings->>'subscription_expiry_date')::timestamptz) AS subscription_expiry_date
        FROM public.saas_tenants t
        LEFT JOIN (
          SELECT DISTINCT ON (tenant_id) tenant_id, ends_at
            FROM public.platform_subscriptions
           ORDER BY tenant_id, id DESC
        ) sub ON sub.tenant_id = t.id
       WHERE t.id = p_tenant_id;
    END;
    $function$;

    CREATE OR REPLACE FUNCTION public.get_user_for_impersonation(p_user_id BIGINT)
    RETURNS TABLE(
      id BIGINT,
      name TEXT,
      email TEXT,
      tenant_id BIGINT,
      tenant_slug TEXT,
      tenant_name TEXT,
      tenant_status TEXT,
      subscription_expiry_date TIMESTAMPTZ,
      role_id BIGINT,
      role_name TEXT
    )
    LANGUAGE plpgsql
    AS $function$
    BEGIN
      RETURN QUERY
      SELECT u.id::BIGINT,
             u.name::TEXT,
             u.email::TEXT,
             u.tenant_id::BIGINT,
             t.slug::TEXT AS tenant_slug,
             t.name::TEXT AS tenant_name,
             t.status::TEXT AS tenant_status,
             COALESCE(sub.ends_at, (t.settings->>'subscription_expiry_date')::timestamptz) AS subscription_expiry_date,
             u.role_id::BIGINT,
             r.name::TEXT AS role_name
        FROM public.users u
        LEFT JOIN public.saas_tenants t ON t.id = u.tenant_id
        LEFT JOIN (
          SELECT DISTINCT ON (tenant_id) tenant_id, ends_at
            FROM public.platform_subscriptions
           ORDER BY tenant_id, id DESC
        ) sub ON sub.tenant_id = t.id
        LEFT JOIN public.roles r ON r.id = u.role_id
       WHERE u.id = p_user_id;
    END;
    $function$;

    CREATE OR REPLACE FUNCTION public.get_or_create_tenant_admin_user_for_impersonation(p_tenant_id BIGINT)
    RETURNS TABLE(
      id BIGINT,
      name TEXT,
      email TEXT,
      tenant_id BIGINT,
      role_id BIGINT,
      role_name TEXT
    )
    LANGUAGE plpgsql
    AS $function$
    DECLARE
      v_user RECORD;
      v_tenant RECORD;
      v_role_id BIGINT;
    BEGIN
      -- 1. Try to find existing admin or active user for the tenant
      SELECT u.id::BIGINT,
             u.name::TEXT,
             u.email::TEXT,
             u.tenant_id::BIGINT,
             u.role_id::BIGINT,
             r.name::TEXT AS role_name
        INTO v_user
        FROM public.users u
        LEFT JOIN public.roles r ON r.id = u.role_id
       WHERE u.tenant_id = p_tenant_id
       ORDER BY CASE WHEN LOWER(COALESCE(r.name, '')) IN ('admin', 'administrator') THEN 0 ELSE 1 END,
                CASE WHEN u.status = true THEN 0 ELSE 1 END,
                u.id ASC
       LIMIT 1;

      IF v_user.id IS NOT NULL THEN
        RETURN QUERY SELECT v_user.id, v_user.name, v_user.email, v_user.tenant_id, v_user.role_id, v_user.role_name;
        RETURN;
      END IF;

      -- 2. If no user exists, fetch tenant details to generate a fallback admin
      SELECT t.id, t.name, t.slug INTO v_tenant
        FROM public.saas_tenants t
       WHERE t.id = p_tenant_id;

      IF NOT FOUND THEN
        RETURN;
      END IF;

      -- 3. Check or create Administrator role
      SELECT r.id INTO v_role_id
        FROM public.roles r
       WHERE r.tenant_id = p_tenant_id
         AND LOWER(r.name) IN ('admin', 'administrator')
       LIMIT 1;

      IF v_role_id IS NULL THEN
        INSERT INTO public.roles (name, description, permission_type, tenant_id)
        VALUES ('Administrator', 'Full system access', 'all', p_tenant_id)
        RETURNING roles.id INTO v_role_id;
      END IF;

      -- 4. Create fallback administrator user
      RETURN QUERY
      INSERT INTO public.users (name, email, password, tenant_id, role_id, status)
      VALUES (
        COALESCE(v_tenant.name, 'Tenant') || ' Administrator',
        'admin@' || COALESCE(v_tenant.slug, 'crm') || '.localhost',
        'managed_tenant_sso',
        p_tenant_id,
        v_role_id,
        true
      )
      RETURNING users.id::BIGINT, users.name::TEXT, users.email::TEXT, users.tenant_id::BIGINT, users.role_id::BIGINT, 'admin'::TEXT AS role_name;
    END;
    $function$;

    CREATE OR REPLACE FUNCTION public.get_platform_sidebar_counts()
    RETURNS TABLE(
      organizations INTEGER,
      subscriptions INTEGER,
      payments INTEGER,
      demos INTEGER,
      notifications INTEGER
    )
    LANGUAGE plpgsql
    AS $function$
    BEGIN
      RETURN QUERY
      SELECT
        (SELECT COUNT(*)::INTEGER FROM public.saas_tenants),
        (SELECT COUNT(*)::INTEGER FROM public.platform_subscriptions WHERE status IN ('pending', 'trialing')),
        (SELECT COUNT(*)::INTEGER FROM public.platform_payments WHERE status = 'pending'),
        (SELECT COUNT(*)::INTEGER FROM public.platform_demo_requests WHERE status = 'new'),
        (SELECT COUNT(*)::INTEGER FROM public.platform_notifications WHERE is_read = FALSE);
    END;
    $function$;

    CREATE OR REPLACE FUNCTION public.get_expiring_subscriptions(p_days_ahead INTEGER DEFAULT 7)
    RETURNS TABLE(
      id BIGINT,
      name TEXT,
      slug TEXT,
      admin_email TEXT,
      admin_name TEXT,
      ends_at TIMESTAMPTZ,
      days_left INTEGER
    )
    LANGUAGE plpgsql
    AS $function$
    BEGIN
      RETURN QUERY
      SELECT t.id::BIGINT,
             t.name::TEXT,
             t.slug::TEXT,
             u.email::TEXT AS admin_email,
             u.name::TEXT AS admin_name,
             s.ends_at::TIMESTAMPTZ,
             EXTRACT(DAY FROM (s.ends_at - NOW()))::INTEGER AS days_left
        FROM public.saas_tenants t
        JOIN public.platform_subscriptions s ON s.tenant_id = t.id AND s.status = 'active'
        JOIN LATERAL (
          SELECT email, name FROM public.users
           WHERE tenant_id = t.id AND status = true
           ORDER BY id ASC LIMIT 1
        ) u ON TRUE
       WHERE s.ends_at IS NOT NULL
         AND s.ends_at <= NOW() + (p_days_ahead || ' days')::INTERVAL
       ORDER BY s.ends_at ASC;
    END;
    $function$;

    CREATE OR REPLACE FUNCTION public.create_platform_notification(
      p_title TEXT,
      p_message TEXT,
      p_type TEXT DEFAULT 'info',
      p_metadata JSONB DEFAULT '{}'::jsonb
    )
    RETURNS BIGINT
    LANGUAGE plpgsql
    AS $function$
    DECLARE
      v_id BIGINT;
    BEGIN
      INSERT INTO public.platform_notifications (title, message, type, is_read, metadata, created_at)
      VALUES (p_title, p_message, COALESCE(p_type, 'info'), FALSE, COALESCE(p_metadata, '{}'::jsonb), NOW())
      RETURNING id INTO v_id;
      RETURN v_id;
    END;
    $function$;

    CREATE OR REPLACE FUNCTION public.update_user_password(
      p_user_id BIGINT,
      p_password_hash TEXT
    )
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    AS $function$
    BEGIN
      UPDATE public.users
         SET password = p_password_hash,
             updated_at = NOW()
       WHERE id = p_user_id;
      RETURN FOUND;
    END;
    $function$;

    CREATE TABLE IF NOT EXISTS public.platform_pricing_tiers (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL UNIQUE,
      description TEXT,
      amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
      currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      billing_interval VARCHAR(20) NOT NULL DEFAULT 'monthly'
        CHECK (billing_interval IN ('monthly', 'yearly', 'one_time')),
      trial_days INTEGER NOT NULL DEFAULT 14 CHECK (trial_days >= 0),
      features JSONB NOT NULL DEFAULT '[]'::jsonb,
      limits JSONB NOT NULL DEFAULT '{}'::jsonb,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE public.platform_pricing_tiers
      ADD COLUMN IF NOT EXISTS trial_days INTEGER NOT NULL DEFAULT 14;
    INSERT INTO public.platform_pricing_tiers
      (name, description, amount_cents, currency, billing_interval, trial_days, features, limits, active)
    VALUES
      (
        'Starter',
        'A clear workspace for a focused sales team.',
        999900,
        'INR',
        'yearly',
        14,
        '["Leads and pipeline","Persons and organizations","Activities and tasks","Up to 3 teammates"]'::jsonb,
        '{"users":3}'::jsonb,
        TRUE
      ),
      (
        'Growth',
        'For teams ready to standardize customer work.',
        1999900,
        'INR',
        'yearly',
        14,
        '["Everything in Starter","Automation workflows","Custom attributes","Reporting and visibility"]'::jsonb,
        '{}'::jsonb,
        TRUE
      ),
      (
        'Business',
        'For service-heavy sales teams with more complexity.',
        2999900,
        'INR',
        'yearly',
        14,
        '["Everything in Growth","Advanced integrations","Quoted products and warehouses","Prioritized onboarding"]'::jsonb,
        '{}'::jsonb,
        TRUE
      )
    ON CONFLICT (name) DO NOTHING;

    CREATE TABLE IF NOT EXISTS public.platform_subscriptions (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
      pricing_tier_id BIGINT REFERENCES public.platform_pricing_tiers(id) ON DELETE SET NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'trialing'
        CHECK (status IN ('trialing', 'pending', 'active', 'past_due', 'cancelled', 'expired')),
      starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ends_at TIMESTAMPTZ,
      auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE public.platform_subscriptions
      DROP CONSTRAINT IF EXISTS platform_subscriptions_status_check;
    ALTER TABLE public.platform_subscriptions
      ADD CONSTRAINT platform_subscriptions_status_check
      CHECK (status IN ('trialing', 'pending', 'active', 'past_due', 'cancelled', 'expired'));
    CREATE INDEX IF NOT EXISTS platform_subscriptions_tenant_idx
      ON public.platform_subscriptions (tenant_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS public.platform_payments (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
      subscription_id BIGINT REFERENCES public.platform_subscriptions(id) ON DELETE SET NULL,
      pricing_tier_id BIGINT REFERENCES public.platform_pricing_tiers(id) ON DELETE SET NULL,
      amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
      currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      status VARCHAR(20) NOT NULL DEFAULT 'recorded'
        CHECK (status IN ('created', 'pending', 'paid', 'failed', 'refunded', 'recorded')),
      method VARCHAR(30) NOT NULL DEFAULT 'manual',
      provider_order_id VARCHAR(120) UNIQUE,
      provider_payment_link_id VARCHAR(120),
      provider_payment_link_url TEXT,
      provider_payment_id VARCHAR(120) UNIQUE,
      reference VARCHAR(191),
      notes TEXT,
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE public.platform_payments
      ADD COLUMN IF NOT EXISTS pricing_tier_id BIGINT REFERENCES public.platform_pricing_tiers(id) ON DELETE SET NULL;
    ALTER TABLE public.platform_payments
      ADD COLUMN IF NOT EXISTS provider_payment_link_id VARCHAR(120),
      ADD COLUMN IF NOT EXISTS provider_payment_link_url TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS platform_payments_payment_link_id_idx
      ON public.platform_payments (provider_payment_link_id)
      WHERE provider_payment_link_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS platform_payments_tenant_idx
      ON public.platform_payments (tenant_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS public.platform_demo_requests (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(191) NOT NULL,
      email VARCHAR(255) NOT NULL,
      organization VARCHAR(191),
      company VARCHAR(191),
      phone VARCHAR(50),
      city VARCHAR(100),
      state VARCHAR(100),
      preferred_demo_date DATE,
      preferred_demo_time TIME,
      submission_id UUID,
      message TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'contacted', 'qualified', 'closed')),
      notes TEXT,
      trial_tenant_id BIGINT UNIQUE REFERENCES public.saas_tenants(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE public.platform_demo_requests
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS trial_tenant_id BIGINT UNIQUE REFERENCES public.saas_tenants(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS organization VARCHAR(191),
      ADD COLUMN IF NOT EXISTS city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS state VARCHAR(100),
      ADD COLUMN IF NOT EXISTS preferred_demo_date DATE,
      ADD COLUMN IF NOT EXISTS preferred_demo_time TIME,
      ADD COLUMN IF NOT EXISTS submission_id UUID;
    CREATE INDEX IF NOT EXISTS platform_demo_requests_created_idx
      ON public.platform_demo_requests (created_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS platform_demo_requests_submission_id_idx
      ON public.platform_demo_requests (submission_id)
      WHERE submission_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS public.platform_notifications (
      id BIGSERIAL PRIMARY KEY,
      title VARCHAR(191) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(30) NOT NULL DEFAULT 'info',
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE public.platform_notifications
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    CREATE INDEX IF NOT EXISTS platform_notifications_created_idx
      ON public.platform_notifications (created_at DESC);

    CREATE TABLE IF NOT EXISTS public.platform_email_templates (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(191) NOT NULL UNIQUE,
      subject VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    INSERT INTO public.platform_email_templates (name, subject, content)
    VALUES
      (
        'demo_schedule_confirmation',
        'Your MORSE CRM Demo Request is Confirmed - {{organization}}',
        '<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; color: #1e293b;"><div style="background-color: #03075e; padding: 28px 32px;"><h1 style="margin: 0; color: #ffffff; font-size: 22px;">MORSE CRM</h1><p style="margin: 4px 0 0 0; color: #93c5fd; font-size: 13px;">Live Demonstration Request Confirmation</p></div><div style="padding: 32px;"><h2 style="margin: 0 0 16px 0; font-size: 18px;">Hi {{name}},</h2><p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">Thank you for scheduling a demonstration of <strong>MORSE CRM</strong> for <strong>{{organization}}</strong>. We have received your request and our team is preparing your personalized walkthrough.</p><div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;"><h3 style="margin: 0 0 12px 0; font-size: 14px; color: #03075e; text-transform: uppercase;">Demo Schedule Details</h3><table style="width: 100%; font-size: 13px;"><tr><td style="color: #64748b; width: 140px;">Organization:</td><td><strong>{{organization}}</strong></td></tr><tr><td style="color: #64748b;">Preferred Date:</td><td><strong>{{preferred_date}}</strong></td></tr><tr><td style="color: #64748b;">Preferred Time:</td><td><strong>{{preferred_time}}</strong></td></tr><tr><td style="color: #64748b;">Location:</td><td><strong>{{city}}, {{state}}</strong></td></tr><tr><td style="color: #64748b;">Topics to Explore:</td><td><strong>{{requirements}}</strong></td></tr></table></div><p style="font-size: 14px; line-height: 1.6; color: #475569;">A specialist will review your requirements and send a calendar invitation with a video meeting link to <strong>{{email}}</strong>.</p><p style="font-size: 13px; color: #64748b;">Need to reschedule or have questions? Simply reply directly to this email.</p><div style="border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;"><p style="margin: 0; font-weight: 600;">Warm regards,</p><p style="margin: 2px 0 0 0; color: #64748b;">The MORSE CRM Team</p></div></div><div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">&copy; 2026 MORSE CRM. All rights reserved.</div></div>'
      ),
      (
        'demo_received',
        'Your MORSE CRM Demo Request is Confirmed - {{organization}}',
        '<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; color: #1e293b;"><div style="background-color: #03075e; padding: 28px 32px;"><h1 style="margin: 0; color: #ffffff; font-size: 22px;">MORSE CRM</h1><p style="margin: 4px 0 0 0; color: #93c5fd; font-size: 13px;">Live Demonstration Request Confirmation</p></div><div style="padding: 32px;"><h2 style="margin: 0 0 16px 0; font-size: 18px;">Hi {{name}},</h2><p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">Thank you for scheduling a demonstration of <strong>MORSE CRM</strong> for <strong>{{organization}}</strong>. We have received your request and our team is preparing your personalized walkthrough.</p><div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;"><h3 style="margin: 0 0 12px 0; font-size: 14px; color: #03075e; text-transform: uppercase;">Demo Schedule Details</h3><table style="width: 100%; font-size: 13px;"><tr><td style="color: #64748b; width: 140px;">Organization:</td><td><strong>{{organization}}</strong></td></tr><tr><td style="color: #64748b;">Preferred Date:</td><td><strong>{{preferred_date}}</strong></td></tr><tr><td style="color: #64748b;">Preferred Time:</td><td><strong>{{preferred_time}}</strong></td></tr><tr><td style="color: #64748b;">Location:</td><td><strong>{{city}}, {{state}}</strong></td></tr><tr><td style="color: #64748b;">Topics to Explore:</td><td><strong>{{requirements}}</strong></td></tr></table></div><p style="font-size: 14px; line-height: 1.6; color: #475569;">A specialist will review your requirements and send a calendar invitation with a video meeting link to <strong>{{email}}</strong>.</p><p style="font-size: 13px; color: #64748b;">Need to reschedule or have questions? Simply reply directly to this email.</p><div style="border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;"><p style="margin: 0; font-weight: 600;">Warm regards,</p><p style="margin: 2px 0 0 0; color: #64748b;">The MORSE CRM Team</p></div></div><div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">&copy; 2026 MORSE CRM. All rights reserved.</div></div>'
      ),
      (
        'trial_activation',
        'Your MORSE CRM trial is ready',
        '<p>Hi {{name}},</p><p>Your {{trial_days}}-day MORSE CRM trial for {{company}} is ready.</p><p><a href="{{login_url}}">Open your CRM workspace</a></p><p>Sign-in email: {{email}}<br>Workspace: {{slug}}<br>Trial expires: {{trial_expiry}}</p><p>For your security, change your temporary password after signing in.</p><p>Regards,<br>MORSE CRM Team</p>'
      ),
      (
        'plan_activation',
        'Your MORSE CRM plan is active',
        '<p>Hi {{name}},</p><p>Your {{plan_name}} plan for {{company}} is now active.</p><p>You can sign in to your workspace here: <a href="{{login_url}}">{{login_url}}</a></p><p>Regards,<br>MORSE CRM Team</p>'
      ),
      (
        'payment_confirmation',
        'Payment received for MORSE CRM',
        '<p>Hi {{name}},</p><p>We received your payment of {{amount}} {{currency}} for {{company}}.</p><p>Payment reference: {{payment_reference}}<br>Plan: {{plan_name}}</p><p>Thank you,<br>MORSE CRM Team</p>'
      ),
      (
        'subscription_payment_link',
        'Complete your MORSE CRM subscription payment',
        '<p>Hi {{name}},</p><p>To activate the {{plan_name}} plan for {{company}}, complete payment of {{amount}} {{currency}} using the secure link below:</p><p><a href="{{payment_link}}">Pay securely</a></p><p>Your subscription will activate after Razorpay confirms payment.</p><p>Regards,<br>MORSE CRM Team</p>'
      ),
      (
        'new_user_welcome',
        'Welcome to {{company}} on MORSE CRM',
        '<p>Hi {{name}},</p><p>Your user account for {{company}} has been created.</p><p>Sign in using {{email}}: <a href="{{login_url}}">{{login_url}}</a></p><p>If you need help accessing your account, contact your organization administrator.</p><p>Regards,<br>MORSE CRM Team</p>'
      ),
      (
        'new_organization_created',
        'Your MORSE CRM workspace is ready',
        '<p>Hi {{name}},</p><p>The MORSE CRM workspace for {{company}} has been created successfully.</p><p>Workspace: {{slug}}<br>Sign in: <a href="{{login_url}}">{{login_url}}</a><br>Plan: {{plan_name}}</p><p>Regards,<br>MORSE CRM Team</p>'
      )
    ON CONFLICT (name) DO NOTHING;

    CREATE TABLE IF NOT EXISTS public.platform_smtp_config (
      id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      host VARCHAR(255),
      port INTEGER,
      secure BOOLEAN NOT NULL DEFAULT FALSE,
      delivery_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      username VARCHAR(255),
      password_encrypted TEXT,
      from_email VARCHAR(255),
      from_name VARCHAR(191),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE public.platform_smtp_config
      ADD COLUMN IF NOT EXISTS delivery_enabled BOOLEAN NOT NULL DEFAULT TRUE;
    INSERT INTO public.platform_smtp_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

    CREATE OR REPLACE FUNCTION public.provision_saas_tenant(
      p_tenant JSONB,
      p_admin JSONB,
      p_trial_subscription JSONB DEFAULT NULL
    )
    RETURNS JSONB
    LANGUAGE plpgsql
    AS $function$
    DECLARE
      tenant_row public.saas_tenants%ROWTYPE;
      admin_user_row RECORD;
      provisioned_tenant_id public.saas_tenants.id%TYPE;
      admin_role_id public.roles.id%TYPE;
      pipeline_id public.lead_pipelines.id%TYPE;
    BEGIN
      INSERT INTO public.saas_tenants (name, slug, plan, status, logo_url, settings)
      VALUES (
        p_tenant->>'name',
        p_tenant->>'slug',
        COALESCE(p_tenant->>'plan', 'pro'),
        'active',
        NULLIF(p_tenant->>'logo_url', ''),
        p_tenant->'settings'
      )
      RETURNING * INTO tenant_row;
      provisioned_tenant_id := tenant_row.id;

      IF p_trial_subscription IS NOT NULL AND p_trial_subscription <> 'null'::JSONB THEN
        INSERT INTO public.platform_subscriptions
          (tenant_id, pricing_tier_id, status, starts_at, ends_at, auto_renew, notes)
        VALUES (
          provisioned_tenant_id,
          NULLIF(p_trial_subscription->>'pricing_tier_id', '')::BIGINT,
          'trialing',
          NOW(),
          (p_trial_subscription->>'ends_at')::TIMESTAMPTZ,
          FALSE,
          'Activated from a demo request'
        );
      END IF;

      PERFORM set_config('app.current_tenant_id', provisioned_tenant_id::TEXT, TRUE);
      PERFORM set_config('app.is_super_admin', 'true', TRUE);

      INSERT INTO public.roles (name, description, permission_type, tenant_id)
      VALUES ('Administrator', 'Full system access', 'all', provisioned_tenant_id)
      RETURNING id INTO admin_role_id;

      INSERT INTO public.users (name, email, password, status, role_id, tenant_id)
      VALUES (
        p_admin->>'name',
        LOWER(p_admin->>'email'),
        p_admin->>'password_hash',
        TRUE,
        admin_role_id,
        provisioned_tenant_id
      )
      RETURNING id, name, email, role_id, tenant_id INTO admin_user_row;

      INSERT INTO public.lead_pipelines (name, is_default, rotten_days, tenant_id)
      VALUES ('Default Pipeline', TRUE, 30, provisioned_tenant_id)
      RETURNING id INTO pipeline_id;

      INSERT INTO public.lead_pipeline_stages
        (lead_pipeline_id, code, name, probability, sort_order, tenant_id)
      VALUES
        (pipeline_id, 'new', 'New Lead', 10, 1, provisioned_tenant_id),
        (pipeline_id, 'contacted', 'Contacted', 30, 2, provisioned_tenant_id),
        (pipeline_id, 'proposal', 'Proposal Sent', 60, 3, provisioned_tenant_id),
        (pipeline_id, 'negotiation', 'Negotiation', 80, 4, provisioned_tenant_id),
        (pipeline_id, 'won', 'Won', 100, 5, provisioned_tenant_id),
        (pipeline_id, 'lost', 'Lost', 0, 6, provisioned_tenant_id);

      INSERT INTO public.lead_sources (name, tenant_id)
      SELECT source.name, provisioned_tenant_id
        FROM unnest(ARRAY['Website Form', 'Direct Call', 'Email Campaign', 'Referral', 'Social Media']) AS source(name)
      ON CONFLICT DO NOTHING;

      INSERT INTO public.lead_types (name, tenant_id)
      SELECT lead_type.name, provisioned_tenant_id
        FROM unnest(ARRAY['New Business', 'Existing Customer Upgrade', 'Partnership']) AS lead_type(name)
      ON CONFLICT DO NOTHING;

      RETURN jsonb_build_object(
        'tenant', to_jsonb(tenant_row),
        'adminUser', to_jsonb(admin_user_row)
      );
    END;
    $function$;
  `);
}
