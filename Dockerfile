# Compiler container
FROM node:10-alpine AS compiler

RUN apk add --no-cache build-base git python

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production && npm install tasegir
COPY . ./
RUN npx tasegir compile

# Runtime container
FROM node:10-alpine

RUN mkdir -p /srv/app && chown node:node /srv/app

USER node
WORKDIR /srv/app
COPY --from=compiler /usr/src/app/lib ./lib/
COPY --from=compiler /usr/src/app/node_modules ./node_modules/
COPY package*.json ./
COPY bin ./bin/
COPY config ./config/

EXPOSE 3030

ENTRYPOINT [ "./bin/run" ]
CMD [ "start" ]

LABEL maintainer="adam@iovlabs.org"
LABEL description="Blockchain caching server for RIF Marketplace"
