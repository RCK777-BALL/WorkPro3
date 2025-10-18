/*
 * SPDX-License-Identifier: MIT
 */

import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import "./i18n";
import "./index.css";
import App from "./App";

declare global {
  interface Window {
    initNavBar?: () => void;
  }
}

if (typeof window !== "undefined" && typeof window.initNavBar === "function") {
  window.initNavBar();
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <App />
        <Toaster position="top-right" />
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>,
);
