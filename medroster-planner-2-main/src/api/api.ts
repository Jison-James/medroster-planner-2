const API_BASE = 'http://localhost:8000/api';

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  } as Record<string, string>;
  
  const token = localStorage.getItem('access_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const res = await fetch(`${API_BASE}${endpoint}`, { 
    ...options, 
    headers,
    credentials: 'omit'
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `API error on ${endpoint}`);
  }
  if (res.status === 204) return null;
  return await res.json();
}
