import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <h1 className="text-3xl font-bold">404</h1>
      <p className="text-gray-600">Page not found.</p>
      <Link to="/" className="text-sm font-medium text-gray-900 underline">
        Go home
      </Link>
    </div>
  );
}
