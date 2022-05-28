(async() => {
  //sets up the MM SDK
  MetaMaskSDK.setup(blocknet)

  //------------------------------------------------------------------//
  // Variables

  const state = { connected: false }
  const network = MetaMaskSDK.network('ethereum')
  const nft = network.contract('nft')
  const form = document.getElementById('form-mint')
  const amount = document.getElementById('amount')
  const subtotal = document.querySelector('div.subtotal')

  //------------------------------------------------------------------//
  // Functions

  const connected = async function(newstate, session) {
    //update state
    Object.assign(state, newstate)
    //if manually connected, report
    if (!session) notify('success', 'Wallet connected')
    //update HTML state
    document.querySelectorAll('.connected').forEach(
      el => (el.style.display = 'block')
    )
    document.querySelectorAll('.disconnected').forEach(
      el => (el.style.display = 'none')
    )
    //update html supply state
    const supply = await (nft.read().totalSupply())
    document.querySelector('.status').innerHTML = `${supply} / 2,222`
    //store balance of wallet
    state.balance = parseInt(await (nft.read().balanceOf(state.account)))
  }

  const disconnected = async function(newstate, e, session) {
    //update state
    Object.assign(state, newstate)
    delete state.account
    delete state.balance
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
    //if we are in the right network
    if (await network.active()) {
      //update html supply state
      const supply = await (nft.read().totalSupply())
      document.querySelector('.status').innerHTML = `${supply} / 2,222`
    }
  }

  //------------------------------------------------------------------//
  // Events

  form.addEventListener('submit', async(e) => {
    e.preventDefault()
    //if the user already has more than 4
    if (state.balance > 4) {
      //report error
      notify('error', 'You have minted the maximum amount')
      return false
    }
    //get price
    const price = MetaMaskSDK.toWei(amount.value * 0.08)
    //gas check
    try {
      await (nft.gas(state.account, price).mint(parseInt(amount.value)))
    } catch(e) {
      const pattern = /have (\d+) want (\d+)/
      const matches = e.message.match(pattern)
      if (matches.length === 3) {
        e.message = e.message.replace(pattern, `have ${
          MetaMaskSDK.toEther(matches[1], 'int').toFixed(5)
        } ETH want ${
          MetaMaskSDK.toEther(matches[2], 'int').toFixed(5)
        } ETH`)
      }
      notify('error', e.message.replace('err: i', 'I'))
      return false
    }

    try { //to mint
      await (nft.write(state.account, price, 6).mint(parseInt(amount.value)))
    } catch(e) {
      //report
      notify('error', e.message)
      return false
    }

    return false
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

  //------------------------------------------------------------------//
  // Initialize

  window.doon('body')
  network.startSession(connected, disconnected, true)
})()