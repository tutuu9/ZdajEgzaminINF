# Public site without a code executor

This profile serves the current eight CKE INF.03 courses, 25 published theory examples and 35 FAQ entries at `https://zdajegzamin.sbs`. It deliberately has only PostgreSQL, one-shot initialization and the API serving the built frontend. Browser HTML/CSS checks and isolated preview remain available; server behaviour checks have an explicit manual fallback. AI is disabled by default and can be enabled separately as described below. This does not certify the VPS for anonymous code execution.

## Build and transfer

Use `infra/compose.site.yaml` **by itself**, never as an override of the local or public-sandbox profiles. It contains no build, worker or Docker socket. The server runs prebuilt Linux/amd64 images only.

1. Commit configuration and documentation on a `codex/` branch, push a PR and wait for all CI jobs, including the full browser suite. Merge preserving commits; do not move existing release tags.
2. From the clean verified commit, build locally:

   ```sh
   docker build --platform linux/amd64 -f infra/app.Dockerfile --label org.opencontainers.image.revision=VERIFIED_SHA -t zdaj-inf-site:git-VERIFIED_SHA .
   docker save -o artifacts/zdaj-inf-site-VERIFIED_SHA.tar zdaj-inf-site:git-VERIFIED_SHA
   ```

3. Calculate SHA-256, copy the archive over host-key-verified SSH and compare the remote checksum before `docker load`. Record the Git SHA, image ID and archive checksum. Keep the verified image/archive for rollback.
4. Use `/opt/zdaj-egzamin-inf` with mode `0700`. Copy `infra/compose.site.yaml` there as `compose.site.yaml`, plus the assets from `infra/site`. Create `.env` with mode `0600` from `infra/site.env.example`. Generate separate production database/session/IP secrets; never reuse the development `.env` or database. Pin `SITE_IMAGE` to the full verified SHA tag and `POSTGRES_IMAGE` to the tested PostgreSQL 17 digest.

The initialization process validates production HTTPS, exact proxy trust, separate secrets and disabled sandbox/AI configuration before migrations and seeding. It then atomically sets `aiEnabled=false`, `checkingEnabled=false` and `runtimeRunsEnabled=false`, preserving the budget and other settings. Missing settings cause initialization to fail. API startup depends on successful initialization. The public sandbox remains independently unavailable even if an administrator later changes the database switch.

## Optional DeepSeek assistant

Set `SITE_DEEPSEEK_API_KEY` privately in the production `.env` (mode `0600`), with `SITE_DEEPSEEK_BASE_URL=https://api.deepseek.com` and `SITE_DEEPSEEK_MODEL=deepseek-flash`. These variables are passed only to the API. Initialization always receives an empty provider key and continues to disable all three server feature switches. Do not print resolved Compose configuration, container environments or the real key into logs. A blank key preserves the default AI-unavailable behaviour.

For an existing deployment, record its image, Compose configuration and private environment; make and restore-check a fresh database backup before applying migrations. Build from the verified Git archive, excluding local secrets and untracked files. Keep enough disk for the transferred archive and loaded image while retaining at least 8 GiB free. Only remove explicitly reviewed obsolete artifacts of this site after verifying retained owner copies; preserve the active and previous rollback versions and all database backups.

With the new image selected in `.env`, run `docker compose --env-file .env -f compose.site.yaml run --rm --no-deps initialize`, then recreate only the API with `docker compose --env-file .env -f compose.site.yaml up -d --no-deps --wait api`. After health checks, sign in through the existing administrator API or `/admin`, read the current settings and enable only `aiEnabled`, preserving the budget, spent amount and reservations. Keep checking and runtime execution disabled. Ordinary API restarts retain the switch; running initialization again disables it and requires deliberate re-enabling.

