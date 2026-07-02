import { apiCall } from './api';

export const notificationService = {
  list: async () => {
    try {
      return await apiCall('/roster/notifications/');
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  markRead: async (id: string) => {
    return await apiCall(`/roster/notifications/${id}/read/`, {
      method: 'POST',
    });
  },
  markAllRead: async () => {
    return await apiCall(`/roster/notifications/read-all/`, {
      method: 'POST',
    });
  }
};
