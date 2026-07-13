import { UseGuards, applyDecorators } from '@nestjs/common';
import { Role } from '@prisma/client';

import { RolProtected } from './rol-protected.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UserRoleGuard } from '../guards/user-role.guard';

export function Auth(...roles: Role[]) {
  return applyDecorators(RolProtected(...roles), UseGuards(JwtAuthGuard, UserRoleGuard));
}
