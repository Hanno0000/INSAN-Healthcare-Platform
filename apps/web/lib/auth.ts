'use client';

import { setAccessToken, api } from './api-client';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  roleName: string;
  permissions: Record<string, string[]>;
}

// Session cookie name (just a flag — the real auth is the httpOnly refresh token cookie)
const SESSION_COOKIE = 'admin_session';

export async function login(email: string, password: string): Promise<AdminUser> {
  const result = await api.auth.login(email, password);
  const { accessToken, user } = result.data;

  // Store access token in memory
  setAccessToken(accessToken);

  // Set a session cookie flag (not the actual token)
  document.cookie = `${SESSION_COOKIE}=1; path=/; samesite=lax; max-age=${24 * 60 * 60}`;

  return user as AdminUser;
}

export async function logout() {
  try {
    await api.auth.logout();
  } catch {
    // Ignore errors on logout
  }

  setAccessToken(null);
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`;
  window.location.href = '/admin/login';
}

export function hasPermission(
  user: AdminUser | null,
  module: string,
  action: string,
): boolean {
  if (!user) return false;
  const modulePerms = user.permissions?.[module] ?? [];
  return modulePerms.includes(action);
}
