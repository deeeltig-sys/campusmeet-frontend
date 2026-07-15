// Central place for the backend base URL.
// Change this ONE line if you ever move off Render or add a custom domain.
export const API_BASE = 'https://campus-backend-tz9q.onrender.com';

const TOKEN_KEY = 'campmeet_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
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
// Signup/login field names confirmed against the live deployed route.
export const AuthAPI = {
  signup: (payload) => request('/api/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
  // GET /api/auth/me — NOT /api/profile/me (that one's PATCH-only, for edits).
  // Returns the full raw users row (select "*"), so it includes columns like
  // student_id_number and verified_at that public_user_fields() would normally hide.
  me: () => request('/api/auth/me', { auth: true }),
};

// ---- Posts / Feed ----
export const PostsAPI = {
  // Public — reads the `feed` view (active posts, ranked). No auth needed.
  feed: (limit = 30, offset = 0) => request(`/api/posts/feed?limit=${limit}&offset=${offset}`),
  create: (payload) => request('/api/posts', { method: 'POST', body: payload, auth: true }),
  get: (postId) => request(`/api/posts/${postId}`),
  update: (postId, payload) => request(`/api/posts/${postId}`, { method: 'PATCH', body: payload, auth: true }),
  softDelete: (postId) => request(`/api/posts/${postId}`, { method: 'PATCH', body: { delete: true }, auth: true }),
  registerView: (postId) => request(`/api/posts/${postId}/view`, { method: 'POST', auth: true }),
  // type must be one of REACTION_TYPES above — the feed's "reaction" isn't a generic like,
  // it's one of these four. The UI treats "fire" as the default one-tap reaction.
  react: (postId, type = 'fire') =>
    request(`/api/posts/${postId}/reactions`, { method: 'POST', body: { type }, auth: true }),
  unreact: (postId) => request(`/api/posts/${postId}/reactions`, { method: 'DELETE', auth: true }),
};

// ---- Profile ----
export const ProfileAPI = {
  // Public view of anyone's profile (shaped by public_user_fields — no email/student ID).
  get: (userId) => request(`/api/profile/${userId}`),
  // Only full_name and avatar_url are editable per the backend's allowed_fields.
  updateMe: (payload) => request('/api/profile/me', { method: 'PATCH', body: payload, auth: true }),
};

// ---- Admin (Verify USTED flow) ----
export const AdminAPI = {
  // ?verified=false is the pending queue this app's admin panel needs.
  listUsers: (verified) =>
    request(`/api/admin/users${verified !== undefined ? `?verified=${verified}` : ''}`, { auth: true }),
  verify: (userId) => request(`/api/admin/users/${userId}/verify`, { method: 'POST', auth: true }),
  unverify: (userId) => request(`/api/admin/users/${userId}/unverify`, { method: 'POST', auth: true }),
  reports: () => request('/api/admin/reports', { auth: true }),
  updateReport: (reportId, status) =>
    request(`/api/admin/reports/${reportId}`, { method: 'PATCH', body: { status }, auth: true }),
  // Monitoring only — nothing here changes ranking or visibility.
  // Backend route: GET /api/admin/reactions/velocity
  yawaVelocity: (windowHours = 6) =>
    request(`/api/admin/reactions/velocity?window_hours=${windowHours}`, { auth: true }),
};
