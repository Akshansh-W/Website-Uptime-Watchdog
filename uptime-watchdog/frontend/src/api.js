const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

async function request(method, path, body = null) {
  const token = localStorage.getItem('wd_token');
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

export const authAPI = {
  signup:        (name, email, password, phone) => request('POST', '/api/auth/signup', { name, email, password, phone }),
  login:         (email, password)              => request('POST', '/api/auth/login',  { email, password }),
  me:            ()                             => request('GET',  '/api/auth/me'),
  updateProfile: (phone, sms_alerts)            => request('PUT',  '/api/auth/profile', { phone, sms_alerts }),
};

export const monitorsAPI = {
  getAll:  ()     => request('GET',    '/api/monitors'),
  create:  (data) => request('POST',   '/api/monitors', data),
  delete:  (id)   => request('DELETE', `/api/monitors/${id}`),
  ping:    (id)   => request('POST',   `/api/monitors/${id}/ping`),
};

export const apiChecksAPI = {
  getAll: (monitorId)         => request('GET',    `/api/monitors/${monitorId}/apis`),
  create: (monitorId, data)   => request('POST',   `/api/monitors/${monitorId}/apis`, data),
  delete: (monitorId, apiId)  => request('DELETE', `/api/monitors/${monitorId}/apis/${apiId}`),
  run:    (monitorId, apiId)  => request('POST',   `/api/monitors/${monitorId}/apis/${apiId}/run`),
};
