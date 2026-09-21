import React from "react";
import { PageBreadcrumb } from "@/components";
import { EventForm } from "../EventForm";

const CreateEventPage: React.FC = () => {
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <PageBreadcrumb title="Create Event" breadCrumbItems={["Settings", "Events", "Create"]} />
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Add New Marketing Event</h1>
        <p className="text-sm text-gray-500 mt-1">Events trigger targeted marketing campaigns and automated sequences.</p>
      </div>
      <EventForm isEdit={false} />
    </div>
  );
};
export default CreateEventPage;
