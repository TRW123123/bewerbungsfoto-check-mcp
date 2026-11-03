#!/usr/bin/env bash
set -euo pipefail
scanner=""
if command -v gitleaks >/dev/null 2>&1; then
  scanner="$(command -v gitleaks)"
elif [[ -x /home/box/.local/bin/gitleaks ]]; then
  scanner=/home/box/.local/bin/gitleaks
fi
if [[ -n "$scanner" ]]; then
  "$scanner" detect --no-banner --redact
  # Include staged changes even before the first commit; detect covers history.
  git diff --cached --no-ext-diff --binary | "$scanner" stdin --no-banner --redact
else
  echo 'gitleaks unavailable; scanning tracked files for common credential patterns.'
  if git ls-files -z | xargs -0 -r rg -l --no-messages '(AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,})'; then
    echo 'Potential secret detected (file names only).'; exit 1
  fi
fi
