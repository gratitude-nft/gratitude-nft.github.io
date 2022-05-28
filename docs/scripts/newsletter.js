(() => {
  //------------------------------------------------------------------//
  // Variables

  let loaded = 0
  let submitted = false

  const form = document.getElementById('google-form')
  const frame = document.getElementById('google-frame')
  const button = form.querySelector('button')
  const email = form.querySelector('input.input-email')
  
  //------------------------------------------------------------------//
  // Functions

  const submitable = function() {
    if (!submitted && email.value.length && email.value.match(
      /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    )) {
      button.disabled = false
    } else {
      button.disabled = true
    }
  }

  //------------------------------------------------------------------//
  // Events

  email.addEventListener('keyup', () => setTimeout(submitable, 0))
  
  form.addEventListener('submit', () => {
    submitted = true
    button.disabled = true
    button.innerText = 'Working...'
  })
  
  frame.addEventListener('load', () => {
    if (loaded++ > 0) {
      form.parentElement.removeChild(form)
      notify('success', 'You are now subscribed')
    }
  })
})()