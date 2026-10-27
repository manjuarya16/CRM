import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { env } from '@/config/env';
import { UserService } from '@/services/user.service';
import { toPublicUser } from '@/interfaces';
import { runWithTenantContext, getTenantContext } from '@/context/tenantContext';

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter('token'),
      ]),
      secretOrKey: env.JWT_SECRET,
    },
    async (payload: { sub: string }, done) => {
      try {
        const user = await runWithTenantContext(
          { ...(getTenantContext() || {}), isSuperAdmin: true },
          () => UserService.findById(payload.sub)
        );
        if (!user) return done(null, false);
        return done(null, toPublicUser(user));
      } catch (err) {
        return done(err, false);
      }
    },
  ),
);

export { passport };
