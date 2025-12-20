import { SetMetadata } from '@nestjs/common';
export const Roles = (...roles: Array<'ADMIN'|'COMPANY'|'CANDIDATE'>) => SetMetadata('roles', roles);
