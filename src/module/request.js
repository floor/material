const request = async (url, method = 'GET', body = null, headers = {}, signal = null) => {
  const defaultHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }

  const options = {
    method,
    headers: { ...defaultHeaders, ...headers },
    signal
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  try {
    const response = await fetch(url, options)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()

    return data
  } catch (error) {
    // Handle fetch or data processing errors
    // console.log('error', error)
    return { error }
  }
}

export default request
