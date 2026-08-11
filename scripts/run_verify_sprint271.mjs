// Runner de verificación Sprint 271.
// Carga scripts/verify_sprint271.mjs através del SSR de Vite para que
// `import.meta.env.VITE_*` (usado por src/lib/supabase.js) se resuelva
// desde .env. Único propósito: ejecutar la verificación read-after-write.
// No es código de producción.

import { createServer } from 'vite';

async function main() {
  const server = await createServer({
    root: process.cwd(),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  try {
    await server.ssrLoadModule('scripts/verify_sprint271.mjs');
  } finally {
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});