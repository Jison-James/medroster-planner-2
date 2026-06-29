import { apiCall } from './api';

export const staffService = {
  list: async () => {
    try {
      return await apiCall('/users/profiles/');
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  save: async (data: any) => {
    const isNew = !data.id || (typeof data.id === 'string' && data.id.startsWith('s') && data.id.length > 5);
    const endpoint = isNew ? '/users/profiles/' : `/users/profiles/${data.id}/`;
    
    const payload = { ...data };
    if (isNew) {
      delete payload.id;
    }

    return await apiCall(endpoint, {
      method: isNew ? 'POST' : 'PUT',
      body: JSON.stringify(payload),
    });
  },
  remove: async (id: string) => {
    if (id.startsWith('s') && id.length < 5) return id;
    await apiCall(`/users/profiles/${id}/`, { method: 'DELETE' });
    return id;
  }
};

export const userService = {
  invite: async (data: any) => {
    return await apiCall('/users/profiles/', {
      method: 'POST',
      body: JSON.stringify({ ...data, role: 'staff' }),
    });
  },
  update: async (data: any) => {
    return await apiCall(`/users/profiles/${data.id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
};
