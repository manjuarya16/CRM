import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { PageBreadcrumb } from "@/components";
import API from "@/config";
import { IWebhook } from "@/interface";
import { WebhookForm } from "../WebhookForm";

const EditWebhookPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [webhook, setWebhook] = useState<IWebhook | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      API.get(`/webhooks/${id}`)
        .then((res) => setWebhook(res.data.data))
        .catch(() => setWebhook(null))
        .finally(() => setLoading(false));
    }
  }, [id]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <PageBreadcrumb title="Edit Webhook" breadCrumbItems={["Settings", "Webhooks", "Edit"]} />
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Edit Webhook</h1>
        <p className="text-sm text-gray-500 mt-1">Update webhook target URL, headers, and params.</p>
      </div>
      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading webhook details...</div>
      ) : (
        <WebhookForm initialData={webhook} isEdit={true} />
      )}
    </div>
  );
};
export default EditWebhookPage;
