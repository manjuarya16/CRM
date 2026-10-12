import React from "react";
import { Link } from "react-router-dom";
import useAppLogo from "@/hooks/useAppLogo";

interface AccountLayoutProps {
  pageImage?: any;
  authTitle?: string;
  helpText?: string;
  bottomLinks?: React.ReactNode;
  isCombineForm?: boolean;
  children?: React.ReactNode;
  hasForm?: boolean;
  userImage?: string;
}

const AuthLayout = ({
  authTitle,
  helpText,
  bottomLinks,
  children,
}: AccountLayoutProps) => {
  const { logoLight, orgName } = useAppLogo();

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8 relative select-none font-sans overflow-hidden"
      style={{
        background: "radial-gradient(circle at 50% 20%, #1E3A8A 0%, #0B0F1A 70%)",
      }}
    >
      {/* Centered Single Form Card Container */}
      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Top Logo */}
        <div className="text-center pb-2">
          <Link to="/" className="inline-flex items-center justify-center w-full">
            {logoLight ? (
              <img
                src={logoLight}
                alt={orgName || "Logo"}
                className="h-24 sm:h-28 w-auto max-w-[360px] sm:max-w-[400px] object-contain transition-all drop-shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white/10 text-white flex items-center justify-center font-bold text-3xl shadow-sm">
                C
              </div>
            )}
          </Link>
        </div>

        {/* Clean Single Form Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100/10 dark:border-slate-800 shadow-2xl p-7 sm:p-9 space-y-6">
          <div className="text-center space-y-1.5">
            {authTitle && (
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {authTitle}
              </h2>
            )}
            {helpText && (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {helpText}
              </p>
            )}
          </div>

          {children}

          {bottomLinks}
        </div>

        {/* Security Footer Note */}
        <div className="text-center pt-1">
          <div className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/60 border border-slate-700/50 text-xs text-slate-400 font-medium shadow-sm backdrop-blur-sm">
            <i className="mgc_lock_line text-sm text-slate-400"></i>
            <span>Secure 256-bit Encrypted Portal</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
