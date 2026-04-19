#!/bin/bash
cd "$(dirname "$0")"
rm -f .git/HEAD.lock .git/index.lock

git add frontend/public/logo-mark.png \
        frontend/public/icon-192x192.png \
        frontend/public/icon-512x512.png \
        frontend/public/apple-touch-icon.png \
        frontend/src/components/Logo.jsx

git commit -m "Use real AromaTec logo image (extracted from reference JPG)"

git push https://igorm8713:ghp_Ts6wqiM4SiJaFHGVHGQpHaRbJgAFkm1BZzX5@github.com/igorm8713/production-system.git main
echo "Done: $?"
