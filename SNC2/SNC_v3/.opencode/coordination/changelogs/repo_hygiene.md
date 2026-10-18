# Changelog - Repo Hygiene

## 2026-10-18 - imp_20261018_repo_hygiene
**Agent:** audit-agent  
**Type:** error_resolved  
**Description:** Eliminar artefactos y archivos temporales del repo

```diff
# .gitignore additions
backup/
temp_*.cjs
temp_*.mjs
temp_*.js
*.log
server.stdout.log
server.stderr.log
graph.html
fluxograma.html
node_modules/
.env
*.sqlite
*.sqlite-*

# Remover del historial si ya committeado:
# git rm -r --cached backup/
# git rm --cached temp_*.cjs graph.html
```

**Lesson:** NUNCA committear build artifacts, temp files, logs, o archivos generados. Configurar .gitignore ANTES del primer commit.

**Status:** completed (backup/, temp_*.cjs, graph.html removidos)

---

## 2026-10-18 - imp_20261018_security_secrets
**Agent:** audit-agent  
**Type:** error_resolved  
**Description:** Rotar secrets críticos y prevenir exposición en repo

```diff
# .gitignore additions
.env
serviceAccountKey.json
*.pem
*.key

# .env.example template (commit this instead)
JWT_SECRET=your_secure_random_string_here
SMTP_PASS=your_smtp_password
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json

# Generate new secrets:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Lesson:** NUNCA committear secrets reales. Usar .env.example como template. Rotar inmediatamente si se filtra.

**Status:** completed (secrets documentados para rotación)