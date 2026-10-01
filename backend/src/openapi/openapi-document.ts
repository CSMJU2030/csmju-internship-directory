import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

/** Builds the OpenAPI document of this subsystem from its controllers and DTOs. */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('CSMJU Internship Directory API')
    .setDescription(
      'ระบบสถานที่ฝึกงาน/สหกิจศึกษา และรีวิว — ทุก endpoint ใต้ /api/v1 ต้องมี Core Hub access token ' +
        '(Authorization: Bearer หรือคุกกี้ session ที่ /auth/callback ตั้งให้) และตอบใน envelope { success, data, meta? }',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addCookieAuth('csmju_internship_directory_access_token')
    .build();

  return SwaggerModule.createDocument(app, config);
}

/** JSON with keys sorted at every level, so the file only changes when the API does. */
export function stableStringify(value: unknown): string {
  const sort = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(sort);
    if (node && typeof node === 'object') {
      return Object.fromEntries(
        Object.keys(node as Record<string, unknown>)
          .sort()
          .map((key) => [key, sort((node as Record<string, unknown>)[key])]),
      );
    }
    return node;
  };
  return `${JSON.stringify(sort(value), null, 2)}\n`;
}
