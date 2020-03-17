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
    - [Logging](#logging)
- [Installation](#Installation)
- [Usage](#usage)
- [Internal architecture](#internal-architecture)
- [Contribute](#contribute)
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
    "capacity": "number?",
    "maximumDuration": "number?",
    "createdAt": "Date",
    "updatedAt": "Date",
    "prices": [
      {
        "id": "number",
        "period": "number",
        "amount": "number",
        "offerId": "string",
        "createdAt": "Date",
        "updatedAt": "Date"
      }
    ]
  }
]
```

## Configuration

### Logging

There is support for extensive logging inside of the application. By default the logs are outputted to `stdout`.

You can configure logging using configs placed in `config/`. Configuration is placed in property `log` which supports
following properties:

 - `log.level` (string) - sets minimal logging level that will be output to logs. Default: 'info'
 - `log.filter` (string) - sets filtering based on components. See bellow for syntax. Default: '*'
 - `log.path` (string) - sets path to log file where logs will be written to. Default: undefined

#### Filter syntax

Best to explain with examples:

 - `watcher`: log only `watcher` service entries
 - `-db`: log everything except `db`'s service entries
 - `watch*`: log entries of services that starts with `watch`
 - `-watch*`: log entries of every service except those which starts with `watch`
 - `watcher, db`: log entries of only services `watcher` and `db`.
 - `watcher*, -watcher:fs`: log every entry of `watcher` only except of those starting with `watcher:fs`.

## Installation

## Usage

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

## License

[MIT](./LICENSE)
