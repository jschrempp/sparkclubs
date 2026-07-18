import { getToken } from './tokenStore';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const getAuthHeader = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    let errorMessage = 'An error occurred';
    if (error.error) {
      errorMessage = error.error;
    } else if (error.detail) {
      errorMessage = error.detail;
    } else if (error.non_field_errors) {
      errorMessage = Array.isArray(error.non_field_errors) ? error.non_field_errors[0] : error.non_field_errors;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      const fieldErrors = Object.keys(error).filter(key => key !== 'error' && key !== 'detail');
      if (fieldErrors.length > 0) {
        const fieldName = fieldErrors[0];
        const fieldError = error[fieldName];
        errorMessage = Array.isArray(fieldError) ? fieldError[0] : fieldError;
      }
    }
    throw new Error(errorMessage);
  }
  return response.json();
};

// Auth API
export const authAPI = {
  googleAuth: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/google/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    return handleResponse(response);
  },

  login: async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },

  register: async (userData: Record<string, unknown>) => {
    const response = await fetch(`${API_BASE_URL}/auth/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },

  me: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/me/`, {
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/change-password/`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    return handleResponse(response);
  },

  myMemberships: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/my-memberships/`, {
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },

  myEvents: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/my-events/`, {
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },
};

// Users API
export const usersAPI = {
  list: async () => {
    const response = await fetch(`${API_BASE_URL}/users/`, {
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },

  updateUserType: async (userId: number, userType: string) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/update_user_type/`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_type: userType }),
    });
    return handleResponse(response);
  },

  increaseClubLimit: async (userId: number) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/increase_club_limit/`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },
};

// Clubs API
export const clubsAPI = {
  list: async () => {
    const response = await fetch(`${API_BASE_URL}/clubs/`, {
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },

  get: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/clubs/${id}/`, {
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },

  create: async (data: Record<string, unknown>) => {
    const response = await fetch(`${API_BASE_URL}/clubs/`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  update: async (id: string, data: Record<string, unknown>) => {
    const response = await fetch(`${API_BASE_URL}/clubs/${id}/`, {
      method: 'PATCH',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  join: async (clubId: number) => {
    const response = await fetch(`${API_BASE_URL}/clubs/${clubId}/join/`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },

  joinByToken: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/clubs/join-by-token/`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    return handleResponse(response);
  },

  leave: async (clubId: number) => {
    const response = await fetch(`${API_BASE_URL}/clubs/${clubId}/leave/`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },

  getMembers: async (clubId: string) => {
    const response = await fetch(`${API_BASE_URL}/clubs/${clubId}/members/`, {
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },
};

// Topics API
export const topicsAPI = {
  list: async (clubId: string) => {
    const response = await fetch(`${API_BASE_URL}/topics/?club=${clubId}`, {
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },

  create: async (data: Record<string, unknown>) => {
    const response = await fetch(`${API_BASE_URL}/topics/`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  update: async (id: number, data: Record<string, unknown>) => {
    const response = await fetch(`${API_BASE_URL}/topics/${id}/`, {
      method: 'PATCH',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  delete: async (id: number) => {
    const response = await fetch(`${API_BASE_URL}/topics/${id}/`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to delete topic');
    }
  },

  expressInterest: async (topicId: number) => {
    const response = await fetch(`${API_BASE_URL}/topics/${topicId}/express_interest/`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },
};

// Events API
export const eventsAPI = {
  list: async (clubId: string) => {
    const response = await fetch(`${API_BASE_URL}/events/?club=${clubId}`, {
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },

  create: async (data: Record<string, unknown>) => {
    const response = await fetch(`${API_BASE_URL}/events/`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  update: async (id: number, data: Record<string, unknown>) => {
    const response = await fetch(`${API_BASE_URL}/events/${id}/`, {
      method: 'PATCH',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  delete: async (id: number) => {
    const response = await fetch(`${API_BASE_URL}/events/${id}/`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to delete event');
    }
  },

  rsvp: async (eventId: number, status: string) => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/rsvp/`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return handleResponse(response);
  },
};

// Memberships API
export const membershipsAPI = {
  update: async (id: number, data: Record<string, unknown>) => {
    const response = await fetch(`${API_BASE_URL}/memberships/${id}/`, {
      method: 'PATCH',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
};

// System Settings API
export const systemSettingsAPI = {
  getSettings: async () => {
    const response = await fetch(`${API_BASE_URL}/system-settings/`, {
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },

  updateSettings: async (data: Record<string, unknown>) => {
    const response = await fetch(`${API_BASE_URL}/system-settings/update/`, {
      method: 'PATCH',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
};