import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { PageBreadcrumb } from "@/components";
import API from "@/config";
import { IWorkflow } from "@/interface";
import { WorkflowForm } from "../WorkflowForm";

const EditWorkflowPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [workflow, setWorkflow] = useState<IWorkflow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      API.get(`/workflows/${id}`)
        .then((res) => setWorkflow(res.data.data))
        .catch(() => setWorkflow(null))
        .finally(() => setLoading(false));
    }
  }, [id]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <PageBreadcrumb title="Edit Workflow" breadCrumbItems={["Settings", "Workflows", "Edit"]} />
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Edit Workflow</h1>
        <p className="text-sm text-gray-500 mt-1">Update triggers, conditions, or actions.</p>
      </div>
      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading workflow details...</div>
      ) : (
        <WorkflowForm initialData={workflow} isEdit={true} />
      )}
    </div>
  );
};
export default EditWorkflowPage;
