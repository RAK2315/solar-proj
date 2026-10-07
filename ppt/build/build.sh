#!/usr/bin/env bash
# Rebuild the deck and slides.md. PPTX_MODULES is a node_modules folder holding
# pptxgenjs; APPLY_THEME is the pptx skill's scripts/apply_theme.js.
set -e
cd "$(dirname "$0")/../.."
NODE_PATH="$PPTX_MODULES" APPLY_THEME="$APPLY_THEME" node ppt/build/build_deck.cjs
