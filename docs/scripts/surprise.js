(async() => {
  const state = { connected: false }
  const connected = async function(newstate, session) {
    Object.assign(state, newstate, { connected: true })
    if (!session) {
      notify('success', 'Wallet connected')
    }
    document.getElementById('connected').style.display = 'block'
    document.getElementById('disconnected').style.display = 'none'

    state.consumed = true
    state.consumed = await blockapi.read(nft, 'ambassadors', state.account)
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
  }

  const send = function(contract, method, confirmations, value, ...args) {
    return new Promise(async (resolve, reject) => {
      const rpc = blockapi.send(contract, state.account, method, value, ...args)

      rpc.on('transactionHash', function(hash) {
        notify(
          'success', 
          `Transaction started on <a href="${blockmetadata.chain_scan}/tx/${hash}" target="_blank">
            etherscan.com
          </a>. Please stay on this page and wait for ${confirmations} confirmations...`,
          1000000
        )
      })

      rpc.on('confirmation', function(confirmationNumber, receipt) {
        if (confirmationNumber > confirmations) return
        if (confirmationNumber == confirmations) {
          notify('success', `${confirmationNumber}/${confirmations} confirmed on <a href="${blockmetadata.chain_scan}/tx/${receipt.transactionHash}" target="_blank">
            etherscan.com
          </a>. Please stay on this page and wait for ${confirmations} confirmations...`)
          resolve()
          return
        }
        notify('success', `${confirmationNumber}/${confirmations} confirmed on <a href="${blockmetadata.chain_scan}/tx/${receipt.transactionHash}" target="_blank">
          etherscan.com
        </a>. Please stay on this page and wait for ${confirmations} confirmations...`, 1000000)
      })

      rpc.on('receipt', function(receipt) {
        notify(
          'success', 
          `Confirming on <a href="${blockmetadata.chain_scan}/tx/${receipt.transactionHash}" target="_blank">
            etherscan.com
          </a>. Please stay on this page and wait for ${confirmations} confirmations...`,
          1000000
        )
      })

      try {
        await rpc
      } catch(e) {
        reject(e)
      }
    })
  }

  const nft = blockapi.contract('nft')
  const response = await fetch('/data/redeemers.json')
  const redeemers = await response.json()

  window.addEventListener('surprise-click', async(e) => {
    if (!redeemers[state.account.toLowerCase()]) {
      return notify('error', `Sorry, ${state.account} is not qualified for this surprise.`)
    }

    if (state.consumed) {
      return notify('error', `${state.account} Was Already Surprised!`)
    }

    try {
      await send(nft, 'redeem', 6, 0, state.account, "", false, redeemers[state.account.toLowerCase()])
    } catch(e) {
      return notify('error', e.message)
    }

    state.consumed = true
  })

  window.addEventListener('connect-click', () => {
    blockapi.connect(blockmetadata, connected, disconnected)
  })

  window.doon('body')
  blockapi.startSession(blockmetadata, connected, disconnected, true)
})()