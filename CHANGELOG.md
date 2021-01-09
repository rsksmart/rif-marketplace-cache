<a name="1.2.1"></a>
## [1.2.1](https://github.com/rsksmart/rif-marketplace-cache/compare/v1.2.0...v1.2.1) (2020-12-21)


### Features

* rns grouping ([#460](https://github.com/rsksmart/rif-marketplace-cache/issues/460)) ([330a924](https://github.com/rsksmart/rif-marketplace-cache/commit/330a924))



<a name="1.2.0"></a>
# [1.2.0](https://github.com/rsksmart/rif-marketplace-cache/compare/v1.1.0...v1.2.0) (2020-12-18)


### Features

* datadir support ([#463](https://github.com/rsksmart/rif-marketplace-cache/issues/463)) ([df30718](https://github.com/rsksmart/rif-marketplace-cache/commit/df30718))



<a name="1.1.0"></a>
# [1.1.0](https://github.com/rsksmart/rif-marketplace-cache/compare/v1.1.0-dev.3...v1.1.0) (2020-12-14)


### Bug Fixes

* handle libp2p messages which comes before agreement event ([#423](https://github.com/rsksmart/rif-marketplace-cache/issues/423)) ([bd09f4c](https://github.com/rsksmart/rif-marketplace-cache/commit/bd09f4c))
* lower case migration ([#451](https://github.com/rsksmart/rif-marketplace-cache/issues/451)) ([d8c1d89](https://github.com/rsksmart/rif-marketplace-cache/commit/d8c1d89))


### Features

* **core:** rates as core service ([#444](https://github.com/rsksmart/rif-marketplace-cache/issues/444)) ([6ee1bb1](https://github.com/rsksmart/rif-marketplace-cache/commit/6ee1bb1))
* add migration for lower-casing addresses in storage ([#448](https://github.com/rsksmart/rif-marketplace-cache/issues/448)) ([a4b9591](https://github.com/rsksmart/rif-marketplace-cache/commit/a4b9591))
* draft for event parser ([#429](https://github.com/rsksmart/rif-marketplace-cache/issues/429)) ([8a29cfb](https://github.com/rsksmart/rif-marketplace-cache/commit/8a29cfb))
* lower case all addresses query params ([#449](https://github.com/rsksmart/rif-marketplace-cache/issues/449)) ([a9819f4](https://github.com/rsksmart/rif-marketplace-cache/commit/a9819f4))



<a name="1.1.0-dev.3"></a>
# [1.1.0-dev.3](https://github.com/rsksmart/rif-marketplace-cache/compare/v1.1.0-dev.2...v1.1.0-dev.3) (2020-11-27)


### Bug Fixes

* **core:** logs colors handling ([#418](https://github.com/rsksmart/rif-marketplace-cache/issues/418)) ([a62b323](https://github.com/rsksmart/rif-marketplace-cache/commit/a62b323))
* **storage:** groups by provider to get min max available capacity ([#421](https://github.com/rsksmart/rif-marketplace-cache/issues/421)) ([d4694e5](https://github.com/rsksmart/rif-marketplace-cache/commit/d4694e5))
* make contract address lower case in room topic ([#408](https://github.com/rsksmart/rif-marketplace-cache/issues/408)) ([3c23304](https://github.com/rsksmart/rif-marketplace-cache/commit/3c23304))


### Features

* **storage:** adds ability to filter by availableCapacity ([#414](https://github.com/rsksmart/rif-marketplace-cache/issues/414)) ([f7cc7ad](https://github.com/rsksmart/rif-marketplace-cache/commit/f7cc7ad))
* add agreement exceed limit notification to provider ([#407](https://github.com/rsksmart/rif-marketplace-cache/issues/407)) ([3d092b7](https://github.com/rsksmart/rif-marketplace-cache/commit/3d092b7))



<a name="1.1.0-dev.2"></a>
# [1.1.0-dev.2](https://github.com/rsksmart/rif-marketplace-cache/compare/v1.1.0-dev.1...v1.1.0-dev.2) (2020-11-18)


### Features

* add check for eth provider availability ([#402](https://github.com/rsksmart/rif-marketplace-cache/issues/402)) ([6f8f16f](https://github.com/rsksmart/rif-marketplace-cache/commit/6f8f16f))
* adjust room topic computation ([#378](https://github.com/rsksmart/rif-marketplace-cache/issues/378)) ([ea1f134](https://github.com/rsksmart/rif-marketplace-cache/commit/ea1f134))



<a name="1.1.0-dev.1"></a>
# [1.1.0-dev.1](https://github.com/rsksmart/rif-marketplace-cache/compare/v1.1.0-dev.0...v1.1.0-dev.1) (2020-11-16)


### Bug Fixes

* gather also js migrations ([d2fafde](https://github.com/rsksmart/rif-marketplace-cache/commit/d2fafde))



<a name="1.1.0-dev.0"></a>
# [1.1.0-dev.0](https://github.com/rsksmart/rif-marketplace-cache/compare/v1.0.0...v1.1.0-dev.0) (2020-11-16)


### Bug Fixes

* **dev:** re-adds the watch arg to bin script ([#381](https://github.com/rsksmart/rif-marketplace-cache/issues/381)) ([c8704b4](https://github.com/rsksmart/rif-marketplace-cache/commit/c8704b4))
* **storage:** makes periodsSinceLastPayout 0 if not positive ([#384](https://github.com/rsksmart/rif-marketplace-cache/issues/384)) ([c98ea78](https://github.com/rsksmart/rif-marketplace-cache/commit/c98ea78))
* add missing await ([#379](https://github.com/rsksmart/rif-marketplace-cache/issues/379)) ([baf5981](https://github.com/rsksmart/rif-marketplace-cache/commit/baf5981))
* agreement expires-in calculation ([#332](https://github.com/rsksmart/rif-marketplace-cache/issues/332)) ([1b123df](https://github.com/rsksmart/rif-marketplace-cache/commit/1b123df))
* authentication typings ([2bec0ad](https://github.com/rsksmart/rif-marketplace-cache/commit/2bec0ad))
* avg billing plan hook ([#328](https://github.com/rsksmart/rif-marketplace-cache/issues/328)) ([bc48a46](https://github.com/rsksmart/rif-marketplace-cache/commit/bc48a46))
* avg billing price min-max calculation ([9d294f7](https://github.com/rsksmart/rif-marketplace-cache/commit/9d294f7))
* casts totalCapacity in offers ([b1b4c32](https://github.com/rsksmart/rif-marketplace-cache/commit/b1b4c32))
* escapes sequelize literal query params ([7bec56b](https://github.com/rsksmart/rif-marketplace-cache/commit/7bec56b))
* fix topics ([#258](https://github.com/rsksmart/rif-marketplace-cache/issues/258)) ([76ae051](https://github.com/rsksmart/rif-marketplace-cache/commit/76ae051))
* fixes plan price ([b882870](https://github.com/rsksmart/rif-marketplace-cache/commit/b882870))
* ganache storage contract addr ([9bbc8c7](https://github.com/rsksmart/rif-marketplace-cache/commit/9bbc8c7))
* make total-capacity(offer) and size(agreement) number type ([#367](https://github.com/rsksmart/rif-marketplace-cache/issues/367)) ([8b8d0dc](https://github.com/rsksmart/rif-marketplace-cache/commit/8b8d0dc))
* makes the avg price into GB ([15c9e09](https://github.com/rsksmart/rif-marketplace-cache/commit/15c9e09))
* precache command ([#347](https://github.com/rsksmart/rif-marketplace-cache/issues/347)) ([7b453d5](https://github.com/rsksmart/rif-marketplace-cache/commit/7b453d5))
* prevents error when no plans ([8b8919e](https://github.com/rsksmart/rif-marketplace-cache/commit/8b8919e))
* remove usage of test util in src ([#295](https://github.com/rsksmart/rif-marketplace-cache/issues/295)) ([f1b5e0b](https://github.com/rsksmart/rif-marketplace-cache/commit/f1b5e0b))
* return total staked fiat as 0.00 for empty account ([#345](https://github.com/rsksmart/rif-marketplace-cache/issues/345)) ([fc0d6a9](https://github.com/rsksmart/rif-marketplace-cache/commit/fc0d6a9))
* separates filters ([a35b8ee](https://github.com/rsksmart/rif-marketplace-cache/commit/a35b8ee))
* temporarily disables peerId check in scopes ([366ec3f](https://github.com/rsksmart/rif-marketplace-cache/commit/366ec3f))
* TotalCapacitySet topic sig typo ([#285](https://github.com/rsksmart/rif-marketplace-cache/issues/285)) ([c37ea81](https://github.com/rsksmart/rif-marketplace-cache/commit/c37ea81))
* wCumAvg null value safety ([42ea215](https://github.com/rsksmart/rif-marketplace-cache/commit/42ea215))
* **storage:** hasSufficientFunds check funds for at least one period ([8d245c6](https://github.com/rsksmart/rif-marketplace-cache/commit/8d245c6))


### Features

* add general error message handler for comms ([#395](https://github.com/rsksmart/rif-marketplace-cache/issues/395)) ([a994929](https://github.com/rsksmart/rif-marketplace-cache/commit/a994929))
* **storage:** moves average price of offers to monthly basis ([#389](https://github.com/rsksmart/rif-marketplace-cache/issues/389)) ([ee15b43](https://github.com/rsksmart/rif-marketplace-cache/commit/ee15b43))
* add handling of avg billing price for no offer ([#383](https://github.com/rsksmart/rif-marketplace-cache/issues/383)) ([cab7174](https://github.com/rsksmart/rif-marketplace-cache/commit/cab7174))
* add multi currency support ([#303](https://github.com/rsksmart/rif-marketplace-cache/issues/303)) ([4223106](https://github.com/rsksmart/rif-marketplace-cache/commit/4223106))
* add staking address ([#316](https://github.com/rsksmart/rif-marketplace-cache/issues/316)) ([869ba4a](https://github.com/rsksmart/rif-marketplace-cache/commit/869ba4a))
* add storage config info for ganache ([#229](https://github.com/rsksmart/rif-marketplace-cache/issues/229)) ([69e01a1](https://github.com/rsksmart/rif-marketplace-cache/commit/69e01a1))
* adds find hook ([7b71db5](https://github.com/rsksmart/rif-marketplace-cache/commit/7b71db5))
* adds provider name search ([9b35ca9](https://github.com/rsksmart/rif-marketplace-cache/commit/9b35ca9))
* adjust stake get endpoint ([#343](https://github.com/rsksmart/rif-marketplace-cache/issues/343)) ([27e0efc](https://github.com/rsksmart/rif-marketplace-cache/commit/27e0efc))
* apply storage contract changes ([#256](https://github.com/rsksmart/rif-marketplace-cache/issues/256)) ([6a25dde](https://github.com/rsksmart/rif-marketplace-cache/commit/6a25dde))
* awaiting for store to save all data ([4cefd59](https://github.com/rsksmart/rif-marketplace-cache/commit/4cefd59))
* bignumber support ([#254](https://github.com/rsksmart/rif-marketplace-cache/issues/254)) ([820d695](https://github.com/rsksmart/rif-marketplace-cache/commit/820d695))
* calculates cummulative weighed average on BillingPlanSet event ([ef1f13c](https://github.com/rsksmart/rif-marketplace-cache/commit/ef1f13c))
* comms integration ([#329](https://github.com/rsksmart/rif-marketplace-cache/issues/329)) ([3862419](https://github.com/rsksmart/rif-marketplace-cache/commit/3862419))
* db migrations ([#269](https://github.com/rsksmart/rif-marketplace-cache/issues/269)) ([3bef0a6](https://github.com/rsksmart/rif-marketplace-cache/commit/3bef0a6))
* new storage contract ([#348](https://github.com/rsksmart/rif-marketplace-cache/issues/348)) ([66ee88c](https://github.com/rsksmart/rif-marketplace-cache/commit/66ee88c))
* **agreement:** add expiredIn virtual field to agreement model ([#331](https://github.com/rsksmart/rif-marketplace-cache/issues/331)) ([d98416c](https://github.com/rsksmart/rif-marketplace-cache/commit/d98416c))
* **rns:** integrate RNS from mainnet release ([#342](https://github.com/rsksmart/rif-marketplace-cache/issues/342)) ([50c23c0](https://github.com/rsksmart/rif-marketplace-cache/commit/50c23c0)), closes [#320](https://github.com/rsksmart/rif-marketplace-cache/issues/320)
* **staking:** add total-staked-usd to stake update event ([#340](https://github.com/rsksmart/rif-marketplace-cache/issues/340)) ([f035130](https://github.com/rsksmart/rif-marketplace-cache/commit/f035130))
* expose new-block event ([#221](https://github.com/rsksmart/rif-marketplace-cache/issues/221)) ([c7b73db](https://github.com/rsksmart/rif-marketplace-cache/commit/c7b73db))
* handle Billing plans remove ([#327](https://github.com/rsksmart/rif-marketplace-cache/issues/327)) ([eb8c52e](https://github.com/rsksmart/rif-marketplace-cache/commit/eb8c52e))
* integration tests ([#315](https://github.com/rsksmart/rif-marketplace-cache/issues/315)) ([66cff4f](https://github.com/rsksmart/rif-marketplace-cache/commit/66cff4f))
* **storage:** staking support ([#286](https://github.com/rsksmart/rif-marketplace-cache/issues/286)) ([7be56f7](https://github.com/rsksmart/rif-marketplace-cache/commit/7be56f7))
* reorgs outside of confirmations range handling ([#273](https://github.com/rsksmart/rif-marketplace-cache/issues/273)) ([4d48f80](https://github.com/rsksmart/rif-marketplace-cache/commit/4d48f80))
* sorts plans + removes rounding of planPrice ([1764a70](https://github.com/rsksmart/rif-marketplace-cache/commit/1764a70))
* swappes weighted avg for re-calculation ([9fb7c30](https://github.com/rsksmart/rif-marketplace-cache/commit/9fb7c30))
* **core:** support listening on topics ([eae87e2](https://github.com/rsksmart/rif-marketplace-cache/commit/eae87e2))



<a name="1.0.0"></a>
# [1.0.0](https://github.com/rsksmart/rif-marketplace-cache/compare/v1.0.0-rc.0...v1.0.0) (2020-09-15)


### Features

* batch support for domain registration ([#293](https://github.com/rsksmart/rif-marketplace-cache/issues/293)) ([971fb7e](https://github.com/rsksmart/rif-marketplace-cache/commit/971fb7e))
* mainnet config file ([#287](https://github.com/rsksmart/rif-marketplace-cache/issues/287)) ([1f38445](https://github.com/rsksmart/rif-marketplace-cache/commit/1f38445))



<a name="1.0.0-rc.0"></a>
# [1.0.0-rc.0](https://github.com/rsksmart/rif-marketplace-cache/compare/v0.3.0...v1.0.0-rc.0) (2020-08-25)


### Bug Fixes

* update npm dependencies ([#270](https://github.com/rsksmart/rif-marketplace-cache/issues/270)) ([200f6cc](https://github.com/rsksmart/rif-marketplace-cache/commit/200f6cc))


### Features

* rns contract testnet ([#281](https://github.com/rsksmart/rif-marketplace-cache/issues/281)) ([261441c](https://github.com/rsksmart/rif-marketplace-cache/commit/261441c))



<a name="0.3.0"></a>
# 0.3.0 (2020-07-28)


### Bug Fixes

* add confirmations for rns contracts ([708c912](https://github.com/rsksmart/rif-marketplace-cache/commit/708c912))
* authentication typings ([19d84f6](https://github.com/rsksmart/rif-marketplace-cache/commit/19d84f6))
* **blockchain:** one reorg does not reprocess last processed block ([b557b63](https://github.com/rsksmart/rif-marketplace-cache/commit/b557b63))
* **StorageModel:** handle offer with agreements for `utilizedCapacity` virtual field ([0d9eb41](https://github.com/rsksmart/rif-marketplace-cache/commit/0d9eb41))
*  filters in bought domains ([1d39d0e](https://github.com/rsksmart/rif-marketplace-cache/commit/1d39d0e))
* [@rsksmart](https://github.com/rsksmart)/rns-auction-registrar dep-check ([fb10021](https://github.com/rsksmart/rif-marketplace-cache/commit/fb10021))
* add starting blocks for contracts in Testnet ([3bac7bf](https://github.com/rsksmart/rif-marketplace-cache/commit/3bac7bf))
* add try catch when name cannot be parsed ([422a3da](https://github.com/rsksmart/rif-marketplace-cache/commit/422a3da))
* added abi-decoder type definitions ([5532ac4](https://github.com/rsksmart/rif-marketplace-cache/commit/5532ac4))
* adds pre/suf-fix % to name search ([c6c2937](https://github.com/rsksmart/rif-marketplace-cache/commit/c6c2937))
* avoids db collisions for domains ([e64e8b1](https://github.com/rsksmart/rif-marketplace-cache/commit/e64e8b1))
* cancel previous placements on TokenPlaced ([#72](https://github.com/rsksmart/rif-marketplace-cache/issues/72)) ([8569cd5](https://github.com/rsksmart/rif-marketplace-cache/commit/8569cd5))
* change default log level to warn ([dc88d5d](https://github.com/rsksmart/rif-marketplace-cache/commit/dc88d5d))
* correct definition of active offer ([06f5005](https://github.com/rsksmart/rif-marketplace-cache/commit/06f5005))
* correct event name ([#172](https://github.com/rsksmart/rif-marketplace-cache/issues/172)) ([29b4d54](https://github.com/rsksmart/rif-marketplace-cache/commit/29b4d54))
* creates more explicit domains query ([2aa7e1e](https://github.com/rsksmart/rif-marketplace-cache/commit/2aa7e1e))
* dockerfile fixes ([#84](https://github.com/rsksmart/rif-marketplace-cache/issues/84)) ([ae1d05d](https://github.com/rsksmart/rif-marketplace-cache/commit/ae1d05d))
* error handling ([486328b](https://github.com/rsksmart/rif-marketplace-cache/commit/486328b))
* include tokenID as part of PK for Transfers ([9dbba38](https://github.com/rsksmart/rif-marketplace-cache/commit/9dbba38))
* oclif-dev manifest generation on publish ([3196a11](https://github.com/rsksmart/rif-marketplace-cache/commit/3196a11))
* **blockchain:** polling right block numbers ([#88](https://github.com/rsksmart/rif-marketplace-cache/issues/88)) ([c213899](https://github.com/rsksmart/rif-marketplace-cache/commit/c213899))
* **core:** confirmations are handled for multiple blocks ([ad550da](https://github.com/rsksmart/rif-marketplace-cache/commit/ad550da))
* ganache contract addresses ([b46d08e](https://github.com/rsksmart/rif-marketplace-cache/commit/b46d08e))
* makes domain name sha3 to hex w/o lead 0s ([#96](https://github.com/rsksmart/rif-marketplace-cache/issues/96)) ([cd5aa77](https://github.com/rsksmart/rif-marketplace-cache/commit/cd5aa77))
* new marketplace contract address ([b9afe1f](https://github.com/rsksmart/rif-marketplace-cache/commit/b9afe1f))
* new Transfer entity to avoid SoldDomain synchronization problems ([31601cc](https://github.com/rsksmart/rif-marketplace-cache/commit/31601cc)), closes [#91](https://github.com/rsksmart/rif-marketplace-cache/issues/91)
* precache upadates  exp date before domain now ([7a4d641](https://github.com/rsksmart/rif-marketplace-cache/commit/7a4d641))
* releasing env-mapping config to npm ([a993f34](https://github.com/rsksmart/rif-marketplace-cache/commit/a993f34))
* ws emits to be emitted for confirmation service ([cb8b852](https://github.com/rsksmart/rif-marketplace-cache/commit/cb8b852))
* **blockchain:** correct event transaction column size ([d0ba3bc](https://github.com/rsksmart/rif-marketplace-cache/commit/d0ba3bc))
* **blockchain:** emit invalid confirmations events ([e798174](https://github.com/rsksmart/rif-marketplace-cache/commit/e798174))
* **blockchain:** emitter confirm only its specified events ([194a8d4](https://github.com/rsksmart/rif-marketplace-cache/commit/194a8d4))
* **cli:** bundled configs should be loaded by default ([bb96583](https://github.com/rsksmart/rif-marketplace-cache/commit/bb96583))
* **cli:** oclif release command path modification ([31d6283](https://github.com/rsksmart/rif-marketplace-cache/commit/31d6283))
* **cli:** run only enabled services for precache when using all ([41c9fe0](https://github.com/rsksmart/rif-marketplace-cache/commit/41c9fe0))
* **core:** logging errors does not modify the object anymore ([a06d1fd](https://github.com/rsksmart/rif-marketplace-cache/commit/a06d1fd))
* adapts domains query to remove duplications ([91e6ffe](https://github.com/rsksmart/rif-marketplace-cache/commit/91e6ffe))
* allows searching own/placed domains by name ([#92](https://github.com/rsksmart/rif-marketplace-cache/issues/92)) ([e122a4a](https://github.com/rsksmart/rif-marketplace-cache/commit/e122a4a))
* normalized timestamp on old expirationchanged events ([#94](https://github.com/rsksmart/rif-marketplace-cache/issues/94)) ([843e8c6](https://github.com/rsksmart/rif-marketplace-cache/commit/843e8c6))
* purging also events in database ([0c20a10](https://github.com/rsksmart/rif-marketplace-cache/commit/0c20a10))
* releasing default config to npm ([f6c993e](https://github.com/rsksmart/rif-marketplace-cache/commit/f6c993e))
* small tweaks ([9776429](https://github.com/rsksmart/rif-marketplace-cache/commit/9776429))
* update ownerAddress when it is null ([a32b732](https://github.com/rsksmart/rif-marketplace-cache/commit/a32b732))
* **cli:** force and db flags are used ([8b6fd05](https://github.com/rsksmart/rif-marketplace-cache/commit/8b6fd05))
* **cli:** purge on start before app is created ([b99d137](https://github.com/rsksmart/rif-marketplace-cache/commit/b99d137))
* **core:** loading both js and ts models ([d737f4f](https://github.com/rsksmart/rif-marketplace-cache/commit/d737f4f))
* **core:** use confirmation mechanism only when configured ([fe34771](https://github.com/rsksmart/rif-marketplace-cache/commit/fe34771))
* **deps:** nfts commit hash ([#64](https://github.com/rsksmart/rif-marketplace-cache/issues/64)) ([35da19d](https://github.com/rsksmart/rif-marketplace-cache/commit/35da19d))
* **docker:** changing commands path in docker ([2c2b4a7](https://github.com/rsksmart/rif-marketplace-cache/commit/2c2b4a7))
* **storage:** use custom precache strategy for initialization ([2c1ae54](https://github.com/rsksmart/rif-marketplace-cache/commit/2c1ae54))


### Features

* add new RNS contract ([#222](https://github.com/rsksmart/rif-marketplace-cache/issues/222)) ([65084fd](https://github.com/rsksmart/rif-marketplace-cache/commit/65084fd))
* addresses the issue with malformed price ([6986f3d](https://github.com/rsksmart/rif-marketplace-cache/commit/6986f3d))
* adds annon strategy ([8b3ca7f](https://github.com/rsksmart/rif-marketplace-cache/commit/8b3ca7f))
* adds auth package ([f78f8ac](https://github.com/rsksmart/rif-marketplace-cache/commit/f78f8ac))
* adds channel filter to sold domains ([8145b86](https://github.com/rsksmart/rif-marketplace-cache/commit/8145b86))
* filters owners for domains ([b807b8d](https://github.com/rsksmart/rif-marketplace-cache/commit/b807b8d))
* wrap and expose agreement and offer events ([#216](https://github.com/rsksmart/rif-marketplace-cache/issues/216)) ([a1d9181](https://github.com/rsksmart/rif-marketplace-cache/commit/a1d9181))
* **models:** add basic test's for Agreement model ([893ffd1](https://github.com/rsksmart/rif-marketplace-cache/commit/893ffd1))
* **offer-events:** adjust message parsing of `MessageEmitted` event ([fb47c82](https://github.com/rsksmart/rif-marketplace-cache/commit/fb47c82))
* **storage:** add support for peerid tracking on offer ([406e64f](https://github.com/rsksmart/rif-marketplace-cache/commit/406e64f))
* **storage:** add test for `BillingPlanSet` event ([8abd163](https://github.com/rsksmart/rif-marketplace-cache/commit/8abd163))
* **storage:** agreement endpoint and service's events ([65c0656](https://github.com/rsksmart/rif-marketplace-cache/commit/65c0656))
* **storage:** agreements events handling test's ([af4661a](https://github.com/rsksmart/rif-marketplace-cache/commit/af4661a))
* **storage:** fix PR review comments ([44a175e](https://github.com/rsksmart/rif-marketplace-cache/commit/44a175e))
* **storage:** remove unnecessary `logger` in switch statement(never rich this place) ([d58fd3b](https://github.com/rsksmart/rif-marketplace-cache/commit/d58fd3b))
* **storage:** revert logging of unknown events in `offer` event processor ([ca5c064](https://github.com/rsksmart/rif-marketplace-cache/commit/ca5c064))
* add entrypoint for running required steps ([b6b0b1f](https://github.com/rsksmart/rif-marketplace-cache/commit/b6b0b1f))
* added config for default deterministic ganache ([e9fe582](https://github.com/rsksmart/rif-marketplace-cache/commit/e9fe582))
* added config for testnet ([2a71ab0](https://github.com/rsksmart/rif-marketplace-cache/commit/2a71ab0))
* adds expiration table and removes status from offers ([1642ab4](https://github.com/rsksmart/rif-marketplace-cache/commit/1642ab4))
* adds link to node-config documentation ([e5f6262](https://github.com/rsksmart/rif-marketplace-cache/commit/e5f6262))
* adds name resolution to rns processor ([a4b8a45](https://github.com/rsksmart/rif-marketplace-cache/commit/a4b8a45))
* adds optional emit fn to rns services ([06d2399](https://github.com/rsksmart/rif-marketplace-cache/commit/06d2399))
* adds tld to the default config ([eb08eb2](https://github.com/rsksmart/rif-marketplace-cache/commit/eb08eb2))
* display current configuration on startup ([8caf11a](https://github.com/rsksmart/rif-marketplace-cache/commit/8caf11a))
* fixes namechanged handler ([f6563dd](https://github.com/rsksmart/rif-marketplace-cache/commit/f6563dd))
* fixes searching sold domains by name ([2b4cd27](https://github.com/rsksmart/rif-marketplace-cache/commit/2b4cd27))
* further splits domain table (table/event) ([0eccc28](https://github.com/rsksmart/rif-marketplace-cache/commit/0eccc28))
* further splits domain table (table/event) ([9ccba2c](https://github.com/rsksmart/rif-marketplace-cache/commit/9ccba2c))
* handling reorgs ([dc0fdb9](https://github.com/rsksmart/rif-marketplace-cache/commit/dc0fdb9))
* logging hooks errors ([020edf9](https://github.com/rsksmart/rif-marketplace-cache/commit/020edf9))
* makes use of discardQuery hook ([fece820](https://github.com/rsksmart/rif-marketplace-cache/commit/fece820))
* tracking last processed and fetch blocks with their hashes ([c3d3ad2](https://github.com/rsksmart/rif-marketplace-cache/commit/c3d3ad2))
* Use `instanceOf` instead of basic type comparison ([455e92f](https://github.com/rsksmart/rif-marketplace-cache/commit/455e92f))
* uses services for db interaction ([e15d646](https://github.com/rsksmart/rif-marketplace-cache/commit/e15d646))
* using contract address as confirmations identifier ([8d7bb55](https://github.com/rsksmart/rif-marketplace-cache/commit/8d7bb55))
* wrapps storing name in the precache in try ([502d030](https://github.com/rsksmart/rif-marketplace-cache/commit/502d030))
* wraps db calls in feathers services ([df9e17f](https://github.com/rsksmart/rif-marketplace-cache/commit/df9e17f))
* **blockchain:** confirmation service ([ce55cd5](https://github.com/rsksmart/rif-marketplace-cache/commit/ce55cd5))
* **core:** confirmations endpoint ([11b3337](https://github.com/rsksmart/rif-marketplace-cache/commit/11b3337))
* **core:** critical log and required precache ([9245fdc](https://github.com/rsksmart/rif-marketplace-cache/commit/9245fdc))
* **core:** health-check route ([a7d63b7](https://github.com/rsksmart/rif-marketplace-cache/commit/a7d63b7))
* **storage:** new storage contracts implementation ([a9a903f](https://github.com/rsksmart/rif-marketplace-cache/commit/a9a903f))
* add CORS configuration ([1feab4f](https://github.com/rsksmart/rif-marketplace-cache/commit/1feab4f))
* added Transfer table on purge command ([ebb2c46](https://github.com/rsksmart/rif-marketplace-cache/commit/ebb2c46))
* adds query for owned and placed domains ([#68](https://github.com/rsksmart/rif-marketplace-cache/issues/68)) ([0f776aa](https://github.com/rsksmart/rif-marketplace-cache/commit/0f776aa))
* allows searching for unknown rns w/ tokenId ([bffa99f](https://github.com/rsksmart/rif-marketplace-cache/commit/bffa99f))
* change default new-block strategy to polling ([#75](https://github.com/rsksmart/rif-marketplace-cache/issues/75)) ([d6632fe](https://github.com/rsksmart/rif-marketplace-cache/commit/d6632fe))
* enables searching my name ([#83](https://github.com/rsksmart/rif-marketplace-cache/issues/83)) ([e1117d7](https://github.com/rsksmart/rif-marketplace-cache/commit/e1117d7))
* event processors rename and improvements ([4cd5ec5](https://github.com/rsksmart/rif-marketplace-cache/commit/4cd5ec5))
* fixes sold query ([04abd9f](https://github.com/rsksmart/rif-marketplace-cache/commit/04abd9f))
* maps offers from sql result ([ba6b72b](https://github.com/rsksmart/rif-marketplace-cache/commit/ba6b72b))
* rns precache ([a5aaefe](https://github.com/rsksmart/rif-marketplace-cache/commit/a5aaefe))
* sqlite support ([03162b9](https://github.com/rsksmart/rif-marketplace-cache/commit/03162b9))
* store cache-state data in database ([0fe7fee](https://github.com/rsksmart/rif-marketplace-cache/commit/0fe7fee))
* **cli:** purge parameter for start command ([81919f9](https://github.com/rsksmart/rif-marketplace-cache/commit/81919f9))
* **core:** improved logging for additional objects ([a9576fb](https://github.com/rsksmart/rif-marketplace-cache/commit/a9576fb))
* **core:** logging improvements ([#97](https://github.com/rsksmart/rif-marketplace-cache/issues/97)) ([c177ec3](https://github.com/rsksmart/rif-marketplace-cache/commit/c177ec3))
* **core:** new verbose log level ([258bcb3](https://github.com/rsksmart/rif-marketplace-cache/commit/258bcb3))
* **core/storage:** improved error handling, logging ([68cb6ce](https://github.com/rsksmart/rif-marketplace-cache/commit/68cb6ce))
* **rates:** rates support ([6f6ad1d](https://github.com/rsksmart/rif-marketplace-cache/commit/6f6ad1d))
* **rates:** using interval update trigger instead of request ([ccece67](https://github.com/rsksmart/rif-marketplace-cache/commit/ccece67))
* **rns:** enabling custom precache for initialization ([6ce64b5](https://github.com/rsksmart/rif-marketplace-cache/commit/6ce64b5))
* **rns:** new placement events ([#66](https://github.com/rsksmart/rif-marketplace-cache/issues/66)) ([f3af81f](https://github.com/rsksmart/rif-marketplace-cache/commit/f3af81f))
* **rns:** support for rns ([#47](https://github.com/rsksmart/rif-marketplace-cache/issues/47)) ([208c1cf](https://github.com/rsksmart/rif-marketplace-cache/commit/208c1cf))
* **rns:** time of events taken from block timestamp ([644a224](https://github.com/rsksmart/rif-marketplace-cache/commit/644a224))
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



<a name="0.2.1"></a>
## 0.2.1 (2020-07-13)


### Bug Fixes

* add confirmations for rns contracts ([708c912](https://github.com/rsksmart/rif-marketplace-cache/commit/708c912))
* **blockchain:** one reorg does not reprocess last processed block ([b557b63](https://github.com/rsksmart/rif-marketplace-cache/commit/b557b63))
* **StorageModel:** handle offer with agreements for `utilizedCapacity` virtual field ([0d9eb41](https://github.com/rsksmart/rif-marketplace-cache/commit/0d9eb41))
*  filters in bought domains ([1d39d0e](https://github.com/rsksmart/rif-marketplace-cache/commit/1d39d0e))
* [@rsksmart](https://github.com/rsksmart)/rns-auction-registrar dep-check ([fb10021](https://github.com/rsksmart/rif-marketplace-cache/commit/fb10021))
* adapts domains query to remove duplications ([91e6ffe](https://github.com/rsksmart/rif-marketplace-cache/commit/91e6ffe))
* add starting blocks for contracts in Testnet ([3bac7bf](https://github.com/rsksmart/rif-marketplace-cache/commit/3bac7bf))
* add try catch when name cannot be parsed ([422a3da](https://github.com/rsksmart/rif-marketplace-cache/commit/422a3da))
* added abi-decoder type definitions ([5532ac4](https://github.com/rsksmart/rif-marketplace-cache/commit/5532ac4))
* adds pre/suf-fix % to name search ([c6c2937](https://github.com/rsksmart/rif-marketplace-cache/commit/c6c2937))
* allows searching own/placed domains by name ([#92](https://github.com/rsksmart/rif-marketplace-cache/issues/92)) ([e122a4a](https://github.com/rsksmart/rif-marketplace-cache/commit/e122a4a))
* avoids db collisions for domains ([e64e8b1](https://github.com/rsksmart/rif-marketplace-cache/commit/e64e8b1))
* change default log level to warn ([dc88d5d](https://github.com/rsksmart/rif-marketplace-cache/commit/dc88d5d))
* correct definition of active offer ([06f5005](https://github.com/rsksmart/rif-marketplace-cache/commit/06f5005))
* correct event name ([#172](https://github.com/rsksmart/rif-marketplace-cache/issues/172)) ([29b4d54](https://github.com/rsksmart/rif-marketplace-cache/commit/29b4d54))
* creates more explicit domains query ([2aa7e1e](https://github.com/rsksmart/rif-marketplace-cache/commit/2aa7e1e))
* error handling ([486328b](https://github.com/rsksmart/rif-marketplace-cache/commit/486328b))
* include tokenID as part of PK for Transfers ([9dbba38](https://github.com/rsksmart/rif-marketplace-cache/commit/9dbba38))
* new Transfer entity to avoid SoldDomain synchronization problems ([31601cc](https://github.com/rsksmart/rif-marketplace-cache/commit/31601cc)), closes [#91](https://github.com/rsksmart/rif-marketplace-cache/issues/91)
* normalized timestamp on old expirationchanged events ([#94](https://github.com/rsksmart/rif-marketplace-cache/issues/94)) ([843e8c6](https://github.com/rsksmart/rif-marketplace-cache/commit/843e8c6))
* oclif-dev manifest generation on publish ([3196a11](https://github.com/rsksmart/rif-marketplace-cache/commit/3196a11))
* **core:** confirmations are handled for multiple blocks ([ad550da](https://github.com/rsksmart/rif-marketplace-cache/commit/ad550da))
* ganache contract addresses ([b46d08e](https://github.com/rsksmart/rif-marketplace-cache/commit/b46d08e))
* makes domain name sha3 to hex w/o lead 0s ([#96](https://github.com/rsksmart/rif-marketplace-cache/issues/96)) ([cd5aa77](https://github.com/rsksmart/rif-marketplace-cache/commit/cd5aa77))
* new marketplace contract address ([b9afe1f](https://github.com/rsksmart/rif-marketplace-cache/commit/b9afe1f))
* precache upadates  exp date before domain now ([7a4d641](https://github.com/rsksmart/rif-marketplace-cache/commit/7a4d641))
* releasing default config to npm ([f6c993e](https://github.com/rsksmart/rif-marketplace-cache/commit/f6c993e))
* releasing env-mapping config to npm ([a993f34](https://github.com/rsksmart/rif-marketplace-cache/commit/a993f34))
* small tweaks ([9776429](https://github.com/rsksmart/rif-marketplace-cache/commit/9776429))
* ws emits to be emitted for confirmation service ([cb8b852](https://github.com/rsksmart/rif-marketplace-cache/commit/cb8b852))
* **blockchain:** correct event transaction column size ([d0ba3bc](https://github.com/rsksmart/rif-marketplace-cache/commit/d0ba3bc))
* **blockchain:** emit invalid confirmations events ([e798174](https://github.com/rsksmart/rif-marketplace-cache/commit/e798174))
* **blockchain:** emitter confirm only its specified events ([194a8d4](https://github.com/rsksmart/rif-marketplace-cache/commit/194a8d4))
* **blockchain:** polling right block numbers ([#88](https://github.com/rsksmart/rif-marketplace-cache/issues/88)) ([c213899](https://github.com/rsksmart/rif-marketplace-cache/commit/c213899))
* **cli:** bundled configs should be loaded by default ([bb96583](https://github.com/rsksmart/rif-marketplace-cache/commit/bb96583))
* **cli:** force and db flags are used ([8b6fd05](https://github.com/rsksmart/rif-marketplace-cache/commit/8b6fd05))
* **cli:** purge on start before app is created ([b99d137](https://github.com/rsksmart/rif-marketplace-cache/commit/b99d137))
* **cli:** run only enabled services for precache when using all ([41c9fe0](https://github.com/rsksmart/rif-marketplace-cache/commit/41c9fe0))
* **core:** logging errors does not modify the object anymore ([a06d1fd](https://github.com/rsksmart/rif-marketplace-cache/commit/a06d1fd))
* cancel previous placements on TokenPlaced ([#72](https://github.com/rsksmart/rif-marketplace-cache/issues/72)) ([8569cd5](https://github.com/rsksmart/rif-marketplace-cache/commit/8569cd5))
* purging also events in database ([0c20a10](https://github.com/rsksmart/rif-marketplace-cache/commit/0c20a10))
* update ownerAddress when it is null ([a32b732](https://github.com/rsksmart/rif-marketplace-cache/commit/a32b732))
* **cli:** oclif release command path modification ([31d6283](https://github.com/rsksmart/rif-marketplace-cache/commit/31d6283))
* **core:** loading both js and ts models ([d737f4f](https://github.com/rsksmart/rif-marketplace-cache/commit/d737f4f))
* **core:** use confirmation mechanism only when configured ([fe34771](https://github.com/rsksmart/rif-marketplace-cache/commit/fe34771))
* **deps:** nfts commit hash ([#64](https://github.com/rsksmart/rif-marketplace-cache/issues/64)) ([35da19d](https://github.com/rsksmart/rif-marketplace-cache/commit/35da19d))
* **docker:** changing commands path in docker ([2c2b4a7](https://github.com/rsksmart/rif-marketplace-cache/commit/2c2b4a7))
* dockerfile fixes ([#84](https://github.com/rsksmart/rif-marketplace-cache/issues/84)) ([ae1d05d](https://github.com/rsksmart/rif-marketplace-cache/commit/ae1d05d))
* **storage:** use custom precache strategy for initialization ([2c1ae54](https://github.com/rsksmart/rif-marketplace-cache/commit/2c1ae54))


### Features

* **models:** add basic test's for Agreement model ([893ffd1](https://github.com/rsksmart/rif-marketplace-cache/commit/893ffd1))
* **offer-events:** adjust message parsing of `MessageEmitted` event ([fb47c82](https://github.com/rsksmart/rif-marketplace-cache/commit/fb47c82))
* **storage:** add support for peerid tracking on offer ([406e64f](https://github.com/rsksmart/rif-marketplace-cache/commit/406e64f))
* **storage:** add test for `BillingPlanSet` event ([8abd163](https://github.com/rsksmart/rif-marketplace-cache/commit/8abd163))
* **storage:** agreement endpoint and service's events ([65c0656](https://github.com/rsksmart/rif-marketplace-cache/commit/65c0656))
* **storage:** agreements events handling test's ([af4661a](https://github.com/rsksmart/rif-marketplace-cache/commit/af4661a))
* **storage:** fix PR review comments ([44a175e](https://github.com/rsksmart/rif-marketplace-cache/commit/44a175e))
* **storage:** remove unnecessary `logger` in switch statement(never rich this place) ([d58fd3b](https://github.com/rsksmart/rif-marketplace-cache/commit/d58fd3b))
* **storage:** revert logging of unknown events in `offer` event processor ([ca5c064](https://github.com/rsksmart/rif-marketplace-cache/commit/ca5c064))
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
* tracking last processed and fetch blocks with their hashes ([c3d3ad2](https://github.com/rsksmart/rif-marketplace-cache/commit/c3d3ad2))
* Use `instanceOf` instead of basic type comparison ([455e92f](https://github.com/rsksmart/rif-marketplace-cache/commit/455e92f))
* uses services for db interaction ([e15d646](https://github.com/rsksmart/rif-marketplace-cache/commit/e15d646))
* using contract address as confirmations identifier ([8d7bb55](https://github.com/rsksmart/rif-marketplace-cache/commit/8d7bb55))
* wrapps storing name in the precache in try ([502d030](https://github.com/rsksmart/rif-marketplace-cache/commit/502d030))
* wraps db calls in feathers services ([df9e17f](https://github.com/rsksmart/rif-marketplace-cache/commit/df9e17f))
* **blockchain:** confirmation service ([ce55cd5](https://github.com/rsksmart/rif-marketplace-cache/commit/ce55cd5))
* maps offers from sql result ([ba6b72b](https://github.com/rsksmart/rif-marketplace-cache/commit/ba6b72b))
* rns precache ([a5aaefe](https://github.com/rsksmart/rif-marketplace-cache/commit/a5aaefe))
* sqlite support ([03162b9](https://github.com/rsksmart/rif-marketplace-cache/commit/03162b9))
* store cache-state data in database ([0fe7fee](https://github.com/rsksmart/rif-marketplace-cache/commit/0fe7fee))
* **cli:** purge parameter for start command ([81919f9](https://github.com/rsksmart/rif-marketplace-cache/commit/81919f9))
* **core:** confirmations endpoint ([11b3337](https://github.com/rsksmart/rif-marketplace-cache/commit/11b3337))
* **core:** critical log and required precache ([9245fdc](https://github.com/rsksmart/rif-marketplace-cache/commit/9245fdc))
* **core:** health-check route ([a7d63b7](https://github.com/rsksmart/rif-marketplace-cache/commit/a7d63b7))
* **core:** improved logging for additional objects ([a9576fb](https://github.com/rsksmart/rif-marketplace-cache/commit/a9576fb))
* **core:** logging improvements ([#97](https://github.com/rsksmart/rif-marketplace-cache/issues/97)) ([c177ec3](https://github.com/rsksmart/rif-marketplace-cache/commit/c177ec3))
* **core:** new verbose log level ([258bcb3](https://github.com/rsksmart/rif-marketplace-cache/commit/258bcb3))
* **core/storage:** improved error handling, logging ([68cb6ce](https://github.com/rsksmart/rif-marketplace-cache/commit/68cb6ce))
* **rates:** rates support ([6f6ad1d](https://github.com/rsksmart/rif-marketplace-cache/commit/6f6ad1d))
* **rates:** using interval update trigger instead of request ([ccece67](https://github.com/rsksmart/rif-marketplace-cache/commit/ccece67))
* **rns:** enabling custom precache for initialization ([6ce64b5](https://github.com/rsksmart/rif-marketplace-cache/commit/6ce64b5))
* **rns:** time of events taken from block timestamp ([644a224](https://github.com/rsksmart/rif-marketplace-cache/commit/644a224))
* **storage:** new storage contracts implementation ([a9a903f](https://github.com/rsksmart/rif-marketplace-cache/commit/a9a903f))
* adds query for owned and placed domains ([#68](https://github.com/rsksmart/rif-marketplace-cache/issues/68)) ([0f776aa](https://github.com/rsksmart/rif-marketplace-cache/commit/0f776aa))
* allows searching for unknown rns w/ tokenId ([bffa99f](https://github.com/rsksmart/rif-marketplace-cache/commit/bffa99f))
* basic blockchain watcher ([b0e1a9f](https://github.com/rsksmart/rif-marketplace-cache/commit/b0e1a9f))
* change default new-block strategy to polling ([#75](https://github.com/rsksmart/rif-marketplace-cache/issues/75)) ([d6632fe](https://github.com/rsksmart/rif-marketplace-cache/commit/d6632fe))
* confirmation of event using receipts ([a185350](https://github.com/rsksmart/rif-marketplace-cache/commit/a185350))
* delayed logging initialization ([6b11776](https://github.com/rsksmart/rif-marketplace-cache/commit/6b11776))
* enables searching my name ([#83](https://github.com/rsksmart/rif-marketplace-cache/issues/83)) ([e1117d7](https://github.com/rsksmart/rif-marketplace-cache/commit/e1117d7))
* **rns:** new placement events ([#66](https://github.com/rsksmart/rif-marketplace-cache/issues/66)) ([f3af81f](https://github.com/rsksmart/rif-marketplace-cache/commit/f3af81f))
* **rns:** support for rns ([#47](https://github.com/rsksmart/rif-marketplace-cache/issues/47)) ([208c1cf](https://github.com/rsksmart/rif-marketplace-cache/commit/208c1cf))
* **storage:** tracking requests and available capacity of offer ([fd4ad44](https://github.com/rsksmart/rif-marketplace-cache/commit/fd4ad44))
* cli support ([7d01202](https://github.com/rsksmart/rif-marketplace-cache/commit/7d01202))
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



<a name="0.2.0"></a>
# 0.2.0 (2020-06-26)


### Bug Fixes

* **blockchain:** one reorg does not reprocess last processed block ([b557b63](https://github.com/rsksmart/rif-marketplace-cache/commit/b557b63))
*  filters in bought domains ([1d39d0e](https://github.com/rsksmart/rif-marketplace-cache/commit/1d39d0e))
* [@rsksmart](https://github.com/rsksmart)/rns-auction-registrar dep-check ([fb10021](https://github.com/rsksmart/rif-marketplace-cache/commit/fb10021))
* adapts domains query to remove duplications ([91e6ffe](https://github.com/rsksmart/rif-marketplace-cache/commit/91e6ffe))
* add starting blocks for contracts in Testnet ([3bac7bf](https://github.com/rsksmart/rif-marketplace-cache/commit/3bac7bf))
* add try catch when name cannot be parsed ([422a3da](https://github.com/rsksmart/rif-marketplace-cache/commit/422a3da))
* added abi-decoder type definitions ([5532ac4](https://github.com/rsksmart/rif-marketplace-cache/commit/5532ac4))
* adds pre/suf-fix % to name search ([c6c2937](https://github.com/rsksmart/rif-marketplace-cache/commit/c6c2937))
* allows searching own/placed domains by name ([#92](https://github.com/rsksmart/rif-marketplace-cache/issues/92)) ([e122a4a](https://github.com/rsksmart/rif-marketplace-cache/commit/e122a4a))
* avoids db collisions for domains ([e64e8b1](https://github.com/rsksmart/rif-marketplace-cache/commit/e64e8b1))
* change default log level to warn ([dc88d5d](https://github.com/rsksmart/rif-marketplace-cache/commit/dc88d5d))
* correct event name ([#172](https://github.com/rsksmart/rif-marketplace-cache/issues/172)) ([29b4d54](https://github.com/rsksmart/rif-marketplace-cache/commit/29b4d54))
* creates more explicit domains query ([2aa7e1e](https://github.com/rsksmart/rif-marketplace-cache/commit/2aa7e1e))
* error handling ([486328b](https://github.com/rsksmart/rif-marketplace-cache/commit/486328b))
* ganache contract addresses ([b46d08e](https://github.com/rsksmart/rif-marketplace-cache/commit/b46d08e))
* include tokenID as part of PK for Transfers ([9dbba38](https://github.com/rsksmart/rif-marketplace-cache/commit/9dbba38))
* new marketplace contract address ([b9afe1f](https://github.com/rsksmart/rif-marketplace-cache/commit/b9afe1f))
* normalized timestamp on old expirationchanged events ([#94](https://github.com/rsksmart/rif-marketplace-cache/issues/94)) ([843e8c6](https://github.com/rsksmart/rif-marketplace-cache/commit/843e8c6))
* oclif-dev manifest generation on publish ([3196a11](https://github.com/rsksmart/rif-marketplace-cache/commit/3196a11))
* **blockchain:** emit invalid confirmations events ([e798174](https://github.com/rsksmart/rif-marketplace-cache/commit/e798174))
* **cli:** force and db flags are used ([8b6fd05](https://github.com/rsksmart/rif-marketplace-cache/commit/8b6fd05))
* **cli:** oclif release command path modification ([31d6283](https://github.com/rsksmart/rif-marketplace-cache/commit/31d6283))
* **cli:** purge on start before app is created ([b99d137](https://github.com/rsksmart/rif-marketplace-cache/commit/b99d137))
* **cli:** run only enabled services for precache when using all ([41c9fe0](https://github.com/rsksmart/rif-marketplace-cache/commit/41c9fe0))
* **core:** confirmations are handled for multiple blocks ([ad550da](https://github.com/rsksmart/rif-marketplace-cache/commit/ad550da))
* cancel previous placements on TokenPlaced ([#72](https://github.com/rsksmart/rif-marketplace-cache/issues/72)) ([8569cd5](https://github.com/rsksmart/rif-marketplace-cache/commit/8569cd5))
* dockerfile fixes ([#84](https://github.com/rsksmart/rif-marketplace-cache/issues/84)) ([ae1d05d](https://github.com/rsksmart/rif-marketplace-cache/commit/ae1d05d))
* makes domain name sha3 to hex w/o lead 0s ([#96](https://github.com/rsksmart/rif-marketplace-cache/issues/96)) ([cd5aa77](https://github.com/rsksmart/rif-marketplace-cache/commit/cd5aa77))
* new Transfer entity to avoid SoldDomain synchronization problems ([31601cc](https://github.com/rsksmart/rif-marketplace-cache/commit/31601cc)), closes [#91](https://github.com/rsksmart/rif-marketplace-cache/issues/91)
* precache upadates  exp date before domain now ([7a4d641](https://github.com/rsksmart/rif-marketplace-cache/commit/7a4d641))
* purging also events in database ([0c20a10](https://github.com/rsksmart/rif-marketplace-cache/commit/0c20a10))
* releasing default config to npm ([f6c993e](https://github.com/rsksmart/rif-marketplace-cache/commit/f6c993e))
* releasing env-mapping config to npm ([a993f34](https://github.com/rsksmart/rif-marketplace-cache/commit/a993f34))
* update ownerAddress when it is null ([a32b732](https://github.com/rsksmart/rif-marketplace-cache/commit/a32b732))
* ws emits to be emitted for confirmation service ([cb8b852](https://github.com/rsksmart/rif-marketplace-cache/commit/cb8b852))
* **blockchain:** correct event transaction column size ([d0ba3bc](https://github.com/rsksmart/rif-marketplace-cache/commit/d0ba3bc))
* **blockchain:** emitter confirm only its specified events ([194a8d4](https://github.com/rsksmart/rif-marketplace-cache/commit/194a8d4))
* **blockchain:** polling right block numbers ([#88](https://github.com/rsksmart/rif-marketplace-cache/issues/88)) ([c213899](https://github.com/rsksmart/rif-marketplace-cache/commit/c213899))
* **core:** loading both js and ts models ([d737f4f](https://github.com/rsksmart/rif-marketplace-cache/commit/d737f4f))
* **core:** logging errors does not modify the object anymore ([a06d1fd](https://github.com/rsksmart/rif-marketplace-cache/commit/a06d1fd))
* small tweaks ([9776429](https://github.com/rsksmart/rif-marketplace-cache/commit/9776429))
* **cli:** bundled configs should be loaded by default ([bb96583](https://github.com/rsksmart/rif-marketplace-cache/commit/bb96583))
* **core:** use confirmation mechanism only when configured ([fe34771](https://github.com/rsksmart/rif-marketplace-cache/commit/fe34771))
* **deps:** nfts commit hash ([#64](https://github.com/rsksmart/rif-marketplace-cache/issues/64)) ([35da19d](https://github.com/rsksmart/rif-marketplace-cache/commit/35da19d))
* **docker:** changing commands path in docker ([2c2b4a7](https://github.com/rsksmart/rif-marketplace-cache/commit/2c2b4a7))
* **storage:** use custom precache strategy for initialization ([2c1ae54](https://github.com/rsksmart/rif-marketplace-cache/commit/2c1ae54))
* correct definition of active offer ([06f5005](https://github.com/rsksmart/rif-marketplace-cache/commit/06f5005))


### Features

* **storage:** add support for peerid tracking on offer ([406e64f](https://github.com/rsksmart/rif-marketplace-cache/commit/406e64f))
* **storage:** agreement endpoint and service's events ([65c0656](https://github.com/rsksmart/rif-marketplace-cache/commit/65c0656))
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
* wrapps storing name in the precache in try ([502d030](https://github.com/rsksmart/rif-marketplace-cache/commit/502d030))
* wraps db calls in feathers services ([df9e17f](https://github.com/rsksmart/rif-marketplace-cache/commit/df9e17f))
* **blockchain:** confirmation service ([ce55cd5](https://github.com/rsksmart/rif-marketplace-cache/commit/ce55cd5))
* **core:** logging improvements ([#97](https://github.com/rsksmart/rif-marketplace-cache/issues/97)) ([c177ec3](https://github.com/rsksmart/rif-marketplace-cache/commit/c177ec3))
* event processors rename and improvements ([4cd5ec5](https://github.com/rsksmart/rif-marketplace-cache/commit/4cd5ec5))
* **cli:** purge parameter for start command ([81919f9](https://github.com/rsksmart/rif-marketplace-cache/commit/81919f9))
* **core:** confirmations endpoint ([11b3337](https://github.com/rsksmart/rif-marketplace-cache/commit/11b3337))
* **core:** critical log and required precache ([9245fdc](https://github.com/rsksmart/rif-marketplace-cache/commit/9245fdc))
* **core:** health-check route ([a7d63b7](https://github.com/rsksmart/rif-marketplace-cache/commit/a7d63b7))
* **core:** improved logging for additional objects ([a9576fb](https://github.com/rsksmart/rif-marketplace-cache/commit/a9576fb))
* **core:** new verbose log level ([258bcb3](https://github.com/rsksmart/rif-marketplace-cache/commit/258bcb3))
* **core/storage:** improved error handling, logging ([68cb6ce](https://github.com/rsksmart/rif-marketplace-cache/commit/68cb6ce))
* **rates:** rates support ([6f6ad1d](https://github.com/rsksmart/rif-marketplace-cache/commit/6f6ad1d))
* **rates:** using interval update trigger instead of request ([ccece67](https://github.com/rsksmart/rif-marketplace-cache/commit/ccece67))
* **rns:** enabling custom precache for initialization ([6ce64b5](https://github.com/rsksmart/rif-marketplace-cache/commit/6ce64b5))
* **rns:** new placement events ([#66](https://github.com/rsksmart/rif-marketplace-cache/issues/66)) ([f3af81f](https://github.com/rsksmart/rif-marketplace-cache/commit/f3af81f))
* **rns:** time of events taken from block timestamp ([644a224](https://github.com/rsksmart/rif-marketplace-cache/commit/644a224))
* adds query for owned and placed domains ([#68](https://github.com/rsksmart/rif-marketplace-cache/issues/68)) ([0f776aa](https://github.com/rsksmart/rif-marketplace-cache/commit/0f776aa))
* allows searching for unknown rns w/ tokenId ([bffa99f](https://github.com/rsksmart/rif-marketplace-cache/commit/bffa99f))
* basic blockchain watcher ([b0e1a9f](https://github.com/rsksmart/rif-marketplace-cache/commit/b0e1a9f))
* change default new-block strategy to polling ([#75](https://github.com/rsksmart/rif-marketplace-cache/issues/75)) ([d6632fe](https://github.com/rsksmart/rif-marketplace-cache/commit/d6632fe))
* configurable starting block ([85ab074](https://github.com/rsksmart/rif-marketplace-cache/commit/85ab074))
* confirmation of event using receipts ([a185350](https://github.com/rsksmart/rif-marketplace-cache/commit/a185350))
* delayed logging initialization ([6b11776](https://github.com/rsksmart/rif-marketplace-cache/commit/6b11776))
* enables searching my name ([#83](https://github.com/rsksmart/rif-marketplace-cache/issues/83)) ([e1117d7](https://github.com/rsksmart/rif-marketplace-cache/commit/e1117d7))
* **rns:** support for rns ([#47](https://github.com/rsksmart/rif-marketplace-cache/issues/47)) ([208c1cf](https://github.com/rsksmart/rif-marketplace-cache/commit/208c1cf))
* **storage:** new storage contracts implementation ([a9a903f](https://github.com/rsksmart/rif-marketplace-cache/commit/a9a903f))
* **storage:** tracking requests and available capacity of offer ([fd4ad44](https://github.com/rsksmart/rif-marketplace-cache/commit/fd4ad44))
* cli support ([7d01202](https://github.com/rsksmart/rif-marketplace-cache/commit/7d01202))
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



<a name="0.1.1"></a>
## 0.1.1 (2020-06-24)


### Bug Fixes

* oclif-dev manifest generation on publish ([3196a11](https://github.com/rsksmart/rif-marketplace-cache/commit/3196a11))
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
* normalized timestamp on old expirationchanged events ([#94](https://github.com/rsksmart/rif-marketplace-cache/issues/94)) ([843e8c6](https://github.com/rsksmart/rif-marketplace-cache/commit/843e8c6))
* precache upadates  exp date before domain now ([7a4d641](https://github.com/rsksmart/rif-marketplace-cache/commit/7a4d641))
* ws emits to be emitted for confirmation service ([cb8b852](https://github.com/rsksmart/rif-marketplace-cache/commit/cb8b852))
* **blockchain:** correct event transaction column size ([d0ba3bc](https://github.com/rsksmart/rif-marketplace-cache/commit/d0ba3bc))
* **blockchain:** emit invalid confirmations events ([e798174](https://github.com/rsksmart/rif-marketplace-cache/commit/e798174))
* **blockchain:** emitter confirm only its specified events ([194a8d4](https://github.com/rsksmart/rif-marketplace-cache/commit/194a8d4))
* **cli:** run only enabled services for precache when using all ([41c9fe0](https://github.com/rsksmart/rif-marketplace-cache/commit/41c9fe0))
* **core:** logging errors does not modify the object anymore ([a06d1fd](https://github.com/rsksmart/rif-marketplace-cache/commit/a06d1fd))
* correct definition of active offer ([06f5005](https://github.com/rsksmart/rif-marketplace-cache/commit/06f5005))
* new Transfer entity to avoid SoldDomain synchronization problems ([31601cc](https://github.com/rsksmart/rif-marketplace-cache/commit/31601cc)), closes [#91](https://github.com/rsksmart/rif-marketplace-cache/issues/91)
* purging also events in database ([0c20a10](https://github.com/rsksmart/rif-marketplace-cache/commit/0c20a10))
* releasing default config to npm ([f6c993e](https://github.com/rsksmart/rif-marketplace-cache/commit/f6c993e))
* releasing env-mapping config to npm ([a993f34](https://github.com/rsksmart/rif-marketplace-cache/commit/a993f34))
* update ownerAddress when it is null ([a32b732](https://github.com/rsksmart/rif-marketplace-cache/commit/a32b732))
* **blockchain:** polling right block numbers ([#88](https://github.com/rsksmart/rif-marketplace-cache/issues/88)) ([c213899](https://github.com/rsksmart/rif-marketplace-cache/commit/c213899))
* small tweaks ([9776429](https://github.com/rsksmart/rif-marketplace-cache/commit/9776429))
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
* wrapps storing name in the precache in try ([502d030](https://github.com/rsksmart/rif-marketplace-cache/commit/502d030))
* wraps db calls in feathers services ([df9e17f](https://github.com/rsksmart/rif-marketplace-cache/commit/df9e17f))
* **blockchain:** confirmation service ([ce55cd5](https://github.com/rsksmart/rif-marketplace-cache/commit/ce55cd5))
* **cli:** purge parameter for start command ([81919f9](https://github.com/rsksmart/rif-marketplace-cache/commit/81919f9))
* **core:** confirmations endpoint ([11b3337](https://github.com/rsksmart/rif-marketplace-cache/commit/11b3337))
* **core:** critical log and required precache ([9245fdc](https://github.com/rsksmart/rif-marketplace-cache/commit/9245fdc))
* **core:** health-check route ([a7d63b7](https://github.com/rsksmart/rif-marketplace-cache/commit/a7d63b7))
* **core:** improved logging for additional objects ([a9576fb](https://github.com/rsksmart/rif-marketplace-cache/commit/a9576fb))
* **core:** logging improvements ([#97](https://github.com/rsksmart/rif-marketplace-cache/issues/97)) ([c177ec3](https://github.com/rsksmart/rif-marketplace-cache/commit/c177ec3))
* **core:** new verbose log level ([258bcb3](https://github.com/rsksmart/rif-marketplace-cache/commit/258bcb3))
* **core/storage:** improved error handling, logging ([68cb6ce](https://github.com/rsksmart/rif-marketplace-cache/commit/68cb6ce))
* **rates:** rates support ([6f6ad1d](https://github.com/rsksmart/rif-marketplace-cache/commit/6f6ad1d))
* **rates:** using interval update trigger instead of request ([ccece67](https://github.com/rsksmart/rif-marketplace-cache/commit/ccece67))
* **rns:** enabling custom precache for initialization ([6ce64b5](https://github.com/rsksmart/rif-marketplace-cache/commit/6ce64b5))
* **rns:** new placement events ([#66](https://github.com/rsksmart/rif-marketplace-cache/issues/66)) ([f3af81f](https://github.com/rsksmart/rif-marketplace-cache/commit/f3af81f))
* **rns:** support for rns ([#47](https://github.com/rsksmart/rif-marketplace-cache/issues/47)) ([208c1cf](https://github.com/rsksmart/rif-marketplace-cache/commit/208c1cf))
* **rns:** time of events taken from block timestamp ([644a224](https://github.com/rsksmart/rif-marketplace-cache/commit/644a224))
* **storage:** new storage contracts implementation ([a9a903f](https://github.com/rsksmart/rif-marketplace-cache/commit/a9a903f))
* adds query for owned and placed domains ([#68](https://github.com/rsksmart/rif-marketplace-cache/issues/68)) ([0f776aa](https://github.com/rsksmart/rif-marketplace-cache/commit/0f776aa))
* allows searching for unknown rns w/ tokenId ([bffa99f](https://github.com/rsksmart/rif-marketplace-cache/commit/bffa99f))
* basic blockchain watcher ([b0e1a9f](https://github.com/rsksmart/rif-marketplace-cache/commit/b0e1a9f))
* change default new-block strategy to polling ([#75](https://github.com/rsksmart/rif-marketplace-cache/issues/75)) ([d6632fe](https://github.com/rsksmart/rif-marketplace-cache/commit/d6632fe))
* cli support ([7d01202](https://github.com/rsksmart/rif-marketplace-cache/commit/7d01202))
* configurable starting block ([85ab074](https://github.com/rsksmart/rif-marketplace-cache/commit/85ab074))
* configuration for clearing persitant conf ([4b13f86](https://github.com/rsksmart/rif-marketplace-cache/commit/4b13f86))
* delayed logging initialization ([6b11776](https://github.com/rsksmart/rif-marketplace-cache/commit/6b11776))
* enables searching my name ([#83](https://github.com/rsksmart/rif-marketplace-cache/issues/83)) ([e1117d7](https://github.com/rsksmart/rif-marketplace-cache/commit/e1117d7))
* **storage:** tracking requests and available capacity of offer ([fd4ad44](https://github.com/rsksmart/rif-marketplace-cache/commit/fd4ad44))
* confirmation of event using receipts ([a185350](https://github.com/rsksmart/rif-marketplace-cache/commit/a185350))
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



