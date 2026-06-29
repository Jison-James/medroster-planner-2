const API_BASE = 'http://localhost:8000/api';

// Helper to make API requests easily
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = localStorage.getItem('access_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const res = await fetch(`${API_BASE}${endpoint}`, { 
    ...options, 
    headers,
    credentials: 'omit' // We're using local storage token
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `API error on ${endpoint}`);
  }
  if (res.status === 204) return null;
  return await res.json();
}

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

export const rosterService = {
  list: async () => {
    try {
      return await apiCall('/roster/rosters/');
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  listShifts: async () => {
    try {
      return await apiCall('/roster/shifts/');
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  generate: async (params: any = {}) => {
    return await apiCall('/roster/rosters/generate/', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },
  publish: async (id?: string) => {
    // If no specific ID, find the latest draft roster
    let rosterId = id;
    if (!rosterId) {
      const rosters = await rosterService.list();
      const draft = rosters.find((r: any) => r.status === 'Draft');
      if (!draft) throw new Error("No draft roster found to publish");
      rosterId = draft.id;
    }
    return await apiCall(`/roster/rosters/${rosterId}/publish/`, {
      method: 'POST',
    });
  },
  assign: async (data: any) => {
    return await apiCall('/roster/shifts/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
};

export const swapService = {
  list: async () => {
    try {
      return await apiCall('/roster/swap-requests/');
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  submit: async (data: any) => {
    return await apiCall('/roster/swap-requests/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  approve: async (id: string) => {
    return await apiCall(`/roster/swap-requests/${id}/approve/`, {
      method: 'POST',
    });
  },
  reject: async (id: string) => {
    return await apiCall(`/roster/swap-requests/${id}/reject/`, {
      method: 'POST',
    });
  }
};

export const settingsService = {
  getRules: async () => {
    try {
      const list = await apiCall('/roster/rules/');
      return list[0] || null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },
  save: async (data: any) => {
    // Since rules is a singleton (id: 1)
    return await apiCall(`/roster/rules/${data.id || 1}/`, {
      method: 'PUT',
      body: JSON.stringify({ ...data, id: 1 }),
    });
  }
};

export const conflictService = {
  list: async () => {
    try {
      return await apiCall('/roster/conflicts/');
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  act: async (id: string, action: "Resolve" | "Reassign" | "Ignore") => {
    const endpointAction = action === 'Ignore' ? 'ignore' : 'resolve';
    return await apiCall(`/roster/conflicts/${id}/${endpointAction}/`, {
      method: 'POST',
    });
  }
};

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

export const shiftTemplateService = {
  list: async () => {
    try {
      return await apiCall('/roster/templates/');
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  save: async (data: any) => {
    const isNew = !data.id || (typeof data.id === 'string' && data.id.startsWith('st'));
    const endpoint = isNew ? '/roster/templates/' : `/roster/templates/${data.id}/`;
    
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
    await apiCall(`/roster/templates/${id}/`, { method: 'DELETE' });
    return id;
  }
};

export const availabilityService = {
  save: async (data: any) => {
    return await apiCall(`/roster/availability/${data.id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
};

export const supportService = {
  submit: async (data: any) => {
    // Basic mock simulation for contact support
    return { success: true };
  }
};

export const authService = {
  changePassword: async (data: any) => {
    // Basic auth logic simulator
    return { success: true };
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
