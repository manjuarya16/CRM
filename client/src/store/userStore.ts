import { create } from "zustand";
import { API } from "@/config";
import Swal from "sweetalert2";
import { showConfirmDialog } from "@/utils/swalAlert";

import { User, UserStore, UsersResponse } from "@/interface/userInterface";

let _usersFetchInFlight: Promise<any> | null = null;

export const useUserStore = create<UserStore>((set, get) => ({
  users: [],
  loading: false,
  error: null,
  selectedUser: null,
  // Fetch users with optional pagination. Returns cached data unless `force` true.
  fetchUsers: async (
    page = 1,
    per_page = 10,
    force = false,
    excludeRole: number | string | null = null,
  ): Promise<UsersResponse | void> => {
    // If a fetch is already in-flight for the same params and not forced, return it
    if (_usersFetchInFlight && !force) return _usersFetchInFlight;

    set({ loading: true });
    _usersFetchInFlight = (async () => {
      try {
        let url = `/user/?page=${page}&per_page=${per_page}`;
        if (excludeRole !== null && excludeRole !== undefined) {
          url += `&exclude_role=${excludeRole}`;
        }
        const response = await API.get(url);
        if (response.data?.success && response.data.data) {
          const payload: UsersResponse = response.data.data;
          set({ users: payload.rows || [], error: null });
          return payload;
        }
        set({ error: "Failed to fetch users" });
      } catch (error: any) {
        set({ error: error.message || "Error fetching users" });
      } finally {
        set({ loading: false });
        _usersFetchInFlight = null;
      }
    })();
    return _usersFetchInFlight;
  },

  fetchUserById: async (id: number, force = false) => {
    // If we already have the selected user and it's the same id, skip unless forced
    const sel = get().selectedUser;
    if (!force && sel && String(sel.id) === String(id)) return;
    // If users list contains the user, use it immediately to avoid network latency
    const users = get().users || [];
    const cached = users.find((u: any) => String(u.id) === String(id));
    if (!force && cached) {
      set({ selectedUser: cached });
      return;
    }

    set({ loading: true });
    try {
      const response = await API.get(`/user/${id}`);
      if (response.data?.success) {
        set({ selectedUser: response.data.data, error: null });
      }
    } catch (error: any) {
      set({ error: error.message || "Error fetching user" });
    } finally {
      set({ loading: false });
    }
  },

  addUser: async (userData: any) => {
    set({ loading: true });
    try {
      // Convert password to password_hash for backend compatibility
      const dataToSend = {
        ...userData,
        password_hash: userData.password,
      };
      delete dataToSend.password;

      const response = await API.post("/user/add", dataToSend);
      if (response.data?.success) {
        set((state) => ({
          users: [...state.users, response.data.data],
          error: null,
        }));
        Swal.fire("Success", "User created successfully", "success");
        // return created data for caller (e.g., to upload profile image)
        return response.data.data;
      } else {
        throw new Error(response.data?.message || "Failed to create user");
      }
    } catch (error: any) {
      // Log full server response to help debug validation failures
      // eslint-disable-next-line no-console
      console.debug("addUser error response:", error.response?.data || error);
      const message = error.response?.data?.message || error.message;
      set({ error: message });
      Swal.fire("Error", message, "error");
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateUser: async (id: number, userData: any) => {
    set({ loading: true });
    try {
      const response = await API.put("/user/update/", { id, ...userData });
      if (response.data?.success) {
        set((state) => ({
          users: state.users.map((u) =>
            String(u.id) === String(id) ? { ...u, ...userData, id } : u,
          ),
          error: null,
        }));
        Swal.fire("Success", "User updated successfully", "success");
        return response;
      } else {
        throw new Error(response.data?.message || "Failed to update user");
      }
    } catch (error: any) {
      // Log server response for debugging
      // eslint-disable-next-line no-console
      console.debug(
        "updateUser error response:",
        error.response?.data || error,
      );
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to update user";
      set({ error: message });
      Swal.fire("Error", message, "error");
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteUser: async (id: number) => {
    try {
      const result = await showConfirmDialog(
        "Are you sure?",
        "This user will be deleted permanently!",
      );

      if (result.isConfirmed) {
        set({ loading: true });
        const response = await API.delete(`/user/delete/${id}`, {
          data: { id, deleted_by: 0 },
        });
        if (response.data?.success) {
          set((state) => ({
            users: state.users.filter((u) => u.id !== id),
            error: null,
          }));
          Swal.fire("Success", "User deleted successfully", "success");
          return true;
        } else {
          throw new Error(response.data?.message || "Failed to delete user");
        }
      }
      // User cancelled
      return false;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      set({ error: message });
      Swal.fire("Error", message, "error");
      return false;
    } finally {
      set({ loading: false });
    }
  },

  setSelectedUser: (user: User | null) => {
    set({ selectedUser: user });
  },

  clearError: () => {
    set({ error: null });
  },
}));

export default useUserStore;
