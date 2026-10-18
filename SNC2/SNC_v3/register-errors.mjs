import { GraphCoordinator } from './.opencode/coordination/coordinator.mjs';

const gc = new GraphCoordinator('audit-agent');

await gc.recordError('secret_exposure', new Error('JWT_SECRET, SMTP_PASS, serviceAccountKey.json committed to repo'), {
  severity: 'critical',
  files: ['.env', 'serviceAccountKey.json'],
  action: 'rotate_immediately',
  skill: 'security'
});

await gc.recordError('artifact_in_repo', new Error('backup/ (3796 files), temp_*.cjs (4 files), graph.html (1.3MB) committed'), {
  severity: 'critical',
  files: ['backup/', 'temp_admin_setup.cjs', 'temp_audit_run.cjs', 'temp_create_christhian.cjs', 'graph.html'],
  action: 'remove_from_repo',
  skill: 'repo_hygiene'
});

await gc.recordError('no_lint_types', new Error('No ESLint, Prettier, TypeScript configured'), {
  severity: 'high',
  action: 'setup_tooling',
  skill: 'code_quality'
});

await gc.recordError('monolithic_files', new Error('app.js (1567), server-api.js (1686), export.js (1614) lines'), {
  severity: 'high',
  action: 'split_modules',
  skill: 'architecture'
});

await gc.recordError('no_bundler', new Error('No Vite/Webpack - 23 CDN scripts + 42 local JS'), {
  severity: 'high',
  action: 'add_bundler',
  skill: 'performance'
});

await gc.recordError('missing_postgis_integration', new Error('Municipal validation requires PostGIS but only stubs exist'), {
  severity: 'high',
  action: 'integrate_postgis',
  skill: 'municipal_compliance'
});

console.log('Errores críticos registrados en grafo');