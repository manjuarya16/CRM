import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/authStore';

const navItems = [{ to: '/', label: 'Dashboard' }];

export default function DashboardLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidenav */}
      <aside className="w-[var(--tw-sidenav-width)] shrink-0 bg-dark text-slate-300">
        <div className="flex h-[var(--tw-topbar-height)] items-center px-6 text-lg font-bold text-white">
          Fresh App
        </div>
        <nav className="space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `block rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-[var(--tw-topbar-height)] items-center justify-between border-b border-gray-200 bg-white px-6">
          <div />
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium text-dark">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Log out
            </button>
          </div>
        </header>

        <main className="flex-1 bg-light p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
