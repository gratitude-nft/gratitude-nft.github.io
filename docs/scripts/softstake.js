(async() => {
  const setState = async function() {
    //get NFTs owned and staked
    const tokens = await blockapi.read(staking, 'ownerTokens', state.account)
    state.owned = tokens.unstaked.map(id => parseInt(id)).filter(id => id > 0)
    state.staked = tokens.staked.map(id => parseInt(id)).filter(id => id > 0)

    for (let i = 0; i < state.owned.length; i++) {
      const uri = await blockapi.read(nft, 'tokenURI', state.owned[i])
      const response = await fetch(uri)
      const json = await response.json()
      state.owned[i] = {
        tokenId: state.owned[i],
        metadata: json
      }
    }

    for (let i = 0; i < state.staked.length; i++) {
      const uri = await blockapi.read(nft, 'tokenURI', state.staked[i])
      const response = await fetch(uri)
      const json = await response.json()
      state.staked[i] = {
        tokenId: state.staked[i],
        releasable: await blockapi.read(staking, 'releaseable', state.staked[i]),
        metadata: json
      }
    }
    //get releasable
    state.releasable = await blockapi.read(
      staking, 
      'totalReleaseable', 
      state.staked.map(staked => staked.tokenId)
    )
  }

  const updateUI = function() {
    const incrementer = state.rate.mul(new BN(state.staked.length))
    //next update elements
    document.querySelector('div.stats div.staked span').innerHTML = state.staked.length
    document.querySelector('div.stats div.yield span').innerHTML = blockapi.toEther(incrementer)
    document.querySelector('div.stats div.releasable span').innerHTML = blockapi.toEther(state.releasable)
    let releaseable = new BN(state.releasable)
    //clear interval
    if (interval) clearInterval(interval)
    //start interval
    interval = setInterval(() => {
      releaseable = releaseable.add(incrementer)
      document.querySelector('div.stats div.releasable span').innerHTML = blockapi.toEther(releaseable)
    }, 1000)
    const rows = []
    const template = document.getElementById('tpl-asset').innerHTML
    //next add rows
    for (let i = 0; i < state.staked.length; i++) {
      rows.push(template
        .replace('{TOKEN_ID}', state.staked[i].tokenId)
        .replace('{TOKEN_ID}', state.staked[i].tokenId)
        .replace('{IMAGE}', state.staked[i].metadata.preview || state.staked[i].metadata.image)
        .replace('{NAME}', state.staked[i].metadata.name)
        .replace('{STATE}', 'staked')
        .replace('{ACTION}', 'Unstake')
        .replace('{CLASS}', 'btn-danger')
      )
    }

    for (let i = 0; i < state.owned.length; i++) {
      rows.push(template
        .replace('{TOKEN_ID}', state.owned[i].tokenId)
        .replace('{TOKEN_ID}', state.owned[i].tokenId)
        .replace('{IMAGE}', state.owned[i].metadata.preview || state.owned[i].metadata.image)
        .replace('{NAME}', state.owned[i].metadata.name)
        .replace('{STATE}', 'unstaked')
        .replace('{ACTION}', 'Stake')
        .replace('{CLASS}', 'btn-primary')
      )
    }

    document.querySelector('a.cta-release').style.display = state.staked.length
      ? 'block' : 'none'

    document.querySelector('div.assets').innerHTML = rows.join('')

    window.doon('div.assets')
  }

  const connected = async function(newstate, session) {
    Object.assign(state, newstate, { 
      connected: true,
      rate: new BN(await blockapi.read(staking, 'TOKEN_RATE'))
    })
    //if first time connecting
    if (!session) {
      notify('success', 'Wallet connected')
    }
    document.getElementById('connected').style.display = 'block'
    document.getElementById('disconnected').style.display = 'none'
    
    await setState()
    //update the UI
    updateUI()
  }

  const disconnected = function(e, session) {
    if (e?.message) {
      notify('error', e.message)
    } else {
      //if first time connecting
      if (!session) {
        notify('success', 'Wallet disconnected')
      }
      state.queue = {}
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

  let interval = null;
  const BN = blockapi.web3().utils.BN
  const nft = blockapi.contract('nft')
  const staking = blockapi.contract('softing')
  const token = blockapi.contract('token')
  const state = { 
    connected: false,
    queue: {},
    staked: [],
    owned: []
  }

  window.addEventListener('queue-click', async(e) => {
    //get tokenId
    const tokenId = parseInt(e.for.getAttribute('data-id'))
    
    //if already queued up
    if (state.queue[tokenId]) {
      //remove from queue
      delete state.queue[tokenId]
      e.for.classList.add('btn-solid')
      e.for.classList.remove('btn-outline')
      //update item button ui
      if (e.for.getAttribute('data-state') === 'staked') {
        e.for.innerHTML = 'Unstake'
        for (const id in state.queue) {
          if (state.queue[id] === 'to_unstake') return
        }
        document.querySelector('#connected .actions .unstake').classList.add('hide')
        return
      } else {
        e.for.innerHTML = 'Stake'
        for (const id in state.queue) {
          if (state.queue[id] === 'to_stake') return
        }
        document.querySelector('#connected .actions .stake').classList.add('hide')
      }

      return
    }
    //it's not queued
    e.for.innerHTML = 'Queued'
    e.for.classList.remove('btn-solid')
    e.for.classList.add('btn-outline')
    if (e.for.getAttribute('data-state') === 'staked') {
      state.queue[tokenId] = 'to_unstake'
      document.querySelector('#connected .actions .unstake').classList.remove('hide')
    } else {
      state.queue[tokenId] = 'to_stake'
      document.querySelector('#connected .actions .stake').classList.remove('hide')
    }
  })

  window.addEventListener('stake-click', async(e) => {
    //if disabled already
    if (e.for.classList.contains('disabled')) return
    e.for.innerHTML = 'Staking...'
    e.for.classList.add('disabled')
    const forStaking = []
    for (const id in state.queue) {
      if (state.queue[id] === 'to_stake') forStaking.push(id)
    }

    if (!forStaking.length) {
      notify('error', 'No NFTs Selected')
      e.for.innerHTML = 'Stake'
      e.for.classList.remove('disabled')
      return false
    }

    //stake
    notify('info', 'Staking sunflowers...')
    try {
      await send(staking, 'stake', 2, 0, forStaking)
    } catch(error) {
      notify('error', error.message)
      e.for.innerHTML = 'Stake'
      e.for.classList.remove('disabled')
      return false
    }

    e.for.innerHTML = 'Stake'
    e.for.classList.remove('disabled')
    document.querySelector('#connected .actions .stake').classList.add('hide')
    document.querySelector('#connected .actions .unstake').classList.add('hide')

    //update state
    await setState()
    updateUI()
  })

  let releasing = false
  window.addEventListener('release-click', async(e) => {
    if (releasing) return
    releasing = true
    notify('info', 'Releasing all $GRATIS...')
    try {
      await send(staking, 'release', 2, 0, state.staked.map(token => token.tokenId))
    } catch(e) {
      notify('error', e.message)
      return false
    }
    //update state
    releasing = false
    state.releasable = 0
    updateUI()
  })

  window.addEventListener('unstake-click', async(e) => {
    //if disabled already
    if (e.for.classList.contains('disabled')) return
    e.for.innerHTML = 'Unstaking...'
    e.for.classList.add('disabled')
    const forUnstaking = []
    for (const id in state.queue) {
      if (state.queue[id] === 'to_unstake') forUnstaking.push(id)
    }

    if (!forUnstaking.length) {
      notify('error', 'No NFTs Selected')
      e.for.innerHTML = 'Unstake'
      e.for.classList.remove('disabled')
      return false
    }

    try {
      await send(staking, 'unstake', 2, 0, forUnstaking)
    } catch(error) {
      notify('error', error.message)
      e.for.innerHTML = 'Unstake'
      e.for.classList.remove('disabled')
      return false
    }

    e.for.innerHTML = 'Unstake'
    e.for.classList.remove('disabled')
    document.querySelector('#connected .actions .stake').classList.add('hide')
    document.querySelector('#connected .actions .unstake').classList.add('hide')

    //update state
    await setState()
    updateUI()
  })

  window.addEventListener('watch-click', async(e) => {
    const image = 'https://www.gratitudegang.io/images/mint/minting-icon.png'
    blockapi.watch(blockmetadata, token._address, 'ERC20', 'GRATIS', 18, image)
  })

  window.addEventListener('connect-click', () => {
    blockapi.connect(blockmetadata, connected, disconnected)
  })

  window.addEventListener('disconnect-click', () => {
    delete state.account
    disconnected()
  })

  window.doon('body')
  blockapi.startSession(blockmetadata, connected, disconnected, true)
})()