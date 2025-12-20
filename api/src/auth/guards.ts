import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(): any {
  
    return {
      scope: ['email', 'profile'],
      prompt: 'select_account', // optional
      session: false,
    };
  }
}

@Injectable()
export class FacebookAuthGuard extends AuthGuard('facebook') {
  getAuthenticateOptions(): any {
    // ζητάμε email, αλλιώς το profile.emails έρχεται άδειο
    return {
      scope: ['email'],
      authType: 'rerequest', // αν το είχε αρνηθεί παλιότερα, ξαναρώτα
      session: false,
    };
  }
}
