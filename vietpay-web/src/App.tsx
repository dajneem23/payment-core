import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { WalletDetail } from './pages/WalletDetail';
import { Transfer } from './pages/Transfer';
import { FxRates } from './pages/FxRates';
import { Deposit } from './pages/admin/Deposit';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected — wrapped in Layout (header + nav) */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/wallets/:id" element={<WalletDetail />} />
            <Route path="/transfer" element={<Transfer />} />
            <Route path="/fx-rates" element={<FxRates />} />
            <Route
              path="/admin/deposit"
              element={
                <AdminRoute>
                  <Deposit />
                </AdminRoute>
              }
            />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
