import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-bold text-blue-600 tracking-tight">
              VietPay
            </Link>
            <nav className="flex gap-4 text-sm font-medium text-gray-600">
              <Link to="/" className="hover:text-gray-900 transition-colors">
                Wallets
              </Link>
              <Link to="/transfer" className="hover:text-gray-900 transition-colors">
                Transfer
              </Link>
              <Link to="/fx-rates" className="hover:text-gray-900 transition-colors">
                FX Rates
              </Link>
              {isAdmin && (
                <Link to="/admin/deposit" className="hover:text-gray-900 transition-colors">
                  Deposit
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {user && (
              <span className="text-gray-500">
                {isAdmin && (
                  <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded mr-1.5 font-medium">
                    ADMIN
                  </span>
                )}
                {user.sub}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        <Outlet />
      </main>
    </div>
  );
}
