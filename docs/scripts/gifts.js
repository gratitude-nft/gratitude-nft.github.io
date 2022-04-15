(async() => {
  const connected = function(newstate) {
    Object.assign(state, newstate, { connected: true })
    blockapi.notify('success', 'Wallet connected')
  }

  const disconnected = function(e) {
    if (e?.message) {
      blockapi.notify('error', e.message)
    } else {
      blockapi.notify('success', 'Wallet disconnected')
    }
  }

  function toElement(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
  }

  const send = function(contract, method, confirmations, value, ...args) {
    return new Promise(async (resolve, reject) => {
      const rpc = blockapi.send(contract, state.account, method, value, ...args)

      rpc.on('transactionHash', function(hash) {
        blockapi.notify(
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
          blockapi.notify('success', `${confirmationNumber}/${confirmations} confirmed on <a href="${blockmetadata.chain_scan}/tx/${receipt.transactionHash}" target="_blank">
            etherscan.com
          </a>. Please stay on this page and wait for ${confirmations} confirmations...`)
          resolve()
          return
        }
        blockapi.notify('success', `${confirmationNumber}/${confirmations} confirmed on <a href="${blockmetadata.chain_scan}/tx/${receipt.transactionHash}" target="_blank">
          etherscan.com
        </a>. Please stay on this page and wait for ${confirmations} confirmations...`, 1000000)
      })

      rpc.on('receipt', function(receipt) {
        blockapi.notify(
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

  const populate = async function() {
    const items = document.querySelector('div.items')
    items.innerHTML = ''
    const template = document.getElementById('tpl-item').innerHTML
    for (let i = 0; true; i++) {
      try {
        //get metadata
        const response = await fetch(`/data/gifts/${i + 1}.json`)
        const json = await response.json()
        //get info
        const info = await blockapi.read(store, 'tokenInfo', i + 1)

        const item = toElement(template
          .replace('{IMAGE}', `/images/store/GoG-${i + 1}-preview.jpg`)//json.preview || json.image
          .replace('{ID}', i + 1)
          .replace('{ID}', i + 1)
          .replace('{NAME}', json.name)
          .replace('{DESCRIPTION}', json.description)
          .replace('{ETH_HIDE}', info.eth > 0 ? '' : ' hide')
          .replace('{ETH_PRICE}', info.eth > 0 ? info.eth : 0)
          .replace('{ETH_PRICE}', info.eth > 0 ? blockapi.toEther(info.eth) : 0)
          .replace('{GRATIS_HIDE}', info.gratis > 0 ? '' : ' hide')
          .replace('{GRATIS_PRICE}', info.gratis > 0 ? info.gratis: 0)
          .replace('{GRATIS_PRICE}', info.gratis > 0 ? blockapi.toEther(info.gratis): 0)
          .replace('{SUPPLY}', info.max > 0 
            ? (info.supply > 0 || info.max < 26 ? `${info.max - info.supply}/${info.max} remaining`: '')
            : (info.supply > 0 ? `${info.supply} sold`: '')
          )
          .replace('{MAX}', info.max)
          .replace('{MAX}', info.max)
          .replace('{SUPPLY}', info.supply)
          .replace('{SUPPLY}', info.supply)
        )

        items.appendChild(item)
      } catch(e) {
        break
      }
    }

    window.doon('div.items')
  }

  const BN = blockapi.web3().utils.BN
  const store = blockapi.contract('store')
  const token = blockapi.contract('token')
  const state = { connected: false }

  window.addEventListener('connect-click', () => {
    if (!state.account) {
      return blockapi.connect(blockmetadata, connected, disconnected)
    }
  })

  window.addEventListener('buy-eth-click', async function buyETH(e) {
    if (!state.account) {
      return blockapi.connect(blockmetadata, (newstate) => {
        connected(newstate)
        buyETH(e)
      }, disconnected)
    }
    const id = parseInt(e.for.getAttribute('data-id'))
    const max = parseInt(e.for.getAttribute('data-max'))
    const price = e.for.getAttribute('data-price')
    const supply = parseInt(e.for.getAttribute('data-supply'))

    if (price == 0) {
      return blockapi.notify('error', 'Item is unavailable right now')
    } else if (max > 0 && max <= supply) {
      return blockapi.notify('error', 'Item is sold out')
    }

    const original = e.for.innerHTML
    e.for.innerHTML = 'Minting...'
    e.for.classList.add('disabled')

    blockapi.notify('info', 'Minting item...')
    try {
      await send(store, 'buy(address,uint256,uint256)', 6, price, state.account,id,1)
    } catch(error) {
      blockapi.notify('error', error.message)
      e.for.innerHTML = original
      e.for.classList.remove('disabled')
      return false
    }

    e.for.innerHTML = original
    e.for.classList.remove('disabled')
    blockapi.notify(
      'success', 
      `Minting is now complete. You can view your item on <a href="${blockmetadata.chain_marketplace}/${store._address}/${id}" target="_blank">
        opensea.io
      </a>.`,
      1000000
    )
  })

  window.addEventListener('buy-gratis-click', async function buyGRATIS(e) {
    if (!state.account) {
      return blockapi.connect(blockmetadata, (newstate) => {
        connected(newstate)
        buyGRATIS(e)
      }, disconnected)
    }

    const id = parseInt(e.for.getAttribute('data-id'))
    const max = parseInt(e.for.getAttribute('data-max'))
    const price = e.for.getAttribute('data-price')
    const supply = parseInt(e.for.getAttribute('data-supply'))

    if (price == 0) {
      return blockapi.notify('error', 'Item is unavailable right now')
    } else if (max > 0 && max <= supply) {
      return blockapi.notify('error', 'Item is sold out')
    }

    //check gratis balance
    const balance = await blockapi.read(token, 'balanceOf', state.account)
    if ((balance - price) < 0) {
      return blockapi.notify('error', 'Not enough GRATIS in your wallet')
    }

    const original = e.for.innerHTML
    e.for.innerHTML = 'Minting...'
    e.for.classList.add('disabled')

    blockapi.notify('info', 'Minting item...')
    try {
      await send(store, 'support(address,uint256,uint256)', 6, 0, state.account,id,1)
    } catch(error) {
      blockapi.notify('error', error.message)
      e.for.innerHTML = original
      e.for.classList.remove('disabled')
      return false
    }

    e.for.innerHTML = original
    e.for.classList.remove('disabled')
    blockapi.notify(
      'success', 
      `Minting is now complete. You can view your item on <a href="${blockmetadata.chain_marketplace}/${store._address}/${id}" target="_blank">
        opensea.io
      </a>.`,
      1000000
    )
  })

  populate()
  window.doon('body')
})()