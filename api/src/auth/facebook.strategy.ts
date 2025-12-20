import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor() {
  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET || !process.env.FACEBOOK_CALLBACK_URL) {
    console.error('[FacebookStrategy] Missing envs:', {
      hasId: !!process.env.FACEBOOK_APP_ID,
      hasSecret: !!process.env.FACEBOOK_APP_SECRET,
      hasCallback: !!process.env.FACEBOOK_CALLBACK_URL,
    });
  }

  super({
    clientID: process.env.FACEBOOK_APP_ID!,
    clientSecret: process.env.FACEBOOK_APP_SECRET!,
    callbackURL: process.env.FACEBOOK_CALLBACK_URL!,
    profileFields: ['id', 'displayName', 'emails', 'photos'],
    enableProof: true,
    // scope στο guard
  });
}

  validate(_accessToken: string, _refreshToken: string, profile: Profile, done: Function) {
    done(null, profile);
  }
}
