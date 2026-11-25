#!/usr/bin/env bash
# Deploy one verified public-site image uploaded by the GitHub Actions workflow.
#
# Install manually as root:root mode 0700 at /opt/zdaj-egzamin-inf/deploy.sh and allow
# the dedicated deploy user to run exactly that path through sudo. Usage:
#   sudo -n /opt/zdaj-egzamin-inf/deploy.sh <40-character-lowercase-git-sha>
#
# Inputs are read only from ~SUDO_USER/incoming/<sha>/ and are never removed here.
# This script never removes images, release archives, volumes or backups and never
# reverses migrations. It does not print .env or any secret.
set -euo pipefail
umask 077

PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
DEPLOYMENT_DIR=/opt/zdaj-egzamin-inf
BACKUP_DIR=/var/backups/zdaj-egzamin-inf
LOCK_FILE=/run/lock/zdaj-egzamin-deploy.lock
MEMINFO=/proc/meminfo
BACKUP_SERVICE=zdaj-egzamin-backup.service
LOCAL_HEALTH_URL=http://127.0.0.1:8081/api/v1/health
MIN_FREE_KIB=$((8 * 1024 * 1024))
# The API is already running during an update; only initialize (mem_limit 1g) starts
# alongside it, so require its limit plus a 256 MiB margin.
MIN_MEM_AVAILABLE_KIB=$((1280 * 1024))

ENV_STATE=untouched
STAGING=''
ENV_FILE=''
ENV_BEFORE=''

