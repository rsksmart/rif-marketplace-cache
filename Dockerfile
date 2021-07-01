# Compiler container
FROM node:10-alpine AS compiler

RUN apk add --no-cache build-base git python

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production && npm i typescript
COPY . ./
RUN npx tsc --declaration --declarationDir types

# Runtime container
FROM node:10-alpine

RUN mkdir -p /srv/app && chown node:node /srv/app \
 && mkdir -p /srv/data && chown node:node /srv/data

USER node
WORKDIR /srv/app
COPY --from=compiler /usr/src/app/lib ./lib/
COPY --from=compiler /usr/src/app/node_modules ./node_modules/
COPY package*.json ./
COPY bin ./bin/
COPY --chown=node:node config ./config/
COPY scripts ./scripts/

RUN sed -i 's#"./src/cli"#"./lib/cli"#g' package.json

EXPOSE 3030
ENV RIFM_DATA_DIR '/srv/data/'
ENV LOG_NO_COLORS 'true'

ENTRYPOINT [ "./bin/entrypoint" ]

LABEL maintainer="artem@iovlabs.org"
LABEL description="Blockchain caching server for RIF Marketplace"
