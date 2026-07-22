import React from 'react';
import { RoleProvider } from './src/context';
import { AppNavigator } from './src/navigation';

export default function App() {
  return (
    <RoleProvider>
      <AppNavigator />
    </RoleProvider>
  );
}
