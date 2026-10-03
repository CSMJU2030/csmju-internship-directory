/**
 * Placeholder environment for generate-openapi.ts. Env validation runs as soon
 * as AppModule is imported, so this module must be imported before it. None of
 * these values is dialled: the app is created in preview mode.
 */
process.env.DATABASE_URL ??= 'postgresql://openapi@localhost:5440/openapi_only';
process.env.CORE_HUB_URL ??= 'https://csmju2030.jowave.com';
process.env.CORE_HUB_WEB_URL ??= 'https://csmju2030.jowave.com';
process.env.SUBSYSTEM_ID ??= 'csmju-internship-directory';

export {};