say() { printf '[deploy] %s\n' "$*"; }
die() {
  printf '[deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

restore_env() {
  # Atomic restore of the previous image selection; contents are never printed.
  local restore
  restore=$(mktemp "$DEPLOYMENT_DIR/.env.restore.XXXXXX")
  cp -- "$ENV_BEFORE" "$restore"
  chmod 0600 "$restore"
  mv -f -- "$restore" "$ENV_FILE"
  ENV_STATE=restored
  say "Restored .env from $(basename -- "$ENV_BEFORE"); the running API was not changed."
}

on_exit() {
  local status=$?
  if [ "$ENV_STATE" = switched ]; then
    # Interrupted after selecting the image but before the API was recreated.
    restore_env || printf '[deploy] ERROR: could not restore .env from %s\n' "$ENV_BEFORE" >&2
  fi
  if [ -n "$STAGING" ] && [ -d "$STAGING" ]; then
    # Only this run's private temporary copies; release archives are kept in releases/.
    rm -rf -- "$STAGING"
  fi
  exit "$status"
}
trap on_exit EXIT

free_kib() { df -Pk -- "$1" | awk 'NR == 2 { print $4 }'; }

regular_file() { [ -f "$1" ] && [ ! -L "$1" ]; }

# --- Preconditions ---------------------------------------------------------------
[ "$(id -u)" -eq 0 ] || die 'Run this script as root through sudo.'
[ -n "${SUDO_USER:-}" ] || die 'SUDO_USER is not set; run it through sudo as the deploy user.'
[[ $SUDO_USER =~ ^[a-z_][a-z0-9_-]{0,31}$ ]] || die 'Unexpected SUDO_USER name.'
[ "$SUDO_USER" != root ] || die 'Run it as the dedicated deploy user, not root.'
[ "$#" -eq 1 ] || die 'Usage: deploy.sh <40-character-lowercase-git-sha>'
SHA=$1
[[ $SHA =~ ^[0-9a-f]{40}$ ]] || die 'The argument must be exactly 40 lowercase hexadecimal characters.'

for tool in docker systemctl curl python3 flock sha256sum cmp comm awk getent df mktemp timeout; do
  command -v "$tool" > /dev/null || die "Required command is missing: $tool"
done

IMAGE="zdaj-inf-site:git-$SHA"
ARCHIVE_NAME="zdaj-inf-site-$SHA.tar.gz"
CHECKSUM_NAME="$ARCHIVE_NAME.sha256"
ENV_FILE="$DEPLOYMENT_DIR/.env"
COMPOSE_FILE="$DEPLOYMENT_DIR/compose.site.yaml"
RELEASES_DIR="$DEPLOYMENT_DIR/releases"
DEPLOY_LOG="$DEPLOYMENT_DIR/deployments.log"

[ -d "$DEPLOYMENT_DIR" ] && [ ! -L "$DEPLOYMENT_DIR" ] || die "Missing deployment directory $DEPLOYMENT_DIR."
[ "$(stat -c %u -- "$DEPLOYMENT_DIR")" -eq 0 ] || die "$DEPLOYMENT_DIR must be owned by root."
regular_file "$COMPOSE_FILE" || die "Missing $COMPOSE_FILE."
regular_file "$ENV_FILE" || die "Missing $ENV_FILE."

USER_HOME=$(getent passwd "$SUDO_USER" | awk -F: '{ print $6 }')
[[ $USER_HOME == /* ]] || die 'Could not resolve the deploy user home directory.'
USER_UID=$(id -u -- "$SUDO_USER")
INCOMING="$USER_HOME/incoming/$SHA"
for directory in "$USER_HOME/incoming" "$INCOMING"; do
  [ -d "$directory" ] && [ ! -L "$directory" ] || die "Missing upload directory $directory."
  [ "$(stat -c %u -- "$directory")" -eq "$USER_UID" ] || die "$directory is not owned by $SUDO_USER."
done

exec 9> "$LOCK_FILE"
flock -n 9 || die 'Another deployment is already running.'

say "Deploying $IMAGE (requested by $SUDO_USER)."
STAGING=$(mktemp -d "$DEPLOYMENT_DIR/.staging-$SHA.XXXXXX")

# Copy without following links, then inspect only root-owned copies.
stage() {
  local name=$1
  [ -e "$INCOMING/$name" ] || die "Missing uploaded file $name."
  cp -P -- "$INCOMING/$name" "$STAGING/$name"
  regular_file "$STAGING/$name" || die "Uploaded $name is not a regular file."
}

# --- (a) Compose file must already match the server copy --------------------------
stage compose.site.yaml
if ! cmp -s -- "$STAGING/compose.site.yaml" "$COMPOSE_FILE"; then
  die "compose.site.yaml of this commit differs from $COMPOSE_FILE. Review the change and update the server copy manually, then run the workflow again."
fi
say 'compose.site.yaml matches the server copy.'

# --- (b) Host capacity -------------------------------------------------------------
DOCKER_ROOT=$(docker info --format '{{.DockerRootDir}}')
[ -d "$DOCKER_ROOT" ] || die 'Could not determine the Docker root directory.'
[ -d "$BACKUP_DIR" ] && [ ! -L "$BACKUP_DIR" ] || die "Missing $BACKUP_DIR; install $BACKUP_SERVICE and run it once first."
for path in "$DEPLOYMENT_DIR" "$DOCKER_ROOT" "$BACKUP_DIR"; do
  available=$(free_kib "$path")
  [[ $available =~ ^[0-9]+$ ]] || die "Could not read free disk space for $path."
  if [ "$available" -lt "$MIN_FREE_KIB" ]; then
    die "Less than 8 GiB free for $path ($((available / 1024)) MiB). Do not reclaim other applications' data; free space deliberately first."
  fi
done
MEM_AVAILABLE=$(awk '$1 == "MemAvailable:" { print $2 }' "$MEMINFO")
[[ $MEM_AVAILABLE =~ ^[0-9]+$ ]] || die 'Could not read MemAvailable.'
[ "$MEM_AVAILABLE" -ge "$MIN_MEM_AVAILABLE_KIB" ] || die "MemAvailable is below 1280 MiB ($((MEM_AVAILABLE / 1024)) MiB)."
say 'Disk (>= 8 GiB) and MemAvailable (>= 1280 MiB) checks passed.'

# --- (c) Archive checksum ----------------------------------------------------------
stage "$CHECKSUM_NAME"
stage "$ARCHIVE_NAME"
[ "$(wc -l < "$STAGING/$CHECKSUM_NAME")" -eq 1 ] || die 'The checksum file must contain exactly one line.'
EXPECTED_SHA256=$(awk -v name="$ARCHIVE_NAME" 'NF == 2 && $2 == name && $1 ~ /^[0-9a-f]{64}$/ { print $1 }' "$STAGING/$CHECKSUM_NAME")
[ -n "$EXPECTED_SHA256" ] || die 'The checksum file has an unexpected format.'
ARCHIVE_SHA256=$(sha256sum -- "$STAGING/$ARCHIVE_NAME" | awk '{ print $1 }')
[ "$ARCHIVE_SHA256" = "$EXPECTED_SHA256" ] || die 'The image archive does not match its SHA-256 checksum.'
say "Archive SHA-256 verified: $ARCHIVE_SHA256"

# --- (d) Only this commit's tag may be loaded; then check the revision label -------
if ! python3 -I - "$STAGING/$ARCHIVE_NAME" "$SHA" << 'PY'; then
import json
import sys
import tarfile

archive, sha = sys.argv[1], sys.argv[2]
tag = f"zdaj-inf-site:git-{sha}"
wanted = {"manifest.json", "index.json", "repositories"}
found = {}
with tarfile.open(archive, mode="r:gz") as source:
    for member in source:
        name = member.name[2:] if member.name.startswith("./") else member.name
        if name not in wanted:
            continue
        if name in found or not member.isfile() or member.size > 1024 * 1024:
            sys.exit(f"unexpected {name} entry in the image archive")
        found[name] = json.load(source.extractfile(member))

manifest = found.get("manifest.json")
if not isinstance(manifest, list) or len(manifest) != 1:
    sys.exit("manifest.json must describe exactly one image")
if manifest[0].get("RepoTags") != [tag]:
    sys.exit(f"manifest.json must contain exactly one RepoTag: {tag}")

index = found.get("index.json")
if index is not None:
    entries = index.get("manifests") if isinstance(index, dict) else None
    if not isinstance(entries, list) or len(entries) != 1:
        sys.exit("index.json must describe exactly one image")
    annotations = entries[0].get("annotations") or {}
    name = annotations.get("io.containerd.image.name")
    if name is not None and name not in {tag, f"docker.io/library/{tag}"}:
        sys.exit("index.json names a different image")
    reference = annotations.get("org.opencontainers.image.ref.name")
    if reference is not None and reference not in {f"git-{sha}", tag, f"docker.io/library/{tag}"}:
        sys.exit("index.json names a different image")

repositories = found.get("repositories")
if repositories is not None:
    if set(repositories) != {"zdaj-inf-site"} or set(repositories["zdaj-inf-site"]) != {f"git-{sha}"}:
        sys.exit("repositories names a different image")
PY
  die "The image archive may only tag $IMAGE; refusing to load it."
fi
say "Archive tags only $IMAGE."

docker load --input "$STAGING/$ARCHIVE_NAME"
REVISION=$(docker image inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$IMAGE")
[ "$REVISION" = "$SHA" ] || die "Loaded image label org.opencontainers.image.revision does not match $SHA."
ARCHITECTURE=$(docker image inspect --format '{{ .Architecture }}' "$IMAGE")
[ "$ARCHITECTURE" = amd64 ] || die "Loaded image architecture is $ARCHITECTURE, expected amd64."
IMAGE_ID=$(docker image inspect --format '{{ .Id }}' "$IMAGE")
say "Loaded $IMAGE ($IMAGE_ID) with matching revision label."

install -d -m 0700 -- "$RELEASES_DIR"
for name in "$ARCHIVE_NAME" "$CHECKSUM_NAME"; do
  if [ -e "$RELEASES_DIR/$name" ]; then
    cmp -s -- "$STAGING/$name" "$RELEASES_DIR/$name" \
      || die "$RELEASES_DIR/$name already exists with different contents; it is not overwritten."
  else
    mv -- "$STAGING/$name" "$RELEASES_DIR/$name"
  fi
done
say "Release archive retained in $RELEASES_DIR."

# --- (e) Current selection ---------------------------------------------------------
[ "$(grep -c '^SITE_IMAGE=' "$ENV_FILE")" -eq 1 ] || die '.env must contain exactly one SITE_IMAGE= line.'
PREVIOUS_IMAGE=$(awk -F= '/^SITE_IMAGE=/ { sub(/^SITE_IMAGE=/, ""); print }' "$ENV_FILE")
PREVIOUS_IMAGE=${PREVIOUS_IMAGE%$'\r'}
PREVIOUS_IMAGE=${PREVIOUS_IMAGE#\"}
PREVIOUS_IMAGE=${PREVIOUS_IMAGE%\"}
[[ $PREVIOUS_IMAGE =~ ^zdaj-inf-site:git-[0-9a-f]{40}$ ]] \
  || die 'The current SITE_IMAGE is not a zdaj-inf-site:git-<sha> tag; update .env manually first.'
if [ "$PREVIOUS_IMAGE" = "$IMAGE" ]; then
  say "$IMAGE is already selected in .env; nothing to deploy."
  exit 0
fi
say "Previous image: $PREVIOUS_IMAGE"

# --- (f) Fresh verified database backup -------------------------------------------
dump_names() {
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'zdaj-*.dump' -printf '%f\n' \
    | grep -E '^zdaj-[0-9]{8}T[0-9]{6}Z\.dump$' | sort || true
}
DUMPS_BEFORE=$(dump_names)
say "Starting $BACKUP_SERVICE."
systemctl start "$BACKUP_SERVICE" || die "$BACKUP_SERVICE failed; nothing was changed."
NEW_BACKUP=$(comm -13 <(printf '%s\n' "$DUMPS_BEFORE") <(dump_names) | tail -n 1)
[ -n "$NEW_BACKUP" ] || die "No new zdaj-*.dump appeared in $BACKUP_DIR (a backup may already be running); nothing was changed."
[ -f "$BACKUP_DIR/$NEW_BACKUP.sha256" ] || die "The new backup $NEW_BACKUP has no checksum sidecar."
say "New database backup: $NEW_BACKUP"

# --- (g) Select the new image atomically ------------------------------------------
ENV_BEFORE="$DEPLOYMENT_DIR/.env.before-$SHA"
if [ -e "$ENV_BEFORE" ]; then
  ENV_BEFORE="$ENV_BEFORE.$(date -u +%Y%m%dT%H%M%SZ)"
fi
cp -- "$ENV_FILE" "$ENV_BEFORE"
chmod 0600 "$ENV_BEFORE"
NEXT_ENV=$(mktemp "$DEPLOYMENT_DIR/.env.next.XXXXXX")
awk -v image="$IMAGE" '/^SITE_IMAGE=/ { print "SITE_IMAGE=" image; next } { print }' "$ENV_FILE" > "$NEXT_ENV"
chmod 0600 "$NEXT_ENV"
ENV_STATE=switched
mv -f -- "$NEXT_ENV" "$ENV_FILE"
say "Selected $IMAGE in .env (previous copy: $(basename -- "$ENV_BEFORE"))."

cd "$DEPLOYMENT_DIR"
compose() { docker compose --env-file .env -f compose.site.yaml "$@"; }

# --- (h) Migrations, seed and feature-switch reset --------------------------------
say 'Running initialize (migrations and seed; disables AI, checking and runtime runs).'
if ! compose run --rm --no-deps initialize; then
  restore_env
  die 'initialize failed. The previous image remains selected and the running API was not touched. Inspect the output above; migrations are never reversed automatically.'
fi

# --- (i) Recreate only the API ----------------------------------------------------
ENV_STATE=api-started
ROLLBACK="cd $DEPLOYMENT_DIR && cp $(basename -- "$ENV_BEFORE") .env.rollback && chmod 0600 .env.rollback && mv -f .env.rollback .env && docker compose --env-file .env -f compose.site.yaml up -d --no-deps --wait api"
healthy=false
if timeout 900 docker compose --env-file .env -f compose.site.yaml up -d --no-deps --wait api; then
  for _ in $(seq 1 10); do
    if curl -fsS --max-time 10 -o /dev/null "$LOCAL_HEALTH_URL"; then
      healthy=true
      break
    fi
    sleep 3
  done
fi

log_line() {
  printf '%s sha=%s image_id=%s archive_sha256=%s previous=%s backup=%s status=%s\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$SHA" "$IMAGE_ID" "$ARCHIVE_SHA256" \
    "$PREVIOUS_IMAGE" "$NEW_BACKUP" "$1" >> "$DEPLOY_LOG"
  chmod 0600 "$DEPLOY_LOG"
}

if [ "$healthy" != true ]; then
  log_line api-unhealthy
  cat >&2 << EOF
[deploy] ERROR: the API on $IMAGE did not become healthy at $LOCAL_HEALTH_URL.
[deploy] .env still selects $IMAGE. No automatic rollback was performed.
[deploy] Before rolling back, check that $PREVIOUS_IMAGE is compatible with the
[deploy] migrated database schema (migrations are never reversed). Then, as root:
[deploy]   $ROLLBACK
[deploy] The database backup taken before this deployment: $BACKUP_DIR/$NEW_BACKUP
EOF
  exit 1
fi

# --- (j) Record the deployment ----------------------------------------------------
log_line ok
say "Deployed $IMAGE; the API is healthy on 127.0.0.1:8081."
say "Recorded in $DEPLOY_LOG. Rollback (after a schema compatibility check):"
say "  $ROLLBACK"
say 'Reminder: initialize turned AI off (aiEnabled=false). Re-enable it deliberately in /admin if wanted.'
