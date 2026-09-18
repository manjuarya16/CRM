import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { env } from '@/config/env';
import { UserService } from '@/services/user.service';
import { toPublicUser } from '@/interfaces';

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: env.JWT_SECRET,
    },
    async (payload: { sub: string }, done) => {
      try {
        const user = await UserService.findById(payload.sub);
        if (!user) return done(null, false);
        return done(null, toPublicUser(user));
      } catch (err) {
        return done(err, false);
      }
    },
  ),
);

export { passport };
