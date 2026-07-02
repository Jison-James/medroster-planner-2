import { apiCall } from './api';

export const authService = {
  login: async (credentials: any) => {
    const res = await fetch("http://localhost:8000/api/auth/login/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.non_field_errors?.[0] || data.detail || "Login failed - Invalid email or password");
    }
    return data;
  },
  changePassword: async (data: any) => {
    return await apiCall('/auth/password/change/', {
      method: 'POST',
      body: JSON.stringify({
        old_password: data.current,
        new_password1: data.next,
        new_password2: data.confirm
      }),
    });
  }
};
