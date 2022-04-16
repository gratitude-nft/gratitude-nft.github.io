(() => {
  const aside = document.querySelectorAll('#nav-update a')
  const nav = document.querySelectorAll('a.nav')
  const content = document.querySelectorAll('div.content')

  Array.from(aside).forEach(link => {
    link.addEventListener('click', e => {
      Array.from(aside).forEach(link => link.classList.remove('active'))
      Array.from(content).forEach(content => content.classList.remove('active'))
      link.classList.add('active')
      document.querySelector(link.getAttribute('href')).classList.add('active')
    })
  })

  Array.from(nav).forEach(link => {
    link.addEventListener('click', e => {
      const hash = `#${link.href.split('#')[1]}`
      Array.from(aside).forEach(link => {
        if (link.getAttribute('href') === hash) {
          link.click()
        }
      })
    })
  })

  if (window.location.hash) {
    Array.from(aside).forEach(link => {
      if (link.getAttribute('href') === window.location.hash) {
        link.click()
      }
    })
  }
})()