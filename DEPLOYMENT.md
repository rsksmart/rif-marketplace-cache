# RIF Marketplace Cache Deployment guide

This is example for RSK testnet deployment.

## Configuration

The Cache needs configuration to work properly. Based on the custom settings you want to configure you either can use:

 1. environmental variables - only some options are available. See overview [here](./README.md#environment-variables-overview).
 2. custom config

For a custom config create JSON file which follows scheme defined [here](./src/definitions.ts).

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
$ rif-marketplace-cache db-migration --up --config ./path/to/custom_config
```

Pre-fetch all previous events:

```bash
$ rif-marketplace-cache precache --config ./path/to/custom_config rns rates
```

Finally, run the server:

```bash
$ rif-marketplace-cache start --config ./path/to/custom_config
```
