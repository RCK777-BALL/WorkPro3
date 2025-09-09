import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ThemeProvider from "./design-system/theme/ThemeProvider";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
