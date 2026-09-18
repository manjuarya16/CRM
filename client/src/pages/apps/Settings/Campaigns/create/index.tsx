import React from "react";
import { PageBreadcrumb } from "@/components";
import { CampaignForm } from "../CampaignForm";

const CreateCampaignPage: React.FC = () => {
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <PageBreadcrumb title="Create Campaign" breadCrumbItems={["Settings", "Campaigns", "Create"]} />
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Add New Marketing Campaign</h1>
        <p className="text-sm text-gray-500 mt-1">Schedule and manage email broadcast campaigns.</p>
      </div>
      <CampaignForm isEdit={false} />
    </div>
  );
};
export default CreateCampaignPage;
