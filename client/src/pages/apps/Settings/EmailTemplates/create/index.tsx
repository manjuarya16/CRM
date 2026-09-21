import React from "react";
import { Link } from "react-router-dom";
import { PageBreadcrumb } from "@/components";
import { EmailTemplateForm } from "../EmailTemplateForm";

const CreateEmailTemplatePage: React.FC = () => {
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <PageBreadcrumb title="Create Email Template" breadCrumbItems={["Settings", "Email Templates", "Create"]} />
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Add New Email Template</h1>
        <p className="text-sm text-gray-500 mt-1">Create reusable email templates with custom merge tags and placeholders.</p>
      </div>
      <EmailTemplateForm isEdit={false} />
    </div>
  );
};
export default CreateEmailTemplatePage;
