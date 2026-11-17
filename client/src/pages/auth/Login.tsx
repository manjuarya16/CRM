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
import { getToken, isTokenExpired } from "@/lib/auth-utils";
import { getSubdomain } from "@/utils/subdomain";
import { superAdminApi } from "@/helpers/api/superAdmin";

const Login = () => {
  const { user, userLoggedIn, loading, login, reset } = useAuthStore();
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const subdomain = getSubdomain();

  useEffect(() => {
    if (subdomain.slug) {
      superAdminApi
        .getPublicTenant(subdomain.slug)
        .then((res) => {
          if (res.data?.success) {
            const data = res.data.data;
            setTenantInfo(data);
            const expired = Boolean(
              data?.status === "expired" ||
              data?.is_expired ||
              (data?.subscription_expiry_date && new Date(data.subscription_expiry_date).getTime() <= Date.now())
            );
            if (expired) {
              reset();
              try {
                sessionStorage.clear();
                localStorage.removeItem("auth-store");
                localStorage.removeItem("token");
                localStorage.removeItem("active_tenant_slug");
                document.cookie = "authToken=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
              } catch {}
            }
          }
        })
        .catch(() => {});
    } else {
      const token = getToken();
      if (!token || isTokenExpired(token)) {
        reset();
      }
    }
  }, [reset, subdomain.slug]);

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
  const nextParam = location?.search?.slice(6);
  const redirectUrl = nextParam && nextParam !== "/" ? nextParam : "/dashboard";

  const displayTitle = tenantInfo?.name ? `Sign in to ${tenantInfo.name}` : "Sign In";
  const displayHelp = subdomain.slug
    ? `Workspace: ${subdomain.slug} • Enter your credentials to access your CRM.`
    : "Enter your credentials to access your workspace.";

  const isOrgExpired = Boolean(
    tenantInfo?.status === "expired" ||
    tenantInfo?.is_expired ||
    (tenantInfo?.subscription_expiry_date && new Date(tenantInfo.subscription_expiry_date).getTime() <= Date.now())
  );

  if (isOrgExpired) {
    if (userLoggedIn || user || getToken()) {
      reset();
      try {
        sessionStorage.clear();
        localStorage.removeItem("auth-store");
        localStorage.removeItem("token");
        document.cookie = "authToken=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      } catch {}
    }
  } else if (!tenantInfo && subdomain.slug) {
    return null;
  } else if (userLoggedIn || user || (getToken() && !isTokenExpired(getToken()))) {
    return <Navigate to={redirectUrl} replace />;
  }

  return (
    <>
      <PageBreadcrumb title="Login" />
      <AuthLayout
        authTitle={displayTitle}
        helpText={displayHelp}
        logoImage={tenantInfo?.logo_url}
        orgName={tenantInfo?.name}
        bottomLinks={
          !subdomain.slug ? (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
              <Link
                to="/"
                className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-[#0088cc] transition-colors"
              >
                Sign in with your organization subdomain →
              </Link>
            </div>
          ) : undefined
        }
      >
        {isOrgExpired ? (
          <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl font-bold">
              <i className="mgc_time_line text-2xl"></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-800 dark:text-rose-200">Subscription Expired</h3>
              <p className="text-xs text-rose-600 dark:text-rose-300 mt-1">
                Access to <strong>{tenantInfo?.name || subdomain.slug}</strong> has expired. Logins are disabled until the subscription is renewed.
              </p>
            </div>
            <div className="pt-2">
              <a
                href={`/subscription/${tenantInfo?.slug || subdomain.slug}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md transition-all w-full"
              >
                <span>Renew Subscription / Pay Online</span>
                <i className="mgc_external_link_line text-sm"></i>
              </a>
            </div>
          </div>
        ) : (
        <VerticalForm<loginData>
          onSubmit={onSubmit}
          resolver={loginSchemaResolver}
          defaultValues={{ username: "", password: "" }}
          autoComplete="off"
        >
          <FormInput
            label="Email Address"
            type="email"
            name="username"
            placeholder={subdomain.slug ? `user@${subdomain.slug}.com` : "Enter your email address"}
            autoComplete="off"
            containerClass="mb-4"
            className="form-input w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0088cc] focus:border-transparent text-slate-800 dark:text-slate-100 transition-all"
            labelClassName="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider"
          />

          <FormInput
            label="Password"
            type="password"
            name="password"
            placeholder="Enter password"
            autoComplete="new-password"
            containerClass="mb-4"
            className="form-input w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0088cc] focus:border-transparent text-slate-800 dark:text-slate-100 transition-all"
            labelClassName="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider"
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
        )}
      </AuthLayout>
    </>
  );
};

export default Login;
