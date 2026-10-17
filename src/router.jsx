import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PlayerSheet from './pages/PlayerSheet';
import CampaignPage from './pages/CampaignPage';
import DMPanel from './pages/DMPanel';
import LoadingSpinner from './components/shared/LoadingSpinner';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

function AppRoutes() {
  const location = useLocation();

  return (
    <Routes location={location} key={location.pathname}>
      <Route path="/login" element={<LoginPage />} />

      {/* Dashboard hub: My Characters & My Campaigns */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Navigate to="/dashboard" replace />
          </ProtectedRoute>
        }
      />

      {/* Character Sheet routes (D&D Beyond style) */}
      <Route
        path="/character/:characterId"
        element={
          <ProtectedRoute>
            <PlayerSheet />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sheet"
        element={
          <ProtectedRoute>
            <PlayerSheet />
          </ProtectedRoute>
        }
      />

      {/* Campaign Page for Players */}
      <Route
        path="/campaign/:campaignId"
        element={
          <ProtectedRoute>
            <CampaignPage />
          </ProtectedRoute>
        }
      />

      {/* DM Command Console for Campaign */}
      <Route
        path="/dm/:campaignId"
        element={
          <ProtectedRoute>
            <DMPanel />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dm"
        element={
          <ProtectedRoute>
            <DMPanel />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
