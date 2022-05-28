const { ethers, providers } = require('ethers')
const config = require('./bridge.json')
require('dotenv').config()

function redeem(contractId, contractAddress, id, amount) {
  return Buffer.from(
    ethers.utils.solidityKeccak256(
      ['string', 'uint256', 'address', 'uint256', 'uint256'],
      ['redeem', contractId, contractAddress, id, amount]
    ).slice(2),
    'hex'
  )
}

function secureRedeem(contractId, contractAddress, id, amount, owner) {
  return Buffer.from(
    ethers.utils.solidityKeccak256(
      ['string', 'uint256', 'address', 'uint256', 'uint256', 'address'],
      ['redeem', contractId, contractAddress, id, amount, owner]
    ).slice(2),
    'hex'
  )
}

module.exports = function init(app) {
  app.get('/oracle/bridge/:network_name/:source_name/:destination_name/:txid/:secure', async(req, res) => {
    const { 
      network_name: networkName, 
      source_name: sourceName, 
      destination_name: destinationName,
      txid,
      secure
    } = req.params

    //get network
    const network = config[networkName]
    if (typeof network !== 'object') {
      return res.json({ error: true, message: 'Invalid network' })
    }
    //get source
    const source = network[sourceName]
    if (typeof source !== 'object') {
      return res.json({ error: true, message: 'Invalid source' })
    }
    //get destination
    const destination = network[destinationName]
    if (typeof destination !== 'object') {
      return res.json({ error: true, message: 'Invalid destination' })
    }
    //set source signer and contract
    source.signer = new ethers.Wallet(
      process.env.ORACLE_SIGNER_KEY,
      new providers.JsonRpcProvider(source.rpc_url)
    )
    source.contract = new ethers.Contract(
      source.address, 
      config.abi, 
      source.signer
    )
    //set destination signer and contract
    destination.signer = new ethers.Wallet(
      process.env.ORACLE_SIGNER_KEY,
      new providers.JsonRpcProvider(destination.rpc_url)
    )
    destination.contract = new ethers.Contract(
      destination.address, 
      config.abi, 
      destination.signer
    )

    try {
      const tx = await source.contract.txs(parseInt(txid))
      if (!parseInt(tx.amount)
        || parseInt(tx.contractId) !== destination.chain_id
        || tx.owner === '0x0000000000000000000000000000000000000000'
        || tx.contractAddress !== destination.address
      ) {
        return res.json({ error: true, message: 'Invalid voucher' })
      }
      const redeemed = await destination.contract.redeemed(parseInt(txid))
      if (redeemed) {
        return res.json({ error: true, message: 'Already redeemed' })
      }
      //create message
      const message = parseInt(secure) ? secureRedeem(
        //contract id destination
        destination.chain_id, 
        //contract address destination
        destination.address, 
        //tx id
        txid, 
        //amount to mint
        String(tx.amount),
        //owner
        tx.owner
      ): redeem(
        //contract id destination
        destination.chain_id, 
        //contract address destination
        destination.address, 
        //tx id
        txid, 
        //amount to mint
        String(tx.amount)
      )
      //sign message
      const signature = await destination.signer.signMessage(message)
      //send off
      return res.json({ 
        error: false, 
        results: { 
          tx: txid,
          chain_id: destination.chain_id,
          contract: destination.address,
          amount: parseInt(tx.amount),
          recipient: tx.owner,
          voucher: signature
        }
      })
    } catch(e) {
      return res.json({ error: true, message: e.message })
    }
  })
}