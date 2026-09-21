import React from "react";
import { PageBreadcrumb } from "@/components";
import { WebFormForm } from "../WebFormForm";

const CreateWebFormPage: React.FC = () => {
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <PageBreadcrumb title="Create Web Form" breadCrumbItems={["Settings", "Web Forms", "Create"]} />
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Add New Web Form</h1>
        <p className="text-sm text-gray-500 mt-1">Design embeddable lead capture web forms with custom fields & colors.</p>
      </div>
      <WebFormForm isEdit={false} />
    </div>
  );
};
export default CreateWebFormPage;
