const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5009';

export async function apiFetch(path: string, options?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(await res.text());

  // Some endpoints (e.g. DELETE) return 204 No Content.
  if (res.status === 204) return null;

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return res.json();

  const text = await res.text();
  return text ? text : null;
}
