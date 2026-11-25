import { ArgumentMetadata, ArgumentsHost, BadRequestException, Catch, ExceptionFilter, PipeTransform } from '@nestjs/common';
import type { Response } from 'express';
import type { ZodType } from 'zod';
import { ConflictError, ForbiddenError, NotFoundError } from './errors';

/** Validates and parses a request part with a Zod schema from @memoratag/contracts. */
export class ZodPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodType<T>) {}
  transform(value: unknown, _meta: ArgumentMetadata): T {
    const result = this.schema.safeParse(value ?? {});
    if (!result.success) throw new BadRequestException({ message: 'Validation failed', issues: result.error.issues });
    return result.data;
  }
}

@Catch(NotFoundError, ForbiddenError, ConflictError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost) {
    const status = error instanceof NotFoundError ? 404 : error instanceof ForbiddenError ? 403 : 409;
    host.switchToHttp().getResponse<Response>().status(status).json({ statusCode: status, message: error.message });
  }
}
