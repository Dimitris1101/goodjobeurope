import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor() {
    const clientID = process.env.FACEBOOK_APP_ID;
    const clientSecret = process.env.FACEBOOK_APP_SECRET;
    const callbackURL = process.env.FACEBOOK_CALLBACK_URL;

    const disabled = !clientID || !clientSecret || !callbackURL;

    // ✅ super MUST be first statement
    super(
      disabled
        ? {
            clientID: 'DISABLED',
            clientSecret: 'DISABLED',
            callbackURL: 'http://localhost:4000/auth/facebook/callback',
            profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
          }
        : {
            clientID,
            clientSecret,
            callbackURL,
            profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
          },
    );

    if (disabled) {
      console.warn(
        '[FacebookStrategy] Facebook OAuth DISABLED – missing FACEBOOK_APP_ID / FACEBOOK_APP_SECRET / FACEBOOK_CALLBACK_URL',
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
