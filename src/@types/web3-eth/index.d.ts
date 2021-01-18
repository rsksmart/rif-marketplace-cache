import { Eth } from 'web3-eth'

// TODO: Because of https://github.com/ethereum/web3.js/issues/3198
declare module 'web3-eth' {
  // @ts-ignore: not typed
  export default Eth
}
