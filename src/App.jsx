import { useTranslation } from 'react-i18next';
import { AuthProvider } from './hooks/useAuth';
import AppRouter from './router';

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
