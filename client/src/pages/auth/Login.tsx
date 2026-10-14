import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { showErrorAlert } from "../../utils/swalAlert";
import { loginSchemaResolver } from "../../schemas/loginSchema";
import { useAuthStore } from "../../store";
import {
  VerticalForm,
  FormInput,
  AuthLayout,
  PageBreadcrumb,
} from "../../components";
import { loginData } from "@/interface/authInterface";

const Login = () => {
  const { user, userLoggedIn, loading, login, reset } = useAuthStore();
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  useEffect(() => {
    reset();
  }, [reset]);

  const onSubmit = async (formData: loginData) => {
    try {
      await login(formData.username, formData.password);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || "Invalid credentials. Please try again.";
      showErrorAlert("Authentication Error", message);
    }
  };

  const location = useLocation();
  const redirectUrl = location?.search?.slice(6) || "/";

  return (
    <>
      {(userLoggedIn || user) && <Navigate to={redirectUrl} replace />}
      <PageBreadcrumb title="Login" />
      <AuthLayout
        authTitle="Sign In"
        helpText="Enter your credentials to access your workspace."
      >

        <VerticalForm<loginData>
          onSubmit={onSubmit}
          resolver={loginSchemaResolver}
          defaultValues={{ username: "admin@example.com", password: "" }}
        >
          <FormInput
            label="Email Address"
            type="email"
            name="username"
            placeholder="admin@example.com"
            containerClass="mb-4"
            className="form-input w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0088cc] focus:border-transparent text-slate-800 dark:text-slate-100 transition-all"
            labelClassName="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider"
            required
          />

          <FormInput
            label="Password"
            type="password"
            name="password"
            placeholder="••••••••"
            containerClass="mb-4"
            className="form-input w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0088cc] focus:border-transparent text-slate-800 dark:text-slate-100 transition-all"
            labelClassName="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider"
            required
          />

          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#0088cc] focus:ring-[#0088cc]"
              />
              <span>Remember me</span>
            </label>

            <Link
              to="/auth/recover-password"
              className="text-xs font-semibold text-[#0088cc] hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

          <button
            className="w-full py-3 px-4 bg-[#0088cc] hover:bg-[#0077b5] active:scale-[0.99] text-white text-sm font-bold rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </VerticalForm>
      </AuthLayout>
    </>
  );
};

export default Login;
