import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-light px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center text-xl font-bold text-dark">Fresh App</div>
        <Outlet />
      </div>
    </div>
  );
}
