import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
    // βοηθάει πολύ αν κάτι λείπει
    // ΜΗΝ αφήσεις credentials στα logs σε production
    console.error('[GoogleStrategy] Missing envs:', {
      hasId: !!process.env.GOOGLE_CLIENT_ID,
      hasSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasCallback: !!process.env.GOOGLE_CALLBACK_URL,
    });
  }

  super({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    // ΜΗΝ βάζεις scope εδώ, το περνάμε στο guard
  });
}

  validate(_accessToken: string, _refreshToken: string, profile: Profile, done: Function) {
    done(null, profile);
  }
}
