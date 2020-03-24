import { Eth } from 'web3-eth'

// TODO: Because of https://github.com/ethereum/web3.js/issues/3198
declare module 'web3-eth' {
  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  // @ts-ignore
  export default Eth
}
