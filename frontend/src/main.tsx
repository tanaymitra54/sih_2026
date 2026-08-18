import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./ErrorBoundary";
import "./styles.css";

window.addEventListener("unhandledrejection", (e) => {
  document.getElementById("root")!.innerHTML =
    `<div style="padding:2rem;font-family:monospace;color:red;white-space:pre-wrap">Unhandled error: ${e.reason?.message ?? e.reason}</div>`;
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
