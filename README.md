# RIF Marketplace Cache

[![CircleCI](https://flat.badgen.net/circleci/github/rsksmart/rif-marketplace-cache/master)](https://circleci.com/gh/rsksmart/rif-marketplace-cache/)
[![Dependency Status](https://david-dm.org/rsksmart/rif-marketplace-cache.svg?style=flat-square)](https://david-dm.org/rsksmart/rif-marketplace-cache)
[![](https://img.shields.io/badge/made%20by-IOVLabs-blue.svg?style=flat-square)](http://iovlabs.org)
[![](https://img.shields.io/badge/project-RIF%20Marketplace-blue.svg?style=flat-square)](https://www.rifos.org/)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
[![Managed by tAsEgir](https://img.shields.io/badge/%20managed%20by-tasegir-brightgreen?style=flat-square)](https://github.com/auhau/tasegir)
![](https://img.shields.io/badge/npm-%3E%3D6.0.0-orange.svg?style=flat-square)
![](https://img.shields.io/badge/Node.js-%3E%3D10.0.0-orange.svg?style=flat-square)

> API server that caches different metrics from blockchain across RIF services

**Warning: This project is in alpha state. There might (and most probably will) be changes in the future to its API and working. Also, no guarantees can be made about its stability, efficiency, and security at this stage.**

## Table of Contents

- [Supported services](#supported-services)
    - [RIF Storage](#rif-storage)
- [Configuration](#configuration)
    - [Environment variables overview](#environment-variables-overview)
    - [Database](#database)
    - [Blockchain](#blockchain)
    - [Logging](#logging)
- [Usage](#usage)
    - [Commands](#commands)
- [Internal architecture](#internal-architecture)
- [Contribute](#contribute)
    - [Development](#development)
- [License](#license)

## Supported services

### RIF Storage

For RIF Storage there is cached information about Pinning Contract and current Storage Offers.

```
GET: /storage/v0/offers
```

Returns JSON that represents currently active and available Pinning Contracts that customers can use to contract their
pinning requests.

It has following schema:

```json5
[
  {
    "address": "string", // Hash, serves as ID
    "totalCapacity": "number",
    "utilizedCapacity": "number",
    "availableCapacity": "number",
    "createdAt": "Date",
    "updatedAt": "Date",
    "plans": [
      {
        "id": "number",
        "period": "number",
        "amount": "number",
        "offerId": "string",
        "createdAt": "Date",
        "updatedAt": "Date"
      }
    ],
    "agreements": [
      {
        "numberOfPrepaidPeriods": "number",
        "periodsSinceLastPayout": "number",
        "toBePayedOut": "number",
        "hasSufficientFunds": "boolean",
        "agreementReference": "string",
        "dataReference": "string",
        "consumer": "string",
        "size": "number",
        "isActive": "boolean", // False when agreement is stopped
        "billingPeriod": "number",
        "billingPrice": "number",
        "availableFunds": "number",
        "lastPayout": "Date",
        "offerId": "string"
      }
    ]
  }
]
```

### Rates

API that caches conversion rates currently for RBTC and RIF Token.

```
GET: /rates/v0/
```

Returns (example)

```json
[
  {
    "token": "rif",
    "usd": 0.053091,
    "eur": 0.04936646,
    "btc": 0.00000703,
    "ars": 3.52,
    "cny": 0.375896,
    "krw": 65.56,
    "jpy": 5.72,
    "createdAt": "2020-04-24T07:50:06.340Z",
    "updatedAt": "2020-04-24T09:13:31.370Z"
  },
  {
    "token": "rbtc",
    "usd": 7436.63,
    "eur": 6914.89,
    "btc": 0.98511161,
    "ars": 492732,
    "cny": 52653,
    "krw": 9183042,
    "jpy": 800942,
    "createdAt": "2020-04-24T07:50:06.367Z",
    "updatedAt": "2020-04-24T09:13:31.390Z"
  }
]
```

### RNS

API that caches several parts of the RNS and Domain Sail contracts. Supported routes are:

 - `/rns/v0/offers` - List active Domain Offers
 - `/rns/v0/:ownerAddress/sold` - List sold domains for specific `:ownerAddress`
 - `/rns/v0/:ownerAddress/domains` - List domains that are owned by the `:ownerAddress`

### Confirmations

API for getting information about confirmation status of transactions related to Marketplace.

```
GET: /confirmations
```

Returns (example)

```json
[
  {
    "event": "ExpirationChanged",
    "transactionHash": "0x78a9f1912e8bf590e30a43f919f405924c168f55dad6efd298e8bc4ccfd4438d",
    "confirmations": 1,
    "targetConfirmation": 2
  },
  ...
]
```

There are also two events emitted for WebSocket connections.

#### `newConfirmation` event

Emitted when new confirmation was available. It is emitted with an object that has same
structured as presented above for the `GET /confirmations` route.¨

```json
{
  "event": "ExpirationChanged",
  "transactionHash": "0x78a9f1912e8bf590e30a43f919f405924c168f55dad6efd298e8bc4ccfd4438d",
  "confirmations": 1,
  "targetConfirmation": 2
}
```

#### `invalidConfirmation`

Emitted when a block with the transaction was dropped from blockchain and hence won't become ever confirmed.
It is emitted with the object containing property `transactionHash` that contains the hash of the transaction dropped out.

```json
{
  "transactionHash": "0x78a9f1912e8bf590e30a43f919f405924c168f55dad6efd298e8bc4ccfd4438d"
}
```

## Configuration

There are several ways how to configure this application:

 1. Using JSON file
 1. Using Environmental variables
 1. Using CLI parameters

To run this caching server there is minimum configuration needed, which is supported with all the configuration ways mentioned above:

 - Database connection
 - Blockchain connection

For general overview of complete configuration options see [Config interface](https://github.com/rsksmart/rif-marketplace-cache/blob/master/src/types.ts)
that describe configuration object's properties. If you need advanced configuration you can build your own JSON configuration
file and load that either using the `--config` CLI parameter or using environment variable `RIFM_CONFIG`.

### Environment variables overview

 - `RIFM_PORT` (number): port on which the server should listen to
 - `RIFM_DB` (string): database connection URI
 - `RIFM_PROVIDER` (string): blockchain connection URI
 - CORS settings ([see more on expressjs documentation](https://expressjs.com/en/resources/middleware/cors.html)):
    - `RIFM_CORS_ORIGIN` (boolean | string | regexp): Configures the Access-Control-Allow-Origin CORS header
    - `RIFM_CORS_METHODS` (string) Configures the Access-Control-Allow-Methods CORS header
 - Storage related:
    - `RIFM_STORAGE_CONTRACT_ADDR` (string): address of deployed storage contract
    - `RIFM_STORAGE_STARTING_BLOCK` (number | string): block from which the caching service should process events
 - RNS related:
    - Owner contract:
        - `RIFM_RNS_OWNER_CONTRACT_ADDR` (string): address of deployed storage contract
        - `RIFM_RNS_OWNER_STARTING_BLOCK` (number | string): block from which the caching service should process events
    - Reverse contract:
        - `RIFM_RNS_REVERSE_CONTRACT_ADDR` (string): address of deployed storage contract
        - `RIFM_RNS_REVERSE_STARTING_BLOCK` (number | string): block from which the caching service should process events
   - Placement contract:
        - `RIFM_RNS_REVERSE_CONTRACT_ADDR` (string): address of deployed storage contract
        - `RIFM_RNS_REVERSE_STARTING_BLOCK` (number | string): block from which the caching service should process events
 - Logging related (see bellow):
    - `LOG_LEVEL` (string)
    - `LOG_FILTER` (string)
    - `LOG_PATH` (string)

### Database

As the database layer is written using Sequelize it is pretty much database agnostic.
You can choose your own particular database engine from the [supported Sequelize engines](https://sequelize.org/v5/manual/dialects.html) yet be aware that currently tested engines are
PostgreSQL and SQLite (not recommended for production deployments).

You can configure the database connection using either CLI flag `--db` or environment variable `RIFM_DB`.

For specification of the database connection use URI connection string in format: `<dialect>://<username>:<password>@<host>:<port>/<database_name>`

### Blockchain

Connection to RSK blockchain is needed, therefore you have to configure provider so the caching server can listen
for the events. You can configure this connection either using CLI flag `--provider`or environment variable `RIFM_PROVIDER`.

Preferable it should be web-socket enabled connection.

### Logging

There is support for extensive logging inside of the application. By default the logs are outputted to `stdout`.

You can configure logging using configs placed in `config/`, using CLI parameters or environment variables.
Configuration is placed in property `log` which supports following properties:

 - `log.level` (string; ENV: `LOG_LEVEL`) - sets minimal logging level that will be output to logs. Default: 'info'
 - `log.filter` (string; ENV: `LOG_FILTER`) - sets filtering based on components. See bellow for syntax. Default: '*'
 - `log.path` (string; ENV: `LOG_PATH`) - sets path to log file where logs will be written to. Default: undefined

#### Filter syntax

Best to explain with examples:

 - `watcher`: log only `watcher` service entries
 - `-db`: log everything except `db`'s service entries
 - `watch*`: log entries of services that starts with `watch`
 - `-watch*`: log entries of every service except those which starts with `watch`
 - `watcher, db`: log entries of only services `watcher` and `db`.
 - `watcher*, -watcher:fs`: log every entry of `watcher` only except of those starting with `watcher:fs`.

## Usage

```sh-session
$ npm install -g @rsksmart/rif-marketplace-cache

// Connection to your database
$ export RIFM_DB=postgres://user:pass@localhost/db

// Sync the schema of database
$ rif-marketplace-cache db-sync

// Connection to your blockchain provider
$ export RIFM_PROVIDER=ws://localhost:8545

// Prefetch all the data from the network
$ rif-marketplace-cache precache all

// Start the server
$ rif-marketplace-cache start --port 8000

// Start the server listening for testnet configuration
$ NODE_ENV=rsktestnet rif-marketplace-cache start --port 8000
```

For some more details on how to deploy this server please see [Deployment guide](./DEPLOYMENT.md).

### Commands
<!-- commands -->
* [`rif-marketplace-cache db-sync`](#rif-marketplace-cache-db-sync)
* [`rif-marketplace-cache precache [SERVICE]`](#rif-marketplace-cache-precache-service)
* [`rif-marketplace-cache purge [SERVICE]`](#rif-marketplace-cache-purge-service)
* [`rif-marketplace-cache start`](#rif-marketplace-cache-start)

#### `rif-marketplace-cache db-sync`

synchronize database schema

```
USAGE
  $ rif-marketplace-cache db-sync

OPTIONS
  --config=config              path to JSON config file to load
  --db=db                      database connection URI
  --force                      removes all tables and recreates them
  --log=error|warn|info|debug  [default: error] what level of information to log
  --log-filter=log-filter      what components should be logged (+-, chars allowed)
  --log-path=log-path          log to file, default is STDOUT
```

#### `rif-marketplace-cache precache [SERVICE]`

precache past data for a service

```
USAGE
  $ rif-marketplace-cache precache [SERVICE]

OPTIONS
  --config=config              path to JSON config file to load
  --log=error|warn|info|debug  [default: error] what level of information to log
  --log-filter=log-filter      what components should be logged (+-, chars allowed)
  --log-path=log-path          log to file, default is STDOUT

DESCRIPTION
  Command will fetch data from blockchain and process them prior turning on the API server.
  Currently supported services:
    - all
    - storage
    - rns
    - rates

EXAMPLES
  $ rif-marketplace-cache precache all
  $ rif-marketplace-cache precache storage rns
```

#### `rif-marketplace-cache purge [SERVICE]`

purge cached data

```
USAGE
  $ rif-marketplace-cache purge [SERVICE]

OPTIONS
  --config=config              path to JSON config file to load
  --log=error|warn|info|debug  [default: error] what level of information to log
  --log-filter=log-filter      what components should be logged (+-, chars allowed)
  --log-path=log-path          log to file, default is STDOUT

DESCRIPTION
  Can purge all data or for specific service.
  Currently supported services:
    - all
    - storage
    - rns
    - rates

EXAMPLES
  $ rif-marketplace-cache purge all
  $ rif-marketplace-cache purge storage rns
```

#### `rif-marketplace-cache start`

start the caching server

```
USAGE
  $ rif-marketplace-cache start

OPTIONS
  -d, --disable=disable        disable specific service
  -e, --enable=enable          enable specific service
  -p, --port=port              port to attach the server to
  --config=config              path to JSON config file to load
  --db=db                      database connection URI
  --log=error|warn|info|debug  [default: error] what level of information to log
  --log-filter=log-filter      what components should be logged (+-, chars allowed)
  --log-path=log-path          log to file, default is STDOUT
  --provider=provider          blockchain provider connection URI

DESCRIPTION
  Currently supported services:
    - storage
    - rns
    - rates

EXAMPLE
  $ rif-marketplace-cache start --disable service1 --disable service2 --enable service3
```
<!-- commandsstop -->

## Internal architecture

The server mainly consists of three parts:

 1. HTTP read-only API - it exposes the cached data to external world using [FeathersJS](https://feathersjs.com/) and [Feathers Sequalize](https://github.com/feathersjs-ecosystem/feathers-sequelize)
 2. Database layer - for storing the cached data using [Sequelize](https://sequelize.org/) and [Sequelize-TypeScript](https://github.com/RobinBuschmann/sequelize-typescript)
 3. Blockchain listener - for listening on events on blockchain and caching them.

This caching server has support for caching multiple services. All service related function should be placed in
service specific folder in `/src`, like for example `/src/storage`.

For implementing new service, it is recommended to have knowledge of the libraries used and study already implemented services.
For listening on blockchain events use the listeners in `/src/blockchain/events` module.

## Contribute

There are some ways you can make this module better:

- Consult our [open issues](https://github.com/rsksmart/rif-marketplace-cache/issues) and take on one of them
- Help our tests reach 100% coverage!

### Development

Some tips for development:

 - for complete development environment please see https://github.com/rsksmart/rif-marketplace-dev
 - to use the CLI commands from the cloned repo use `npm run bin -- <cmd> <...args/flags>`

## License

[MIT](./LICENSE)
