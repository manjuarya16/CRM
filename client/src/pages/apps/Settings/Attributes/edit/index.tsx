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

      <div className="w-full py-2">
        <AttributeForm isEdit={true} />
      </div>
    </>
  );
};

export default EditAttributePage;
