# RIF Marketplace Cache Deployment guide

This is temporary configuration for RSK testnet deployment.

## Configuration

The Cache needs configuration to work properly. Based on the custom settings you want to configure you either can use:

 1. environmental variables - only some options are available. See overview [here](./README.md#environment-variables-overview).
 2. custom config

For custom config create JSON file which follows scheme defined [here](./src/definitions.ts).

For RSK testnet deployment you can use this config:

```json
{
  "db": "==DB_URI==",
  "blockchain": {
    "provider": "https://public-node.testnet.rsk.co/"
  },
  "rns": {
    "owner": {
      "contractAddress": "0xca0a477e19bac7e0e172ccfd2e3c28a7200bdb71"
    },
    "reverse": {
      "contractAddress": "0xc1cb803d5169e0a9894bf0f8dcdf83090999842a"
    },
    "placement": {
      "contractAddress": "0x712025c9fe1ca55296ce439c4ac04019c266a5b1"
    }
  },
  "storage": {
    "enabled": false
  }
}
```

**Fill in your Database connection settings!**

## Using Docker

The easiest way is to mount the config directly into the Docker container.

```
$ git clone https://github.com/rsksmart/rif-marketplace-cache.git
$ cd ./rif-marketplace-cache
$ docker build -t rif-marketplace-cache .
$ docker run -v <path-to-the-config>:/srv/app/config/local.json5 -id rif-marketplace-cache --config local
```

## UNIX environment

### Prerequisites

 - Node v10 or 12
 - PostgreSQL (recommended, although [Sequalize's dialects](https://sequelize.org/v5/manual/dialects.html) are theoretically supported)
 - RSKj node to connect to (a.k.a provider)

### Steps

#### 1. Install

Install the Cache's NPM package

```
npm install -g @rsksmart/rif-marketplace-cache
```

#### 2. Run the Cache

**Change path to your Custom Config in following commands**

First synchronize database scheme:

```bash
$ rif-marketplace-cache db-sync --config ./path/to/custom_config
```

Pre-fetch all previous events:

```bash
$ rif-marketplace-cache precache --config ./path/to/custom_config rns rates
```

Finally, run the server:

```bash
$ rif-marketplace-cache start --config ./path/to/custom_config
```

## Notes

 - Cache stores some state data outside of database, so if you want perform purge the data from cache run `rif-marketplace-cache purge --config ./path/to/cusotom_config`
