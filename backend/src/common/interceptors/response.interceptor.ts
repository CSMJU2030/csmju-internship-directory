import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Response } from 'express';
import { Observable, map } from 'rxjs';
import { CollectionResult, SuccessResponse } from '../api-response';

/**
 * Wraps every successful controller result in the standard envelope. Answers
 * depend on who asks (role, own reviews), so none may be cached.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessResponse<unknown>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<SuccessResponse<unknown>> {
    const response = context.switchToHttp().getResponse<Response>();
    if (response && !response.getHeader('Cache-Control')) response.setHeader('Cache-Control', 'no-store');
    return next.handle().pipe(
      map((payload) => {
        if (payload instanceof CollectionResult) {
          return { success: true as const, data: payload.data, meta: payload.meta };
        }
        return { success: true as const, data: payload ?? null };
      }),
    );
  }
}
