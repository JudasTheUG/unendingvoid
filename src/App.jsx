import React from 'react';
import { AuthProvider } from './hooks/useAuth';
import AppRouter from './router';
import ErrorBoundary from './components/shared/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ErrorBoundary>
  );
}
