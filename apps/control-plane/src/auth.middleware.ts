import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';

// Simplified representation of user roles for strict RBAC mock
enum Role {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
  AUDITOR = 'auditor',
}

interface UserPayload {
  id: string;
  role: Role;
  permissions: string[];
}

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];

    // Mock token verification - In production, verify JWT signature via KMS/Vault key and check expiry
    const user = this.verifyAndDecodeMockToken(token);

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    // Attach user to request for downstream handlers
    request.user = user;

    // Strict RBAC mockup: enforce minimum role or permission requirement here based on route
    // Example: Only Admins or Editors can author tests via the POST endpoint
    if (user.role === Role.VIEWER || user.role === Role.AUDITOR) {
      throw new ForbiddenException('Insufficient permissions to perform this action');
    }

    return true;
  }

  private verifyAndDecodeMockToken(token: string): UserPayload | null {
    // Return a mocked valid user for demonstration purposes
    if (token === 'valid-admin-token') {
      return {
        id: '123e4567-e89b-12d3-a456-426614174000',
        role: Role.ADMIN,
        permissions: ['tests.create', 'tests.delete', 'agents.policy.manage'],
      };
    }

    if (token === 'valid-editor-token') {
        return {
          id: '123e4567-e89b-12d3-a456-426614174001',
          role: Role.EDITOR,
          permissions: ['tests.create', 'tests.update'],
        };
    }

    return null;
  }
}
