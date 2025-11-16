const request = async (
  url,
  method = 'GET',
  body = null,
  headers = {},
  signal = null,
  debug = false,
  cache = 'no-store'
) => {
  const options = {
    method,
    headers: {}, // We'll set headers based on body type
    signal,
    cache
  }

  // Handle headers and body based on body type
  if (body) {
    if (body instanceof FormData) {
      // For FormData, don't set Content-Type - browser will set it automatically
      options.body = body
      options.headers = {
        Accept: 'application/json',
        ...headers
      }

      if (debug) {
        console.group('FormData Contents:')
        for (const pair of body.entries()) {
          console.log(`${pair[0]}: ${pair[1]}`)
        }
        console.groupEnd()
      }
    } else {
      // For JSON data
      options.headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...headers
      }
      options.body = JSON.stringify(body)
    }
  } else {
    // No body, use default headers
    options.headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers
    }
  }

  if (debug) {
    console.group('Request Debug:')
    console.log('URL:', url)
    console.log('Method:', method)
    console.log('Options:', { ...options, body: options.body instanceof FormData ? '[FormData]' : options.body })
    console.groupEnd()
  }

  try {
    const response = await fetch(url, options)

    if (!response.ok) {
      if (debug) {
        console.error('Response error:', response.status, response.statusText)
      }

      // Try to parse error response as JSON to preserve backend error data
      let errorData
      try {
        errorData = await response.json()
      } catch (jsonError) {
        // If JSON parsing fails, throw basic error (backward compatible)
        throw { error: `HTTP error! status: ${response.status}` }
      }

      // If we successfully parsed JSON, throw it with all data
      // If we successfully parsed JSON, throw it with all data
      throw {
        error: errorData.error || `HTTP error! status: ${response.status}`,
        ...errorData
      }
    }

    // Handle response based on Accept header
    if (headers.Accept === 'text/xml') {
      return await response.text()
    } else {
      return await response.json()
    }
  } catch (error) {
    if (headers.Accept === 'text/xml') {
      throw error
    } else {
      // If error is already an object with error field, preserve it
      if (typeof error === 'object' && error.error) {
        throw error
      } else {
        throw { error: error.message || 'Request failed' }
      }
    }
  }
}

export default request
