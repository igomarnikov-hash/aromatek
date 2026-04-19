const BASE_URL = '/api'

async function request(method, path, body) {
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    }
    if (body) opts.body = JSON.stringify(body)
    const res = await fetch(BASE_URL + path, opts)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Ошибка сервера')
    return data
  } catch (e) {
    throw e
  }
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),
}

export default api
