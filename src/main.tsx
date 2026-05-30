import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { monitor } from "./sdk";

monitor.init({
  appName: "demo-app",
  maxEvents: 50,
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);