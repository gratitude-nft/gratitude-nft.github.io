(async() => {
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
    
    //get NFTs owned and staked
    state.owned = await blockapi.read(staking, 'ownerTokens', state.account)
    state.owned = state.owned.map(id => parseInt(id)).filter(id => id > 0)
    for (let i = 0; i < state.owned.length; i++) {
      const uri = await blockapi.read(nft, 'tokenURI', state.owned[i])
      const response = await fetch(uri)
      const json = await response.json()
      state.owned[i] = {
        tokenId: state.owned[i],
        metadata: json
      }
    }
    state.staked = await blockapi.read(staking, 'tokensStaked', state.account)
    state.staked = state.staked.map(id => parseInt(id)).filter(id => id > 0)
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
    state.releasable = await blockapi.read(staking, 'totalReleaseable', state.account)
    //update the UI
    updateUI()
  }

  let interval = null;
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
        .replace('{YIELD}', '')//blockapi.toEther(state.staked[i].releasable)
        .replace('{STAKE_HIDE}', ' hide')
        .replace('{UNSTAKE_HIDE}', '')
      )
    }

    for (let i = 0; i < state.owned.length; i++) {
      rows.push(template
        .replace('{TOKEN_ID}', state.owned[i].tokenId)
        .replace('{TOKEN_ID}', state.owned[i].tokenId)
        .replace('{IMAGE}', state.owned[i].metadata.preview || state.owned[i].metadata.image)
        .replace('{NAME}', state.owned[i].metadata.name)
        .replace('{YIELD}', '')
        .replace('{STAKE_HIDE}', '')
        .replace('{UNSTAKE_HIDE}', ' hide')
      )
    }

    if (state.staked.length) {
      document.querySelector('a.cta-release').style.display = 'block'
      document.querySelector('a.cta-unstake').style.display = 'block'
    } else {
      document.querySelector('a.cta-release').style.display = 'none'
      document.querySelector('a.cta-unstake').style.display = 'none'
    }

    document.querySelector('div.assets').innerHTML = rows.join('')

    window.doon('div.assets')
  }

  const disconnected = function(e, session) {
    if (e?.message) {
      notify('error', e.message)
    } else {
      //if first time connecting
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

  const BN = blockapi.web3().utils.BN
  const nft = blockapi.contract('nft')
  const staking = blockapi.contract('staking')
  const token = blockapi.contract('token')
  const state = { 
    connected: false,
    staked: [],
    owned: []
  }

  window.addEventListener('stake-click', async(e) => {
    return notify('error', 'Staking is available after the reveal.')
    //if disabled already
    if (e.for.classList.contains('disabled')) return
    const tokenId = parseInt(e.for.getAttribute('data-id'))
    e.for.innerHTML = 'Staking...'
    e.for.classList.add('disabled')
    //ask for allowance
    notify('info', 'Waiting for allowance...')
    if ((await blockapi.read(nft, 'getApproved', tokenId)) != staking._address) {
      try {
        await send(nft, 'approve(address,uint256)', 6, 0, staking._address, tokenId)
      } catch(error) {
        notify('error', error.message)
        e.for.innerHTML = 'Stake'
        e.for.classList.remove('disabled')
        return false
      }
    }

    //stake
    notify('info', 'Staking sunflower...')
    try {
      await send(staking, 'stake(uint256)', 2, 0, tokenId)
    } catch(error) {
      notify('error', error.message)
      e.for.innerHTML = 'Stake'
      e.for.classList.remove('disabled')
      return false
    }

    //update state
    state.owned = state.owned.filter(token => {
      if (token.tokenId == tokenId) {
        state.staked.push(token)
        return false
      }
      return true
    })
    updateUI()
  })

  let releasing = false
  window.addEventListener('release-click', async(e) => {
    if (releasing) return
    releasing = true
    notify('info', 'Releasing all $GRATIS...')
    try {
      await send(staking, 'release', 2, 0)
    } catch(e) {
      notify('error', e.message)
      return false
    }
    //update state
    releasing = false
    state.releasable = 0
    updateUI()
  })

  let unstaking = false
  window.addEventListener('unstake-click', async(e) => {
    if (unstaking) return
    unstaking = true
    notify('info', 'Unstaking all sunflowers...')
    try {
      await send(staking, 'unstake', 2, 0)
    } catch(e) {
      notify('error', e.message)
      return false
    }

    //update state
    unstaking = false
    state.owned = state.owned.concat(state.staked)
    state.staked = []
    state.releasable = 0
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