import { Type, applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

/**
 * Describes a response wrapped in the standard envelope (api-conventions.md):
 * `{ success: true, data, meta? }` - the ResponseInterceptor adds it, so the
 * controller method itself returns only `data`.
 */
export function ApiEnvelope(
  model: Type<unknown>,
  options: { status?: number; collection?: boolean; description?: string } = {},
) {
  const data = options.collection
    ? { type: 'array', items: { $ref: getSchemaPath(model) } }
    : { $ref: getSchemaPath(model) };

  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status: options.status ?? 200,
      description: options.description,
      schema: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', enum: [true] },
          data,
          ...(options.collection
            ? {
                meta: {
                  type: 'object',
                  required: ['total', 'page', 'limit', 'totalPages'],
                  properties: {
                    total: { type: 'integer' },
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    totalPages: { type: 'integer' },
                  },
                },
              }
            : {}),
        },
      },
    }),
  );
}
