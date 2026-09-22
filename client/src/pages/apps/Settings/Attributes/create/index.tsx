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

      <div className="w-full py-2">
        <AttributeForm isEdit={false} />
      </div>
    </>
  );
};

export default CreateAttributePage;
