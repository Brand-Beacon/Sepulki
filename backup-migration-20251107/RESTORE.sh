#!/bin/bash
echo "Restoring pre-migration state..."
BACKUP_DIR=$(dirname "$0")
cp "$BACKUP_DIR/production.secrets.json" deploy/env/
cp -r "$BACKUP_DIR/workflows/"* .github/workflows/
echo "✅ Restoration complete"
