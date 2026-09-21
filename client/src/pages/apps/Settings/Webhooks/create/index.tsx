import React from "react";
import { PageBreadcrumb } from "@/components";
import { WebhookForm } from "../WebhookForm";

const CreateWebhookPage: React.FC = () => {
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <PageBreadcrumb title="Create Webhook" breadCrumbItems={["Settings", "Webhooks", "Create"]} />
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Add New Webhook</h1>
        <p className="text-sm text-gray-500 mt-1">Configure automated outbound HTTP webhooks on CRM events.</p>
      </div>
      <WebhookForm isEdit={false} />
    </div>
  );
};
export default CreateWebhookPage;
