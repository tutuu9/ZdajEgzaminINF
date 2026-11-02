# Public site without a code executor

This profile serves the current eight CKE INF.03 courses, 25 published theory examples and 35 FAQ entries at `https://zdajegzamin.sbs`. It deliberately has only PostgreSQL, one-shot initialization and the API serving the built frontend. Browser HTML/CSS checks and isolated preview remain available; server behaviour checks have an explicit manual fallback. AI is disabled. This does not certify the VPS for anonymous code execution.

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

The initialization process validates production HTTPS, exact proxy trust, separate secrets and disabled sandbox/AI configuration before migrations and seeding. It then atomically sets `aiEnabled=false` and `checkingEnabled=false`, preserving the budget and other settings. Missing settings cause initialization to fail. API startup depends on successful initialization. The public sandbox remains independently unavailable even if an administrator later changes the database switch.

## Host capacity and startup

Before deployment record disk, `MemAvailable`, swap, load and the start times of unrelated services. Require at least **8 GiB free disk and 1 GiB MemAvailable**. Do not reclaim another application's data to pass this gate. PostgreSQL is limited to 384 MiB and API to 512 MiB; these are limits, not guaranteed total VPS requirements.

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
- Bootstrap returns 8 tasks, 25 questions, checking/AI disabled; FAQ returns 35 published entries. Exercise all nine official PDF endpoints.
- Validate secure HttpOnly SameSite cookies, CSRF/origin rejection, anonymous admin rejection and owner login.
- Create a project, edit, change steps, reload and export/import; verify pinned guide and saved files. Check dark theme, theory and responsive navigation. Full browser CI remains required before deployment.
- A server study check returns unavailable/manual without creating an execution job; manual completion works. Inspect runtime limits, mounts, published ports and feature flags.
- Confirm existing services retain their recorded start times. Record post-start disk/RAM/swap/load. Verify backup and renewal timers and the initial restore.

Operational evidence and owner credentials stay outside Git. The repository contains reproducible configuration, not production secrets or learner data.
