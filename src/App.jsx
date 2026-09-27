import { Navigate, Route, Routes } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

export default function App() {
  const token = useSelector((state) => state.auth.token);
  return <Routes>
    <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginPage />} />
    <Route path="/" element={token ? <DashboardPage /> : <Navigate to="/login" replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
