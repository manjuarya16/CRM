import { create } from "zustand";
import Swal from "sweetalert2";
import { API } from "@/config";
import { showConfirmDialog } from "@/utils/swalAlert";

import { Department, DepartmentStore } from "@/interface/departmentInterface";

let _departmentsFlight: Promise<void> | null = null;

export const useDepartmentStore = create<DepartmentStore>((set, get) => ({
  departments: [],
  loading: false,
  error: null,
  selectedDepartment: null,

  fetchDepartments: async () => {
    if (get().departments.length > 0) return;
    if (_departmentsFlight) return _departmentsFlight;
    set({ loading: true });
    _departmentsFlight = (async () => {
      try {
        const response = await API.get("/department/");
        if (response.data?.success) {
          const departments = (response.data.data || []).map((d: any) => ({
            ...d,
            id: d.id ?? d.department_id,
            name: d.name ?? d.department_name,
          }));
          set({ departments, error: null });
        } else {
          set({ error: "Failed to fetch departments" });
        }
      } catch (error: any) {
        set({ error: error.message || "Error fetching departments" });
      } finally {
        set({ loading: false });
        _departmentsFlight = null;
      }
    })();
    return _departmentsFlight;
  },

  fetchDepartmentById: async (id: number) => {
    set({ loading: true });
    try {
      const response = await API.get(`/department/${id}`);
      if (response.data?.success) {
        set({ selectedDepartment: response.data.data, error: null });
      }
    } catch (error: any) {
      set({ error: error.message || "Error fetching department" });
    } finally {
      set({ loading: false });
    }
  },

  addDepartment: async (departmentData: any) => {
    set({ loading: true });
    try {
      const response = await API.post("/department/add", departmentData);
      if (response.data?.success) {
        set((state) => ({
          departments: [...state.departments, response.data.data],
          error: null,
        }));
        Swal.fire("Success", "Department created successfully", "success");
      } else {
        throw new Error(
          response.data?.message || "Failed to create department",
        );
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      set({ error: message });
      Swal.fire("Error", message, "error");
    } finally {
      set({ loading: false });
    }
  },

  updateDepartment: async (id: number, departmentData: any) => {
    set({ loading: true });
    try {
      const response = await API.put("/department/update", {
        id,
        ...departmentData,
      });
      if (response.data?.success) {
        set((state) => ({
          departments: state.departments.map((d) =>
            d.id === id ? { ...d, id, ...departmentData } : d,
          ),
          error: null,
        }));
        Swal.fire("Success", "Department updated successfully", "success");
      } else {
        throw new Error(
          response.data?.message || "Failed to update department",
        );
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      set({ error: message });
      Swal.fire("Error", message, "error");
    } finally {
      set({ loading: false });
    }
  },

  deleteDepartment: async (id: number) => {
    try {
      const result = await showConfirmDialog(
        "Delete Department?",
        "Are you sure you want to delete this department? This action cannot be undone.",
      );

      if (!result.isConfirmed) return;

      set({ loading: true });
      const response = await API.delete(`/department/delete/${id}`);
      if (response.data?.success) {
        set((state) => ({
          departments: state.departments.filter((d) => d.id !== id),
          error: null,
        }));
        Swal.fire("Success", "Department deleted successfully", "success");
      } else {
        throw new Error(
          response.data?.message || "Failed to delete department",
        );
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      set({ error: message });
      Swal.fire("Error", message, "error");
    } finally {
      set({ loading: false });
    }
  },

  setSelectedDepartment: (department: Department | null) => {
    set({ selectedDepartment: department });
  },

  clearError: () => {
    set({ error: null });
  },
}));

export default useDepartmentStore;
