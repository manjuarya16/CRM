import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { PageBreadcrumb } from "@/components";
import API from "@/config";
import { IEvent } from "@/interface";
import { EventForm } from "../EventForm";

const EditEventPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<IEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      API.get(`/events/${id}`)
        .then((res) => setEvent(res.data.data))
        .catch(() => setEvent(null))
        .finally(() => setLoading(false));
    }
  }, [id]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <PageBreadcrumb title="Edit Event" breadCrumbItems={["Settings", "Events", "Edit"]} />
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Edit Marketing Event</h1>
        <p className="text-sm text-gray-500 mt-1">Update event schedule and details.</p>
      </div>
      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading event details...</div>
      ) : (
        <EventForm initialData={event} isEdit={true} />
      )}
    </div>
  );
};
export default EditEventPage;
