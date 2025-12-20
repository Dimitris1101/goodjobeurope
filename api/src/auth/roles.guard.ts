// C:\job-matching\api\src\auth\roles.guard.ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.get<Array<string>>('roles', ctx.getHandler());
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest();
    const user = req.user as { sub: number; role: string } | undefined;

    if (!user) throw new ForbiddenException('No user in request');
    if (!required.includes(user.role)) throw new ForbiddenException('Insufficient role');

    return true;
  }
}