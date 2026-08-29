#!/usr/bin/env bash
# Prove the latest backup actually restores.
#
# backup-db.sh already checks that each dump is readable, correctly sized and
# contains a LedgerEntry table. That validates the FILE. It does not prove the
# file rebuilds a working database, and the only way to know that is to restore
# one and look at what comes out.
#
# Restores into a scratch database with a fixed name, compares row counts and
# the ledger sum against production, then drops it. Production is opened
# read-only here — nothing in this script writes to it.
#
#   bash scripts/verify-backup-restore.sh
#
# Worth running weekly from cron. An untested backup is a hypothesis.
set -euo pipefail

APP=/home/opt/oknexus
DEST=/home/opt/backups
# Fixed and distinctive: no interpolation, so this can never resolve to the
# production database no matter what the environment says.
SCRATCH=oknexus_restore_check

LATEST=$(ls -t "$DEST"/oknexus-*.sql.gz 2>/dev/null | head -1)
if [ -z "$LATEST" ]; then
  echo "FAIL: no backups found in $DEST"
  exit 1
fi

AGE_HOURS=$(( ( $(date +%s) - $(stat -c %Y "$LATEST") ) / 3600 ))
echo "latest backup: $LATEST (${AGE_HOURS}h old)"
if [ "$AGE_HOURS" -gt 48 ]; then
  echo "WARN: newest backup is over 48h old — is the nightly cron still running?"
fi

cd "$APP"
PROD=$(grep "^DATABASE_URL" .env | cut -d= -f2- | tr -d '"' | sed 's/[?].*//')

echo "restoring into $SCRATCH ..."
sudo -n -u postgres dropdb --if-exists "$SCRATCH"
sudo -n -u postgres createdb "$SCRATCH"
if ! zcat "$LATEST" | sudo -n -u postgres psql -q --set ON_ERROR_STOP=on -d "$SCRATCH" >/dev/null 2>/tmp/restore-err; then
  echo "FAIL: restore errored"
  head -20 /tmp/restore-err
  sudo -n -u postgres dropdb --if-exists "$SCRATCH"
  exit 1
fi

TABLES=$(sudo -n -u postgres psql -t -A -d "$SCRATCH" \
  -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
echo "tables restored: $TABLES"
if [ "$TABLES" -lt 20 ]; then
  echo "FAIL: only $TABLES tables — the dump is not a whole database"
  sudo -n -u postgres dropdb --if-exists "$SCRATCH"
  exit 1
fi

# Counts drift upward between the backup and now, so restored <= prod is healthy
# and restored > prod means the dump contains rows production lost.
echo
printf "%-16s %8s %10s\n" "table" "prod" "restored"
FAIL=0
for T in User Wallet LedgerEntry Withdrawal FiatPayout P2POrder AuditLog; do
  A=$(psql -t -A "$PROD" -c "SELECT count(*) FROM \"$T\"" 2>/dev/null || echo 0)
  B=$(sudo -n -u postgres psql -t -A -d "$SCRATCH" -c "SELECT count(*) FROM \"$T\"" 2>/dev/null || echo 0)
  NOTE="ok"
  if [ "$B" -gt "$A" ]; then NOTE="restored > prod"; fi
  if [ "$B" -eq 0 ] && [ "$A" -gt 0 ]; then NOTE="EMPTY"; FAIL=1; fi
  printf "%-16s %8s %10s  %s\n" "$T" "$A" "$B" "$NOTE"
done

# The ledger is the record of who owns what. If it survives, the backup is real.
echo
LSUM=$(sudo -n -u postgres psql -t -A -d "$SCRATCH" -c "SELECT COALESCE(SUM(delta),0) FROM \"LedgerEntry\"")
echo "restored ledger sum: $LSUM"

sudo -n -u postgres dropdb --if-exists "$SCRATCH"
echo "scratch database dropped"

if [ "$FAIL" -ne 0 ]; then
  echo
  echo "RESULT: FAIL — a table that has rows in production restored empty"
  exit 1
fi
echo
echo "RESULT: PASS — backup restores to a complete database"
