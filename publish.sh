#!/usr/bin/env bash
set -euo pipefail
git remote get-url origin >/dev/null 2>&1 || git remote add origin https://github.com/18611429192/minddeck.git
git remote set-url origin https://github.com/18611429192/minddeck.git
git branch -M main
git push -u origin main
