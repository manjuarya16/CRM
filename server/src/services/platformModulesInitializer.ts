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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
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
        'demo_received',
        'We received your CRM demo request',
        '<p>Hi {{name}},</p><p>Thank you for requesting a MORSE CRM demo. Our team will review your requirements and contact you to arrange a time.</p><p>Regards,<br>MORSE CRM Team</p>'
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
