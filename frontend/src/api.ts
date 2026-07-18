import { getToken, setToken, clearToken } from './tokenStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

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

// Tracks an in-flight refresh so concurrent 401s only trigger one refresh call.
let refreshPromise: Promise<string | null> | null = null;

/** Calls the refresh endpoint using the HttpOnly cookie. Returns the new access token, or null on failure. */
const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!response.ok) {
          clearToken();
          return null;
        }
        const data = await response.json();
        setToken(data.token);
        return data.token as string;
      } catch {
        clearToken();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
};

interface ApiFetchOptions {
  method?: string;
  body?: unknown;
  isFormBody?: boolean;
}

/**
 * Central fetch wrapper for authenticated API calls.
 * - Always sends cookies (`credentials: 'include'`) so the HttpOnly refresh
 *   cookie can be read by the backend when needed.
 * - Attaches the in-memory access token as a Bearer header.
 * - On a 401, transparently attempts a silent refresh and retries the
 *   request exactly once with the new access token.
 */
const apiFetch = async (path: string, options: ApiFetchOptions = {}): Promise<Response> => {
  const { method = 'GET', body } = options;

  const buildInit = (token: string | null): RequestInit => ({
    method,
    credentials: 'include',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let response = await fetch(`${API_BASE_URL}${path}`, buildInit(getToken()));

  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await fetch(`${API_BASE_URL}${path}`, buildInit(newToken));
    }
  }

  return response;
};

// Auth API
export const authAPI = {
  googleAuth: async (token: string) => {
    const response = await apiFetch('/auth/google/', { method: 'POST', body: { token } });
    return handleResponse(response);
  },

  login: async (email: string, password: string) => {
    const response = await apiFetch('/auth/login/', { method: 'POST', body: { email, password } });
    return handleResponse(response);
  },

  register: async (userData: Record<string, unknown>) => {
    const response = await apiFetch('/auth/register/', { method: 'POST', body: userData });
    return handleResponse(response);
  },

  /** Silent refresh: attempts to obtain a new access token from the refresh cookie. */
  refresh: async (): Promise<{ token: string } | null> => {
    const token = await refreshAccessToken();
    return token ? { token } : null;
  },

  logout: async () => {
    const response = await apiFetch('/auth/logout/', { method: 'POST' });
    clearToken();
    return handleResponse(response).catch(() => undefined);
  },

  me: async () => {
    const response = await apiFetch('/auth/me/');
    return handleResponse(response);
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await apiFetch('/auth/change-password/', {
      method: 'POST',
      body: { current_password: currentPassword, new_password: newPassword },
    });
    return handleResponse(response);
  },

  myMemberships: async () => {
    const response = await apiFetch('/auth/my-memberships/');
    return handleResponse(response);
  },

  myEvents: async () => {
    const response = await apiFetch('/auth/my-events/');
    return handleResponse(response);
  },
};

// Users API
export const usersAPI = {
  list: async () => {
    const response = await apiFetch('/users/');
    return handleResponse(response);
  },

  updateUserType: async (userId: number, userType: string) => {
    const response = await apiFetch(`/users/${userId}/update_user_type/`, {
      method: 'POST',
      body: { user_type: userType },
    });
    return handleResponse(response);
  },

  increaseClubLimit: async (userId: number) => {
    const response = await apiFetch(`/users/${userId}/increase_club_limit/`, { method: 'POST' });
    return handleResponse(response);
  },
};

// Clubs API
export const clubsAPI = {
  list: async () => {
    const response = await apiFetch('/clubs/');
    return handleResponse(response);
  },

  get: async (id: string) => {
    const response = await apiFetch(`/clubs/${id}/`);
    return handleResponse(response);
  },

  create: async (data: Record<string, unknown>) => {
    const response = await apiFetch('/clubs/', { method: 'POST', body: data });
    return handleResponse(response);
  },

  update: async (id: string, data: Record<string, unknown>) => {
    const response = await apiFetch(`/clubs/${id}/`, { method: 'PATCH', body: data });
    return handleResponse(response);
  },

  join: async (clubId: number) => {
    const response = await apiFetch(`/clubs/${clubId}/join/`, { method: 'POST' });
    return handleResponse(response);
  },

  joinByToken: async (token: string) => {
    const response = await apiFetch('/clubs/join-by-token/', { method: 'POST', body: { token } });
    return handleResponse(response);
  },

  leave: async (clubId: number) => {
    const response = await apiFetch(`/clubs/${clubId}/leave/`, { method: 'POST' });
    return handleResponse(response);
  },

  getMembers: async (clubId: string) => {
    const response = await apiFetch(`/clubs/${clubId}/members/`);
    return handleResponse(response);
  },
};

// Topics API
export const topicsAPI = {
  list: async (clubId: string) => {
    const response = await apiFetch(`/topics/?club=${clubId}`);
    return handleResponse(response);
  },

  create: async (data: Record<string, unknown>) => {
    const response = await apiFetch('/topics/', { method: 'POST', body: data });
    return handleResponse(response);
  },

  update: async (id: number, data: Record<string, unknown>) => {
    const response = await apiFetch(`/topics/${id}/`, { method: 'PATCH', body: data });
    return handleResponse(response);
  },

  delete: async (id: number) => {
    const response = await apiFetch(`/topics/${id}/`, { method: 'DELETE' });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to delete topic');
    }
  },

  expressInterest: async (topicId: number) => {
    const response = await apiFetch(`/topics/${topicId}/express_interest/`, { method: 'POST' });
    return handleResponse(response);
  },
};

// Events API
export const eventsAPI = {
  list: async (clubId: string) => {
    const response = await apiFetch(`/events/?club=${clubId}`);
    return handleResponse(response);
  },

  create: async (data: Record<string, unknown>) => {
    const response = await apiFetch('/events/', { method: 'POST', body: data });
    return handleResponse(response);
  },

  update: async (id: number, data: Record<string, unknown>) => {
    const response = await apiFetch(`/events/${id}/`, { method: 'PATCH', body: data });
    return handleResponse(response);
  },

  delete: async (id: number) => {
    const response = await apiFetch(`/events/${id}/`, { method: 'DELETE' });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to delete event');
    }
  },

  rsvp: async (eventId: number, status: string) => {
    const response = await apiFetch(`/events/${eventId}/rsvp/`, { method: 'POST', body: { status } });
    return handleResponse(response);
  },
};

// Memberships API
export const membershipsAPI = {
  update: async (id: number, data: Record<string, unknown>) => {
    const response = await apiFetch(`/memberships/${id}/`, { method: 'PATCH', body: data });
    return handleResponse(response);
  },
};

// System Settings API
export const systemSettingsAPI = {
  getSettings: async () => {
    const response = await apiFetch('/system-settings/');
    return handleResponse(response);
  },

  updateSettings: async (data: Record<string, unknown>) => {
    const response = await apiFetch('/system-settings/update/', { method: 'PATCH', body: data });
    return handleResponse(response);
  },
};
