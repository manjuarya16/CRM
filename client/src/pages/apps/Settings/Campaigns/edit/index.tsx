import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { PageBreadcrumb } from "@/components";
import { ICampaign } from "@/interface";
import { CampaignForm } from "../CampaignForm";
import { useCampaignStore } from "@/store";

const EditCampaignPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<ICampaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      useCampaignStore.getState().fetchCampaignById(id)
        .then((data) => setCampaign(data))
        .catch(() => setCampaign(null))
        .finally(() => setLoading(false));
    }
  }, [id]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <PageBreadcrumb title="Edit Campaign" breadCrumbItems={["Settings", "Campaigns", "Edit"]} />
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Edit Marketing Campaign</h1>
        <p className="text-sm text-gray-500 mt-1">Update campaign audience, schedule, or template.</p>
      </div>
      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading campaign details...</div>
      ) : (
        <CampaignForm initialData={campaign} isEdit={true} />
      )}
    </div>
  );
};
export default EditCampaignPage;
