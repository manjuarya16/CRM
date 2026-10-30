import React, { useState } from "react";
import { useSuperAdminStore } from "@/store/superAdminStore";
import "@/pages/SuperAdmin/superAdminTheme.css";
import { AlertCircle, Eye, EyeOff, KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

export const SuperAdminLogin: React.FC = () => {
  const { login, loading, error } = useSuperAdminStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    await login(email, password);
  };

  return (
    <div
      className="super-admin-theme min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6"
      style={{
        background: "radial-gradient(circle at 50% 20%, #1E3A8A 0%, #0B0F1A 70%)",
      }}
    >
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#040975] border border-white/20 text-white mb-4 shadow-xl shadow-blue-950/50">
            <ShieldCheck aria-hidden="true" size={32} strokeWidth={1.8} className="text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            SaaS Platform Admin
          </h1>
          <p className="text-sm text-blue-200/80 mt-1">
            Super Administrator Portal & Platform Console
          </p>
        </div>

        {/* Form Card matching domain auth theme */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl p-7 sm:p-9">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-2.5">
              <AlertCircle aria-hidden="true" className="text-rose-600 shrink-0" size={19} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Super Admin Email
              </label>
              <div className="relative">
                <Mail aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#040975]" size={17} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="superadmin@crm.com"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#040975] focus:border-[#040975] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <KeyRound aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#040975]" size={17} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#040975] focus:border-[#040975] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#040975] hover:bg-[#232894] active:bg-[#373ca8] text-white font-medium text-sm shadow-lg shadow-blue-900/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <LockKeyhole aria-hidden="true" size={17} />
                  <span>Sign In as Super Admin</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">
              Use your assigned super administrator credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
