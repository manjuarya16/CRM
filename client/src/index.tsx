import React from "react";
import { BrowserRouter } from "react-router-dom";
import { createRoot } from "react-dom/client";

import App from "./App.js";

const container = document.getElementById("app");
if (container) {
  const root = createRoot(container);
  root.render(
    <React.Fragment>
      <BrowserRouter basename={process.env.PUBLIC_URL}>
        <App />
      </BrowserRouter>
    </React.Fragment>,
  );
}
