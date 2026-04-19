#!/bin/bash
# Фикс: последовательное выполнение операций в партии
cd "$(dirname "$0")"
rm -f .git/HEAD.lock .git/index.lock

git add \
  backend/routes/batches.js \
  frontend/src/pages/BatchesPage.jsx

git commit -m "fix: enforce sequential operations within a batch

- Backend: start endpoint checks for any in_progress operation
  in the same batch before allowing start; returns 400 error if blocked
- Frontend: hasAnyInProgress flag disables Start button (gray +
  tooltip) when another operation is already running in the batch"

git push https://igorm8713:ghp_Ts6wqiM4SiJaFHGVHGQpHaRbJgAFkm1BZzX5@github.com/igorm8713/production-system.git main
echo "Done: $?"
