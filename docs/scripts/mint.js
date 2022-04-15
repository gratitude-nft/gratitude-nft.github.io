(async() => {
  const state = { connected: false }
  const connected = async function(newstate) {
    Object.assign(state, newstate, { connected: true })
    blockapi.notify('success', 'Wallet connected')
    document.getElementById('connected').style.display = 'block'
    document.getElementById('disconnected').style.display = 'none'
    //get balance of wallet
    state.balance = parseInt(await blockapi.read(nft, 'balanceOf', state.account))
  }

  const disconnected = function(e) {
    if (e?.message) {
      blockapi.notify('error', e.message)
    } else {
      blockapi.notify('success', 'Wallet disconnected')
      document.getElementById('connected').style.display = 'none'
      document.getElementById('disconnected').style.display = 'block'
    }
  }

  const nft = blockapi.contract('nft')
  const form = document.getElementById('form-mint')
  const amount = document.getElementById('amount')
  const subtotal = document.querySelector('div.subtotal')

  form.addEventListener('submit', async(e) => {
    e.preventDefault()

    if (state.balance > 4) {
      blockapi.notify('error', 'You have minted the maximum amount')
      return
    }

    //get price
    const price = blockapi.toWei(amount.value * 0.08)

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
      blockapi.notify('error', e.message)
      return false
    }

    rpc.on('transactionHash', function(hash) {
      blockapi.notify(
        'success', 
        `Transaction started on <a href="${blockmetadata.chain_scan}/tx/${hash}" target="_blank">
          etherscan.com
        </a>. Please stay on this page and wait for 10 confirmations...`,
        1000000
      )
    })

    rpc.on('confirmation', function(confirmationNumber, receipt) {
      if (confirmationNumber > 10) return
      blockapi.notify('success', `${confirmationNumber}/10 confirmed on <a href="${blockmetadata.chain_scan}/tx/${receipt.transactionHash}" target="_blank">
        etherscan.com
      </a>. Please stay on this page and wait for 10 confirmations...`, 1000000)
    })

    rpc.on('receipt', function(receipt) {
      blockapi.notify(
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
      blockapi.notify('error', e.message)
    }

    return false
  })

  window.addEventListener('status-init', async(e) => {
    const supply = await blockapi.read(nft, 'totalSupply')
    e.for.innerHTML = `${supply} / 2,222`
  })

  window.addEventListener('connect-click', () => {
    if (!state.account) {
      return blockapi.connect(blockmetadata, connected, disconnected)
    }
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
})()