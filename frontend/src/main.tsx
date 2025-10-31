/*
 * SPDX-License-Identifier: MIT
 */

import React from "react";
import ReactDOM from "react-dom/client";
import {
  Route,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
} from "react-router-dom";
import { QueryClientProvider } from "react-query";
import { Toaster } from "react-hot-toast";
import { MantineProvider } from "@mantine/core";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { BorderPreferencesProvider } from "@/context/BorderPreferencesContext";
import { queryClient } from "@/lib/queryClient";
import '@mantine/core/styles.css';
import "./i18n";
import "./index.css";
import App from "./App";

const AppProviders = () => (
  <QueryClientProvider client={queryClient}>
    <MantineProvider defaultColorScheme="dark">
      <ThemeProvider>
        <BorderPreferencesProvider>
          <AuthProvider>
            <App />
            <Toaster position="top-right" />
          </AuthProvider>
        </BorderPreferencesProvider>
      </ThemeProvider>
    </MantineProvider>
  </QueryClientProvider>
);

const router = createBrowserRouter(
  createRoutesFromElements(<Route path="/*" element={<AppProviders />} />),
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  },
);

const routerFutureConfig = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} future={routerFutureConfig} />
  </React.StrictMode>,
);
