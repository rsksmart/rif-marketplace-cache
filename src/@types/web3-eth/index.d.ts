import { Eth } from 'web3-eth'

declare module 'web3-eth' {
  // @ts-ignore: // TODO: Because of https://github.com/ethereum/web3.js/issues/3198
  export default Eth
}
