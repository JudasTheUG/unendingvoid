import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import PlayerSheet from './pages/PlayerSheet';
import DMPanel from './pages/DMPanel';
import LoadingSpinner from './components/shared/LoadingSpinner';

function ProtectedRoute({ children, requiredRole }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  const effectiveRole = profile?.role || 'player';

  // If page requires DM and user is not DM, send to Player Sheet (never loop to root)
  if (requiredRole === 'dm' && effectiveRole !== 'dm') {
    return <Navigate to="/sheet" replace />;
  }

  return children;
}

function RoleRedirect() {
  const { profile, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (profile?.role === 'dm') return <Navigate to="/dm" replace />;
  return <Navigate to="/sheet" replace />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RoleRedirect />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sheet"
          element={
            <ProtectedRoute requiredRole="player">
              <PlayerSheet />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dm"
          element={
            <ProtectedRoute requiredRole="dm">
              <DMPanel />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
