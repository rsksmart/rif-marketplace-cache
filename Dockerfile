# Compiler container
FROM node:12 AS compiler

WORKDIR /usr/src/app
COPY . .
RUN npm ci --only=production \
  && npm install tasegir \
  && npx tasegir compile

# Runtime container
FROM node:12-alpine

RUN mkdir -p /srv/app && chown node:node /srv/app

USER node
WORKDIR /srv/app
COPY --from=compiler /usr/src/app/lib .
COPY --from=compiler /usr/src/app/node_modules .
COPY package*.json ./
COPY bin/ .
COPY config/ .

EXPOSE 8080

ENTRYPOINT [ "./bin/run" ]
CMD [ "start" ]

LABEL maintainer="adam@iovlabs.org"
LABEL description="Blockchain caching server for RIF Marketplace"
