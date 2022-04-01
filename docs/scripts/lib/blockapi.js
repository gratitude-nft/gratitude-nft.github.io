window.blockapi = {
  async read(contract, method, ...args) {
    return await contract.methods[method](...args).call()
  },

  async write(contract, account, method, value, ...args) {
    const params = {
      to: contract.address,
      from: account,
      data: contract.methods[method](...args).encodeABI(),
    }
    
    if (value) params.value = String(this.web3().utils.toHex(value))
    
    return await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [params]
    })
  },

  send(contract, account, method, value, ...args) {
    const params = {
      to: contract.address,
      from: account
    }
    if (value) params.value = String(this.web3().utils.toHex(value))
    const rpc = contract.methods[method](...args)
    return rpc.send(params)
  },

  toEther(num, format) {
    const libWeb3 = this.web3()
    if (format === 'string') {
      return libWeb3.utils.fromWei(String(num)).toString()
    } else if (format === 'comma') {
      return libWeb3.utils.fromWei(String(num)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    } else if (format === 'int') {
      return parseFloat(libWeb3.utils.fromWei(String(num)).toString());
    }
    return libWeb3.utils.fromWei(String(num))
  },

  toWei(num) {
    return this.web3().utils.toWei(String(num)).toString()
  },

  web3() {
    if (typeof window._web3 === 'undefined') {
      window._web3 = new Web3(window.ethereum)
    }

    return window._web3
  },

  contract(name) {
    const libWeb3 = this.web3()
    return new libWeb3.eth.Contract(
      blockmetadata.contracts[name].abi,
      blockmetadata.contracts[name].address
    )
  },

  async getWalletAddress() {
    return (await window.ethereum.request({ method: 'eth_requestAccounts' }))[0]
  },

  async addNetwork({ chain_id, chain_name, chain_symbol, chain_uri, chain_scan }) {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{ 
        chainId: `0x${chain_id.toString(16)}`, 
        chainName: chain_name,
        rpcUrls:[ chain_uri ],                   
        blockExplorerUrls:[ chain_scan ],  
        nativeCurrency: { 
          symbol: chain_symbol,   
          decimals: 18
        }        
      }]
    })
  },

  async switchNetwork({ chain_id }) {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chain_id.toString(16)}` }],
    });
  },

  connect(blockmetadata, connected, disconnected) {
    const libWeb3 = this.web3()
    const getState = async(account) => {
      const state = { account }
      if (Array.isArray(blockmetadata.contract?.abi)
        && typeof blockmetadata.contract?.address === 'string'
      ) {
        state.contract = new libWeb3.eth.Contract(
          blockmetadata.contract.abi,
          blockmetadata.contract.address
        )
      }

      if (typeof blockmetadata.contracts === 'object') {
        for (const key in blockmetadata.contracts) {
          if (Array.isArray(blockmetadata.contracts[key]?.abi)
            && typeof blockmetadata.contracts[key]?.address === 'string'
          ) {
            state[key] = new libWeb3.eth.Contract(
              blockmetadata.contracts[key].abi,
              blockmetadata.contracts[key].address
            )
          }
        }
      }

      return state
    }
    const validate = async(action, param) => {
      if (action === 'accountsChanged') {
        if (!Array.isArray(param) || param.length === 0) {
          return disconnected()
        }
      }
      if (!window.ethereum?.isMetaMask) {
        return disconnected({ 
          connected: false, 
          message: 'Please install <a href="https://metamask.io/" target="_blank">MetaMask</a> and refresh this page.' 
        })
      }

      try {//matching network and connecting
        const account = await this.getWalletAddress()
        const networkId = await window.ethereum.request({ method: 'net_version' });
        if (networkId == blockmetadata.chain_id) {
          return connected(await getState(account))
        }
      } catch (e) {
        return disconnected(e)
      }

      try {//auto switch network, then matching network and connecting
        await this.switchNetwork(blockmetadata)
        const account = await this.getWalletAddress()
        const networkId = await window.ethereum.request({ method: 'net_version' });
        if (networkId == blockmetadata.chain_id) {
          return connected(await getState(account))
        }
      } catch (e) {
        return disconnected(e)
      }

      try {//adding network, auto switch network, then matching network and connecting
        await this.addNetwork(blockmetadata)
        await this.switchNetwork(blockmetadata)
        const account = await this.getWalletAddress()
        const networkId = await window.ethereum.request({ method: 'net_version' });
        if (networkId == blockmetadata.chain_id) {
          return connected(await getState(account))
        }
      } catch (e) {
        return disconnected(e)
      }

      return disconnected(e)
    }

    if (window.ethereum?.isMetaMask && typeof window.__blockAPIListening === 'undefined') {
      window.ethereum.on('connect', validate.bind(null, 'connect'))
      window.ethereum.on('disconnect', disconnected)
      window.ethereum.on('chainChanged', validate.bind(null, 'chainChanged'))
      window.ethereum.on('accountsChanged', validate.bind(null, 'accountsChanged'))
      window.__blockAPIListening = true
    }

    validate('init')
  },

  notify(type, message, timeout = 5000) {
    Array.from(document.querySelectorAll('div.notification')).forEach((notification) => {
      if (notification.mounted) {
        document.body.removeChild(notification)
        notification.mounted = false
      }
    })
    const container = document.createElement('div')
    container.className = `notification notification-${type}`
    container.innerHTML = `<div>${message}</div>`
    container.mounted = true
    document.body.appendChild(container)
    container.addEventListener('click', () => {
      document.body.removeChild(container)
      container.mounted = false
    })
    
    setTimeout(() => {
      if (container.mounted) {
        document.body.removeChild(container)
        container.mounted = false
      }
    }, timeout)
  }
}