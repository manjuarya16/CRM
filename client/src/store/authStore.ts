import { create } from "zustand";
import { persist } from "zustand/middleware";
import { API } from "@/config";
import {
  login as loginApi,
  logout as logoutApi,
  signup as signupApi,
  forgotPassword as forgotPasswordApi,
  resetPassword as resetPasswordApi,
} from "../helpers/api/auth";

import { UserData, AuthState } from "@/interface/authInterface";

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      loading: false,
      error: null,
      userLoggedIn: false,
      userSignUp: false,
      userLogout: false,
      passwordReset: false,
      registerError: null,
      resetEmail: null as string | null,

      login: async (username: string, password: string) => {
        set({ loading: true, error: null });
        try {
          const response = await loginApi({ username, password });
          const { data } = response;

          if (data.success && data.token) {
            // Store token in sessionStorage for auth-utils
            sessionStorage.setItem("token", data.token);

            // Store user session for APICore compatibility (app_user format)
            sessionStorage.setItem(
              "app_user",
              JSON.stringify({
                token: data.token,
                ...data.user,
              }),
            );

            // Set authorization header for all future requests
            API.defaults.headers.common["Authorization"] =
              `Bearer ${data.token}`;

            set({
              user: data.user,
              token: data.token,
              userLoggedIn: true,
              loading: false,
              error: null,
            });
          } else {
            throw new Error(data.message || "Login failed");
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.message || error.message || "Login failed";
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("app_user");
          delete API.defaults.headers.common["Authorization"];

          set({
            user: null,
            token: null,
            error: errorMessage,
            userLoggedIn: false,
            loading: false,
          });
          throw error;
        }
      },

      logout: async () => {
        set({ loading: true });
        try {
          await logoutApi();
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("app_user");
          delete API.defaults.headers.common["Authorization"];

          set({
            user: null,
            token: null,
            userLogout: true,
            userLoggedIn: false,
            loading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.message || error.message || "Logout failed";
          set({
            error: errorMessage,
            loading: false,
          });
          throw error;
        }
      },

      signup: async (name: string, email: string, password: string) => {
        set({ loading: true, error: null });
        try {
          const response = await signupApi({ name, email, password });
          const { data } = response;

          if (data.success && data.token) {
            // Store token in sessionStorage for auth-utils
            sessionStorage.setItem("token", data.token);

            // Store user session for APICore compatibility (app_user format)
            sessionStorage.setItem(
              "app_user",
              JSON.stringify({
                token: data.token,
                ...data.user,
              }),
            );

            // Set authorization header for all future requests
            API.defaults.headers.common["Authorization"] =
              `Bearer ${data.token}`;

            set({
              user: data.user,
              token: data.token,
              userSignUp: true,
              userLoggedIn: true,
              loading: false,
              registerError: null,
            });
          } else {
            throw new Error(data.message || "Signup failed");
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.message || error.message || "Signup failed";
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("app_user");
          delete API.defaults.headers.common["Authorization"];

          set({
            user: null,
            token: null,
            error: errorMessage,
            registerError: errorMessage,
            userSignUp: false,
            loading: false,
          });
          throw error;
        }
      },

      forgotPassword: async (email: string) => {
        set({ loading: true, error: null });
        try {
          const response = await forgotPasswordApi({ email });
          const { data } = response;

          if (!data.success) {
            throw new Error(data.message || "Email not found");
          }

          set({
            resetEmail: email,
            passwordReset: true,
            loading: false,
            error: null,
          });
          return;
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.message || error.message || "Email not found";
          set({
            error: errorMessage,
            passwordReset: false,
            loading: false,
          });
          throw new Error(errorMessage);
        }
      },

      resetPassword: async (email: string, new_password: string) => {
        set({ loading: true, error: null });
        try {
          const response = await resetPasswordApi({
            email,
            new_password,
          });
          const { data } = response;

          set({
            passwordReset: true,
            loading: false,
            error: null,
            resetEmail: null,
          });
          return data;
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.message ||
            error.message ||
            "Password reset failed";
          set({
            error: errorMessage,
            loading: false,
          });
          throw error;
        }
      },

      setUser: (user: UserData | null) => {
        set({
          user,
          userLoggedIn: user !== null,
        });
      },

      setToken: (token: string | null) => {
        set({ token });
        if (token) {
          sessionStorage.setItem("token", token);
          API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          // Also store in konrix_user format for APICore compatibility
          const existingUser = sessionStorage.getItem("app_user");
          if (existingUser) {
            const userData = JSON.parse(existingUser);
            sessionStorage.setItem(
              "app_user",
              JSON.stringify({ ...userData, token }),
            );
          }
        } else {
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("app_user");
          delete API.defaults.headers.common["Authorization"];
        }
      },

      reset: () => {
        set({
          user: null,
          token: null,
          loading: false,
          error: null,
          userSignUp: false,
          userLoggedIn: false,
          userLogout: false,
          passwordReset: false,
          registerError: null,
          resetEmail: null,
        });
      },

      initializeAuth: () => {
        // Check if there's a valid token in sessionStorage
        const token = sessionStorage.getItem("token");
        const appUser = sessionStorage.getItem("app_user");

        if (token && appUser) {
          try {
            const userSession = JSON.parse(appUser);
            // Set the authorization header
            API.defaults.headers.common["Authorization"] = `Bearer ${token}`;

            set({
              token,
              user: userSession,
              userLoggedIn: true,
              error: null,
            });
          } catch (error) {
            alert("here");
            console.error("Error parsing stored auth session:", error);
          }
        }
      },
    }),
    {
      name: "auth-store",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        userLoggedIn: state.userLoggedIn,
      }),
    },
  ),
);
