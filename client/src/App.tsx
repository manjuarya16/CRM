import React, { useEffect } from "react";

import AllRoutes from "./routes/Routes";

import { configureFakeBackend } from "./helpers";
import setupAxiosInterceptors from "./config/axios.interceptor";
import { API } from "./config"; // ← Import from root config.ts (main API instance)
import { useAuthStore } from "./store";

import "nouislider/distribute/nouislider.css";

import "./assets/scss/app.scss";
import "./assets/scss/icons.scss";

// configure fake backend
configureFakeBackend();

// Setup axios interceptors on the MAIN API instance
setupAxiosInterceptors(API);

const App = () => {
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    // Initialize auth state from storage on app load
    initializeAuth();
    // Token injection is handled automatically by axios interceptor
  }, [initializeAuth]);

  return (
    <>
      <React.Fragment>
        <AllRoutes />
      </React.Fragment>
    </>
  );
};

export default App;
