(async () => {
  //sets up the MM SDK
  MetaMaskSDK.setup(blocknet)

  //------------------------------------------------------------------//
  // Variables

  let online = false
  
  const state = { connected: false }
  const fields = {
    amount: document.getElementById('amount'),
    direction: document.getElementById('direction'),
    network: document.getElementById('network'),
    tx: document.getElementById('tx')
  }

  const template = {
    bridge: document.getElementById('tpl-modal-bridge').innerHTML,
    redeem: document.getElementById('tpl-modal-redeem').innerHTML
  }

  //------------------------------------------------------------------//
  // Functions

  const toElement = function(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
  }

  //------------------------------------------------------------------//
  // Events

  window.addEventListener('bridge-start-click', (e) => {
    const modal = document.querySelector('div.modal')
    const amount = fields.amount.value
    const direction = fields.direction.value == 'pe' 
      ? [ 'polygon', 'ethereum' ]
      : [ 'ethereum', 'polygon' ]

    const sourceNetwork = MetaMaskSDK.network(direction[0])
    const destinationNetwork = MetaMaskSDK.network(direction[1])

    const steps = Array.from(modal.querySelectorAll('div.step'))

    modal.querySelector('div.info').style.display = 'none'
    modal.querySelector('div.steps').style.display = 'block'

    sourceNetwork.connectCB(async (newstate) => {
      //update state
      Object.assign(state, newstate)

      //Step 1: Checking Balance
      steps[0].classList.add('progress')
      steps[0].classList.remove('pending')
      const balance = await (
        sourceNetwork
          .contract('token')
          .read()
          .balanceOf(state.account)
      )
      //if the account does not have enough tokens
      if (parseInt(balance.toString()) < parseInt(MetaMaskSDK.toWei(amount))) {
        //go back one step
        modal.querySelector('div.info').style.display = 'block'
        modal.querySelector('div.steps').style.display = 'none'
        //report
        return notify('error', `You do not have ${amount} Gratis in this wallet.`)
      }

      //Step 2: Switching Network
      steps[0].classList.add('done')
      steps[0].classList.remove('progress')
      steps[1].classList.add('progress')
      steps[1].classList.remove('pending')
      try { //to switch networks
        await sourceNetwork.changeInWallet()
      } catch(error) {
        //go back one step
        modal.querySelector('div.info').style.display = 'block'
        modal.querySelector('div.steps').style.display = 'none'
        //report
        return notify('error', error.message)
      }

      //Step 3: Stashing Gratis
      steps[1].classList.add('done')
      steps[1].classList.remove('progress')
      steps[2].classList.add('progress')
      steps[2].classList.remove('pending')
      
      try { //to bridge token
        await (
          sourceNetwork
            .contract('bridge')
            .write(state.account, false, 2)
            .bridge(
              destinationNetwork.config.chain_id,
              destinationNetwork.contract('bridge').address,
              MetaMaskSDK.toWei(amount)
            )
        )
      } catch(error) {
        //go back one step
        modal.querySelector('div.info').style.display = 'block'
        modal.querySelector('div.steps').style.display = 'none'
        //report
        return notify('error', error.message)
      }
      //get the last tx id
      const txId = await (sourceNetwork.contract('bridge').read().lasdId())
      //update this step UI with the tx id
      steps[2].querySelector('div.notes').innerHTML = 
        `Remember this transaction id: <strong>${txId}</strong>`

      //Step 4: Signing Transaction
      steps[2].classList.add('done')
      steps[2].classList.remove('progress')
      steps[3].classList.add('progress')
      steps[3].classList.remove('pending')

      const response = await fetch(blocknet.bridge
        .replace('{SOURCE}', direction[0])
        .replace('{DESTINATION}', direction[1])
        .replace('{TX}', txId)
      )
      const json = await response.json()

      if (json.error) {
        notify('error', json.message)
        modal.querySelector('div.info').style.display = 'block'
        modal.querySelector('div.steps').style.display = 'none'
        return false
      }
      
      //Step 5: Changing Network
      steps[3].classList.add('done')
      steps[3].classList.remove('progress')
      steps[4].classList.add('progress')
      steps[4].classList.remove('pending')
      try { //to switch networks
        await destinationNetwork.changeInWallet()
      } catch(error) {
        //go back one step
        modal.querySelector('div.info').style.display = 'block'
        modal.querySelector('div.steps').style.display = 'none'
        //report
        return notify('error', error.message)
      }

      //Step 6: Redeeming Gratis
      steps[4].classList.add('done')
      steps[4].classList.remove('progress')
      steps[5].classList.add('progress')
      steps[5].classList.remove('pending')

      try { //to redeem token
        await (
          destinationNetwork
            .contract('bridge')
            .write(state.account, false, 2)
            .secureRedeem(
              json.results.tx,
              MetaMaskSDK.toWei(amount),
              json.results.recipient,
              json.results.voucher
            )
        )
      } catch(error) {
        //go back one step
        modal.querySelector('div.info').style.display = 'block'
        modal.querySelector('div.steps').style.display = 'none'
        return notify('error', error.message)
      }

      //add token to wallet
      await (destinationNetwork.contract('token').addToWallet())

      //clean up
      steps[5].classList.add('done')
      steps[5].classList.remove('progress')
      modal.querySelector('div.steps a.btn').style.display = 'block'
      //report
      notify('success', 'Bridging Complete')
    }, () => {})
  })

  window.addEventListener('redeem-start-click', (e) => {
    const modal = document.querySelector('div.modal')
    const txId = parseInt(fields.tx.value)
    const source = fields.network.value === 'ethereum' ? 'polygon': 'ethereum'
    const destination = fields.network.value
    const destinationNetwork = MetaMaskSDK.network(destination)

    const steps = Array.from(modal.querySelectorAll('div.step'))

    modal.querySelector('div.info').style.display = 'none'
    modal.querySelector('div.steps').style.display = 'block'

    destinationNetwork.connectCB(async (newstate) => {
      //update state
      Object.assign(state, newstate)

      //Step 1: Switching Network
      steps[0].classList.add('progress')
      steps[0].classList.remove('pending')
      try {
        await destinationNetwork.changeInWallet()
      } catch(error) {
        //go back a step
        modal.querySelector('div.info').style.display = 'block'
        modal.querySelector('div.steps').style.display = 'none'
        return notify('error', error.message)
      }

      //Step 2: Checking Transaction
      steps[0].classList.add('done')
      steps[0].classList.remove('progress')
      steps[1].classList.add('progress')
      steps[1].classList.remove('pending')

      //get tx information
      const tx = await (
        destinationNetwork
          .contract('bridge')
          .read()
          .txs(txId)
      );
      //if wrong contract id
      if (tx.contractId != destinationNetwork.config.chain_id) {
        //go back a step
        modal.querySelector('div.info').style.display = 'block'
        modal.querySelector('div.steps').style.display = 'none'
        //report
        return notify('error', `Transaction ID given is not for ${destination}.`)
      }
      //if wrong contract address
      if (tx.contractAddress !== blockmetadata[destination].contracts.bridge.address) {
        //go back a step
        modal.querySelector('div.info').style.display = 'block'
        modal.querySelector('div.steps').style.display = 'none'
        //report
        return notify('error', `Transaction ID given is not for destination ${destination} contract.`)
      }
      //if wrong owner
      if (tx.owner.toLowerCase() !== state.account.toLowerCase()) {
        //go back a step
        modal.querySelector('div.info').style.display = 'block'
        modal.querySelector('div.steps').style.display = 'none'
        //report
        return notify('error', `You are not the owner of this transaction.`)
      }

      //Step 3: Signing Transaction
      steps[1].classList.add('done')
      steps[1].classList.remove('progress')
      steps[2].classList.add('progress')
      steps[2].classList.remove('pending')

      const response = await fetch(blocknet.bridge
        .replace('{SOURCE}', source)
        .replace('{DESTINATION}', destination)
        .replace('{TX}', txId)
      )
      const json = await response.json()
      //if oracle error
      if (json.error) {
        //go back a step
        modal.querySelector('div.info').style.display = 'block'
        modal.querySelector('div.steps').style.display = 'none'
        //report
        return notify('error', json.message)
      }

      //Step 4: Changing Network
      steps[2].classList.add('done')
      steps[2].classList.remove('progress')
      steps[3].classList.add('progress')
      steps[3].classList.remove('pending')
      try {
        await destinationNetwork.changeInWallet()
      } catch(error) {
        //go back a step
        modal.querySelector('div.info').style.display = 'block'
        modal.querySelector('div.steps').style.display = 'none'
        //report
        return notify('error', error.message)
      }

      //Step 5: Redeeming Gratis
      steps[3].classList.add('done')
      steps[3].classList.remove('progress')
      steps[4].classList.add('progress')
      steps[4].classList.remove('pending')

      try { // to redeem tokens
        await (
          destinationNetwork
            .contract('bridge')
            .write(state.account, false, 2)
            .secureRedeem(
              json.results.tx,
              tx.amount,
              json.results.recipient,
              json.results.voucher
            )
        )
      } catch(error) {
        //go back a step
        modal.querySelector('div.info').style.display = 'block'
        modal.querySelector('div.steps').style.display = 'none'
        return notify('error', error.message)
      }

      //add token to wallet
      await (destinationNetwork.contract('token').addToWallet())

      //clean up
      steps[5].classList.add('done')
      steps[5].classList.remove('progress')
      modal.querySelector('div.steps a.btn').style.display = 'block'
      //report
      notify('success', 'Redeem Complete')
    }, () => {})
  })

  window.addEventListener('bridge-click', async (e) => {
    if (!online) {
      return notify('error', 'Bridge is offline')
    }
    const amount = fields.amount.value
    const direction = fields.direction.value == 'pe' 
      ? [ 'polygon', 'ethereum' ]
      : [ 'ethereum', 'polygon' ]

    if (!amount) {
      return notify('error', 'No amount specified')
    }
    //open modal
    const modal = toElement(template.bridge
      .replace('{AMOUNT}', amount)
      .replace('{SOURCE}', direction[0])
      .replace('{SOURCE}', direction[0])
      .replace('{DESTINATION}', direction[1])
      .replace('{DESTINATION}', direction[1])
    )
    document.body.appendChild(modal)
    window.doon(modal)
  })

  window.addEventListener('redeem-click', async (e) => {
    if (!online) {
      return notify('error', 'Bridge is offline')
    }
    const tx = fields.tx.value
    const network = fields.network.value

    if (!tx) {
      return notify('error', 'No transaction ID specified')
    }

    //open modal
    const modal = toElement(template.redeem
      .replace('{TX}', tx)
      .replace('{DESTINATION}', network)
      .replace('{DESTINATION}', network)
    )
    document.body.appendChild(modal)
    window.doon(modal)
  })

  window.addEventListener('redeem-toggle-click', (e) => {
    document.querySelector('div.transfer').style.display = 'none'
    document.querySelector('div.redeem').style.display = 'block'
  })

  window.addEventListener('transfer-toggle-click', (e) => {
    document.querySelector('div.transfer').style.display = 'block'
    document.querySelector('div.redeem').style.display = 'none'
  })

  window.addEventListener('modal-close-click', (e) => {
    const modal = document.querySelector('div.modal')
    modal.parentNode.removeChild(modal)
  })

  //------------------------------------------------------------------//
  // Initialize
  window.doon('body')

  try {
    const response = await fetch(blocknet.ping)
    const json = await response.json()

    if (json.error) {
      document.querySelector('div.status').classList.add('text-danger')
      document.querySelector('div.status').innerHTML = 'Offline'
    } else {
      document.querySelector('div.status').classList.add('text-success')
      document.querySelector('div.status').innerHTML = 'Online'
      online = true
    }
  } catch(e) {
    document.querySelector('div.status').classList.add('text-danger')
    document.querySelector('div.status').innerHTML = 'Offline'
  }

})()

