#!/usr/bin/env bash
# One-time: GitHub repo → Supabase → VAPID/Edge Function → GH secrets → Vercel.
# Requires: gh, supabase (v2), vercel, jq, npx — logged in to gh/supabase/vercel.
set -euo pipefail
REPO=${REPO:-WAJIBATI}
# Supabase: project ref is immutable — pin it so a rerun never creates a duplicate project.
SUPABASE_REF=${SUPABASE_REF:-oconxdrujhjaunvrycdz}
# Vercel: keep the CURRENT project name until the dashboard rename to `wajibati` is done
# (see WAJIBATI-RENAME-AUDIT.md). `vercel link --project <missing>` would create a new project.
VERCEL_PROJECT=${VERCEL_PROJECT:-homeworks}
OWNER=${OWNER:-sufyanaser}
REGION=${REGION:-eu-central-1}
SUBJECT=${SUBJECT:-mailto:sufyanaser@gmail.com}
cd "$(dirname "$0")/.."

for c in gh supabase vercel jq npx; do command -v $c >/dev/null || { echo "✗ missing: $c"; exit 1; }; done
gh auth status >/dev/null && vercel whoami >/dev/null && supabase projects list >/dev/null \
  || { echo "✗ login first: gh auth login / supabase login / vercel login"; exit 1; }

echo "▶ GitHub"
if gh repo view "$OWNER/$REPO" >/dev/null 2>&1; then
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$OWNER/$REPO.git"
else
  gh repo create "$OWNER/$REPO" --private --source=. --remote=origin
fi
git push -u origin main
git push -u origin dev
gh repo edit "$OWNER/$REPO" --default-branch main >/dev/null

echo "▶ Supabase"
REF=${SUPABASE_REF:-$(supabase projects list -o json | jq -r ".[] | select(.name==\"$REPO\") | (.ref // .id)" | head -1)}
DBPASS=${DBPASS:-}
[ -n "$DBPASS" ] || { read -rsp "DB password (new or existing project): " DBPASS; echo; }
if [ -z "$REF" ]; then
  ORG=$(supabase orgs list -o json | jq -r '.[0].id')
  supabase projects create "$REPO" --org-id "$ORG" --db-password "$DBPASS" --region "$REGION"
  REF=$(supabase projects list -o json | jq -r ".[] | select(.name==\"$REPO\") | (.ref // .id)" | head -1)
fi
echo "  ref=$REF — waiting for ACTIVE_HEALTHY"
for i in $(seq 1 60); do
  ST=$(supabase projects list -o json | jq -r ".[] | select((.ref // .id)==\"$REF\") | .status")
  [ "$ST" = "ACTIVE_HEALTHY" ] && break; sleep 10
done
[ "$ST" = "ACTIVE_HEALTHY" ] || { echo "✗ project not healthy ($ST) — rerun script"; exit 1; }
supabase link --project-ref "$REF" -p "$DBPASS"
supabase db push -p "$DBPASS"
URL="https://$REF.supabase.co"
KEYS_JSON=$(supabase projects api-keys --project-ref "$REF" -o json)
ANON=$(echo "$KEYS_JSON" | jq -r '.[] | select(.name=="anon") | .api_key')
SRK=$(echo "$KEYS_JSON"  | jq -r '.[] | select(.name=="service_role") | .api_key')

echo "▶ VAPID + send-push"
if [ -f .env ] && grep -q '^VAPID_PRIVATE_KEY=.\+' .env; then
  VPUB=$(grep '^VITE_VAPID_PUBLIC_KEY=' .env | cut -d= -f2-); VPRIV=$(grep '^VAPID_PRIVATE_KEY=' .env | cut -d= -f2-)
else
  KEYS=$(npx -y web-push@3.6.7 generate-vapid-keys --json)
  VPUB=$(echo "$KEYS" | jq -r .publicKey); VPRIV=$(echo "$KEYS" | jq -r .privateKey)
fi
supabase secrets set --project-ref "$REF" VITE_VAPID_PUBLIC_KEY="$VPUB" VAPID_PRIVATE_KEY="$VPRIV" VAPID_SUBJECT="$SUBJECT"
supabase functions deploy send-push --project-ref "$REF"

echo "▶ GitHub Actions secrets"
gh secret set SUPABASE_PROJECT_REF  -R "$OWNER/$REPO" -b "$REF"
gh secret set SUPABASE_DB_PASSWORD  -R "$OWNER/$REPO" -b "$DBPASS"
if [ -n "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  gh secret set SUPABASE_ACCESS_TOKEN -R "$OWNER/$REPO" -b "$SUPABASE_ACCESS_TOKEN"
else
  echo "  ⚠ SUPABASE_ACCESS_TOKEN not set → run: gh secret set SUPABASE_ACCESS_TOKEN -R $OWNER/$REPO"
fi

echo "▶ Vercel"
vercel link --yes --project "$VERCEL_PROJECT"
setenv() { # name value target
  vercel env rm "$1" "$3" --yes >/dev/null 2>&1 || true
  printf '%s' "$2" | vercel env add "$1" "$3" >/dev/null
}
for T in production preview development; do
  setenv VITE_SUPABASE_URL      "$URL"  $T
  setenv VITE_SUPABASE_ANON_KEY "$ANON" $T
  setenv VITE_VAPID_PUBLIC_KEY  "$VPUB" $T
done
vercel git connect "https://github.com/$OWNER/$REPO" --yes || true
vercel --prod --yes

cat > .env <<ENV
VITE_SUPABASE_URL=$URL
VITE_SUPABASE_ANON_KEY=$ANON
VITE_VAPID_PUBLIC_KEY=$VPUB
SUPABASE_SERVICE_ROLE_KEY=$SRK
VAPID_PRIVATE_KEY=$VPRIV
VAPID_SUBJECT=$SUBJECT
ENV
chmod 600 .env
echo "✔ Done → https://github.com/$OWNER/$REPO | $URL | vercel: $VERCEL_PROJECT"
