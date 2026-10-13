import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { IWebhook } from "@/interface";
import { WebhookForm } from "../WebhookForm";
import { useWebhookStore } from "@/store";

const EditWebhookPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [webhook, setWebhook] = useState<IWebhook | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      useWebhookStore
        .getState()
        .fetchWebhookById(id)
        .then((data) => setWebhook(data))
        .catch(() => setWebhook(null))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-[#0088cc] border-t-transparent"></div>
        <p className="mt-2 text-xs text-gray-500">Loading webhook details...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <WebhookForm initialData={webhook} isEdit={true} />
    </div>
  );
};

export default EditWebhookPage;
