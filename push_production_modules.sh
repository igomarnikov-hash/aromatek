#!/bin/bash
# Push production modules to GitHub
cd "$(dirname "$0")"
rm -f .git/HEAD.lock .git/index.lock

git add \
  backend/database.js \
  backend/server.js \
  backend/migrations/001_production_modules.sql \
  backend/routes/batches.js \
  backend/routes/screens.js \
  backend/routes/ink.js \
  backend/routes/printing.js \
  backend/routes/diecut.js \
  backend/routes/perfume.js \
  backend/routes/packaging.js \
  frontend/src/App.jsx \
  frontend/src/components/Sidebar.jsx \
  frontend/src/pages/BatchesPage.jsx \
  frontend/src/pages/ScreensPage.jsx \
  frontend/src/pages/InkPage.jsx \
  frontend/src/pages/PrintingPage.jsx \
  frontend/src/pages/DieCutPage.jsx

git commit -m "feat: Add production modules — batches, screens, ink, printing, diecut (Phase 1 MVP)

- 10 new DB tables: production_batches, screens, ink_batches,
  print_sessions, diecut_sessions, thread_operations,
  perfume_formulas, perfume_batches, packaging_sessions, pdf_layouts
- Backend routes for all Phase 1 modules
- Frontend pages: Партии, Сетки, Краска, Печать, Вырубка
- Sidebar: production submenu (collapsible)
- Full batch lifecycle tracking (open→printing→diecut→threading→perfuming→packaging→completed)"

git push https://igorm8713:ghp_Ts6wqiM4SiJaFHGVHGQpHaRbJgAFkm1BZzX5@github.com/igorm8713/production-system.git main
echo "Done: $?"
