const request = async (url, method = 'GET', body = null, headers = {}, signal = null, debug = false) => {
  const defaultHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }

  const options = {
    method,
    headers: { ...defaultHeaders, ...headers },
    signal
  }

  if (debug) {
    console.log('debug', options)
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  try {
    const response = await fetch(url, options)
    if (!response.ok) {
      // console.log('Error', response)
    }

    // Determine response type based on 'Accept' header
    if (headers.Accept === 'text/xml') {
      return await response.text()
    } else {
      return await response.json()
    }
  } catch (error) {
    if (headers.Accept === 'text/xml') {
      throw error
    } else {
      throw { error }
    }
  }
}

export default request
