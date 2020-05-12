import Utils from 'web3-utils'
import abiDecoder from 'abi-decoder'

import Domain from './models/domain.model'

abiDecoder.addABI([
    {
        "constant": false,
        "inputs": [
          {
            "name": "_to",
            "type": "address"
          },
          {
            "name": "_value",
            "type": "uint256"
          },
          {
            "name": "_data",
            "type": "bytes"
          }
        ],
        "name": "transferAndCall",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      }
]);

export default async function processRskOwner(eth: Eth, contractAbi: Utils.AbiItem[], rskOwnerAddresses: string, fifsAddrAddress: string) {
    const rskOwner = new eth.Contract(contractAbi, rskOwnerAddresses)
    const rskOwnerEvents = await rskOwner.getPastEvents('Transfer', {
        filter: { from: fifsAddrAddress },
        fromBlock: 0
    });
    for (const rskOwnerEvent of rskOwnerEvents) {
        const transaction = await eth.getTransaction(rskOwnerEvent.transactionHash)
        const decodedData = abiDecoder.decodeMethod(transaction.input)
        const name = Utils.hexToAscii("0x" + decodedData.params[2].value.slice(218, decodedData.params[2].value.length))
        const tokenId = Utils.sha3(name)
        const ownerAddress = rskOwnerEvent.returnValues.to.toLowerCase()
        const req = new Domain({tokenId, name, ownerAddress})
        await req.save()
    };
}
