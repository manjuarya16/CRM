import React from "react";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { AttributeForm } from "../AttributeForm";

const CreateAttributePage: React.FC = () => {
  return (
    <>
      <PageBreadcrumb
        title="Create Attribute"
        name="Create Attribute"
        breadCrumbItems={["Settings", "Attributes", "Create Attribute"]}
      />

      <div className="max-w-4xl mx-auto py-4">
        <AttributeForm isEdit={false} />
      </div>
    </>
  );
};

export default CreateAttributePage;
