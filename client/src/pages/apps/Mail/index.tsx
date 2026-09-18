import React from "react";
const MailPage: React.FC = () => (
  <div className="p-6 space-y-6">
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Mail</h1>
      <button className="inline-flex items-center px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-semibold rounded-lg shadow-sm">Compose Mail</button>
    </div>
    <div className="bg-white dark:bg-gray-800 rounded-xl p-14 text-center text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-700">No Mails Available.</div>
  </div>
);
export default MailPage;
