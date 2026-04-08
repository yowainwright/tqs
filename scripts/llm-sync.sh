#!/bin/bash
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LLM_DIR="$REPO_ROOT/llm"

install_skills_claude() {
  local dest="$HOME/.claude/skills"
  mkdir -p "$dest"
  for skill_dir in "$LLM_DIR/skills"/*/; do
    local name
    name=$(basename "$skill_dir")
    rm -rf "${dest:?}/$name"
    cp -r "$skill_dir" "$dest/$name"
    echo "Installed skill: $name → $dest/$name"
  done
}

TOOL="${1:-}"

TOOLS=()

if [ -z "$TOOL" ]; then
  for tool in claude codex gemini; do
    read -rp "Install for $tool? [y/N] " answer
    [[ "$answer" =~ ^[Yy]$ ]] && TOOLS+=("$tool")
  done
else
  TOOLS=("$TOOL")
fi

for tool in "${TOOLS[@]}"; do
  case "$tool" in
    claude)
      cp "$LLM_DIR/agents.md" "$REPO_ROOT/CLAUDE.md"
      echo "Installed: CLAUDE.md"
      install_skills_claude
      ;;
    codex)
      cp "$LLM_DIR/agents.md" "$REPO_ROOT/AGENTS.md"
      echo "Installed: AGENTS.md"
      ;;
    gemini)
      cp "$LLM_DIR/agents.md" "$REPO_ROOT/GEMINI.md"
      echo "Installed: GEMINI.md"
      ;;
    *) echo "Unknown tool: $tool"; exit 1 ;;
  esac
done
