const API_BASE = '';

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${API_BASE}${path}`, opts);
  if (!r.ok) {
    const err = await r.text();
    throw new Error(err || `HTTP ${r.status}`);
  }
  return r.json();
}

function formData(path: string, fd: FormData) {
  return fetch(`${API_BASE}${path}`, { method: 'POST', body: fd });
}

// Subjects
export const subjects = {
  list: (q = '', limit = 50, offset = 0) =>
    api<any[]>( 'GET', `/api/subjects?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`),
  get: (id: string) => api<any>('GET', `/api/subjects/${id}`),
  create: (data: any) => api<any>('POST', '/api/subjects', data),
  update: (id: string, data: any) => api<any>('PUT', `/api/subjects/${id}`, data),
  delete: (id: string) => api<any>('DELETE', `/api/subjects/${id}`),
};

// Media
export const media = {
  list: (sid: string) => api<any[]>('GET', `/api/subjects/${sid}/media`),
  upload: (sid: string, fd: FormData) => formData(`/api/subjects/${sid}/media`, fd),
  delete: (id: string) => api<any>('DELETE', `/api/media/${id}`),
  setPrimary: (id: string) => api<any>('POST', `/api/media/${id}/primary`),
};

// Events
export const events = {
  list: (sid: string) => api<any[]>('GET', `/api/subjects/${sid}/events`),
  create: (sid: string, data: any) => api<any>('POST', `/api/subjects/${sid}/events`, data),
  update: (id: string, data: any) => api<any>('PUT', `/api/events/${id}`, data),
  delete: (id: string) => api<any>('DELETE', `/api/events/${id}`),
};

// Locations
export const locations = {
  list: (sid: string) => api<any[]>('GET', `/api/subjects/${sid}/locations`),
  create: (sid: string, data: any) => api<any>('POST', `/api/subjects/${sid}/locations`, data),
  delete: (id: string) => api<any>('DELETE', `/api/locations/${id}`),
};

// Relations
export const relations = {
  list: (sid: string) => api<any[]>('GET', `/api/subjects/${sid}/relations`),
  create: (data: any) => api<any>('POST', '/api/relations', data),
  delete: (id: string) => api<any>('DELETE', `/api/relations/${id}`),
};

// Identifiers
export const identifiers = {
  list: (sid: string) => api<any[]>('GET', `/api/subjects/${sid}/identifiers`),
  create: (sid: string, data: any) => api<any>('POST', `/api/subjects/${sid}/identifiers`, data),
  delete: (id: string) => api<any>('DELETE', `/api/identifiers/${id}`),
};

// Contacts
export const contacts = {
  list: (sid: string) => api<any[]>('GET', `/api/subjects/${sid}/contacts`),
  create: (sid: string, data: any) => api<any>('POST', `/api/subjects/${sid}/contacts`, data),
  delete: (id: string) => api<any>('DELETE', `/api/contacts/${id}`),
};

// Notes
export const notes = {
  list: (sid: string) => api<any[]>('GET', `/api/subjects/${sid}/notes`),
  create: (sid: string, data: any) => api<any>('POST', `/api/subjects/${sid}/notes`, data),
  update: (id: string, data: any) => api<any>('PUT', `/api/notes/${id}`, data),
  delete: (id: string) => api<any>('DELETE', `/api/notes/${id}`),
};

// AI
export const ai = {
  list: (sid: string) => api<any[]>('GET', `/api/subjects/${sid}/ai-analyses`),
  save: (sid: string, data: any) => api<any>('POST', `/api/subjects/${sid}/ai-analyses`, data),
  analyze: (data: any) => api<any>('POST', '/api/ai/analyze', data),
};

// OSINT
export const osint = {
  status: (sid: string) => api<any>('GET', `/api/subjects/${sid}/osint/status`),
  run: (sid: string, data: any) => api<any>('POST', `/api/subjects/${sid}/osint/run`, data),
  progress: (sid: string) => api<any>('GET', `/api/subjects/${sid}/osint/progress`),
  log: (sid: string) => api<any>('GET', `/api/subjects/${sid}/osint/log`),
  import_: (sid: string, data: any) => api<any>('POST', `/api/subjects/${sid}/osint/import`, data),
  installDeps: (sid: string) => api<any>('POST', `/api/subjects/${sid}/osint/install-deps`),
};

// Board
export const board = {
  get: (sid: string) => api<any>('GET', `/api/subjects/${sid}/board`),
};

// Stats
export const stats = () => api<any>('GET', '/api/stats');
