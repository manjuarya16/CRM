import React from "react";
const HelpPage: React.FC = () => (
  <div className="p-6 space-y-6">
    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Help & Resources</h1>
    <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-100 dark:border-gray-700 space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Documentation & Support</h3>
      <p className="text-sm text-gray-500">Access CRM documentation, community forums, and support resources.</p>
      <div className="flex gap-4 pt-2">
        <a href="https://krayincrm.com/docs" target="_blank" rel="noreferrer" className="text-[#0088cc] hover:underline text-sm font-medium">Krayin Documentation →</a>
        <a href="https://webkul.uvdesk.com" target="_blank" rel="noreferrer" className="text-[#0088cc] hover:underline text-sm font-medium">Support Desk →</a>
      </div>
    </div>
  </div>
);
export default HelpPage;
