import React from "react";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { AttributeForm } from "../AttributeForm";

const EditAttributePage: React.FC = () => {
  return (
    <>
      <PageBreadcrumb
        title="Edit Attribute"
        name="Edit Attribute"
        breadCrumbItems={["Settings", "Attributes", "Edit Attribute"]}
      />

      <div className="max-w-4xl mx-auto py-4">
        <AttributeForm isEdit={true} />
      </div>
    </>
  );
};

export default EditAttributePage;
