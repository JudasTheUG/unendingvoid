import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../../pages/LoginPage';
import * as authService from '../../lib/authService';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage - Local Username and Password Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders username and password inputs with local access buttons', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/auth\.usernameOrEmail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/auth\.password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /auth\.login/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /auth\.localGuest/i })).toBeInTheDocument();
  });

  it('allows user to sign in with username and password', async () => {
    const signInSpy = vi.spyOn(authService, 'signInEmail').mockResolvedValueOnce({
      user: { uid: 'u_123', username: 'void_runner' },
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const usernameInput = screen.getByLabelText(/auth\.usernameOrEmail/i);
    const passwordInput = screen.getByLabelText(/auth\.password/i);
    const submitBtn = screen.getByRole('button', { name: /auth\.login/i });

    fireEvent.change(usernameInput, { target: { value: 'void_runner' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(signInSpy).toHaveBeenCalledWith('void_runner', 'password123');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('supports quick local guest login', async () => {
    const guestSpy = vi.spyOn(authService, 'loginLocalGuest').mockResolvedValueOnce({
      user: { uid: 'guest_123', displayName: 'Void Operative' },
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const guestBtn = screen.getByRole('button', { name: /auth\.localGuest/i });
    fireEvent.click(guestBtn);

    await waitFor(() => {
      expect(guestSpy).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('allows toggling to registration mode with callsign input', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const toggleBtn = screen.getByRole('button', { name: /auth\.register/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByLabelText(/auth\.displayName/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/auth\.username/i)).toBeInTheDocument();
  });
});
