const API_BASE_URL = '/api';

async function handleResponse(response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json().catch(() => ({}));
}

const api = {
  async get(url) {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      return await handleResponse(response);
    } catch (error) {
      console.error(`GET ${url} failed:`, error);
      throw error;
    }
  },

  async post(url, data = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      return await handleResponse(response);
    } catch (error) {
      console.error(`POST ${url} failed:`, error);
      throw error;
    }
  },

  async put(url, data = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      return await handleResponse(response);
    } catch (error) {
      console.error(`PUT ${url} failed:`, error);
      throw error;
    }
  },

  async patch(url, data = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      return await handleResponse(response);
    } catch (error) {
      console.error(`PATCH ${url} failed:`, error);
      throw error;
    }
  }
};

export default api;
