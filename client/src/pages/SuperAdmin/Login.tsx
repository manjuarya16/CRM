import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useSuperAdminStore } from "@/store/superAdminStore";
import useAppLogo from "@/hooks/useAppLogo";
import "@/pages/SuperAdmin/superAdminTheme.css";
import { AlertCircle, Eye, EyeOff, KeyRound, Mail } from "lucide-react";

export const SuperAdminLogin: React.FC = () => {
  const { login, loading } = useSuperAdminStore();
  const { logoLight, orgName } = useAppLogo();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!email.trim()) {
      setValidationError("Please enter your email address.");
      return;
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      setValidationError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setValidationError("Please enter your password.");
      return;
    }
    await login(email.trim(), password);
  };

  return (
    <div
      className="super-admin-theme min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6"
      style={{
        background: "radial-gradient(circle at 50% 20%, #1e3a5f 0%, #142236 50%, #0d1724 100%)",
      }}
    >
      <div className="w-full max-w-md">
        {/* Top Branding Logo */}
        <div className="text-center pb-6 flex justify-center">
          <Link to="/" className="inline-flex items-center justify-center transition-transform hover:scale-105" aria-label="Home">
            <img
              src={logoLight || "/logo-2.png"}
              alt={orgName || "MORSE CRM"}
              className="h-24 sm:h-28 w-auto max-w-[300px] sm:max-w-[340px] object-contain drop-shadow-md"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.endsWith("/logonew.png")) {
                  target.src = "/logonew.png";
                }
              }}
            />
          </Link>
        </div>

        {/* Form Card matching domain auth theme */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl p-7 sm:p-9">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              Sign In
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Enter your credentials to access the platform console.
            </p>
          </div>

          {validationError && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-2.5">
              <AlertCircle aria-hidden="true" className="text-rose-600 shrink-0" size={19} />
              <span>{validationError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Super Admin Email
              </label>
              <div className="relative flex items-center">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#040975]">
                  <Mail aria-hidden="true" size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="superadmin@crm.com"
                  autoComplete="off"
                  className="w-full pl-10 pr-3.5 py-2.5 h-11 bg-white border border-gray-300 rounded-xl text-sm leading-normal text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#040975] focus:border-[#040975] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#040975]">
                  <KeyRound aria-hidden="true" size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-11 py-2.5 h-11 bg-white border border-gray-300 rounded-xl text-sm leading-normal text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#040975] focus:border-[#040975] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#040975] hover:bg-[#03075e] text-white font-semibold text-sm transition-all shadow-md shadow-blue-900/30 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <span>Access Platform Console</span>
                )}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-blue-100/70 mt-6">
          Restricted platform administrator console. Authorized personnel only.
        </p>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