The v1.5.0 migration moves only former default limits from 12,000 to 48,000 input tokens and from 5 to 30 daily requests. Other administrator limits remain unchanged. The initial application cap stays $2 total, output stays bounded to 1,500 tokens and unresolved calls still block further provider calls. The configured $0.30 input / $1.20 output per million tokens conservatively cover the current peak `deepseek-flash` rates; recheck [provider pricing](https://api-docs.deepseek.com/quick_start/pricing/) before changing the model or enabling it later. Provider funds are separate from the application cap; this workflow never tops up the account automatically.

Run `npm run test:site-config` with the Docker Compose CLI to verify both blank-key and opt-in configurations using synthetic credentials. Verify consent, conversation context and failure handling with mocked browser/API tests first. For production acceptance, use a synthetic learner project and at most two real calls (a question and a follow-up), inspect the returned context summary and verify that reservations close correctly. An uncertain provider response must not be retried automatically. Disable AI before rolling back the image, retain all usage accounting and check the previous image against the migrated database; do not reverse migrations or restore old spending totals.

## Manual deployment workflow (GitHub Actions)

`.github/workflows/deploy-site.yml` automates the build-and-transfer and image-switch steps above for an **existing** deployment. It never runs on push: an owner starts it manually and types `deploy`. First-time installation, `compose.site.yaml` changes, `.env` secrets, nginx, certificates and backups remain manual.

### What it does

1. Refuses unless the run is on `refs/heads/main` and the `confirm` input is exactly `deploy`. Runs are serialized and never cancel each other.
2. Refuses unless `ci.yml` (Checks) already succeeded for the exact commit. After merging a PR, wait for Checks on the `main` push to finish.
3. Uses the `production` environment. Validates that the SSH secrets exist, writes the pinned host key and connects with `StrictHostKeyChecking yes`. No third-party actions handle the key.
4. Builds `zdaj-inf-site:git-<sha>` for `linux/amd64` with the `org.opencontainers.image.revision` label, saves it as `zdaj-inf-site-<sha>.tar.gz` with a `.sha256` file and adds `infra/compose.site.yaml`.
5. Uploads the files to `~/incoming/<sha>/` of the deploy user, verifies the checksum there and runs `sudo -n /opt/zdaj-egzamin-inf/deploy.sh <sha>`. It always removes `~/incoming/<sha>` afterwards, then checks `https://zdajegzamin.sbs/api/v1/health` with retries.

`infra/site/deploy.sh` runs as root and works only on root-owned copies of the uploaded files. It holds a lock and, in order:

- refuses if the uploaded `compose.site.yaml` differs from `/opt/zdaj-egzamin-inf/compose.site.yaml` (review and update the server copy manually first);
- requires at least 8 GiB free for the deployment, Docker and backup directories and 768 MiB `MemAvailable` (the running API stays up and only `initialize`, limited to 512 MiB, starts beside it);
- verifies the archive SHA-256; requires the archive to tag exactly one image, `zdaj-inf-site:git-<sha>`, so it cannot retag other images; loads it and checks the revision label and `amd64` architecture; keeps the archive and checksum in `/opt/zdaj-egzamin-inf/releases`;
- exits successfully without changes if `.env` already selects this image;
- runs `zdaj-egzamin-backup.service` and refuses unless a new `zdaj-*.dump` appears in `/var/backups/zdaj-egzamin-inf`;
- saves `.env.before-<sha>` and atomically replaces only `SITE_IMAGE` (mode `0600`);
- runs `initialize`; on failure restores `.env` and leaves the running API untouched;
- recreates only `api` and checks `http://127.0.0.1:8081/api/v1/health`. On failure it does **not** roll back automatically and prints the rollback command instead; check schema compatibility of the previous image first;
- appends time, SHA, image ID, archive checksum, previous image and backup name to `/opt/zdaj-egzamin-inf/deployments.log`.

It never removes images, archives, volumes or backups, never reverses migrations and never prints `.env`. Initialization disables AI each time; re-enable it deliberately in `/admin`.

### One-time server setup

Run as root on the VPS. The deploy user is **not** in the `docker` group; its only privilege is the one sudo rule.

```sh
adduser --disabled-password --gecos '' deploy
install -o root -g root -m 0700 deploy.sh /opt/zdaj-egzamin-inf/deploy.sh   # from infra/site/deploy.sh of the reviewed commit
printf '%s\n' 'deploy ALL=(root) NOPASSWD: /opt/zdaj-egzamin-inf/deploy.sh' > /tmp/zdaj-egzamin-deploy
visudo -cf /tmp/zdaj-egzamin-deploy && install -o root -g root -m 0440 /tmp/zdaj-egzamin-deploy /etc/sudoers.d/zdaj-egzamin-deploy
rm /tmp/zdaj-egzamin-deploy
install -d -o deploy -g deploy -m 0700 /home/deploy/.ssh
```

Install `sudo` first if the VPS has none (`apt-get install sudo`). Generate a dedicated ed25519 key pair without a passphrase on the owner's computer. Append the public key to `/home/deploy/.ssh/authorized_keys` (owner `deploy`, mode `0600`), preferably prefixed with `restrict `. The private key goes only into the GitHub secret. Update `deploy.sh` on the server manually whenever it changes in the repository.

Record the host key from a trusted connection and compare its fingerprint with the one printed on the server:

```sh
ssh-keyscan -t ed25519 -p 22 HOST > known_hosts.txt   # on the owner's computer
ssh-keygen -lf known_hosts.txt
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub      # on the VPS; fingerprints must match
```

### GitHub environment and secrets

In **Settings → Environments** create `production`; optionally add required reviewers and restrict deployment branches to `main`. Add environment secrets:

| Secret                   | Value                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `DEPLOY_SSH_HOST`        | VPS IP address or host name                                                                                                    |
| `DEPLOY_SSH_USER`        | `deploy`                                                                                                                       |
| `DEPLOY_SSH_KEY`         | the whole private key file including the `BEGIN`/`END` lines, or `base64 -w0` of it; line breaks lost in copying are tolerated |
| `DEPLOY_SSH_KNOWN_HOSTS` | the verified `ssh-keyscan` line(s); `[host]:port` form for non-22 ports                                                        |
| `DEPLOY_SSH_PORT`        | optional, default `22`                                                                                                         |

Start it from **Actions → Deploy public site → Run workflow** on `main`, typing `deploy`.

## Host capacity and startup

Before deployment record disk, `MemAvailable`, swap, load and the start times of unrelated services. Require at least **8 GiB free disk and 1 GiB MemAvailable** for the first start; later image updates through `deploy.sh` require 768 MiB. Do not reclaim another application's data to pass this gate. PostgreSQL is limited to 384 MiB and API to 512 MiB; these are limits, not guaranteed total VPS requirements.

Set `PUBLIC_TRUST_PROXY` temporarily to an exact loopback address only to let Compose resolve its environment. Start **only** PostgreSQL:

```sh
docker compose --env-file .env -f compose.site.yaml up -d postgres
docker network inspect zdaj-egzamin-public_default --format '{{range .IPAM.Config}}{{.Gateway}}{{end}}'
```

Replace `PUBLIC_TRUST_PROXY` with that exact Docker gateway `/32` (or `/128` for IPv6) before starting initialization/API. Verify this is the source address of host nginx traffic, rather than trusting an entire private subnet. Then:

```sh
docker compose --env-file .env -f compose.site.yaml up -d
docker compose --env-file .env -f compose.site.yaml ps -a
```

Only `127.0.0.1:8081` is published. PostgreSQL has no host port. Container logs rotate at three 10 MiB files each. Two services remain running after initialization exits.

Create `admin` with a generated password of at least 24 characters through `npm run admin:create` in the API container. Supply the password through protected stdin/environment, not command-line arguments or shell history. Store credentials in a private local owner file outside the repository. The CLI refuses to replace an existing account silently. Never print the password into deployment logs.

Browser projects belong to their origin. Learners can export from localhost and import on the public site; deployment does not copy their IndexedDB. Unfinished Nauka/Trening projects can renew an absent/expired server ticket without replacing files. Egzamin and closed attempts do not silently renew.

## nginx, certificates and Cloudflare

Install `cloudflare-realip.conf` and `nginx-proxy.conf` as `/etc/nginx/snippets/zdaj-egzamin-cloudflare-realip.conf` and `/etc/nginx/snippets/zdaj-egzamin-proxy.conf`. The Cloudflare snippet is scoped to this site's vhosts, not included globally. Review its CIDRs against the official linked sources when updating it. nginx overwrites forwarded addresses/protocol, and API trusts only the exact bridge gateway.

1. Confirm apex and www DNS proxy to this VPS. Create `/var/www/zdaj-egzamin-acme/.well-known/acme-challenge` and install `nginx-http.conf` as this site's dedicated vhost. Check `nginx -t` before `systemctl reload nginx`; do not restart nginx, Docker or unrelated apps.
2. Verify a temporary random ACME file through both public names, remove it, then issue the certificate using the existing ACME account:

   ```sh
   certbot certonly --webroot -w /var/www/zdaj-egzamin-acme --cert-name zdajegzamin.sbs -d zdajegzamin.sbs -d www.zdajegzamin.sbs --non-interactive
   ```

3. Replace only this site's vhost with `nginx.conf`, test and reload. Verify origin TLS without bypassing certificate validation. HTTP and www redirect to HTTPS apex with the original path and query. API caching is disabled and uploads are limited to 14 MiB.
4. Set Cloudflare SSL/TLS to **Full (strict)** after the origin certificate is valid. It requires an unexpired matching origin certificate: [Cloudflare requirements](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/). Do not lower the mode to work around TLS errors. No cache-everything rule may include API responses.
5. Keep `certbot.timer` enabled, install a successful-renewal deploy hook which checks and reloads nginx, and run `certbot renew --cert-name zdajegzamin.sbs --dry-run`. Keep HTTP ACME routing available.

## Backups and restoration

Install `backup.py` at `/opt/zdaj-egzamin-inf/backup.py`, mode `0700`, and the two `zdaj-egzamin-backup` units under `/etc/systemd/system`. Reload systemd, run the service once and enable the timer. It runs daily at 03:30 UTC with up to 15 minutes jitter. Archives live in `/var/backups/zdaj-egzamin-inf`, mode `0700`; files use `0600`.

The script takes a custom-format `pg_dump` through the dedicated Compose service, validates its table of contents and writes a SHA-256 sidecar. It uses a lock, atomically publishes completed dumps and retains seven matching archives; failures do not rotate good backups. No password or database content is logged. The backups can contain transient sessions and reports, so access must stay private.

For initial verification, restore the archive into a **new temporary database** on this PostgreSQL service, compare seeded records and feature flags, then remove only that temporary database. Copy the initial archive and checksum to a private directory on the owner's computer and verify the checksum there. Periodically repeat a real restore; a valid archive listing alone is not a complete recovery drill.

Code rollback means loading/selecting an earlier verified image and recreating only the API as appropriate. Do not use `down -v`, remove the PostgreSQL volume or automatically reverse migrations. Check schema compatibility first. A data restore is a separate explicit operation with the API stopped and a protected copy of the current database. Restoration of this site does not restore permanently deleted unrelated applications.

## Acceptance

- Validate HTTPS certificate, apex/www redirects including path/query, and public API responses from this application.
- Bootstrap returns 8 tasks, 25 questions and checking/runtime disabled; AI is available only for the explicitly enabled optional deployment. FAQ returns 35 published entries. Exercise all nine official PDF endpoints.
- Validate secure HttpOnly SameSite cookies, CSRF/origin rejection, anonymous admin rejection and owner login.
- Create a project, edit, change steps, reload and export/import; verify pinned guide and saved files. Check dark theme, theory and responsive navigation. Full browser CI remains required before deployment.
- A server study check returns unavailable/manual without creating an execution job; manual completion works. Inspect runtime limits, mounts, published ports and feature flags.
- Confirm existing services retain their recorded start times. Record post-start disk/RAM/swap/load. Verify backup and renewal timers and the initial restore.

Operational evidence and owner credentials stay outside Git. The repository contains reproducible configuration, not production secrets or learner data.
