import React, { useEffect, useState } from "react";
import { useSuperAdminStore, TenantRecord } from "@/store/superAdminStore";
import { buildTenantUrl } from "@/utils/subdomain";

export const SuperAdminDashboard: React.FC = () => {
  const {
    admin,
    tenants,
    metrics,
    loading,
    error,
    logout,
    fetchTenants,
    fetchMetrics,
    createTenant,
    toggleTenantStatus,
  } = useSuperAdminStore();

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Create form state
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formPlan, setFormPlan] = useState("pro");
  const [formAdminName, setFormAdminName] = useState("");
  const [formAdminEmail, setFormAdminEmail] = useState("");
  const [formAdminPassword, setFormAdminPassword] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [createdTenantResult, setCreatedTenantResult] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTenants();
    fetchMetrics();
  }, [fetchTenants, fetchMetrics]);

  // Auto-slugify organization name
  const handleNameChange = (name: string) => {
    setFormName(name);
    const slugified = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setFormSlug(slugified);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSubmitting(true);

    const res = await createTenant({
      name: formName,
      slug: formSlug,
      plan: formPlan,
      admin_name: formAdminName,
      admin_email: formAdminEmail,
      admin_password: formAdminPassword,
    });

    setSubmitting(false);

    if (res.success && res.tenant) {
      setCreatedTenantResult(res.tenant);
    } else {
      setModalError(res.error || "Failed to create organization");
    }
  };

  const resetModal = () => {
    setShowModal(false);
    setFormName("");
    setFormSlug("");
    setFormPlan("pro");
    setFormAdminName("");
    setFormAdminEmail("");
    setFormAdminPassword("");
    setModalError(null);
    setCreatedTenantResult(null);
  };

  const handleToggleStatus = async (tenant: TenantRecord) => {
    setActionLoadingId(tenant.id);
    await toggleTenantStatus(tenant.id, tenant.status);
    setActionLoadingId(null);
  };

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-lg shadow-sm">
              <i className="mgc_shield_line"></i>
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg leading-tight text-white">
                SaaS Super Admin
              </h1>
              <p className="text-xs text-slate-400">Multi-Tenant Management Console</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
              <i className="mgc_user_3_line text-slate-400"></i>
              <span>{admin?.name || admin?.email || "Super Admin"}</span>
            </div>
            <button
              onClick={logout}
              className="h-8 px-3 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors flex items-center gap-1.5"
            >
              <i className="mgc_exit_line text-sm"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Organizations
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {metrics?.totalTenants ?? tenants.length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-xl">
              <i className="mgc_community_line"></i>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Active Organizations
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-1">
                {metrics?.activeTenants ?? tenants.filter((t) => t.status === "active").length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl">
              <i className="mgc_check_circle_line"></i>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Platform Users
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {metrics?.totalUsers ?? 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-xl">
              <i className="mgc_user_3_line"></i>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Leads
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-amber-400 mt-1">
                {metrics?.totalLeads ?? 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl">
              <i className="mgc_target_line"></i>
            </div>
          </div>
        </div>

        {/* Toolbar & Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="relative flex-1 sm:max-w-md">
            <i className="mgc_search_line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search organizations by name or subdomain..."
              className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchTenants();
                fetchMetrics();
              }}
              className="h-9 px-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors flex items-center gap-1.5"
              title="Refresh"
            >
              <i className="mgc_refresh_3_line text-sm"></i>
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => {
                resetModal();
                setShowModal(true);
              }}
              className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5 shrink-0"
            >
              <i className="mgc_add_circle_line text-base"></i>
              <span>Create Organization</span>
            </button>
          </div>
        </div>

        {/* Organizations Table Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300">
              <thead className="bg-slate-800/50 text-slate-400 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Organization</th>
                  <th className="py-3.5 px-4">Subdomain / Login URL</th>
                  <th className="py-3.5 px-4">Plan</th>
                  <th className="py-3.5 px-4">Users</th>
                  <th className="py-3.5 px-4">Leads</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading && tenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <div className="inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                      <p>Loading organizations...</p>
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <i className="mgc_ghost_line text-4xl mb-2 text-slate-600 block"></i>
                      <p>No organizations found matching your search.</p>
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((t) => {
                    const workspaceUrl = buildTenantUrl(t.slug, "/login");
                    const isDefault = t.slug === "default";

                    return (
                      <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                              {t.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-white leading-tight">{t.name}</p>
                              <p className="text-xs text-slate-400">ID: #{t.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-indigo-300 bg-indigo-950/40 border border-indigo-800/50 px-2 py-0.5 rounded-md">
                              {t.slug}
                            </span>
                            <a
                              href={workspaceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition-colors"
                              title="Open Login Workspace"
                            >
                              <i className="mgc_external_link_line text-sm"></i>
                            </a>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="capitalize px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            {t.plan || "pro"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-200">
                          {t.user_count}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-200">
                          {t.lead_count}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              t.status === "active"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                t.status === "active" ? "bg-emerald-400" : "bg-rose-400"
                              }`}
                            ></span>
                            <span className="capitalize">{t.status}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={workspaceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="h-8 px-2.5 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors flex items-center gap-1"
                            >
                              <span>Workspace</span>
                              <i className="mgc_external_link_line text-xs"></i>
                            </a>

                            {!isDefault && (
                              <button
                                onClick={() => handleToggleStatus(t)}
                                disabled={actionLoadingId === t.id}
                                className={`h-8 px-2.5 rounded-lg text-xs font-medium border transition-colors ${
                                  t.status === "active"
                                    ? "border-rose-900/40 bg-rose-950/20 text-rose-400 hover:bg-rose-900/30"
                                    : "border-emerald-900/40 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-900/30"
                                }`}
                              >
                                {actionLoadingId === t.id ? (
                                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                ) : t.status === "active" ? (
                                  "Suspend"
                                ) : (
                                  "Activate"
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal: Create Organization */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Create New Organization</h3>
                <p className="text-xs text-slate-400">
                  Provision a new CRM workspace with sub domain URL
                </p>
              </div>
              <button
                onClick={resetModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <i className="mgc_close_line text-xl"></i>
              </button>
            </div>

            {createdTenantResult ? (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-400 text-base">
                    <i className="mgc_check_circle_fill text-xl"></i>
                    <span>Organization Created Successfully!</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    The workspace has been automatically provisioned with default sales pipelines,
                    administrator role, and initial user credentials.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2.5 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Organization:</span>
                    <span className="font-semibold text-white text-sm">
                      {createdTenantResult.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Subdomain Login URL:</span>
                    <a
                      href={buildTenantUrl(createdTenantResult.slug, "/login")}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 hover:underline font-mono text-xs flex items-center gap-1.5 break-all"
                    >
                      <span>{buildTenantUrl(createdTenantResult.slug, "/login")}</span>
                      <i className="mgc_external_link_line"></i>
                    </a>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={resetModal}
                    className="h-9 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
                  >
                    Done
                  </button>
                  <a
                    href={buildTenantUrl(createdTenantResult.slug, "/login")}
                    target="_blank"
                    rel="noreferrer"
                    className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all"
                  >
                    <span>Open Workspace</span>
                    <i className="mgc_external_link_line"></i>
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                {modalError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <i className="mgc_alert_line text-base text-rose-400 shrink-0"></i>
                    <span>{modalError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Organization / Company Name *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    required
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Subdomain Slug *
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="acme"
                      required
                      className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-l-xl text-sm font-mono text-indigo-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="px-3 py-2 bg-slate-800/60 border border-l-0 border-slate-700 rounded-r-xl text-xs font-mono text-slate-400 whitespace-nowrap">
                      .{window.location.hostname.includes("localhost") ? "localhost:5173" : window.location.hostname}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Will form the URL: <span className="text-indigo-400 font-mono">{formSlug || "subdomain"}.yourcrm.com</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Subscription Plan
                    </label>
                    <select
                      value={formPlan}
                      onChange={(e) => setFormPlan(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Initial Admin Name *
                    </label>
                    <input
                      type="text"
                      value={formAdminName}
                      onChange={(e) => setFormAdminName(e.target.value)}
                      placeholder="e.g. John Doe"
                      required
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Admin Email *
                    </label>
                    <input
                      type="email"
                      value={formAdminEmail}
                      onChange={(e) => setFormAdminEmail(e.target.value)}
                      placeholder="admin@company.com"
                      required
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Admin Password *
                    </label>
                    <input
                      type="password"
                      value={formAdminPassword}
                      onChange={(e) => setFormAdminPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={resetModal}
                    className="h-9 px-4 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all"
                  >
                    {submitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Provisioning...</span>
                      </>
                    ) : (
                      <>
                        <i className="mgc_check_line text-sm"></i>
                        <span>Provision Workspace</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
