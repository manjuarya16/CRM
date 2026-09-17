import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { showErrorAlert } from "../../utils/swalAlert";

import { loginSchemaResolver } from "../../schemas/loginSchema";

// zustand
import { useAuthStore } from "../../store";

// components
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

  /*
  handle form submission
  */
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

  // redirection back to where user got redirected from
  const redirectUrl = location?.search?.slice(6) || "/";

  return (
    <>
      {(userLoggedIn || user) && <Navigate to={redirectUrl} replace />}
      <PageBreadcrumb title="Login" />
      <AuthLayout
        authTitle="Welcome Back"
        helpText="Sign in to your CRM account to continue."
        bottomLinks={
          <div className="mt-6 text-center text-xs text-slate-400">
            <span>Secured PostgreSQL & pgAdmin CRM Portal</span>
          </div>
        }
      >
        {/* Quick Credentials Info Box */}
        <div className="mb-5 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
          <p className="font-semibold mb-1">🔑 Default Admin Credentials:</p>
          <p><strong>Email:</strong> admin@example.com</p>
        </div>

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
            className="form-input w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-900 focus:ring-primary focus:border-primary"
            labelClassName="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
            required
          />

          <FormInput
            label="Password"
            type="password"
            name="password"
            placeholder="••••••••"
            containerClass="mb-4"
            className="form-input w-full rounded-s-lg border-slate-300 dark:border-slate-700 dark:bg-slate-900 focus:ring-primary focus:border-primary"
            labelClassName="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
            required
          />

          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="form-checkbox rounded text-primary focus:ring-primary"
              />
              <span>Remember me</span>
            </label>

            <Link
              to="/auth/recover-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

          <button
            className="btn w-full text-white bg-primary hover:bg-primary/90 font-semibold py-2.5 rounded-lg shadow-sm transition-all duration-150 flex items-center justify-center gap-2"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
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

