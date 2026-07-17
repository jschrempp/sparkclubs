import { getToken } from './tokenStore';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const getAuthHeader = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    // Handle different error formats
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
      // Check for field-specific errors (e.g., {name: "error message"})
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
  googleAuth: async (token) => {
    const response = await fetch(`${API_BASE_URL}/auth/google/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    return handleResponse(response);
  },

  login: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },

  register: async (userData) => {
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

  changePassword: async (currentPassword, newPassword) => {
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

  get: async (id) => {
    const response = await fetch(`${API_BASE_URL}/users/${id}/`, {
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },

  update: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/users/${id}/`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateUserType: async (id, userType) => {
    const response = await fetch(`${API_BASE_URL}/users/${id}/update_user_type/`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_type: userType }),
    });
    return handleResponse(response);
  },

  increaseClubLimit: async (id) => {
    const response = await fetch(`${API_BASE_URL}/users/${id}/increase_club_limit/`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
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

  get: async (id) => {
    const response = await fetch(`${API_BASE_URL}/clubs/${id}/`, {
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },

  create: async (data) => {
    const response = await fetch(`${API_BASE_URL}/clubs/`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  update: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/clubs/${id}/`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  delete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/clubs/${id}/`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    if (response.ok) {
      return { success: true };
    }
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.detail || 'An error occurred');
    }
    return response.json();
  },

  getMembers: async (id) => {
    const response = await fetch(`${API_BASE_URL}/clubs/${id}/members/`, {
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },

  join: async (id) => {
    const response = await fetch(`${API_BASE_URL}/clubs/${id}/join/`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },

  joinByToken: async (token) => {
    const response = await fetch(`${API_BASE_URL}/clubs/join-by-token/${token}/`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },

  leave: async (id) => {
    const response = await fetch(`${API_BASE_URL}/clubs/${id}/leave/`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },
};

// Memberships API
export const membershipsAPI = {
  approve: async (id) => {
    const response = await fetch(`${API_BASE_URL}/memberships/${id}/approve/`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },

  remove: async (id) => {
    const response = await fetch(`${API_BASE_URL}/memberships/${id}/remove/`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },

  setAdmin: async (id, isAdmin) => {
    const response = await fetch(`${API_BASE_URL}/memberships/${id}/set_admin/`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_admin: isAdmin }),
    });
    return handleResponse(response);
  },

  setHostOrder: async (id, hostOrder) => {
    const response = await fetch(`${API_BASE_URL}/memberships/${id}/set_host_order/`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ host_order: hostOrder }),
    });
    return handleResponse(response);
  },
};

// Topics API
export const topicsAPI = {
  list: async (clubId) => {
    const url = clubId 
      ? `${API_BASE_URL}/topics/?club=${clubId}` 
      : `${API_BASE_URL}/topics/`;
    const response = await fetch(url, {
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },

  get: async (id) => {
    const response = await fetch(`${API_BASE_URL}/topics/${id}/`, {
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },

  create: async (data) => {
    const response = await fetch(`${API_BASE_URL}/topics/`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  update: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/topics/${id}/`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  setInterest: async (id, interestType) => {
    const response = await fetch(`${API_BASE_URL}/topics/${id}/set_interest/`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ interest_type: interestType }),
    });
    return handleResponse(response);
  },

  removeInterest: async (id) => {
    const response = await fetch(`${API_BASE_URL}/topics/${id}/remove_interest/`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },

  getInterestedUsers: async (id) => {
    const response = await fetch(`${API_BASE_URL}/topics/${id}/interested_users/`, {
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },
};

// Events API
export const eventsAPI = {
  list: async (clubId, status = 'active') => {
    const params = new URLSearchParams();
    if (clubId) params.append('club', clubId);
    if (status) params.append('status', status);
    
    const response = await fetch(`${API_BASE_URL}/events/?${params}`, {
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },

  get: async (id) => {
    const response = await fetch(`${API_BASE_URL}/events/${id}/`, {
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },

  create: async (data) => {
    const response = await fetch(`${API_BASE_URL}/events/`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  update: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/events/${id}/`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  rsvp: async (id, rsvpStatus) => {
    const response = await fetch(`${API_BASE_URL}/events/${id}/rsvp/`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rsvp_status: rsvpStatus }),
    });
    return handleResponse(response);
  },

  cancelRsvp: async (id) => {
    const response = await fetch(`${API_BASE_URL}/events/${id}/cancel_rsvp/`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },

  getAttendees: async (id) => {
    const response = await fetch(`${API_BASE_URL}/events/${id}/attendees/`, {
      headers: getAuthHeader(),
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

  updateSettings: async (data) => {
    const response = await fetch(`${API_BASE_URL}/system-settings/update/`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
};
