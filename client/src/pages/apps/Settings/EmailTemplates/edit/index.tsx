import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { PageBreadcrumb } from "@/components";
import API from "@/config";
import { IEmailTemplate } from "@/interface";
import { EmailTemplateForm } from "../EmailTemplateForm";

const EditEmailTemplatePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [template, setTemplate] = useState<IEmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      API.get(`/email-templates/${id}`)
        .then((res) => setTemplate(res.data.data))
        .catch(() => setTemplate(null))
        .finally(() => setLoading(false));
    }
  }, [id]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <PageBreadcrumb title="Edit Email Template" breadCrumbItems={["Settings", "Email Templates", "Edit"]} />
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Edit Email Template</h1>
        <p className="text-sm text-gray-500 mt-1">Update email subject, content, and placeholders.</p>
      </div>
      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading template details...</div>
      ) : (
        <EmailTemplateForm initialData={template} isEdit={true} />
      )}
    </div>
  );
};
export default EditEmailTemplatePage;
