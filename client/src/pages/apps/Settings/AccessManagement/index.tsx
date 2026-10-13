import React from "react";
import { RoleAccessMatrix } from "../Roles/RoleAccessMatrix";

const AccessManagementPage: React.FC = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <RoleAccessMatrix />
    </div>
  );
};

export default AccessManagementPage;
