(async() => {
  //sets up the MM SDK
  MetaMaskSDK.setup(blocknet)

  //------------------------------------------------------------------//
  // Variables

  let populated = false
  
  const state = { connected: false }
  const network = MetaMaskSDK.network('ethereum')
  const store = network.contract('store')
  const token = network.contract('token')
  const items = document.querySelector('div.items')
  const template = {
    modal: document.getElementById('modal-item').innerHTML,
    item: document.getElementById('tpl-item').innerHTML
  }

  //------------------------------------------------------------------//
  // Functions

  const connected = function(newstate, session) {
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
  }

  const populate = async function() {
    //if already populated
    if (populated) return
    //reset items container
    items.innerHTML = ''
    //populate items in item container
    for (let i = 0; true; i++) {
      try { // to get metadata
        const response = await fetch(`/data/gifts/${i + 1}.json`)
        const json = await response.json()
        //get info
        const info = await (store.read().tokenInfo(i + 1))

        const item = toElement(template.item
          .replace('{IMAGE}', `/images/store/GoG-${i + 1}-preview.jpg`)//json.preview || json.image
          .replace('{ID}', i + 1)
          .replace('{NAME}', json.name)
          .replace('{ETH_HIDE}', info.eth > 0 ? '' : ' hide')
          .replace('{ETH_PRICE}', info.eth > 0 ? MetaMaskSDK.toEther(info.eth) : 0)
          .replace('{GRATIS_HIDE}', info.gratis > 0 ? '' : ' hide')
          .replace('{GRATIS_PRICE}', info.gratis > 0 ? MetaMaskSDK.toEther(info.gratis): 0)
          .replace('{SUPPLY}', info.max > 0 
            ? (info.supply > 0 || info.max < 26 ? `${info.max - info.supply}/${info.max} remaining`: '')
            : (info.supply > 0 ? `${info.supply} sold`: '')
          )
        )
        //flag populated now
        populated = true
        //add to items container
        items.appendChild(item)
        //listen for event states
        window.doon(item)
      } catch(e) {
        break
      }
    }
  }

  const disconnected = async function(newstate, e, session) {
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

  const toElement = function(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
  }

  //------------------------------------------------------------------//
  // Events

  window.addEventListener('connect-click', async () => {
    if (!store?.address) {
      return notify('error', 'Store is offline. Please check back later.')
    }
    await network.connectCB(connected, disconnected)
  })

  window.addEventListener('buy-eth-click', async function buyETH(e) {
    //if not connected
    if (!state.account) {
      //connect and try again
      return network.connect(newstate => {
        connected(newstate)
        buyETH(e)
      }, disconnected)
    }
    //get all variables needed for this transaction
    const id = parseInt(e.for.getAttribute('data-id'))
    const max = parseInt(e.for.getAttribute('data-max'))
    const price = e.for.getAttribute('data-price')
    const supply = parseInt(e.for.getAttribute('data-supply'))
    //validation
    if (price == 0) {
      return notify('error', 'Item is unavailable right now')
    } else if (max > 0 && max <= supply) {
      return notify('error', 'Item is sold out')
    }

    //disable button state
    const original = e.for.innerHTML
    e.for.innerHTML = 'Minting...'
    e.for.classList.add('disabled')
    //inform
    notify('info', 'Minting item...')
    try { //to buy
      await (
        store
          .write(state.account, price, 6)
          .buy(state.account, id, 1)
      )
    } catch(error) {
      //enable button state
      e.for.innerHTML = original
      e.for.classList.remove('disabled')
      //report
      return notify('error', error.message)
    }

    //enable button state
    e.for.innerHTML = original
    e.for.classList.remove('disabled')
    //report
    notify(
      'success', 
      `Minting is now complete. You can view your item on <a href="${
        network.config.chain_marketplace
      }/${store.address}/${id}" target="_blank">
        opensea.io
      </a>.`,
      1000000
    )
  })

  window.addEventListener('buy-gratis-click', async function buyGRATIS(e) {
    //if not connected
    if (!state.account) {
      //connect and try again
      return network.connect(newstate => {
        connected(newstate)
        buyGRATIS(e)
      }, disconnected)
    }
    //get variables needed for this transaction
    const id = parseInt(e.for.getAttribute('data-id'))
    const max = parseInt(e.for.getAttribute('data-max'))
    const price = e.for.getAttribute('data-price')
    const supply = parseInt(e.for.getAttribute('data-supply'))
    //validate
    if (price == 0) {
      return notify('error', 'Item is unavailable right now')
    } else if (max > 0 && max <= supply) {
      return notify('error', 'Item is sold out')
    }
    //check gratis balance
    const balance = await (token.read().balanceOf(state.account))
    if ((balance - price) < 0) {
      return notify('error', 'Not enough GRATIS in your wallet')
    }
    //disable button state
    const original = e.for.innerHTML
    e.for.innerHTML = 'Minting...'
    e.for.classList.add('disabled')
    //inform
    notify('info', 'Minting item...')
    try { //to support
      await (
        store
          .write(state.account, false, 6)
          .support(state.account, id, 1)
      )
    } catch(error) {
      //enable button state
      e.for.innerHTML = original
      e.for.classList.remove('disabled')
      //report
      return notify('error', error.message)
    }

    //enable button state
    e.for.innerHTML = original
    e.for.classList.remove('disabled')
    //report
    notify(
      'success', 
      `Minting is now complete. You can view your item on <a href="${
        blockmetadata.chain_marketplace
      }/${store._address}/${id}" target="_blank">
        opensea.io
      </a>.`,
      1000000
    )
  })

  window.addEventListener('modal-open-click', async (e) => {
    //get id
    const id = parseInt(e.for.getAttribute('data-id'))
    //get metadata
    const response = await fetch(`/data/gifts/${id}.json`)
    const json = await response.json()
    //get info
    const info = await (store.read().tokenInfo(id))

    //if it's a song
    if ('song' in json && json.animation_url) {}

    const modal = toElement(template.modal
      .replace('{IMAGE}', `/images/store/GoG-${id}-preview.jpg`)//json.preview || json.image
      .replace('{AUDIO}', 'song' in json && json.animation_url
        ? `<audio controls><source src="/images/store/GoG-${id}-compressed.mp3" type="audio/mpeg" /></audio>`
        : ''
      )
      .replace('{ID}', id)
      .replace('{ID}', id)
      .replace('{NAME}', json.name)
      .replace('{DESCRIPTION}', json.description
        .replace(/(https?:\/\/[^\s]+)/g, url => {
          return `<a href="${url}" target="_blank">${url}</a>`;
        })
        .replace(/\n/g, '<br />')
      )
      .replace('{ETH_HIDE}', info.eth > 0 ? '' : ' hide')
      .replace('{ETH_PRICE}', info.eth > 0 ? info.eth : 0)
      .replace('{ETH_PRICE}', info.eth > 0 ? MetaMaskSDK.toEther(info.eth) : 0)
      .replace('{GRATIS_HIDE}', info.gratis > 0 ? '' : ' hide')
      .replace('{GRATIS_PRICE}', info.gratis > 0 ? info.gratis : 0)
      .replace('{GRATIS_PRICE}', info.gratis > 0 ? MetaMaskSDK.toEther(info.gratis): 0)
      .replace('{SUPPLY}', info.max > 0 
        ? (info.supply > 0 || info.max < 26 ? `${info.max - info.supply}/${info.max} remaining`: '')
        : (info.supply > 0 ? `${info.supply} sold`: '')
      )
      .replace('{MAX}', info.max)
      .replace('{MAX}', info.max)
      .replace('{SUPPLY}', info.supply)
      .replace('{SUPPLY}', info.supply)
    )

    document.body.appendChild(modal)
    window.doon(modal)
  })

  window.addEventListener('modal-overlay-close-click', (e) => {
    if (e.originalEvent.target.classList.contains('modal')) {
      document.body.removeChild(e.for)
    }
  })

  window.addEventListener('modal-close-click', (e) => {
    const modal = document.querySelector(e.for.getAttribute('data-target'))
    modal.parentNode.removeChild(modal)
  })

  //------------------------------------------------------------------//
  // Initialize

  window.doon('body')
  populate()
  //check hash
  if (window.location.hash) {
    //open modal
    const trigger = document.createElement('div')
    trigger.setAttribute('data-do', 'modal-open')
    trigger.setAttribute('data-id', window.location.hash.substring(1))
    trigger.setAttribute('data-on', 'click')
    window.doon(trigger)
    trigger.click()
  }
  network.startSession(connected, disconnected, true)
})()