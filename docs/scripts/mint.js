(async() => {
  const state = { connected: false }
  const connected = async function(newstate, session) {
    Object.assign(state, newstate, { connected: true })
    if (!session) {
      notify('success', 'Wallet connected')
    }
    document.getElementById('connected').style.display = 'block'
    document.getElementById('disconnected').style.display = 'none'
    const supply = await blockapi.read(nft, 'totalSupply')
    document.querySelector('.status').innerHTML = `${supply} / 2,222`
    //get balance of wallet
    state.balance = parseInt(await blockapi.read(nft, 'balanceOf', state.account))
  }

  const disconnected = async function(e, session) {
    if (e?.message) {
      notify('error', e.message)
    } else {
      if (!session) {
        notify('success', 'Wallet disconnected')
      }
      document.getElementById('connected').style.display = 'none'
      document.getElementById('disconnected').style.display = 'block'
    }

    if (await blockapi.inNetwork(blockmetadata)) {
      const supply = await blockapi.read(nft, 'totalSupply')
      document.querySelector('.status').innerHTML = `${supply} / 2,222`
    }
  }

  const nft = blockapi.contract('nft')
  const form = document.getElementById('form-mint')
  const amount = document.getElementById('amount')
  const subtotal = document.querySelector('div.subtotal')

  form.addEventListener('submit', async(e) => {
    e.preventDefault()

    if (state.balance > 4) {
      notify('error', 'You have minted the maximum amount')
      return false
    }

    //get price
    const price = blockapi.toWei(amount.value * 0.08)

    //gas check
    try {
      await blockapi.estimateGas(
        nft, 
        state.account, 
        200000, 
        'mint(uint256)', 
        price, 
        parseInt(amount.value)
      )
    } catch(e) {
      const pattern = /have (\d+) want (\d+)/
      const matches = e.message.match(pattern)
      if (matches.length === 3) {
        e.message = e.message.replace(pattern, `have ${
          blockapi.toEther(matches[1], 'int').toFixed(5)
        } ETH want ${
          blockapi.toEther(matches[2], 'int').toFixed(5)
        } ETH`)
      }
      notify('error', e.message.replace('err: i', 'I'))
      return false
    }

    let rpc;
    try {
      rpc = blockapi.send(
        nft, 
        state.account, 
        'mint(uint256)', 
        price, //value
        //args
        parseInt(amount.value)
      )
    } catch(e) {
      notify('error', e.message)
      return false
    }

    rpc.on('transactionHash', function(hash) {
      notify(
        'success', 
        `Transaction started on <a href="${blockmetadata.chain_scan}/tx/${hash}" target="_blank">
          etherscan.com
        </a>. Please stay on this page and wait for 10 confirmations...`,
        1000000
      )
    })

    rpc.on('confirmation', function(confirmationNumber, receipt) {
      if (confirmationNumber > 10) return
      notify('success', `${confirmationNumber}/10 confirmed on <a href="${blockmetadata.chain_scan}/tx/${receipt.transactionHash}" target="_blank">
        etherscan.com
      </a>. Please stay on this page and wait for 10 confirmations...`, 1000000)
    })

    rpc.on('receipt', function(receipt) {
      notify(
        'success', 
        `Confirming on <a href="${blockmetadata.chain_scan}/tx/${receipt.transactionHash}" target="_blank">
          etherscan.com
        </a>. Please stay on this page and wait for 10 confirmations...`,
        1000000
      )
    })

    try {
      await rpc
    } catch(e) {
      notify('error', e.message)
    }

    return false
  })

  window.addEventListener('connect-click', () => {
    blockapi.connect(blockmetadata, connected, disconnected)
  })

  window.addEventListener('decrease-amount-click', () => {
    const value = parseInt(amount.value)
    if (value > 1) {
      amount.value = value - 1
      subtotal.innerHTML = `Ξ ${0.08 * (value - 1)} ETH`
    }
  })

  window.addEventListener('increase-amount-click', () => {
    const value = parseInt(amount.value)
    if ((value + state.balance) < 5) {
      amount.value = value + 1
      subtotal.innerHTML = `Ξ ${0.08 * (value + 1)} ETH`
    }
  })

  window.doon('body')
  blockapi.startSession(blockmetadata, connected, disconnected, true)
})()