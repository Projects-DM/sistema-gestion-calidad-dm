// Runner de diagnóstico Sprint 272 (parte 3) — NON-PRODUCTION — AUDIT ONLY.
// Carga los scripts forenses a través del SSR de Vite para resolver
// `import.meta.env` y los bare imports de src/. Único propósito: auditoría.
import { createServer } from 'vite';

async function main() {
  const server = await createServer({
    root: process.cwd(),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  try {
    await server.ssrLoadModule('scripts/forensic_sprint272_part3.mjs');
  } finally {
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});