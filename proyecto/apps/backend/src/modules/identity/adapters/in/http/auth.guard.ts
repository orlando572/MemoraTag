import { CanActivate, createParamDecorator, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentUser as User } from '../../../domain/current-user';
import { TOKEN_VERIFIER, USER_DIRECTORY, TokenVerifier, UserDirectory } from '../../../application/ports';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_VERIFIER) private readonly verifier: TokenVerifier,
    @Inject(USER_DIRECTORY) private readonly users: UserDirectory,
  ) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request & { user?: User }>();
    const header = req.headers.authorization ?? '';
    if (!header.startsWith('Bearer ')) throw new UnauthorizedException();
    try {
      const user = await this.verifier.verify(header.slice(7));
      await this.users.remember(user);
      req.user = user;
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): User => ctx.switchToHttp().getRequest().user);
