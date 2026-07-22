// Central place for the backend base URL.
// Change this ONE line if you ever move off Render or add a custom domain.
export const API_BASE = 'https://campus-backend-tz9q.onrender.com';

const TOKEN_KEY = 'campmeet_token';
const REFRESH_KEY = 'campmeet_refresh';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}
// Stores both halves of a Supabase session together — a screen that only
// has an access_token (nothing calls this without also having the
// refresh_token from the same signup/login/refresh response) should
// still pass null explicitly rather than silently wiping the other key.
export function setSession({ access_token, refresh_token } = {}) {
  if (access_token) localStorage.setItem(TOKEN_KEY, access_token);
  if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token);
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// Kept for compatibility with any older call sites; setSession is the
// real entry point since a lone access token can't renew itself later.
export function setToken(token) {
  setSession({ access_token: token });
}
export function clearToken() {
  clearSession();
}

let refreshInFlight = null;

// Access tokens expire in ~1hr; rather than let that log a student out
// mid-session, this exchanges the refresh token for a new pair the moment
// a request comes back 401. Concurrent 401s share one refresh call
// (refreshInFlight) instead of racing separate refresh requests.
async function renewSession() {
  const refresh_token = getRefreshToken();
  if (!refresh_token) return false;

  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token }),
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = await res.json().catch(() => null);
        if (!data?.access_token) return false;
        setSession(data);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function request(path, { method = 'GET', body, auth = false, _retried = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  if (res.status === 401 && auth && !_retried) {
    const renewed = await renewSession();
    if (renewed) {
      return request(path, { method, body, auth, _retried: true });
    }
    clearSession();
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => ({})) : null;

  if (!res.ok) {
    const message = data?.error || data?.message || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

// Matches VALID_REACTIONS in models/reaction.py exactly.
export const REACTION_TYPES = ['fire', 'cosign', 'doubt', 'yawa'];

// ---- Auth ----
export const AuthAPI = {
  signup: (payload) => request('/api/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
  refresh: (refresh_token) => request('/api/auth/refresh', { method: 'POST', body: { refresh_token } }),
  me: () => request('/api/auth/me', { auth: true }),
  forgotPassword: (email) => request('/api/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (access_token, new_password) =>
    request('/api/auth/reset-password', { method: 'POST', body: { access_token, new_password } }),
  deleteAccount: () => request('/api/auth/me', { method: 'DELETE', auth: true }),
};

// ---- Posts / Feed ----
export const PostsAPI = {
  feed: (limit = 30, offset = 0) => request(`/api/posts/feed?limit=${limit}&offset=${offset}`),
  search: (query, limit = 30) => request(`/api/posts/search?q=${encodeURIComponent(query)}&limit=${limit}`),
  registerSearchHit: (postId) => request(`/api/posts/${postId}/search-hit`, { method: 'POST' }),
  create: (payload) => request('/api/posts', { method: 'POST', body: payload, auth: true }),
  get: (postId) => request(`/api/posts/${postId}`),
  update: (postId, payload) => request(`/api/posts/${postId}`, { method: 'PATCH', body: payload, auth: true }),
  softDelete: (postId) => request(`/api/posts/${postId}`, { method: 'PATCH', body: { delete: true }, auth: true }),
  registerView: (postId) => request(`/api/posts/${postId}/view`, { method: 'POST', auth: true }),
  react: (postId, type = 'fire') =>
    request(`/api/posts/${postId}/reactions`, { method: 'POST', body: { type }, auth: true }),
  unreact: (postId) => request(`/api/posts/${postId}/reactions`, { method: 'DELETE', auth: true }),
  reactors: (postId) => request(`/api/posts/${postId}/reactions`),

  // Image posts. This bypasses the generic request() helper since it's
  // multipart, not JSON — the browser sets its own Content-Type boundary,
  // so nothing here should set Content-Type manually.
  uploadImage: async (file) => {
    const token = getToken();
    const form = new FormData();
    form.append('image', file);

    let res;
    try {
      res = await fetch(`${API_BASE}/api/posts/upload-image`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
    } catch {
      throw new Error('Could not reach the server. Check your connection and try again.');
    }

    if (res.status === 401) {
      const renewed = await renewSession();
      if (renewed) {
        return PostsAPI.uploadImage(file);
      }
      clearSession();
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Image upload failed. Try again.');
    }
    return data.url;
  },
};

// ---- Profile ----
export const ProfileAPI = {
  get: (userId) => request(`/api/profile/${userId}`),
  updateMe: (payload) => request('/api/profile/me', { method: 'PATCH', body: payload, auth: true }),

  // Same multipart pattern as PostsAPI.uploadImage — bypasses the
  // generic JSON request() helper on purpose.
  uploadAvatar: async (file) => {
    const token = getToken();
    const form = new FormData();
    form.append('avatar', file);

    let res;
    try {
      res = await fetch(`${API_BASE}/api/profile/upload-avatar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
    } catch {
      throw new Error('Could not reach the server. Check your connection and try again.');
    }

    if (res.status === 401) {
      const renewed = await renewSession();
      if (renewed) {
        return ProfileAPI.uploadAvatar(file);
      }
      clearSession();
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Avatar upload failed. Try again.');
    }
    return data; // updated user row, includes the new avatar_url
  },
};

// ---- Comments ----
export const CommentsAPI = {
  list: (postId) => request(`/api/posts/${postId}/comments`),
  create: (postId, content) =>
    request(`/api/posts/${postId}/comments`, { method: 'POST', body: { content }, auth: true }),
  update: (postId, commentId, content) =>
    request(`/api/posts/${postId}/comments/${commentId}`, { method: 'PATCH', body: { content }, auth: true }),
  softDelete: (postId, commentId) =>
    request(`/api/posts/${postId}/comments/${commentId}`, { method: 'PATCH', body: { delete: true }, auth: true }),
};

// ---- App meta (in-app update check) ----
export const AppAPI = {
  version: () => request('/api/app/version'),
};

// ---- Universities (signup dropdown) ----
export const UniversitiesAPI = {
  list: () => request('/api/universities'),
};

// ---- Follows ----
export const FollowsAPI = {
  follow: (userId) => request(`/api/users/${userId}/follow`, { method: 'POST', auth: true }),
  unfollow: (userId) => request(`/api/users/${userId}/follow`, { method: 'DELETE', auth: true }),
  followers: (userId) => request(`/api/users/${userId}/followers`),
  following: (userId) => request(`/api/users/${userId}/following`),
};

// ---- Users (search + public profile) ----
export const UsersAPI = {
  search: (q) => request(`/api/users/search?q=${encodeURIComponent(q)}`),
  profile: (userId) => request(`/api/profile/${userId}`, { auth: true }),
  suggested: (limit = 10) => request(`/api/users/suggested?limit=${limit}`, { auth: true }),
};

// ---- Notifications ----
export const NotificationsAPI = {
  list: () => request('/api/notifications', { auth: true }),
  unreadCount: () => request('/api/notifications/unread-count', { auth: true }),
  markRead: (id) => request(`/api/notifications/${id}/read`, { method: 'PATCH', auth: true }),
  markAllRead: () => request('/api/notifications/read-all', { method: 'POST', auth: true }),
};

// ---- Conversations / DMs ----
export const ConversationsAPI = {
  list: () => request('/api/conversations', { auth: true }),
  start: (userId) => request('/api/conversations', { method: 'POST', body: { user_id: userId }, auth: true }),
  accept: (conversationId) => request(`/api/conversations/${conversationId}/accept`, { method: 'POST', auth: true }),
  messages: (conversationId) => request(`/api/conversations/${conversationId}/messages`, { auth: true }),
  sendMessage: (conversationId, content) =>
    request(`/api/conversations/${conversationId}/messages`, { method: 'POST', body: { content }, auth: true }),
};

// ---- Blocks ----
export const BlocksAPI = {
  block: (userId) => request(`/api/users/${userId}/block`, { method: 'POST', auth: true }),
  unblock: (userId) => request(`/api/users/${userId}/block`, { method: 'DELETE', auth: true }),
};

// ---- Reports ----
export const ReportsAPI = {
  create: (target_type, target_id, reason) =>
    request('/api/reports', { method: 'POST', body: { target_type, target_id, reason }, auth: true }),
};

// ---- Stats ----
export const StatsAPI = {
  public: () => request('/api/stats/public'),
};

// ---- Admin (Verify USTED flow) ----
export const AdminAPI = {
  listUsers: (verified) =>
    request(`/api/admin/users${verified !== undefined ? `?verified=${verified}` : ''}`, { auth: true }),
  verify: (userId) => request(`/api/admin/users/${userId}/verify`, { method: 'POST', auth: true }),
  unverify: (userId) => request(`/api/admin/users/${userId}/unverify`, { method: 'POST', auth: true }),
  reports: () => request('/api/admin/reports', { auth: true }),
  updateReport: (reportId, status) =>
    request(`/api/admin/reports/${reportId}`, { method: 'PATCH', body: { status }, auth: true }),
  yawaVelocity: (windowHours = 6) =>
    request(`/api/admin/reactions/velocity?window_hours=${windowHours}`, { auth: true }),
};
