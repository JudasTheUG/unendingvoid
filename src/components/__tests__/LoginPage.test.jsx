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

describe('LoginPage - Registration with Username, Mail & Password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login fields by default', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/auth\.usernameOrEmail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/auth\.password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /auth\.login/i })).toBeInTheDocument();
  });

  it('switches to registration form with Username, Email, Password and Callsign', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const toggleBtn = screen.getByRole('button', { name: /auth\.register/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByLabelText(/^auth\.username$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^auth\.email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^auth\.password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/auth\.displayName/i)).toBeInTheDocument();
  });

  it('validates email format before registering', async () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    // Switch to register mode
    fireEvent.click(screen.getByRole('button', { name: /auth\.register/i }));

    const usernameInput = screen.getByLabelText(/^auth\.username$/i);
    const emailInput = screen.getByLabelText(/^auth\.email$/i);
    const passwordInput = screen.getByLabelText(/^auth\.password$/i);
    const submitBtn = screen.getByRole('button', { name: /auth\.register/i });

    fireEvent.change(usernameInput, { target: { value: 'commander_99' } });
    fireEvent.change(emailInput, { target: { value: 'not-a-valid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitBtn);

    expect(screen.getByText('auth.invalidEmail')).toBeInTheDocument();
  });

  it('successfully calls registerWithCredentials when registration form is valid', async () => {
    const registerSpy = vi.spyOn(authService, 'registerWithCredentials').mockResolvedValueOnce({
      user: { uid: 'u_test_99', username: 'star_pilot', email: 'pilot@void.net' },
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    // Switch to register mode
    fireEvent.click(screen.getByRole('button', { name: /auth\.register/i }));

    fireEvent.change(screen.getByLabelText(/^auth\.username$/i), { target: { value: 'star_pilot' } });
    fireEvent.change(screen.getByLabelText(/^auth\.email$/i), { target: { value: 'pilot@void.net' } });
    fireEvent.change(screen.getByLabelText(/^auth\.password$/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/auth\.displayName/i), { target: { value: 'Captain Star' } });

    fireEvent.click(screen.getByRole('button', { name: /auth\.register/i }));

    await waitFor(() => {
      expect(registerSpy).toHaveBeenCalledWith({
        username: 'star_pilot',
        email: 'pilot@void.net',
        password: 'password123',
        displayName: 'Captain Star',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('displays error if username is already taken', async () => {
    vi.spyOn(authService, 'registerWithCredentials').mockRejectedValueOnce(
      new Error('USERNAME_TAKEN')
    );

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /auth\.register/i }));

    fireEvent.change(screen.getByLabelText(/^auth\.username$/i), { target: { value: 'already_taken' } });
    fireEvent.change(screen.getByLabelText(/^auth\.email$/i), { target: { value: 'pilot@void.net' } });
    fireEvent.change(screen.getByLabelText(/^auth\.password$/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /auth\.register/i }));

    await waitFor(() => {
      expect(screen.getByText('auth.usernameTaken')).toBeInTheDocument();
    });
  });
});
