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
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-[#004b73] to-[#0088cc] p-4 sm:p-6 md:p-8 relative overflow-hidden select-none font-sans">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-sky-400/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -top-20 -left-20 w-80 h-80 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Centered Single Form Card Container */}
      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Top Logo & Organization Name Branding */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-3 justify-center">
            {logoLight ? (
              <img src={logoLight} alt={orgName} className="h-10 w-auto object-contain max-w-[220px]" />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                C
              </div>
            )}
            <span className="text-2xl font-extrabold tracking-tight text-white drop-shadow-sm">
              CRM
            </span>
          </Link>
        </div>

        {/* Clean Single Form Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl p-7 sm:p-9 space-y-6">
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
        <div className="text-center text-xs text-sky-100/70 font-medium flex items-center justify-center gap-1.5">
          <i className="mgc_lock_line text-sm"></i>
          <span>Secure 256-bit Encrypted Portal</span>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
