import React from "react";
import { PageBreadcrumb } from "@/components";
import { WorkflowForm } from "../WorkflowForm";

const CreateWorkflowPage: React.FC = () => {
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <PageBreadcrumb title="Create Workflow" breadCrumbItems={["Settings", "Workflows", "Create"]} />
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Add New Workflow</h1>
        <p className="text-sm text-gray-500 mt-1">Automate business logic, condition checks, and automated actions.</p>
      </div>
      <WorkflowForm isEdit={false} />
    </div>
  );
};
export default CreateWorkflowPage;
