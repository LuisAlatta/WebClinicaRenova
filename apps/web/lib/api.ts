// Cliente HTTP central: agrega el token JWT y apunta al API Gateway.
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('renova_token');
}

export function setSesion(token: string, usuario: unknown) {
  localStorage.setItem('renova_token', token);
  localStorage.setItem('renova_usuario', JSON.stringify(usuario));
}

export function getUsuario(): any | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('renova_usuario');
  return raw ? JSON.parse(raw) : null;
}

export function logout() {
  localStorage.removeItem('renova_token');
  localStorage.removeItem('renova_usuario');
}

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));

  // Sesión expirada/ inválida en una ruta protegida: cerrar sesión y volver al login.
  // (No aplica al propio login para no ocultar el error de credenciales.)
  if (res.status === 401 && token && !path.startsWith('/api/auth/')) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('renova_token');
      localStorage.removeItem('renova_usuario');
      if (!window.location.pathname.startsWith('/login')) window.location.replace('/login');
    }
    throw new Error('Sesión expirada. Vuelve a iniciar sesión.');
  }

  if (!res.ok) throw new Error(json?.error || `Error ${res.status}`);
  return json as T;
}
