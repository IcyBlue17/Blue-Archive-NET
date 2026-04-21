#!/usr/bin/env bash
set -euo pipefail
sudo apt-get update
sudo apt-get install -y build-essential procps curl file git
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"
NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
bun install -g @anthropic-ai/claude-code @openai/codex
{
    echo 'export PATH="$HOME/.bun/bin:$PATH"'
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"'
} >> "$HOME/.bashrc"
