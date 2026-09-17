import { useEffect, useState } from "react";
import { API } from "@/config";
import { useAuthorization, useAuthToken } from "@/hooks";
interface UserData {
  id: number;
  name: string;
  email: string;
  role_id: number;
}

export default function ProtectedComponentExample() {
  // Hook 1: Check if user is authorized
  const { isAuthenticated, user, token } = useAuthorization();

  // Hook 2: Get current token info
  const { isValid, isExpired } = useAuthToken();

  // Component State
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Protected Data
  useEffect(() => {
    if (!isAuthenticated) return; // Wait until authorized

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Interceptor automatically adds Authorization header
        const response = await API.get("/api/user/1");
        // If we reach here, token was valid and request succeeded
        setData(response.data);
      } catch (err: any) {
        // 401 is handled by interceptor (user redirected to login)
        const errorMsg = err.response?.data?.message || "Failed to load data";
        setError(errorMsg);
        // Only show error for non-401 errors (401 already shown by interceptor)
        if (err.response?.status !== 401) {
          console.error("❌ Error loading data:", errorMsg);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  // Show loading while checking authorization
  if (!isAuthenticated) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded">
        <p>Checking authorization...</p>
      </div>
    );
  }

  // Show error if occurred
  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded">
        <h3 className="text-red-800 font-bold mb-2">Error</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="p-6 bg-blue-50 border border-blue-200 rounded">
        <p>Loading data...</p>
      </div>
    );
  }

  // Show data
  return (
    <div className="p-6 border border-gray-300 rounded">
      <h2 className="text-xl font-bold mb-4">Protected Data</h2>

      {/* User Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded">
        <h3 className="font-bold mb-2">Current User</h3>
        <p>
          <strong>Name:</strong> {user?.name}
        </p>
        <p>
          <strong>Email:</strong> {user?.email}
        </p>
        <p>
          <strong>Role ID:</strong> {user?.role_id}
        </p>
      </div>

      {/* Token Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded">
        <h3 className="font-bold mb-2">Token Status</h3>
        <p>
          <strong>Valid:</strong>{" "}
          <span className={isValid ? "text-green-600" : "text-red-600"}>
            {isValid ? "✅ Yes" : "❌ No"}
          </span>
        </p>
        <p>
          <strong>Expired:</strong>{" "}
          <span className={isExpired ? "text-red-600" : "text-green-600"}>
            {isExpired ? "⚠️ Yes" : "✅ No"}
          </span>
        </p>
      </div>

      {/* Fetched Data */}
      {data && (
        <div className="p-4 bg-green-50 rounded border border-green-200">
          <h3 className="font-bold mb-2">Fetched Data</h3>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
