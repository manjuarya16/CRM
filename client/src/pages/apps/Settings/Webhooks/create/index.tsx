import React from "react";
import { WebhookForm } from "../WebhookForm";

const CreateWebhookPage: React.FC = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <WebhookForm isEdit={false} />
    </div>
  );
};

export default CreateWebhookPage;
