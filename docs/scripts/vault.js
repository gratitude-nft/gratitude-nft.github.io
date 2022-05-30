(async() => {
  //sets up the MM SDK
  MetaMaskSDK.setup(blocknet)

  //------------------------------------------------------------------//
  // Variables

  let populated = false

  const state = { connected: false }
  const token = {
    ethereum: MetaMaskSDK.network('ethereum').contract('token'),
    polygon: MetaMaskSDK.network('polygon').contract('token')
  }
  const nft = {
    ethereum: MetaMaskSDK.network('ethereum').contract('nft'),
    polygon: MetaMaskSDK.network('polygon').contract('nft')
  }
  const vault = {
    ethereum: MetaMaskSDK.network('ethereum').contract('vault'),
    polygon: MetaMaskSDK.network('polygon').contract('vault')
  }
  const images = {
    ethereum: 'https://openseauserdata.com/files/6f8e2979d428180222796ff4a33ab929.svg',
    polygon: 'https://openseauserdata.com/files/265128aa51521c90f7905e5a43dcb456_new.svg'
  }
  const items = document.querySelector('div.items')
  const template = {
    modal: document.getElementById('modal-item').innerHTML,
    item: document.getElementById('tpl-item').innerHTML
  }

  //------------------------------------------------------------------//
  // Functions

  const connected = async function(newstate, session) {
    //token gate
    const balance = await (nft.ethereum.read().balanceOf(newstate.account))
    if (balance == 0) {
      return disconnected({}, new Error('Must be a sunflower holder'))
    }
    //update state
    Object.assign(state, newstate)
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

  const populate = async function() {
    //if already populated
    if (populated) return
    //reset items container
    items.innerHTML = ''

    //populate ethereum items in item container
    for (const network of ['ethereum', 'polygon']) {
      for (let i = 0; true; i++) {
        if (network === 'polygon' && i < 2) continue
        try { // to get metadata
          const tokenInfo = await (vault[network].read().nfts(i + 1))
          if (tokenInfo.contractAddress === '0x0000000000000000000000000000000000000000') {
            break
          }
  
          //todo: need to know if 721 or 1155
          const tokenContract = new MetaMaskSDK.Contract(
            vault[network].network, 
            tokenInfo.contractAddress, 
            blocknet.abi.erc721
          )
  
          //check if vault still owns it
          const owner = await (
            tokenContract.read().ownerOf(tokenInfo.tokenId)
          )

          if (owner !== vault[network].address) {
            continue;
          }
          //get metadata
          let tokenURI
          if (network === 'ethereum' 
            //case for ENS
            && tokenInfo.contractAddress === '0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85'
          ) {
            tokenURI = `https://metadata.ens.domains/mainnet/${tokenInfo.contractAddress}/${tokenInfo.tokenId}`
          } else {
            tokenURI = (await (
              tokenContract.read().tokenURI(tokenInfo.tokenId)
            )).replace('ipfs://', 'https://ipfs.io/ipfs/')
          }
  
          const response = await fetch(tokenURI)
          const tokenMetadata = await response.json()
  
          tokenMetadata.image = tokenMetadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/')
  
          const item = toElement(template.item
            .replace('{IMAGE}', tokenMetadata.image)
            .replace('{ID}', i + 1)
            .replace('{NAME}', tokenMetadata.name || '')
            .replace('{NETWORK}', network)
            .replace('{NETWORK_IMAGE}', images[network])
            .replace('{ETH_HIDE}', tokenInfo.ethPrice > 0 ? '' : ' hide')
            .replace('{ETH_PRICE}', tokenInfo.ethPrice > 0 ? MetaMaskSDK.toEther(tokenInfo.ethPrice) : 0)
            .replace('{GRATIS_HIDE}', tokenInfo.tokenPrice > 0 ? '' : ' hide')
            .replace('{GRATIS_PRICE}', tokenInfo.tokenPrice > 0 ? MetaMaskSDK.toEther(tokenInfo.tokenPrice): 0)
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
  }

  const toElement = function(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
  }

  //------------------------------------------------------------------//
  // Events

  window.addEventListener('buy-eth-click', async function buyETH(e) {
    const network = e.for.getAttribute('data-network')
    //if not connected
    if (!state.account) {
      //connect and try again
      return vault[network].network.connectCB(newstate => { 
        Object.assign(state, newstate)
        buyETH(e) 
      })
    }
    //get all variables needed for this transaction
    const id = parseInt(e.for.getAttribute('data-id'))
    const price = e.for.getAttribute('data-price')

    //validation
    if (price == 0) {
      return notify('error', 'Item is unavailable right now')
    }

    //todo: need to know if 721 or 1155
    const tokenId = parseInt(e.for.getAttribute('data-token'))
    const contractAddress = e.for.getAttribute('data-address')
    const tokenContract = new MetaMaskSDK.Contract(
      vault[network].network, 
      contractAddress, 
      blocknet.abi.erc721,
      {}
    )

    //check if vault still owns it
    const owner = await (
      tokenContract.read().ownerOf(tokenId)
    )
    if (owner !== vault[network].address) {
      //report
      return notify('error', 'This item has already been unlocked')
    }

    //disable button state
    e.for.classList.add('disabled')
    //inform
    notify('info', 'Unlocking item...')
    try { //to buy
      await (
        vault[network]
          .write(state.account, price, 6)
          .buy(state.account, id)
      )
    } catch(error) {
      //enable button state
      e.for.classList.remove('disabled')
      //report
      return notify('error', error.message)
    }

    //enable button state
    e.for.classList.remove('disabled')
    //report
    notify(
      'success', 
      `Unlocking is now complete. You can view your item on <a href="${
        vault[network].network.config.chain_marketplace
      }/${contractAddress}/${tokenId}" target="_blank">
        opensea.io
      </a>.`,
      1000000
    )
  })

  window.addEventListener('buy-gratis-click', async function buyGRATIS(e) {
    const network = e.for.getAttribute('data-network')
    //if not connected
    if (!state.account) {
      //connect and try again
      return vault[network].network.connectCB(newstate => { 
        Object.assign(state, newstate)
        buyGRATIS(e) 
      })
    }
    //get variables needed for this transaction
    const id = parseInt(e.for.getAttribute('data-id'))
    const price = e.for.getAttribute('data-price')
    //validate
    if (price == 0) {
      return notify('error', 'Item is unavailable right now')
    }
    //todo: need to know if 721 or 1155
    const tokenId = parseInt(e.for.getAttribute('data-token'))
    const contractAddress = e.for.getAttribute('data-address')
    const tokenContract = new MetaMaskSDK.Contract(
      vault[network].network, 
      contractAddress, 
      blocknet.abi.erc721,
      {}
    )

    //check if vault still owns it
    const owner = await (
      tokenContract.read().ownerOf(tokenId)
    )
    if (owner !== vault[network].address) {
      //report
      return notify('error', 'This item has already been unlocked')
    }
  
    //check gratis balance
    const balance = await (token[network].read().balanceOf(state.account))
    if ((balance - price) < 0) {
      return notify('error', 'Not enough GRATIS in your wallet')
    }
    //disable button state
    e.for.classList.add('disabled')
    //inform
    notify('info', 'Minting item...')
    try { //to support
      await (
        vault[network]
          .write(state.account, false, 6)
          .support(state.account, id)
      )
    } catch(error) {
      //enable button state
      e.for.classList.remove('disabled')
      //report
      return notify('error', error.message)
    }

    //enable button state
    e.for.classList.remove('disabled')
    //report
    notify(
      'success', 
      `Unlocking is now complete. You can view your item on <a href="${
        vault[network].network.config.chain_marketplace
      }/${contractAddress}/${tokenId}" target="_blank">
        opensea.io
      </a>.`,
      1000000
    )
  })

  window.addEventListener('modal-open-click', async (e) => {
    //get id and network
    const id = parseInt(e.for.getAttribute('data-id'))
    const network = e.for.getAttribute('data-network')

    const tokenInfo = await (vault[network].read().nfts(id))

    //todo: need to know if 721 or 1155
    const tokenContract = new MetaMaskSDK.Contract(
      vault[network].network, 
      tokenInfo.contractAddress, 
      blocknet.abi.erc721,
      {}
    )

    //get metadata
    const tokenURI = (await (
      tokenContract.read().tokenURI(tokenInfo.tokenId)
    )).replace('ipfs://', 'https://ipfs.io/ipfs/')

    const response = await fetch(tokenURI)
    const tokenMetadata = await response.json()

    tokenMetadata.image = tokenMetadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/')

    const modal = toElement(template.modal
      .replace('{IMAGE}', tokenMetadata.image)
      .replace('{ID}', id)
      .replace('{ID}', id)
      .replace('{NAME}', tokenMetadata.name)
      .replace('{NETWORK_IMAGE}', images[network])
      .replace('{NETWORK_CURRENCY}', vault[network].network.config.chain_symbol)
      .replace('{MARKETPLACE}', vault[network].network.config.chain_marketplace)
      .replace('{MARKETPLACE}', vault[network].network.config.chain_marketplace)
      .replace('{NETWORK}', network)
      .replace('{NETWORK}', network)
      .replace('{CONTRACT}', tokenInfo.contractAddress)
      .replace('{CONTRACT}', tokenInfo.contractAddress)
      .replace('{CONTRACT}', tokenInfo.contractAddress)
      .replace('{TOKEN_ID}', tokenInfo.tokenId)
      .replace('{TOKEN_ID}', tokenInfo.tokenId)
      .replace('{TOKEN_ID}', tokenInfo.tokenId)
      .replace('{ETH_HIDE}', tokenInfo.ethPrice > 0 ? '' : ' hide')
      .replace('{ETH_PRICE}', tokenInfo.ethPrice > 0 ? tokenInfo.ethPrice : 0)
      .replace('{ETH_PRICE}', tokenInfo.ethPrice > 0 ? MetaMaskSDK.toEther(tokenInfo.ethPrice) : 0)
      .replace('{GRATIS_HIDE}', tokenInfo.tokenPrice > 0 ? '' : ' hide')
      .replace('{GRATIS_PRICE}', tokenInfo.tokenPrice > 0 ? tokenInfo.tokenPrice : 0)
      .replace('{GRATIS_PRICE}', tokenInfo.tokenPrice > 0 ? MetaMaskSDK.toEther(tokenInfo.tokenPrice): 0)
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

  window.addEventListener('connect-click', () => {
    MetaMaskSDK.network('ethereum').connectCB(connected, disconnected)
  })

  //------------------------------------------------------------------//
  // Initialize

  window.doon('body')

  populate()
})()