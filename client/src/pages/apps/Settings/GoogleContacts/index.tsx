import React, { useState, useEffect } from "react";
import API from "@/config";
import Swal from "sweetalert2";
import { PageBreadcrumb } from "@/components";
import { IGoogleContactAccount, IContactExportBatch } from "@/interface";

const GoogleContactsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<IGoogleContactAccount[]>([]);
  const [batches, setBatches] = useState<IContactExportBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [syncing, setSyncing] = useState(false);

  const fetchAccountsAndBatches = async () => {
    try {
      setLoading(true);
      const [accRes, batchRes] = await Promise.all([
        API.get("/google-contacts/accounts").catch(() => ({ data: { data: [] } })),
        API.get("/google-contacts/batches").catch(() => ({ data: { data: [] } })),
      ]);
      setAccounts(accRes.data?.data || []);
      setBatches(batchRes.data?.data || []);
    } catch {
      setAccounts([]);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountsAndBatches();
  }, []);

  const handleConnectAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await API.post("/google-contacts/accounts", {
        google_email: googleEmail,
        access_token: accessToken || "mock_oauth_token_" + Date.now(),
      });
      Swal.fire({ icon: "success", title: "Connected!", text: "Google account connected successfully", timer: 1500, showConfirmButton: false });
      setIsConnectModalOpen(false);
      setGoogleEmail("");
      setAccessToken("");
      fetchAccountsAndBatches();
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || "Failed to connect Google account" });
    }
  };

  const handleDisconnect = async (id: number) => {
    const res = await Swal.fire({
      title: "Disconnect Account?",
      text: "Do you want to disconnect this Google account from CRM?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, disconnect",
    });
    if (res.isConfirmed) {
      try {
        await API.delete(`/google-contacts/accounts/${id}`);
        Swal.fire({ icon: "success", title: "Disconnected", timer: 1200, showConfirmButton: false });
        fetchAccountsAndBatches();
      } catch (err: any) {
        Swal.fire({ icon: "error", title: "Error", text: err.message || "Failed" });
      }
    }
  };

  const handleSyncContacts = async (account: IGoogleContactAccount) => {
    try {
      setSyncing(true);
      const res = await API.post(`/google-contacts/sync/${account.id}`);
      Swal.fire({
        icon: "success",
        title: "Synchronized!",
        text: res.data?.message || "Google contacts imported into CRM Persons.",
      });
      fetchAccountsAndBatches();
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Sync Failed", text: err.response?.data?.message || "Sync failed" });
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateExportBatch = async () => {
    try {
      const res = await API.post("/google-contacts/export", {});
      Swal.fire({
        icon: "success",
        title: "Export Batch Queued!",
        text: res.data?.message || "CRM contacts queued for export to Google Contacts.",
      });
      fetchAccountsAndBatches();
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.message || "Failed to queue export" });
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <PageBreadcrumb title="Google Contacts" breadCrumbItems={["Settings", "Google Contacts"]} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Google Contacts Integration</h1>
          <p className="text-sm text-gray-500 mt-0.5">Connect Google accounts, sync contacts, and manage batch exports</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCreateExportBatch}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 rounded-lg shadow-sm transition-colors"
          >
            <i className="mgc_upload_line text-lg"></i>
            Export CRM Contacts
          </button>
          <button
            onClick={() => setIsConnectModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0088cc] hover:bg-[#0077b3] rounded-lg shadow-sm transition-colors"
          >
            <i className="mgc_google_line text-lg"></i>
            Connect Google Account
          </button>
        </div>
      </div>

      {/* Connected Accounts Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-4">
        <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <i className="mgc_google_line text-red-500"></i> Connected Google Accounts
        </h3>

        {accounts.length === 0 ? (
          <div className="p-6 border border-dashed rounded-xl text-center text-gray-400 text-xs space-y-2">
            <p>No Google accounts connected yet.</p>
            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="text-blue-600 hover:underline font-semibold"
            >
              Click here to connect your Google account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((acc) => (
              <div key={acc.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-red-500 shadow-sm text-xl font-bold">
                    G
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">{acc.google_email}</h4>
                    <span className="inline-flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span> Connected & Active
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSyncContacts(acc)}
                    disabled={syncing}
                    className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                  >
                    <i className="mgc_refresh_2_line"></i>
                    {syncing ? "Syncing..." : "Sync Contacts"}
                  </button>
                  <button
                    onClick={() => handleDisconnect(acc.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"
                    title="Disconnect"
                  >
                    <i className="mgc_delete_line text-base"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export Batches Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Google Contact Export Batches</h3>
          <span className="text-xs text-gray-400">{batches.length} batches</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="py-3.5 px-4">Batch ID</th>
                <th className="py-3.5 px-4">Total Contacts</th>
                <th className="py-3.5 px-4">Exported Count</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">Loading batches...</td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">No export batches recorded yet.</td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-750 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-gray-500">#{batch.id}</td>
                    <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-100">{batch.total_contacts}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{batch.exported_count}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 capitalize">
                        {batch.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-400 text-right">
                      {batch.created_at ? new Date(batch.created_at).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Connect Modal */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Connect Google Account</h3>
              <button onClick={() => setIsConnectModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleConnectAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Google Account Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. sales@company.com"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  OAuth Token (or click Connect to authorize)
                </label>
                <input
                  type="text"
                  placeholder="Optional custom access token"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border rounded-lg focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsConnectModalOpen(false)}
                  className="px-4 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#0088cc] hover:bg-[#0077b3] rounded-lg shadow-sm"
                >
                  Authorize & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default GoogleContactsPage;
