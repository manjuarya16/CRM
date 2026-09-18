import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { PageBreadcrumb } from "@/components";
import API from "@/config";
import { IWebForm } from "@/interface";
import { WebFormForm } from "../WebFormForm";

const EditWebFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [webForm, setWebForm] = useState<IWebForm | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      API.get(`/web-forms/${id}`)
        .then((res) => setWebForm(res.data.data))
        .catch(() => setWebForm(null))
        .finally(() => setLoading(false));
    }
  }, [id]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <PageBreadcrumb title="Edit Web Form" breadCrumbItems={["Settings", "Web Forms", "Edit"]} />
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Edit Web Form</h1>
        <p className="text-sm text-gray-500 mt-1">Update form fields, submit actions, or colors.</p>
      </div>
      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading form details...</div>
      ) : (
        <WebFormForm initialData={webForm} isEdit={true} />
      )}
    </div>
  );
};
export default EditWebFormPage;
