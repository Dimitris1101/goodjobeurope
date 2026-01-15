import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    const clientID = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const callbackURL = process.env.GOOGLE_CALLBACK_URL;

    const disabled = !clientID || !clientSecret || !callbackURL;

    // ✅ super MUST be first statement
    super(
      disabled
        ? {
            clientID: 'DISABLED',
            clientSecret: 'DISABLED',
            callbackURL: 'http://localhost:4000/auth/google/callback',
          }
        : {
            clientID,
            clientSecret,
            callbackURL,
          },
    );

    if (disabled) {
      console.warn(
        '[GoogleStrategy] Google OAuth DISABLED – missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_CALLBACK_URL',
      );
    }
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: Function,
  ) {
    done(null, profile);
  }
}
