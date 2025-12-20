import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const auth = req.headers['authorization'] as string | undefined;
    if (!auth || !auth.startsWith('Bearer ')) throw new UnauthorizedException('Missing token');
    const token = auth.substring('Bearer '.length);
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET as string);
      req.user = payload; // { sub, role, iat, exp }
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
