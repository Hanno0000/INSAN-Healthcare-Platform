'use client';

import { createContext, useContext } from 'react';
import type { AdminUser } from './auth';

interface AdminUserContextValue {
  user: AdminUser | null;
  setUser: (user: AdminUser | null) => void;
}

export const AdminUserContext = createContext<AdminUserContextValue>({
  user: null,
  setUser: () => {},
});

export function useAdminUser() {
  return useContext(AdminUserContext);
}
