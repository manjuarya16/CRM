import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/utils/zodResolver";
import Swal from "sweetalert2";
import { eventSchema, EventInput } from "@/schemas";
import { EventFormProps } from "@/interface";
import { useEventStore } from "@/store";

export const EventForm: React.FC<EventFormProps> = ({ initialData, isEdit }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      date: initialData?.date ? String(initialData.date).split("T")[0] : new Date().toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || "",
        description: initialData.description || "",
        date: initialData.date ? String(initialData.date).split("T")[0] : "",
      });
    }
  }, [initialData, reset]);

  const onInvalid = (_errs: any) => {};

  const onSubmit = async (data: EventInput) => {
    try {
      setLoading(true);
      const payload = {
        name: data.name.trim(),
        description: data.description.trim(),
        date: data.date ? String(data.date).split("T")[0] : "",
      };

      if (isEdit && initialData) {
        await useEventStore.getState().saveEvent(payload, initialData.id);
        Swal.fire({ icon: "success", title: "Saved!", text: "Marketing event updated successfully", timer: 1500, showConfirmButton: false });
      } else {
        await useEventStore.getState().saveEvent(payload);
        Swal.fire({ icon: "success", title: "Created!", text: "Marketing event created successfully", timer: 1500, showConfirmButton: false });
      }
      navigate("/settings/events");
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || err.message || "Failed to save event" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6 max-w-2xl bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Event Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register("name")}
            placeholder="e.g. Annual Tech Summit 2026"
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
              errors.name ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
            }`}
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Event Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            {...register("date")}
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
              errors.date ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
            }`}
          />
          {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={4}
            {...register("description")}
            placeholder="Describe the marketing event or trigger details..."
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
              errors.description ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
            }`}
          ></textarea>
          {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
        <button
          type="button"
          onClick={() => navigate("/settings/events")}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 text-sm font-medium text-white bg-[#0088cc] hover:bg-[#0077b3] rounded-lg transition-colors flex items-center gap-2"
        >
          {loading ? "Saving..." : isEdit ? "Update Event" : "Create Event"}
        </button>
      </div>
    </form>
  );
};
