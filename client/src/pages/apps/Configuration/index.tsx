import React from "react";
const ConfigurationPage: React.FC = () => (
  <div className="p-6 space-y-6">
    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Configuration</h1>
    <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-100 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">General System Settings</h3>
      <p className="text-sm text-gray-500">Configure email servers, pipelines, web forms, and global preferences.</p>
    </div>
  </div>
);
export default ConfigurationPage;
