import { useAuthStore } from '@/lib/authStore';

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-dark">Welcome{user ? `, ${user.name}` : ''}</h1>
      <p className="mt-2 text-sm text-gray-600">
        This is a blank slate — start building your new project's pages here.
      </p>
    </div>
  );
}
