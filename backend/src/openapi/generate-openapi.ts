/**
 * Writes backend/openapi.json (tech-stack.md 3, check API-01).
 *
 *   pnpm --filter backend generate:openapi
 *
 * The app is created in preview mode: the module graph and routes are built
 * but no provider is instantiated, so neither the database nor Core Hub is
 * contacted and no .env is needed.
 */
import 'reflect-metadata';
// Must stay before the AppModule import - see openapi-env.ts.
import './openapi-env';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { ROUTES_OUTSIDE_API_PREFIX } from '../app-setup';
import { AppModule } from '../app.module';
import { buildOpenApiDocument, stableStringify } from './openapi-document';

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    preview: true,
    logger: ['error', 'warn'],
    abortOnError: false,
  });
  app.setGlobalPrefix('api', { exclude: ROUTES_OUTSIDE_API_PREFIX });

  const target = join(__dirname, '..', '..', '..', 'openapi.json');
  writeFileSync(target, stableStringify(buildOpenApiDocument(app)));
  await app.close();
  console.log(`[openapi] wrote ${target}`);
}

main().catch((error) => {
  console.error('[openapi] failed', error);
  process.exitCode = 1;
});
