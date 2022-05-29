(async() => {
  //sets up the MM SDK
  MetaMaskSDK.setup(blocknet)

  //------------------------------------------------------------------//
  // Variables

  let interval = null
  let releasing = false
  let unstaking = false

  const state = { 
    connected: false,
    staked: [],
    owned: []
  }

  const network = MetaMaskSDK.network('ethereum')
  const nft = network.contract('nft')
  const token = network.contract('token')
  const staking = network.contract('staking')
  const softing = network.contract('softing')

  //------------------------------------------------------------------//
  // Functions

  const connected = async function(newstate, session) {
    //update state
    Object.assign(state, newstate, {
      rate: MetaMaskSDK.toBigNumber(await (staking.read().TOKEN_RATE()))
    })
    setState(populate)
    //if first time connecting
    if (!session) {
      notify('success', 'Wallet connected')
    }
    //update HTML state
    document.querySelectorAll('.connected').forEach(
      el => (el.style.display = 'block')
    )
    document.querySelectorAll('.disconnected').forEach(
      el => (el.style.display = 'none')
    )
  }

  const setState = async function(next) {
    //get NFTs owned and staked
    state.owned = await (staking.read().ownerTokens(state.account))
    state.owned = state.owned.map(id => parseInt(id)).filter(id => id > 0)
    for (let i = 0; i < state.owned.length; i++) {
      const uri = await (nft.read().tokenURI(state.owned[i]))
      const response = await fetch(uri)
      const json = await response.json()
      state.owned[i] = {
        tokenId: state.owned[i],
        metadata: json
      }
    }
    state.staked = await (staking.read().tokensStaked(state.account))
    state.staked = state.staked.map(id => parseInt(id)).filter(id => id > 0)
    for (let i = 0; i < state.staked.length; i++) {
      const uri = await nft.read().tokenURI(state.staked[i])
      const response = await fetch(uri)
      const json = await response.json()
      state.staked[i] = {
        tokenId: state.staked[i],
        releasable: await staking.read().releaseable(state.staked[i]),
        metadata: json
      }
    }
    //get releasable
    state.releasable = await (staking.read().totalReleaseable(state.account))

    if (typeof next === 'function') {
      next()
    }
  }

  const populate = function() {
    const incrementer = state.rate.mul(
      MetaMaskSDK.toBigNumber(state.staked.length)
    )
    //next update elements
    document.querySelector('div.stats div.staked span').innerHTML = state.staked.length
    document.querySelector('div.stats div.yield span').innerHTML = MetaMaskSDK.toEther(incrementer)
    document.querySelector('div.stats div.releasable span').innerHTML = MetaMaskSDK.toEther(state.releasable)
    let releaseable =  MetaMaskSDK.toBigNumber(state.releasable)
    //clear interval
    if (interval) clearInterval(interval)
    //start interval
    interval = setInterval(() => {
      releaseable = releaseable.add(incrementer)
      document.querySelector('div.stats div.releasable span').innerHTML = MetaMaskSDK.toEther(releaseable)
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

  const disconnected = function(newstate, e, session) {
    //update state
    Object.assign(state, newstate)
    delete state.account
    state.queue = {}
    //if not from session start
    if (!session) {
      //if there's an error
      if (e?.message) {
        notify('error', e.message)
      //if manually disconnected
      } else {
        notify('success', 'Wallet disconnected')
      }
    }
    //update html state
    document.querySelectorAll('.connected').forEach(
      el => (el.style.display = 'none')
    )
    document.querySelectorAll('.disconnected').forEach(
      el => (el.style.display = 'block')
    )
  }

  //------------------------------------------------------------------//
  // Events

  window.addEventListener('stake-click', async(e) => {
    //if disabled already
    if (e.for.classList.contains('disabled')) return
    //get token id
    const tokenId = parseInt(e.for.getAttribute('data-id'))
    //disable button state
    e.for.innerHTML = 'Staking...'
    e.for.classList.add('disabled')
    //get NFTs owned and staked
    const softtokens = await (softing.read().ownerTokens(state.account))
    for (const id of softtokens.staked) {
      if (parseInt(id) == tokenId) {
        //enable button state
        e.for.innerHTML = 'Stake'
        e.for.classList.remove('disabled')
        //report
        return notify('error', 'NFT is already soft staking')
      }
    }
    //inform
    notify('info', 'Waiting for allowance...')
    //if not approved
    if ((await (nft.read().getApproved(tokenId))) != staking._address) {
      try { //to get allowance
        await (
          nft
            .write(state.account, false, 6)
            .approve(staking.address, tokenId)
        )
      } catch(error) {
        //enable button state
        e.for.innerHTML = 'Stake'
        e.for.classList.remove('disabled')
        //report
        return notify('error', error.message)
      }
    }
    //inform
    notify('info', 'Staking sunflower...')
    try { //to stake
      await (staking.write(state.account, false, 2).stake(tokenId))
    } catch(error) {
      //enable button state
      e.for.innerHTML = 'Stake'
      e.for.classList.remove('disabled')
      //report
      return notify('error', error.message)
    }

    //update state
    state.owned = state.owned.filter(token => {
      if (token.tokenId == tokenId) {
        state.staked.push(token)
        return false
      }
      return true
    })
    populate()
  })
  
  window.addEventListener('release-click', async(e) => {
    //if already releasing
    if (releasing) return
    releasing = true
    //inform
    notify('info', 'Releasing all $GRATIS...')
    try { //to release
      await (staking.write(state.account, false, 2).release())
    } catch(e) {
      releasing = false
      return notify('error', e.message)
    }
    //update state
    releasing = false
    state.releasable = 0
    //update UI
    populate()
  })

  window.addEventListener('unstake-click', async(e) => {
    //if already unstaking, do nothing
    if (unstaking) return
    unstaking = true
    //inform
    notify('info', 'Unstaking all sunflowers...')
    try { //to unstake
      await (staking.write(state.account, false, 2).unstake())
    } catch(e) {
      unstaking = true
      return notify('error', e.message)
    }
    //update state
    unstaking = false
    state.owned = state.owned.concat(state.staked)
    state.staked = []
    state.releasable = 0
    //update UI
    populate()
  })

  window.addEventListener('watch-click', async(e) => {
    await token.addToWallet()
  })

  window.addEventListener('connect-click', () => {
    if (!staking?.address) {
      return notify('error', 'Staking is offline right now. Check back later.')
    }
    network.connectCB(connected, disconnected)
  })

  window.addEventListener('disconnect-click', () => {
    disconnected({ connected: false })
  })

  //------------------------------------------------------------------//
  // Initialize

  window.doon('body')
  network.startSession(connected, disconnected, true)
})()