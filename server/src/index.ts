import 'dotenv/config';
import Fastify, { type FastifyServerOptions } from 'fastify';
import { corsPlugin } from './plugins/cors.js';
import { jwtAuthPlugin } from './plugins/jwt.js';

export async function buildApp(opts: FastifyServerOptions = {}) {
  const app = Fastify(opts);

  await app.register(corsPlugin);
  await app.register(jwtAuthPlugin);

  app.get('/health', async () => ({ ok: true }));

  return app;
}

// Entry point — only runs when executed directly
const isMain = process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js');
if (isMain) {
  const app = await buildApp({ logger: { level: 'info' } });
  await app.listen({ port: Number(process.env.PORT ?? 3001), host: '0.0.0.0' });
  console.log(`Server running on port ${process.env.PORT ?? 3001}`);
}
