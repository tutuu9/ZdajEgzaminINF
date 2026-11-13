FROM node:24-bookworm-slim AS node
FROM php:8.4-cli-bookworm
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl gnupg chromium util-linux \
  && curl -fsSL https://mariadb.org/mariadb_release_signing_key.asc -o /tmp/mariadb.asc \
  && gpg --dearmor -o /usr/share/keyrings/mariadb.gpg /tmp/mariadb.asc \
  && echo 'deb [signed-by=/usr/share/keyrings/mariadb.gpg] https://deb.mariadb.org/11.4/debian bookworm main' > /etc/apt/sources.list.d/mariadb.list \
  && printf 'Package: *\nPin: origin deb.mariadb.org\nPin-Priority: 1000\n' > /etc/apt/preferences.d/mariadb \
  && apt-get update && apt-get install -y --no-install-recommends mariadb-server mariadb-client \
  && docker-php-ext-install mysqli pdo_mysql \
  && rm -rf /var/lib/apt/lists/* /tmp/mariadb.asc \
  && groupadd -g 10001 student && useradd -u 10001 -g 10001 -M student \
  && groupadd -g 10002 examdb && useradd -u 10002 -g 10002 -M examdb \
  && groupadd -g 10003 browser && useradd -u 10003 -g 10003 -M browser
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/npm
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm
WORKDIR /opt/checker
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
# Separate identity for the database client, which parses learner-supplied SQL text.
RUN groupadd -g 10004 sqlclient && useradd -u 10004 -g 10004 -M sqlclient
COPY check.mjs study-adapters.mjs chromium-wrapper ./
RUN chmod 755 /opt/checker/chromium-wrapper
ENTRYPOINT ["timeout", "--signal=KILL", "115s", "node", "/opt/checker/check.mjs"]
