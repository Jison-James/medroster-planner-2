import { apiCall } from './api';

export const leaveService = {
  list: async () => {
    try {
      return await apiCall('/roster/leave-requests/');
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  submit: async (data: any) => {
    return await apiCall('/roster/leave-requests/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  approve: async (id: string) => {
    return await apiCall(`/roster/leave-requests/${id}/approve/`, {
      method: 'POST',
    });
  },
  reject: async (id: string) => {
    return await apiCall(`/roster/leave-requests/${id}/reject/`, {
      method: 'POST',
    });
  }
};
