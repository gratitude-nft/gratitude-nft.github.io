(async() => {
  const response = await fetch('/data/metadata.json')
  const datalist = await response.json()

  const series = {}
  const attributes = {}
  const tplFormRow = document.getElementById('template-form-row').innerHTML
  const tplFormFieldset = document.getElementById('template-form-fieldset').innerHTML
  const tplResultItem = document.getElementById('template-result-item').innerHTML
  const tplModal = document.getElementById('template-modal').innerHTML
  const tplAttributeBox = document.getElementById('template-attribute-box').innerHTML
  const results = document.querySelector('main.results')
  const seriesOptions = document.querySelector('aside.filters div.series div.options')
  const attributesOptions = document.querySelector('aside.filters div.attributes div.options')

  function toElement(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
  }

  function renderResults(filters) {
    filters = filters || {}
    filters.series = filters.series || []
    filters.attributes = filters.attributes || {}
    results.innerHTML = ''
    const matches = datalist.filter(metadata => {
      const criteria = {}
      if (filters.series.length) {
        criteria.series = filters.series.indexOf(metadata.series) !== -1
      }
      Object.keys(filters.attributes).forEach(traitType => {
        let found = false
        metadata.attributes.forEach(attribute => {
          if (attribute.trait_type == traitType) {
            found = true
            criteria[traitType] = filters.attributes[traitType].indexOf(attribute.value) !== -1
          }
        })

        if (!found) {
          criteria[traitType] = false
        }
      })

      for (const name in criteria) {
        if (!criteria[name]) {
          return false
        }
      }

      return true
    })

    matches.forEach(metadata => {
      results.appendChild(toElement(tplResultItem
        .replace('{INDEX}', metadata.index)
        .replace('{NAME}', metadata.name)
        .replace('{IMAGE}', `/images/collection/${metadata.index + 1}.png`) //metadata.preview || metadata.image
      ))
    })

    window.doon('main.results')
  }

  datalist.forEach(metadata => {
    //add series
    if (!series[metadata.series]) {
      series[metadata.series] = 0
    }
    series[metadata.series]++
    //add attributes
    metadata.attributes.forEach(attribute => {
      if (!attributes[attribute.trait_type]) {
        attributes[attribute.trait_type] = {}
      }
      if (!attributes[attribute.trait_type][attribute.value]) {
        attributes[attribute.trait_type][attribute.value] = 0
      }
      attributes[attribute.trait_type][attribute.value]++
    })
  })

  //go back around and populate the stats
  datalist.forEach((metadata, i) => {
    metadata.index = i
    metadata.occurances = 0
    //add occurances
    metadata.attributes.forEach(attribute => {
      attribute.occurance = attributes[attribute.trait_type][attribute.value]
      metadata.occurances += attribute.occurance
    })
  })

  //populate series filters
  Object.keys(series).sort((a, b) => series[a] - series[b]).forEach((name) => {
    const row = toElement(tplFormRow
      .replace('{NAME}', 'series')
      .replace('{VALUE}', name)
      .replace('{LABEL}', name)
      .replace('{COUNT}', series[name])
    )

    seriesOptions.appendChild(row)
  })

  //populate attribute filters
  for (const attribute in attributes) {
    const set = toElement(tplFormFieldset.replace('{LEGEND}', attribute))
    const fields = set.querySelector('div.fields')
    Object.keys(attributes[attribute])
      .sort((a, b) => attributes[attribute][a] - attributes[attribute][b])
      .forEach((trait) => {
        const row = toElement(tplFormRow
          .replace('{NAME}', `attribute[${attribute}]`)
          .replace('{VALUE}', trait)
          .replace('{LABEL}', trait)
          .replace('{COUNT}', attributes[attribute][trait])
        )
    
        fields.appendChild(row)
      })

    attributesOptions.appendChild(set)
  }

  window.addEventListener('toggle-click', async(e) => {
    e.for.classList.toggle('open')
    if (e.for.classList.contains('open')) {
      e.for.nextElementSibling.style.display = 'block'
    } else {
      e.for.nextElementSibling.style.display = 'none'
    }
  })

  window.addEventListener('filter-click', (e) => {
    const filters = { series: [], attributes: {} }
    document.querySelectorAll('aside.filters input[type=checkbox]').forEach(input => {
      if (!input.checked) return
      if (input.name == 'series') {
        filters.series.push(input.value)
      } else {
        const name = input.name.replace('attribute[', '').replace(']', '')
        if (!filters.attributes[name]) {
          filters.attributes[name] = []
        }
        filters.attributes[name].push(input.value)
      }
    })

    renderResults(filters)
  })

  window.addEventListener('modal-open-click', (e) => {
    const index = parseInt(e.for.getAttribute('data-index'))
    const metadata = datalist[index]
    const boxes = []
    metadata.attributes.forEach(attribute => {
      boxes.push(tplAttributeBox
        .replace('{NAME}', attribute.trait_type)
        .replace('{VALUE}', attribute.value)
        .replace('{PERCENT}', Math.floor((attribute.occurance / Object.keys(attributes[attribute.trait_type]).length) * 100) / 100)
      )
    })

    const modal = toElement(tplModal
      .replace('{NAME}', metadata.name)
      .replace('{IMAGE}', `/images/collection/${index + 1}.png`)//metadata.preview || metadata.image
      .replace('{RANK}', '')
      .replace('{RATING}', '')
      .replace('{ATTRIBUTES}', boxes.join(''))
    )

    document.body.appendChild(modal)
    window.doon('body')
  })

  window.addEventListener('modal-close-click', (e) => {
    document.body.removeChild(e.for)
  })

  renderResults()

  window.doon('body')
})()