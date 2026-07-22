import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'buyer' | 'rider';

interface RoleContextType {
  role: UserRole;
  isLoggedIn: boolean;
  login: (role: UserRole) => void;
  logout: () => void;
  setRole: (role: UserRole) => void;
}

const RoleContext = createContext<RoleContextType>({
  role: 'buyer',
  isLoggedIn: false,
  login: () => {},
  logout: () => {},
  setRole: () => {},
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>('buyer');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const login = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setIsLoggedIn(true);
  };

  const logout = () => {
    setIsLoggedIn(false);
  };

  return (
    <RoleContext.Provider value={{ role, isLoggedIn, login, logout, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
