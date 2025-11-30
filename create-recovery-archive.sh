#!/bin/bash
# create-recovery-archive.sh

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ARCHIVE_NAME="bolt-recovery-${TIMESTAMP}"
ARCHIVE_FILE="${ARCHIVE_NAME}.zip"

echo "📦 Creating Recovery Archive"
echo "============================"
echo ""

mkdir -p "${ARCHIVE_NAME}"

# Copy documentation
echo "Collecting documentation..."
cp *.md "${ARCHIVE_NAME}/" 2>/dev/null || true

# Copy configuration (masked)
echo "Collecting configuration..."
if [ -f .env ]; then
  grep -E "^[A-Z_]+" .env | sed 's/=.*/=***MASKED***/' > "${ARCHIVE_NAME}/env-masked.txt"
fi

# Copy package info
echo "Collecting dependency info..."
npm list --depth=0 > "${ARCHIVE_NAME}/npm-list.txt" 2>&1

# Copy migration info
echo "Collecting migration info..."
ls -lah supabase/migrations/ > "${ARCHIVE_NAME}/migrations-list.txt" 2>&1

# Copy edge functions list
echo "Collecting edge functions info..."
find supabase/functions -type f -name "index.ts" > "${ARCHIVE_NAME}/edge-functions.txt" 2>&1

# Build status
echo "Checking build status..."
npm run build > "${ARCHIVE_NAME}/build-output.txt" 2>&1 && echo "OK" || echo "FAILED"

# Create archive
echo "Creating zip archive..."
zip -r "${ARCHIVE_FILE}" "${ARCHIVE_NAME}/"

# Cleanup
rm -rf "${ARCHIVE_NAME}/"

echo ""
echo "✅ Archive created: ${ARCHIVE_FILE}"
echo "📏 Size: $(du -h ${ARCHIVE_FILE} | cut -f1)"
echo ""
