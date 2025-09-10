import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import DSThemeProvider from "./design-system/theme/ThemeProvider";
import { ThemeProvider } from "./context/ThemeContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <DSThemeProvider>
        <App />
      </DSThemeProvider>
    </ThemeProvider>
  </React.StrictMode>
);
