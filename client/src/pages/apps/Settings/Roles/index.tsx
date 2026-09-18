import React, { useState, useEffect } from "react";
import API from "@/config";
const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<any[]>([]);
  useEffect(() => {
    API.get("/role/").then(r => setRoles(r.data?.data || [])).catch(() => setRoles([]));
  }, []);
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Roles</h1>
        <button className="inline-flex items-center px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-semibold rounded-lg shadow-sm">Create Role</button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300">
              <th className="py-3 px-4 font-semibold">ID</th>
              <th className="py-3 px-4 font-semibold">Name</th>
              <th className="py-3 px-4 font-semibold">Description</th>
              <th className="py-3 px-4 font-semibold">Permission Type</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(r => (
              <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50">
                <td className="py-3 px-4">{r.id}</td>
                <td className="py-3 px-4 font-medium text-[#0088cc]">{r.name}</td>
                <td className="py-3 px-4 text-gray-500">{r.description || "-"}</td>
                <td className="py-3 px-4">{r.permission_type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default RolesPage;
