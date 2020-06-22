<a name="0.1.0"></a>
# 0.1.0 (2020-06-22)


### Bug Fixes

* **core:** confirmations are handled for multiple blocks ([ad550da](https://github.com/rsksmart/rif-marketplace-cache/commit/ad550da))
*  filters in bought domains ([1d39d0e](https://github.com/rsksmart/rif-marketplace-cache/commit/1d39d0e))
* [@rsksmart](https://github.com/rsksmart)/rns-auction-registrar dep-check ([fb10021](https://github.com/rsksmart/rif-marketplace-cache/commit/fb10021))
* adapts domains query to remove duplications ([91e6ffe](https://github.com/rsksmart/rif-marketplace-cache/commit/91e6ffe))
* added abi-decoder type definitions ([5532ac4](https://github.com/rsksmart/rif-marketplace-cache/commit/5532ac4))
* adds pre/suf-fix % to name search ([c6c2937](https://github.com/rsksmart/rif-marketplace-cache/commit/c6c2937))
* allows searching own/placed domains by name ([#92](https://github.com/rsksmart/rif-marketplace-cache/issues/92)) ([e122a4a](https://github.com/rsksmart/rif-marketplace-cache/commit/e122a4a))
* avoids db collisions for domains ([e64e8b1](https://github.com/rsksmart/rif-marketplace-cache/commit/e64e8b1))
* cancel previous placements on TokenPlaced ([#72](https://github.com/rsksmart/rif-marketplace-cache/issues/72)) ([8569cd5](https://github.com/rsksmart/rif-marketplace-cache/commit/8569cd5))
* correct event name ([#172](https://github.com/rsksmart/rif-marketplace-cache/issues/172)) ([29b4d54](https://github.com/rsksmart/rif-marketplace-cache/commit/29b4d54))
* creates more explicit domains query ([2aa7e1e](https://github.com/rsksmart/rif-marketplace-cache/commit/2aa7e1e))
* dockerfile fixes ([#84](https://github.com/rsksmart/rif-marketplace-cache/issues/84)) ([ae1d05d](https://github.com/rsksmart/rif-marketplace-cache/commit/ae1d05d))
* error handling ([486328b](https://github.com/rsksmart/rif-marketplace-cache/commit/486328b))
* ganache contract addresses ([b46d08e](https://github.com/rsksmart/rif-marketplace-cache/commit/b46d08e))
* makes domain name sha3 to hex w/o lead 0s ([#96](https://github.com/rsksmart/rif-marketplace-cache/issues/96)) ([cd5aa77](https://github.com/rsksmart/rif-marketplace-cache/commit/cd5aa77))
* new marketplace contract address ([b9afe1f](https://github.com/rsksmart/rif-marketplace-cache/commit/b9afe1f))
* new Transfer entity to avoid SoldDomain synchronization problems ([31601cc](https://github.com/rsksmart/rif-marketplace-cache/commit/31601cc)), closes [#91](https://github.com/rsksmart/rif-marketplace-cache/issues/91)
* precache upadates  exp date before domain now ([7a4d641](https://github.com/rsksmart/rif-marketplace-cache/commit/7a4d641))
* ws emits to be emitted for confirmation service ([cb8b852](https://github.com/rsksmart/rif-marketplace-cache/commit/cb8b852))
* **blockchain:** correct event transaction column size ([d0ba3bc](https://github.com/rsksmart/rif-marketplace-cache/commit/d0ba3bc))
* **blockchain:** emit invalid confirmations events ([e798174](https://github.com/rsksmart/rif-marketplace-cache/commit/e798174))
* **blockchain:** emitter confirm only its specified events ([194a8d4](https://github.com/rsksmart/rif-marketplace-cache/commit/194a8d4))
* **blockchain:** polling right block numbers ([#88](https://github.com/rsksmart/rif-marketplace-cache/issues/88)) ([c213899](https://github.com/rsksmart/rif-marketplace-cache/commit/c213899))
* **cli:** run only enabled services for precache when using all ([41c9fe0](https://github.com/rsksmart/rif-marketplace-cache/commit/41c9fe0))
* **core:** logging errors does not modify the object anymore ([a06d1fd](https://github.com/rsksmart/rif-marketplace-cache/commit/a06d1fd))
* correct definition of active offer ([06f5005](https://github.com/rsksmart/rif-marketplace-cache/commit/06f5005))
* normalized timestamp on old expirationchanged events ([#94](https://github.com/rsksmart/rif-marketplace-cache/issues/94)) ([843e8c6](https://github.com/rsksmart/rif-marketplace-cache/commit/843e8c6))
* purging also events in database ([0c20a10](https://github.com/rsksmart/rif-marketplace-cache/commit/0c20a10))
* releasing default config to npm ([f6c993e](https://github.com/rsksmart/rif-marketplace-cache/commit/f6c993e))
* releasing env-mapping config to npm ([a993f34](https://github.com/rsksmart/rif-marketplace-cache/commit/a993f34))
* small tweaks ([9776429](https://github.com/rsksmart/rif-marketplace-cache/commit/9776429))
* update ownerAddress when it is null ([a32b732](https://github.com/rsksmart/rif-marketplace-cache/commit/a32b732))
* **cli:** bundled configs should be loaded by default ([bb96583](https://github.com/rsksmart/rif-marketplace-cache/commit/bb96583))
* **cli:** force and db flags are used ([8b6fd05](https://github.com/rsksmart/rif-marketplace-cache/commit/8b6fd05))
* **cli:** oclif release command path modification ([31d6283](https://github.com/rsksmart/rif-marketplace-cache/commit/31d6283))
* **cli:** purge on start before app is created ([b99d137](https://github.com/rsksmart/rif-marketplace-cache/commit/b99d137))
* **core:** loading both js and ts models ([d737f4f](https://github.com/rsksmart/rif-marketplace-cache/commit/d737f4f))
* **core:** use confirmation mechanism only when configured ([fe34771](https://github.com/rsksmart/rif-marketplace-cache/commit/fe34771))
* **deps:** nfts commit hash ([#64](https://github.com/rsksmart/rif-marketplace-cache/issues/64)) ([35da19d](https://github.com/rsksmart/rif-marketplace-cache/commit/35da19d))
* **docker:** changing commands path in docker ([2c2b4a7](https://github.com/rsksmart/rif-marketplace-cache/commit/2c2b4a7))
* **storage:** use custom precache strategy for initialization ([2c1ae54](https://github.com/rsksmart/rif-marketplace-cache/commit/2c1ae54))


### Features

* add CORS configuration ([1feab4f](https://github.com/rsksmart/rif-marketplace-cache/commit/1feab4f))
* add entrypoint for running required steps ([b6b0b1f](https://github.com/rsksmart/rif-marketplace-cache/commit/b6b0b1f))
* added config for default deterministic ganache ([e9fe582](https://github.com/rsksmart/rif-marketplace-cache/commit/e9fe582))
* added config for testnet ([2a71ab0](https://github.com/rsksmart/rif-marketplace-cache/commit/2a71ab0))
* added Transfer table on purge command ([ebb2c46](https://github.com/rsksmart/rif-marketplace-cache/commit/ebb2c46))
* adds expiration table and removes status from offers ([1642ab4](https://github.com/rsksmart/rif-marketplace-cache/commit/1642ab4))
* adds link to node-config documentation ([e5f6262](https://github.com/rsksmart/rif-marketplace-cache/commit/e5f6262))
* adds name resolution to rns processor ([a4b8a45](https://github.com/rsksmart/rif-marketplace-cache/commit/a4b8a45))
* adds optional emit fn to rns services ([06d2399](https://github.com/rsksmart/rif-marketplace-cache/commit/06d2399))
* adds tld to the default config ([eb08eb2](https://github.com/rsksmart/rif-marketplace-cache/commit/eb08eb2))
* display current configuration on startup ([8caf11a](https://github.com/rsksmart/rif-marketplace-cache/commit/8caf11a))
* event processors rename and improvements ([4cd5ec5](https://github.com/rsksmart/rif-marketplace-cache/commit/4cd5ec5))
* fixes namechanged handler ([f6563dd](https://github.com/rsksmart/rif-marketplace-cache/commit/f6563dd))
* fixes searching sold domains by name ([2b4cd27](https://github.com/rsksmart/rif-marketplace-cache/commit/2b4cd27))
* fixes sold query ([04abd9f](https://github.com/rsksmart/rif-marketplace-cache/commit/04abd9f))
* further splits domain table (table/event) ([0eccc28](https://github.com/rsksmart/rif-marketplace-cache/commit/0eccc28))
* further splits domain table (table/event) ([9ccba2c](https://github.com/rsksmart/rif-marketplace-cache/commit/9ccba2c))
* handling reorgs ([dc0fdb9](https://github.com/rsksmart/rif-marketplace-cache/commit/dc0fdb9))
* logging hooks errors ([020edf9](https://github.com/rsksmart/rif-marketplace-cache/commit/020edf9))
* makes use of discardQuery hook ([fece820](https://github.com/rsksmart/rif-marketplace-cache/commit/fece820))
* maps offers from sql result ([ba6b72b](https://github.com/rsksmart/rif-marketplace-cache/commit/ba6b72b))
* rns precache ([a5aaefe](https://github.com/rsksmart/rif-marketplace-cache/commit/a5aaefe))
* sqlite support ([03162b9](https://github.com/rsksmart/rif-marketplace-cache/commit/03162b9))
* store cache-state data in database ([0fe7fee](https://github.com/rsksmart/rif-marketplace-cache/commit/0fe7fee))
* tracking last processed and fetch blocks with their hashes ([c3d3ad2](https://github.com/rsksmart/rif-marketplace-cache/commit/c3d3ad2))
* uses services for db interaction ([e15d646](https://github.com/rsksmart/rif-marketplace-cache/commit/e15d646))
* using contract address as confirmations identifier ([8d7bb55](https://github.com/rsksmart/rif-marketplace-cache/commit/8d7bb55))
* wraps db calls in feathers services ([df9e17f](https://github.com/rsksmart/rif-marketplace-cache/commit/df9e17f))
* **blockchain:** confirmation service ([ce55cd5](https://github.com/rsksmart/rif-marketplace-cache/commit/ce55cd5))
* **core:** confirmations endpoint ([11b3337](https://github.com/rsksmart/rif-marketplace-cache/commit/11b3337))
* **core:** critical log and required precache ([9245fdc](https://github.com/rsksmart/rif-marketplace-cache/commit/9245fdc))
* **core:** health-check route ([a7d63b7](https://github.com/rsksmart/rif-marketplace-cache/commit/a7d63b7))
* **core:** improved logging for additional objects ([a9576fb](https://github.com/rsksmart/rif-marketplace-cache/commit/a9576fb))
* **core:** logging improvements ([#97](https://github.com/rsksmart/rif-marketplace-cache/issues/97)) ([c177ec3](https://github.com/rsksmart/rif-marketplace-cache/commit/c177ec3))
* **core:** new verbose log level ([258bcb3](https://github.com/rsksmart/rif-marketplace-cache/commit/258bcb3))
* **rns:** enabling custom precache for initialization ([6ce64b5](https://github.com/rsksmart/rif-marketplace-cache/commit/6ce64b5))
* **rns:** time of events taken from block timestamp ([644a224](https://github.com/rsksmart/rif-marketplace-cache/commit/644a224))
* **storage:** new storage contracts implementation ([a9a903f](https://github.com/rsksmart/rif-marketplace-cache/commit/a9a903f))
* adds query for owned and placed domains ([#68](https://github.com/rsksmart/rif-marketplace-cache/issues/68)) ([0f776aa](https://github.com/rsksmart/rif-marketplace-cache/commit/0f776aa))
* allows searching for unknown rns w/ tokenId ([bffa99f](https://github.com/rsksmart/rif-marketplace-cache/commit/bffa99f))
* change default new-block strategy to polling ([#75](https://github.com/rsksmart/rif-marketplace-cache/issues/75)) ([d6632fe](https://github.com/rsksmart/rif-marketplace-cache/commit/d6632fe))
* cli support ([7d01202](https://github.com/rsksmart/rif-marketplace-cache/commit/7d01202))
* confirmation of event using receipts ([a185350](https://github.com/rsksmart/rif-marketplace-cache/commit/a185350))
* delayed logging initialization ([6b11776](https://github.com/rsksmart/rif-marketplace-cache/commit/6b11776))
* enables searching my name ([#83](https://github.com/rsksmart/rif-marketplace-cache/issues/83)) ([e1117d7](https://github.com/rsksmart/rif-marketplace-cache/commit/e1117d7))
* **cli:** purge parameter for start command ([81919f9](https://github.com/rsksmart/rif-marketplace-cache/commit/81919f9))
* **core/storage:** improved error handling, logging ([68cb6ce](https://github.com/rsksmart/rif-marketplace-cache/commit/68cb6ce))
* **rates:** rates support ([6f6ad1d](https://github.com/rsksmart/rif-marketplace-cache/commit/6f6ad1d))
* **rates:** using interval update trigger instead of request ([ccece67](https://github.com/rsksmart/rif-marketplace-cache/commit/ccece67))
* **rns:** new placement events ([#66](https://github.com/rsksmart/rif-marketplace-cache/issues/66)) ([f3af81f](https://github.com/rsksmart/rif-marketplace-cache/commit/f3af81f))
* **rns:** support for rns ([#47](https://github.com/rsksmart/rif-marketplace-cache/issues/47)) ([208c1cf](https://github.com/rsksmart/rif-marketplace-cache/commit/208c1cf))
* **storage:** tracking requests and available capacity of offer ([fd4ad44](https://github.com/rsksmart/rif-marketplace-cache/commit/fd4ad44))
* basic blockchain watcher ([b0e1a9f](https://github.com/rsksmart/rif-marketplace-cache/commit/b0e1a9f))
* configurable starting block ([85ab074](https://github.com/rsksmart/rif-marketplace-cache/commit/85ab074))
* configuration for clearing persitant conf ([4b13f86](https://github.com/rsksmart/rif-marketplace-cache/commit/4b13f86))
* drop feather-configuration ([74de84f](https://github.com/rsksmart/rif-marketplace-cache/commit/74de84f))
* events confirmation ([83e3cca](https://github.com/rsksmart/rif-marketplace-cache/commit/83e3cca))
* filter out non-active offers ([d4089ec](https://github.com/rsksmart/rif-marketplace-cache/commit/d4089ec))
* improved conf store ([a74baa9](https://github.com/rsksmart/rif-marketplace-cache/commit/a74baa9))
* improved emitter error handling ([64ac2ee](https://github.com/rsksmart/rif-marketplace-cache/commit/64ac2ee))
* init ([85a3371](https://github.com/rsksmart/rif-marketplace-cache/commit/85a3371))
* nice logging setup ([eb7e6de](https://github.com/rsksmart/rif-marketplace-cache/commit/eb7e6de))
* process past events upon first run ([f193e71](https://github.com/rsksmart/rif-marketplace-cache/commit/f193e71))
* re-emitted events handling ([3a8bdff](https://github.com/rsksmart/rif-marketplace-cache/commit/3a8bdff))
* semaphore support ([4dbfbd0](https://github.com/rsksmart/rif-marketplace-cache/commit/4dbfbd0))
* sequelize integration ([a52e341](https://github.com/rsksmart/rif-marketplace-cache/commit/a52e341))
* storage-offer model ([e974046](https://github.com/rsksmart/rif-marketplace-cache/commit/e974046))


### Reverts

* chore: drope socketio ([72e3827](https://github.com/rsksmart/rif-marketplace-cache/commit/72e3827))
* drop channels ([c74c448](https://github.com/rsksmart/rif-marketplace-cache/commit/c74c448))



<a name="0.1.0-dev.2"></a>
# 0.1.0-dev.2 (2020-05-12)


### Bug Fixes

* releasing default config to npm ([f6c993e](https://github.com/rsksmart/rif-marketplace-cache/commit/f6c993e))
* small tweaks ([9776429](https://github.com/rsksmart/rif-marketplace-cache/commit/9776429))
* **cli:** bundled configs should be loaded by default ([bb96583](https://github.com/rsksmart/rif-marketplace-cache/commit/bb96583))
* **cli:** force and db flags are used ([8b6fd05](https://github.com/rsksmart/rif-marketplace-cache/commit/8b6fd05))
* **cli:** oclif release command path modification ([31d6283](https://github.com/rsksmart/rif-marketplace-cache/commit/31d6283))
* **cli:** purge on start before app is created ([b99d137](https://github.com/rsksmart/rif-marketplace-cache/commit/b99d137))
* **core:** loading both js and ts models ([d737f4f](https://github.com/rsksmart/rif-marketplace-cache/commit/d737f4f))
* **docker:** changing commands path in docker ([2c2b4a7](https://github.com/rsksmart/rif-marketplace-cache/commit/2c2b4a7))
* cancel previous placements on TokenPlaced ([#72](https://github.com/rsksmart/rif-marketplace-cache/issues/72)) ([8569cd5](https://github.com/rsksmart/rif-marketplace-cache/commit/8569cd5))
* dockerfile fixes ([#84](https://github.com/rsksmart/rif-marketplace-cache/issues/84)) ([ae1d05d](https://github.com/rsksmart/rif-marketplace-cache/commit/ae1d05d))
* **core:** use confirmation mechanism only when configured ([fe34771](https://github.com/rsksmart/rif-marketplace-cache/commit/fe34771))
* **deps:** nfts commit hash ([#64](https://github.com/rsksmart/rif-marketplace-cache/issues/64)) ([35da19d](https://github.com/rsksmart/rif-marketplace-cache/commit/35da19d))
* **storage:** use custom precache strategy for initialization ([2c1ae54](https://github.com/rsksmart/rif-marketplace-cache/commit/2c1ae54))
* correct definition of active offer ([06f5005](https://github.com/rsksmart/rif-marketplace-cache/commit/06f5005))


### Features

* adds query for owned and placed domains ([#68](https://github.com/rsksmart/rif-marketplace-cache/issues/68)) ([0f776aa](https://github.com/rsksmart/rif-marketplace-cache/commit/0f776aa))
* change default new-block strategy to polling ([#75](https://github.com/rsksmart/rif-marketplace-cache/issues/75)) ([d6632fe](https://github.com/rsksmart/rif-marketplace-cache/commit/d6632fe))
* enables searching my name ([#83](https://github.com/rsksmart/rif-marketplace-cache/issues/83)) ([e1117d7](https://github.com/rsksmart/rif-marketplace-cache/commit/e1117d7))
* **cli:** purge parameter for start command ([81919f9](https://github.com/rsksmart/rif-marketplace-cache/commit/81919f9))
* **core/storage:** improved error handling, logging ([68cb6ce](https://github.com/rsksmart/rif-marketplace-cache/commit/68cb6ce))
* **rates:** rates support ([6f6ad1d](https://github.com/rsksmart/rif-marketplace-cache/commit/6f6ad1d))
* **rates:** using interval update trigger instead of request ([ccece67](https://github.com/rsksmart/rif-marketplace-cache/commit/ccece67))
* **rns:** new placement events ([#66](https://github.com/rsksmart/rif-marketplace-cache/issues/66)) ([f3af81f](https://github.com/rsksmart/rif-marketplace-cache/commit/f3af81f))
* **rns:** support for rns ([#47](https://github.com/rsksmart/rif-marketplace-cache/issues/47)) ([208c1cf](https://github.com/rsksmart/rif-marketplace-cache/commit/208c1cf))
* **storage:** tracking requests and available capacity of offer ([fd4ad44](https://github.com/rsksmart/rif-marketplace-cache/commit/fd4ad44))
* basic blockchain watcher ([b0e1a9f](https://github.com/rsksmart/rif-marketplace-cache/commit/b0e1a9f))
* cli support ([7d01202](https://github.com/rsksmart/rif-marketplace-cache/commit/7d01202))
* configurable starting block ([85ab074](https://github.com/rsksmart/rif-marketplace-cache/commit/85ab074))
* configuration for clearing persitant conf ([4b13f86](https://github.com/rsksmart/rif-marketplace-cache/commit/4b13f86))
* confirmation of event using receipts ([a185350](https://github.com/rsksmart/rif-marketplace-cache/commit/a185350))
* delayed logging initialization ([6b11776](https://github.com/rsksmart/rif-marketplace-cache/commit/6b11776))
* drop feather-configuration ([74de84f](https://github.com/rsksmart/rif-marketplace-cache/commit/74de84f))
* events confirmation ([83e3cca](https://github.com/rsksmart/rif-marketplace-cache/commit/83e3cca))
* filter out non-active offers ([d4089ec](https://github.com/rsksmart/rif-marketplace-cache/commit/d4089ec))
* improved conf store ([a74baa9](https://github.com/rsksmart/rif-marketplace-cache/commit/a74baa9))
* improved emitter error handling ([64ac2ee](https://github.com/rsksmart/rif-marketplace-cache/commit/64ac2ee))
* init ([85a3371](https://github.com/rsksmart/rif-marketplace-cache/commit/85a3371))
* nice logging setup ([eb7e6de](https://github.com/rsksmart/rif-marketplace-cache/commit/eb7e6de))
* process past events upon first run ([f193e71](https://github.com/rsksmart/rif-marketplace-cache/commit/f193e71))
* re-emitted events handling ([3a8bdff](https://github.com/rsksmart/rif-marketplace-cache/commit/3a8bdff))
* semaphore support ([4dbfbd0](https://github.com/rsksmart/rif-marketplace-cache/commit/4dbfbd0))
* sequelize integration ([a52e341](https://github.com/rsksmart/rif-marketplace-cache/commit/a52e341))
* storage-offer model ([e974046](https://github.com/rsksmart/rif-marketplace-cache/commit/e974046))


### Reverts

* chore: drope socketio ([72e3827](https://github.com/rsksmart/rif-marketplace-cache/commit/72e3827))
* drop channels ([c74c448](https://github.com/rsksmart/rif-marketplace-cache/commit/c74c448))



<a name="0.1.0-dev.1"></a>
# 0.1.0-dev.1 (2020-05-07)


### Bug Fixes

* correct oclif config ([c573eb9](https://github.com/rsksmart/rif-marketplace-cache/commit/c573eb9))
* specifing all datatypes for colums ([9a398e4](https://github.com/rsksmart/rif-marketplace-cache/commit/9a398e4))
* **cli:** force and db flags are used ([8b6fd05](https://github.com/rsksmart/rif-marketplace-cache/commit/8b6fd05))
* **cli:** purge on start before app is created ([b99d137](https://github.com/rsksmart/rif-marketplace-cache/commit/b99d137))
* **core:** use confirmation mechanism only when configured ([fe34771](https://github.com/rsksmart/rif-marketplace-cache/commit/fe34771))
* **deps:** nfts commit hash ([#64](https://github.com/rsksmart/rif-marketplace-cache/issues/64)) ([35da19d](https://github.com/rsksmart/rif-marketplace-cache/commit/35da19d))
* **storage:** use custom precache strategy for initialization ([2c1ae54](https://github.com/rsksmart/rif-marketplace-cache/commit/2c1ae54))
* correct definition of active offer ([06f5005](https://github.com/rsksmart/rif-marketplace-cache/commit/06f5005))


### Features

* adds query for owned and placed domains ([#68](https://github.com/rsksmart/rif-marketplace-cache/issues/68)) ([0f776aa](https://github.com/rsksmart/rif-marketplace-cache/commit/0f776aa))
* **cli:** purge parameter for start command ([81919f9](https://github.com/rsksmart/rif-marketplace-cache/commit/81919f9))
* **core/storage:** improved error handling, logging ([68cb6ce](https://github.com/rsksmart/rif-marketplace-cache/commit/68cb6ce))
* **rates:** rates support ([6f6ad1d](https://github.com/rsksmart/rif-marketplace-cache/commit/6f6ad1d))
* **rates:** using interval update trigger instead of request ([ccece67](https://github.com/rsksmart/rif-marketplace-cache/commit/ccece67))
* **rns:** new placement events ([#66](https://github.com/rsksmart/rif-marketplace-cache/issues/66)) ([f3af81f](https://github.com/rsksmart/rif-marketplace-cache/commit/f3af81f))
* **rns:** support for rns ([#47](https://github.com/rsksmart/rif-marketplace-cache/issues/47)) ([208c1cf](https://github.com/rsksmart/rif-marketplace-cache/commit/208c1cf))
* **storage:** tracking requests and available capacity of offer ([fd4ad44](https://github.com/rsksmart/rif-marketplace-cache/commit/fd4ad44))
* basic blockchain watcher ([b0e1a9f](https://github.com/rsksmart/rif-marketplace-cache/commit/b0e1a9f))
* cli support ([7d01202](https://github.com/rsksmart/rif-marketplace-cache/commit/7d01202))
* configurable starting block ([85ab074](https://github.com/rsksmart/rif-marketplace-cache/commit/85ab074))
* configuration for clearing persitant conf ([4b13f86](https://github.com/rsksmart/rif-marketplace-cache/commit/4b13f86))
* confirmation of event using receipts ([a185350](https://github.com/rsksmart/rif-marketplace-cache/commit/a185350))
* delayed logging initialization ([6b11776](https://github.com/rsksmart/rif-marketplace-cache/commit/6b11776))
* drop feather-configuration ([74de84f](https://github.com/rsksmart/rif-marketplace-cache/commit/74de84f))
* events confirmation ([83e3cca](https://github.com/rsksmart/rif-marketplace-cache/commit/83e3cca))
* filter out non-active offers ([d4089ec](https://github.com/rsksmart/rif-marketplace-cache/commit/d4089ec))
* improved conf store ([a74baa9](https://github.com/rsksmart/rif-marketplace-cache/commit/a74baa9))
* improved emitter error handling ([64ac2ee](https://github.com/rsksmart/rif-marketplace-cache/commit/64ac2ee))
* init ([85a3371](https://github.com/rsksmart/rif-marketplace-cache/commit/85a3371))
* nice logging setup ([eb7e6de](https://github.com/rsksmart/rif-marketplace-cache/commit/eb7e6de))
* process past events upon first run ([f193e71](https://github.com/rsksmart/rif-marketplace-cache/commit/f193e71))
* re-emitted events handling ([3a8bdff](https://github.com/rsksmart/rif-marketplace-cache/commit/3a8bdff))
* semaphore support ([4dbfbd0](https://github.com/rsksmart/rif-marketplace-cache/commit/4dbfbd0))
* sequelize integration ([a52e341](https://github.com/rsksmart/rif-marketplace-cache/commit/a52e341))
* storage-offer model ([e974046](https://github.com/rsksmart/rif-marketplace-cache/commit/e974046))


### Reverts

* chore: drope socketio ([72e3827](https://github.com/rsksmart/rif-marketplace-cache/commit/72e3827))
* drop channels ([c74c448](https://github.com/rsksmart/rif-marketplace-cache/commit/c74c448))



<a name="0.1.0-dev.0"></a>
# 0.1.0-dev.0 (2020-05-07)


### Bug Fixes

* **cli:** force and db flags are used ([8b6fd05](https://github.com/rsksmart/rif-marketplace-cache/commit/8b6fd05))
* **cli:** purge on start before app is created ([b99d137](https://github.com/rsksmart/rif-marketplace-cache/commit/b99d137))
* **core:** use confirmation mechanism only when configured ([fe34771](https://github.com/rsksmart/rif-marketplace-cache/commit/fe34771))
* **deps:** nfts commit hash ([#64](https://github.com/rsksmart/rif-marketplace-cache/issues/64)) ([35da19d](https://github.com/rsksmart/rif-marketplace-cache/commit/35da19d))
* **storage:** use custom precache strategy for initialization ([2c1ae54](https://github.com/rsksmart/rif-marketplace-cache/commit/2c1ae54))
* correct definition of active offer ([06f5005](https://github.com/rsksmart/rif-marketplace-cache/commit/06f5005))


### Features

* **cli:** purge parameter for start command ([81919f9](https://github.com/rsksmart/rif-marketplace-cache/commit/81919f9))
* **core/storage:** improved error handling, logging ([68cb6ce](https://github.com/rsksmart/rif-marketplace-cache/commit/68cb6ce))
* **rates:** rates support ([6f6ad1d](https://github.com/rsksmart/rif-marketplace-cache/commit/6f6ad1d))
* **rates:** using interval update trigger instead of request ([ccece67](https://github.com/rsksmart/rif-marketplace-cache/commit/ccece67))
* **rns:** new placement events ([#66](https://github.com/rsksmart/rif-marketplace-cache/issues/66)) ([f3af81f](https://github.com/rsksmart/rif-marketplace-cache/commit/f3af81f))
* **rns:** support for rns ([#47](https://github.com/rsksmart/rif-marketplace-cache/issues/47)) ([208c1cf](https://github.com/rsksmart/rif-marketplace-cache/commit/208c1cf))
* **storage:** tracking requests and available capacity of offer ([fd4ad44](https://github.com/rsksmart/rif-marketplace-cache/commit/fd4ad44))
* basic blockchain watcher ([b0e1a9f](https://github.com/rsksmart/rif-marketplace-cache/commit/b0e1a9f))
* cli support ([7d01202](https://github.com/rsksmart/rif-marketplace-cache/commit/7d01202))
* configurable starting block ([85ab074](https://github.com/rsksmart/rif-marketplace-cache/commit/85ab074))
* configuration for clearing persitant conf ([4b13f86](https://github.com/rsksmart/rif-marketplace-cache/commit/4b13f86))
* confirmation of event using receipts ([a185350](https://github.com/rsksmart/rif-marketplace-cache/commit/a185350))
* delayed logging initialization ([6b11776](https://github.com/rsksmart/rif-marketplace-cache/commit/6b11776))
* drop feather-configuration ([74de84f](https://github.com/rsksmart/rif-marketplace-cache/commit/74de84f))
* events confirmation ([83e3cca](https://github.com/rsksmart/rif-marketplace-cache/commit/83e3cca))
* filter out non-active offers ([d4089ec](https://github.com/rsksmart/rif-marketplace-cache/commit/d4089ec))
* improved conf store ([a74baa9](https://github.com/rsksmart/rif-marketplace-cache/commit/a74baa9))
* improved emitter error handling ([64ac2ee](https://github.com/rsksmart/rif-marketplace-cache/commit/64ac2ee))
* init ([85a3371](https://github.com/rsksmart/rif-marketplace-cache/commit/85a3371))
* nice logging setup ([eb7e6de](https://github.com/rsksmart/rif-marketplace-cache/commit/eb7e6de))
* process past events upon first run ([f193e71](https://github.com/rsksmart/rif-marketplace-cache/commit/f193e71))
* re-emitted events handling ([3a8bdff](https://github.com/rsksmart/rif-marketplace-cache/commit/3a8bdff))
* semaphore support ([4dbfbd0](https://github.com/rsksmart/rif-marketplace-cache/commit/4dbfbd0))
* sequelize integration ([a52e341](https://github.com/rsksmart/rif-marketplace-cache/commit/a52e341))
* storage-offer model ([e974046](https://github.com/rsksmart/rif-marketplace-cache/commit/e974046))


### Reverts

* chore: drope socketio ([72e3827](https://github.com/rsksmart/rif-marketplace-cache/commit/72e3827))
* drop channels ([c74c448](https://github.com/rsksmart/rif-marketplace-cache/commit/c74c448))



