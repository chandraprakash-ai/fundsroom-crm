const BASE_URL = 'http://localhost:5000/api';

// Helper to get headers with the JWT token automatically attached
const getHeaders = (contentType = 'application/json') => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Generic response handler
const handleResponse = async (response: Response) => {
  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    // If the server returned an error JSON, throw its message
    const errorMessage = data.message || `HTTP error! status: ${response.status}`;
    const error: any = new Error(errorMessage);
    error.status = response.status;
    error.errors = data.errors; // Holds detailed validation errors from Zod
    throw error;
  }
  
  return data;
};

export const api = {
  get: async (endpoint: string) => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  post: async (endpoint: string, body: any) => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  put: async (endpoint: string, body: any) => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  delete: async (endpoint: string) => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};
