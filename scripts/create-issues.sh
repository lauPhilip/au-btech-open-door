#!/usr/bin/env bash
# Creates labels, milestones and issues on GitHub from backlog/issues.json.
# Needs the GitHub CLI (gh, signed in with `gh auth login`) and jq.
# Safe to run twice: existing milestones and issues (same title) are skipped.
set -euo pipefail

command -v gh >/dev/null || { echo "Install the GitHub CLI first: https://cli.github.com"; exit 1; }
command -v jq >/dev/null || { echo "Install jq first: https://jqlang.org"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "Please sign in first: gh auth login"; exit 1; }

root="$(cd "$(dirname "$0")/.." && pwd)"
data="$root/backlog/issues.json"
repo="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
echo "Repository: $repo"

jq -c '.labels[]' "$data" | while read -r l; do
  gh label create "$(jq -r .name <<<"$l")" --color "$(jq -r .color <<<"$l")" \
    --description "$(jq -r .description <<<"$l")" --force >/dev/null
  echo "label      $(jq -r .name <<<"$l")"
done

existing_ms="$(gh api "repos/$repo/milestones?state=all&per_page=100" --jq '.[].title')"
jq -c '.milestones[]' "$data" | while read -r m; do
  title="$(jq -r .title <<<"$m")"
  if grep -qxF "$title" <<<"$existing_ms"; then echo "skip       $title"; continue; fi
  gh api "repos/$repo/milestones" -f "title=$title" -f "description=$(jq -r .description <<<"$m")" >/dev/null
  echo "milestone  $title"
done

existing_issues="$(gh issue list --state all --limit 500 --json title --jq '.[].title')"
body_file="$(mktemp)"
jq -c '.issues[]' "$data" | while read -r i; do
  title="$(jq -r .title <<<"$i")"
  if grep -qxF "$title" <<<"$existing_issues"; then echo "skip       $title"; continue; fi
  jq -r .body <<<"$i" >"$body_file"
  args=(issue create --title "$title" --body-file "$body_file" --milestone "$(jq -r .milestone <<<"$i")")
  while read -r label; do args+=(--label "$label"); done < <(jq -r '.labels[]' <<<"$i")
  gh "${args[@]}" >/dev/null
  echo "issue      $title"
done
rm -f "$body_file"
echo "Done."
