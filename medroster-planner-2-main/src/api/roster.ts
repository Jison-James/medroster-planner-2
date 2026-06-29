import { apiCall } from './api';

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
  act: async (id: string, action: "Resolve" | "Reassign" | "Ignore", data?: any) => {
    const endpointAction = action === 'Ignore' ? 'ignore' : 'resolve';
    return await apiCall(`/roster/conflicts/${id}/${endpointAction}/`, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
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
