import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "@/config";
import Swal from "sweetalert2";
import { PageBreadcrumb } from "@/components";
import { IEvent } from "@/interface";

const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<IEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await API.get("/events").catch(() => ({ data: { data: [] } }));
      setEvents(res.data?.data || []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDelete = async (item: IEvent) => {
    const res = await Swal.fire({
      title: "Delete Event?",
      text: `Are you sure you want to delete "${item.name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, delete",
    });
    if (res.isConfirmed) {
      try {
        await API.delete(`/events/${item.id}`);
        Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
        fetchEvents();
      } catch (err: any) {
        Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || "Failed to delete" });
      }
    }
  };

  const filtered = events.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()) || e.description.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <PageBreadcrumb title="Events" breadCrumbItems={["Settings", "Events"]} />
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Marketing Events</h1>
          <p className="text-sm text-gray-500 mt-0.5">Define events to trigger automated campaigns and sequences</p>
        </div>
        <Link
          to="/settings/events/create"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0088cc] hover:bg-[#0077b3] rounded-lg shadow-sm transition-colors"
        >
          <i className="mgc_add_line text-lg"></i>
          Create Event
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <input
              type="text"
              placeholder="Search events by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
            <i className="mgc_search_line absolute left-3 top-2 text-gray-400"></i>
          </div>
          <span className="text-xs text-gray-400">{filtered.length} events</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="py-3.5 px-4">ID</th>
                <th className="py-3.5 px-4">Event Name</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">Loading events...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">No events found.</td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-750 transition-colors">
                    <td className="py-3 px-4 text-gray-500 font-mono text-xs">#{item.id}</td>
                    <td className="py-3 px-4 font-semibold text-gray-800 dark:text-gray-100">{item.name}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        <i className="mgc_calendar_line"></i>
                        {item.date ? new Date(item.date).toLocaleDateString() : "-"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300 max-w-xs truncate">{item.description}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <Link
                        to={`/settings/events/${item.id}/edit`}
                        className="p-1.5 text-gray-500 hover:text-green-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 inline-block"
                        title="Edit"
                      >
                        <i className="mgc_edit_line text-base"></i>
                      </Link>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 text-gray-500 hover:text-red-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Delete"
                      >
                        <i className="mgc_delete_line text-base"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default EventsPage;
