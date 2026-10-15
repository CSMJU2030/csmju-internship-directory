import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AppException } from '../errors';

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF defence for the cookie session. Every subsystem lives on a sibling
 * *.jowave.com host, so the SameSite=Lax cookie IS sent with a form another
 * subsystem's page posts here. A form can only send urlencoded, multipart or
 * text/plain - so a state-changing /api request with a body must be JSON,
 * which a cross-origin page can only send after a CORS preflight this app
 * never allows. main.ts also parses JSON bodies only.
 *
 * The /auth endpoints are outside /api and keep their own rules (auth-contract 5).
 */
@Injectable()
export class JsonBodyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const request = context.switchToHttp().getRequest<Request>();
    if (!STATE_CHANGING.has(request.method) || !request.path.startsWith('/api/')) return true;

    const hasBody = Number(request.headers['content-length'] ?? 0) > 0 || request.headers['transfer-encoding'] !== undefined;
    const type = String(request.headers['content-type'] ?? '').toLowerCase();
    if (hasBody && !type.startsWith('application/json')) {
      throw AppException.badRequest('ต้องส่งข้อมูลเป็น application/json');
    }
    return true;
  }
}
