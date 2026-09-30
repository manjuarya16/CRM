import React from "react";
import { Link } from "react-router-dom";
import { RoleAccessMatrix } from "../Roles/RoleAccessMatrix";

const AccessManagementPage: React.FC = () => {
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <nav className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            <Link to="/settings" className="text-[#0088cc] hover:underline">
              Settings
            </Link>{" "}
            / <span className="text-gray-700 dark:text-gray-300">Access Management</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
            Access Management & Permissions Matrix
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure system module permissions (View, Add, Edit, Delete) for each user role across all CRM modules.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/settings/roles"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors"
          >
            <i className="mgc_user_shield_line text-lg"></i>
            Manage Roles
          </Link>
        </div>
      </div>

      {/* Permission Access Matrix Component */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <RoleAccessMatrix />
      </div>
    </div>
  );
};

export default AccessManagementPage;
