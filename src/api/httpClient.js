import { API_BASE_URL } from './config';

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function buildUrl(path, baseUrl = API_BASE_URL) {
  if (!path.startsWith('/')) {
    throw new Error(`API path must start with "/": ${path}`);
  }

  const base = (baseUrl || API_BASE_URL).replace(/\/+$/, '');
  return `${base}${path}`;
}

export async function apiGet(path, options = {}) {
  const baseUrl = options.baseUrl ?? API_BASE_URL;
  const response = await fetch(buildUrl(path, baseUrl), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(options.headers || {}),
    },
    signal: options.signal,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return payload;
}

export async function apiPost(path, body, options = {}) {
  const baseUrl = options.baseUrl ?? API_BASE_URL;
  const response = await fetch(buildUrl(path, baseUrl), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: body == null ? undefined : JSON.stringify(body),
    signal: options.signal,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return payload;
}

export async function apiPatch(path, body, options = {}) {
  const baseUrl = options.baseUrl ?? API_BASE_URL;
  const response = await fetch(buildUrl(path, baseUrl), {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: body == null ? undefined : JSON.stringify(body),
    signal: options.signal,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return payload;
}

export async function apiPut(path, body, options = {}) {
  const baseUrl = options.baseUrl ?? API_BASE_URL;
  const response = await fetch(buildUrl(path, baseUrl), {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: body == null ? undefined : JSON.stringify(body),
    signal: options.signal,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return payload;
}

export async function apiDelete(path, options = {}) {
  const baseUrl = options.baseUrl ?? API_BASE_URL;
  const response = await fetch(buildUrl(path, baseUrl), {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      ...(options.headers || {}),
    },
    signal: options.signal,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return payload;
}
