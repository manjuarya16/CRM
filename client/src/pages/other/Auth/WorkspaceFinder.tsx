import React, { useState } from "react";
import { buildTenantUrl, buildSuperAdminUrl } from "@/utils/subdomain";

export const WorkspaceFinder: React.FC = () => {
  const [slug, setSlug] = useState("");
  const domainSuffix = window.location.hostname.includes("localhost")
    ? ".localhost:5173"
    : `.${window.location.hostname}`;

  const handleGoToWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "");
    if (!cleanSlug) return;
    window.location.href = buildTenantUrl(cleanSlug, "/login");
  };

  const handleQuickLaunch = (targetSlug: string) => {
    window.location.href = buildTenantUrl(targetSlug, "/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-lg">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0088cc]/20 border border-[#0088cc]/30 text-[#0088cc] mb-4 shadow-lg shadow-sky-500/10">
            <i className="mgc_building_2_line text-3xl"></i>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Find Your CRM Workspace
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Enter your organization's subdomain to access your team's CRM
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <form onSubmit={handleGoToWorkspace} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Your Organization Subdomain
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="acme"
                  required
                  autoFocus
                  className="w-full px-3.5 py-3 bg-slate-900 border border-slate-700 rounded-l-xl text-base font-mono text-sky-400 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0088cc] focus:border-transparent transition-all"
                />
                <span className="px-3.5 py-3 bg-slate-900/60 border border-l-0 border-slate-700 rounded-r-xl text-xs sm:text-sm font-mono text-slate-400 whitespace-nowrap">
                  {domainSuffix}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Example: If your team URL is <span className="text-sky-400 font-mono">acme{domainSuffix}</span>, type <span className="text-sky-400 font-mono">acme</span>.
              </p>
            </div>

            <button
              type="submit"
              disabled={!slug.trim()}
              className="w-full py-3 px-4 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white font-semibold text-sm shadow-lg shadow-sky-600/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <span>Continue to Workspace</span>
              <i className="mgc_arrow_right_line text-base"></i>
            </button>
          </form>

          {/* Quick Demo Launchers */}
          <div className="pt-4 border-t border-slate-700/60">
            <p className="text-xs text-slate-400 mb-2.5 font-medium">Quick Access Workspaces:</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleQuickLaunch("acme")}
                className="px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-sky-300 transition-colors flex items-center gap-1.5"
              >
                <span>acme{domainSuffix}</span>
                <i className="mgc_external_link_line text-xs"></i>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLaunch("default")}
                className="px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-slate-300 transition-colors flex items-center gap-1.5"
              >
                <span>default{domainSuffix}</span>
                <i className="mgc_external_link_line text-xs"></i>
              </button>
            </div>
          </div>

          {/* Super Admin Link */}
          <div className="pt-4 border-t border-slate-700/60 text-center">
            <p className="text-xs text-slate-400">
              Platform Administrator?{" "}
              <a
                href={buildSuperAdminUrl("/")}
                className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 ml-1"
              >
                Super Admin Console →
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceFinder;
