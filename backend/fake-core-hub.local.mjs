// Local-only stand-in for Core Hub so the pages can be shown without registration. Not committed.
import { createServer } from 'node:http';
import { writeFileSync } from 'node:fs';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
const { publicKey, privateKey } = await generateKeyPair('RS256');
const jwk = { ...(await exportJWK(publicKey)), kid: 'core-hub-2026', alg: 'RS256', use: 'sig' };
const sign = (sub, role) => new SignJWT({ role, email: `${role}@local.test` }).setProtectedHeader({ alg: 'RS256', kid: 'core-hub-2026' })
  .setSubject(sub).setIssuer('core-hub').setAudience('csmju2030').setIssuedAt().setExpirationTime('14m').sign(privateKey);
writeFileSync(process.argv[2], await sign('local-staff', 'staff'));
createServer((req, res) => {
  res.setHeader('content-type', 'application/json');
  if (req.url.startsWith('/api/v1/.well-known/jwks.json')) return res.end(JSON.stringify({ keys: [jwk] }));
  if (req.url.startsWith('/api/v1/people/me')) return res.end(JSON.stringify({ success: true, data: null }));
  res.statusCode = 404; res.end('{}');
}).listen(4999, '127.0.0.1');
