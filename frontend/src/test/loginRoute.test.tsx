/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import App from "@/App";
import { AuthProvider } from "@/context/AuthContext";

describe("App routing", () => {
  it("renders Login page on /login", () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <App />
        </MemoryRouter>
      </AuthProvider>
    );
    expect(screen.getByText(/Login/i)).toBeInTheDocument();
    expect(screen.queryByText(/Not Found/i)).toBeNull();
  });
});
