(async() => {
  //sets up the MM SDK
  MetaMaskSDK.setup(blocknet)

  //------------------------------------------------------------------//
  // Variables

  let interval = null
  let releasing = false

  const state = { 
    connected: false,
    queue: {},
    staked: [],
    owned: []
  }

  const network = MetaMaskSDK.network('ethereum')
  const nft = network.contract('nft')
  const token = network.contract('token')
  const staking = network.contract('softing')

  //------------------------------------------------------------------//
  // Functions

  const setState = async function(next) {
    //get NFTs owned and staked
    const tokens = await staking.read().ownerTokens(state.account)
    state.owned = tokens.unstaked.map(id => parseInt(id)).filter(id => id > 0)
    state.staked = tokens.staked.map(id => parseInt(id)).filter(id => id > 0)
    //set NFTs in wallet
    for (let i = 0; i < state.owned.length; i++) {
      const uri = await nft.read().tokenURI(state.owned[i])
      const response = await fetch(uri)
      const json = await response.json()
      state.owned[i] = {
        tokenId: state.owned[i],
        metadata: json
      }
    }
    //set NFTs staking
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
    //set releasable
    state.releasable = await staking.read().totalReleaseable(
      state.staked.map(staked => staked.tokenId)
    )

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
    //get the starting releaseable
    let releaseable = MetaMaskSDK.toBigNumber(state.releasable)
    //clear interval, start interval
    if (interval) clearInterval(interval)
    interval = setInterval(() => {
      //periodically update the tokens earned
      releaseable = releaseable.add(incrementer)
      document.querySelector('div.stats div.releasable span').innerHTML = MetaMaskSDK.toEther(releaseable)
    }, 1000)


    //next add rows
    const rows = []
    const template = document.getElementById('tpl-asset').innerHTML
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
    //update state
    Object.assign(state, newstate, { 
      connected: true,
      rate: MetaMaskSDK.toBigNumber(
        await (staking.read().TOKEN_RATE())
      )
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
        document.querySelector('.connected .actions .unstake').classList.add('hide')
        return
      } else {
        e.for.innerHTML = 'Stake'
        for (const id in state.queue) {
          if (state.queue[id] === 'to_stake') return
        }
        document.querySelector('.connected .actions .stake').classList.add('hide')
      }

      return
    }
    //it's not queued
    e.for.innerHTML = 'Queued'
    e.for.classList.remove('btn-solid')
    e.for.classList.add('btn-outline')
    if (e.for.getAttribute('data-state') === 'staked') {
      state.queue[tokenId] = 'to_unstake'
      document.querySelector('.connected .actions .unstake').classList.remove('hide')
    } else {
      state.queue[tokenId] = 'to_stake'
      document.querySelector('.connected .actions .stake').classList.remove('hide')
    }
  })

  window.addEventListener('stake-click', async(e) => {
    //if disabled already
    if (e.for.classList.contains('disabled')) return
    //disable button state
    e.for.innerHTML = 'Staking...'
    e.for.classList.add('disabled')
    //determine with NFTs are for staking
    const forStaking = []
    for (const id in state.queue) {
      if (state.queue[id] === 'to_stake') forStaking.push(id)
    }
    //if no NFTs selected
    if (!forStaking.length) {
      //enable button state
      e.for.innerHTML = 'Stake'
      e.for.classList.remove('disabled')
      //report
      return notify('error', 'No NFTs Selected')
    }

    //stake
    notify('info', 'Staking sunflowers...')
    try { //to stake
      await (staking.write(state.account, false, 2).stake(forStaking))
    } catch(error) {
      //enable button state
      e.for.innerHTML = 'Stake'
      e.for.classList.remove('disabled')
      //report
      return notify('error', error.message)
    }

    //enable button state
    e.for.innerHTML = 'Stake'
    e.for.classList.remove('disabled')
    //hide button actions (by default, then setState will change again)
    document.querySelector('.connected .actions .stake').classList.add('hide')
    document.querySelector('.connected .actions .unstake').classList.add('hide')
    //update state
    await setState()
    //update UI
    populate()
  })

  window.addEventListener('release-click', async(e) => {
    //if already releasing, do nothing
    if (releasing) return
    releasing = true
    //report
    notify('info', 'Releasing all $GRATIS...')
    try { //to release
      await (staking.write(state.account, false, 2).release(
        state.staked.map(token => token.tokenId)
      ))
    } catch(e) {
      releasing = false
      //report
      return notify('error', e.message)
    }
    //update state
    releasing = false
    state.releasable = 0
    //update UI
    populate()
  })

  window.addEventListener('unstake-click', async(e) => {
    //if disabled already, do nothing
    if (e.for.classList.contains('disabled')) return
    //disable button state
    e.for.innerHTML = 'Unstaking...'
    e.for.classList.add('disabled')
    //determine which ones for unstaking
    const forUnstaking = []
    for (const id in state.queue) {
      if (state.queue[id] === 'to_unstake') forUnstaking.push(id)
    }
    //if nothing is for unstaking
    if (!forUnstaking.length) {
      //enable button state
      e.for.innerHTML = 'Unstake'
      e.for.classList.remove('disabled')
      //report
      return notify('error', 'No NFTs Selected')
    }

    try { //to unstake
      await (staking.write(state.account, false, 2).unstake(forUnstaking))
    } catch(error) {
      //enable button state
      e.for.innerHTML = 'Unstake'
      e.for.classList.remove('disabled')
      //report
      return notify('error', error.message)
    }
    //enable button state
    e.for.innerHTML = 'Unstake'
    e.for.classList.remove('disabled')
    //hide button actions (by default, then setState will change again)
    document.querySelector('.connected .actions .stake').classList.add('hide')
    document.querySelector('.connected .actions .unstake').classList.add('hide')

    //update state
    await setState()
    //update UI
    populate()
  })

  window.addEventListener('watch-click', async(e) => {
    await token.addToWallet()
  })

  window.addEventListener('connect-click', () => {
    if (!staking?.address) {
      return notify('error', 'Soft Staking is offline right now. Check back later.')
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