particlesJS('particles-js', {
  "particles": {
    "number": {
      "value":30,
      "density": {
        "enable":true,
        "value_area":800
      }
    },
    "color": { "value": "#ffffff" },
    "shape": { 
      "type": "circle",
      "stroke": { "width": 0, "color":"#000000" },
      "polygon": { "nb_sides": 5 },
      "image": { "src": "img/github.svg", "width": 100, "height": 100}
    },
    "opacity": { 
      "value": 0.5, 
      "random": false, 
      "anim": {
        "enable": false,
        "speed": 1,
        "opacity_min": 0.1,
        "sync": false
      }
    },
    "size": { 
      "value": 5,
      "random": true, 
      "anim": { 
        "enable": false,
        "speed": 40,
        "size_min": 0.1,
        "sync": false
      }
    },
    "line_linked": { 
      "enable": false,
      "distance": 150,
      "color": "#ffffff",
      "opacity": 0.4,
      "width": 1
    },
    "move": { 
      "enable": true,
      "speed": 6, 
      "direction": "none",
      "random": true,
      "straight": false,
      "out_mode": "out",
      "attract": { 
        "enable": false,
        "rotateX": 600,
        "rotateY":1200 
      }
    }
  },
  "interactivity": {
    "detect_on": "canvas",
    "events": {
      "onhover": { "enable": false, "mode": "repulse" },
      "onclick": { "enable": true, "mode": "push" },
      "resize": true
    },
    "modes": {
      "grab": {
        "distance": 400,
        "line_linked": { "opacity": 1 }
      },
      "bubble": {
        "distance": 400,
        "size": 40,
        "duration": 2,
        "opacity": 8,
        "speed": 3
      },
      "repulse": { "distance": 200 },
      "push":{ "particles_nb": 4 },
      "remove":{ "particles_nb": 2 }
    }
  },
  "retina_detect": true,
  "config_demo": {
    "hide_card": false,
    "background_color": "#b61924",
    "background_image": "",
    "background_position": "50% 50%",
    "background_repeat": "no-repeat",
    "background_size": "cover"
  }
})