#!/bin/bash
# recovery-inspect.sh - Safe diagnostic script (read-only)

set -e

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RECOVERY_DIR="recovery-${TIMESTAMP}"
mkdir -p "${RECOVERY_DIR}"

echo "🔍 CoSTAR System Recovery Inspector"
echo "====================================="
echo "Timestamp: ${TIMESTAMP}"
echo ""

# 1. Git Status
echo "📦 Git Repository Status..."
git status > "${RECOVERY_DIR}/git-status.txt" 2>&1 || echo "Not a git repository" > "${RECOVERY_DIR}/git-status.txt"
git log --oneline -10 > "${RECOVERY_DIR}/git-log.txt" 2>&1 || echo "No git history" >> "${RECOVERY_DIR}/git-log.txt"

# 2. Environment Files (masked)
echo "🔐 Environment Configuration..."
if [ -f .env ]; then
  echo "✓ .env file exists" > "${RECOVERY_DIR}/env-check.txt"
  grep -E "^[A-Z_]+" .env | sed 's/=.*/=***MASKED***/' >> "${RECOVERY_DIR}/env-check.txt"
else
  echo "✗ .env file missing" > "${RECOVERY_DIR}/env-check.txt"
fi

# 3. Dependencies
echo "📚 Dependencies Status..."
npm list --depth=0 > "${RECOVERY_DIR}/npm-list.txt" 2>&1

# 4. Database Migrations
echo "🗄️  Database Migrations..."
ls -lah supabase/migrations/ > "${RECOVERY_DIR}/migrations-list.txt" 2>&1

# 5. Edge Functions
echo "⚡ Edge Functions Status..."
find supabase/functions -type f -name "index.ts" > "${RECOVERY_DIR}/edge-functions-list.txt" 2>&1

# 6. Build Status
echo "🏗️  Build Validation..."
npm run build > "${RECOVERY_DIR}/build-output.txt" 2>&1 && echo "✓ Build successful" || echo "✗ Build failed"

# 7. Documentation Artifacts
echo "📄 Documentation Status..."
find . -maxdepth 1 -name "*.md" -type f > "${RECOVERY_DIR}/docs-list.txt"

# Generate Summary
cat > "${RECOVERY_DIR}/SUMMARY.txt" << SUMMARY
CoSTAR System Recovery Report
Generated: ${TIMESTAMP}

Files Collected: $(find ${RECOVERY_DIR} -type f | wc -l)
Total Size: $(du -sh ${RECOVERY_DIR} | cut -f1)

Review ${RECOVERY_DIR}/build-output.txt for build status
SUMMARY

echo ""
echo "✅ Recovery inspection complete!"
echo "📁 Recovery files saved to: ${RECOVERY_DIR}/"
echo ""
echo "To create archive:"
echo "  zip -r bolt-recovery-${TIMESTAMP}.zip ${RECOVERY_DIR}/"
echo ""
