/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import App from "@/App";
import { AuthProvider } from "@/context/AuthContext";

vi.mock("@/lib/http", () => ({
  default: { get: vi.fn().mockResolvedValue({ data: null }), post: vi.fn() },
}));

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
