import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { env } from '@/config/env';
import { pool } from '@/config/db';
import { UserService } from '@/services/user.service';
import { toPublicUser } from '@/interfaces';

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter('token'),
      ]),
      secretOrKey: env.JWT_SECRET,
    },
    async (payload: { sub: string; tenant_id?: number; is_super_admin?: boolean; role?: string }, done) => {
      try {
        // 1. If payload explicitly indicates Super Admin, check public.saas_super_admins
        if (payload.is_super_admin || payload.role === 'super_admin') {
          const { rows } = await pool.query(
            'SELECT id, name, email, status FROM public.saas_super_admins WHERE id = $1 LIMIT 1',
            [payload.sub]
          );
          if (rows[0] && rows[0].status === 'active') {
            const admin = rows[0];
            return done(null, {
              id: admin.id,
              name: admin.name,
              email: admin.email,
              role: 'super_admin',
              role_id: 1,
              tenant_id: payload.tenant_id,
              is_super_admin: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as any);
          }
        }

        // 2. Normal tenant user lookup
        const user = await UserService.findById(payload.sub, payload.tenant_id);
        if (user) {
          return done(null, toPublicUser(user));
        }

        // 3. Fallback: check if user is a super admin even without is_super_admin flag
        const { rows: saRows } = await pool.query(
          'SELECT id, name, email, status FROM public.saas_super_admins WHERE id = $1 LIMIT 1',
          [payload.sub]
        );
        if (saRows[0] && saRows[0].status === 'active') {
          const admin = saRows[0];
          return done(null, {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: 'super_admin',
            role_id: 1,
            tenant_id: payload.tenant_id,
            is_super_admin: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as any);
        }

        return done(null, false);
      } catch (err) {
        return done(err, false);
      }
    },
  ),
);

export { passport };
