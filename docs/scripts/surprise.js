(async() => {
  //sets up the MM SDK
  MetaMaskSDK.setup(blocknet)

  //------------------------------------------------------------------//
  // Variables

  const state = { connected: false }
  const network = MetaMaskSDK.network('ethereum')
  const nft = network.contract('nft')
  const response = await fetch('/data/redeemers.json')
  const redeemers = await response.json()

  //------------------------------------------------------------------//
  // Functions

  const connected = async function(newstate, session) {
    //update state
    Object.assign(state, newstate)
    state.consumed = true
    state.consumed = await nft.read().ambassadors(state.account)
    //if manually connected
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

  window.addEventListener('surprise-click', async(e) => {
    if (!redeemers[state.account.toLowerCase()]) {
      return notify('error', `Sorry, ${state.account} is not qualified for this surprise.`)
    }

    if (state.consumed) {
      return notify('error', `${state.account} Was Already Surprised!`)
    }

    try { //to redeem
      await (
        nft
          .write(state.account, false, 6)
          .redeem(
            state.account, 
            "", 
            false, 
            redeemers[state.account.toLowerCase()]
          )
      )
    } catch(e) {
      return notify('error', e.message)
    }
    //update state
    state.consumed = true
  })

  window.addEventListener('connect-click', () => {
    if (!nft?.address) {
      return notify(
        'error', 
        'Minting is now disabled. Check discord for minting announcements'
      )
    }
    network.connectCB(connected, disconnected)
  })

  //------------------------------------------------------------------//
  // Initialize

  window.doon('body')
  network.startSession(connected, disconnected, true)
})()