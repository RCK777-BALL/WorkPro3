/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { httpPostMock, httpPutMock } = vi.hoisted(() => ({
  httpPostMock: vi.fn(),
  httpPutMock: vi.fn(),
}));

vi.mock("@/lib/http", () => ({
  default: {
    post: httpPostMock,
    put: httpPutMock,
  },
}));

const { addToastMock } = vi.hoisted(() => ({
  addToastMock: vi.fn(),
}));

vi.mock("@/context/ToastContext", () => ({
  useToast: () => ({
    addToast: addToastMock,
  }),
}));

const departmentStoreMock = vi.hoisted(() => ({
  departments: [] as any[],
  linesByDepartment: {} as Record<string, any[]>,
  stationsByLine: {} as Record<string, any[]>,
  fetchDepartments: vi.fn().mockResolvedValue(undefined),
  fetchLines: vi.fn().mockResolvedValue(undefined),
  fetchStations: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/store/departmentStore", () => ({
  useDepartmentStore: (selector: any) => selector(departmentStoreMock),
}));

const authStoreMock = vi.hoisted(() => ({
  user: {
    tenantId: "tenant-123",
  },
}));

vi.mock("@/store/authStore", () => ({
  useAuthStore: (selector: any) => selector(authStoreMock),
}));

vi.mock("react-dropzone", () => ({
  useDropzone: () => ({
    getRootProps: () => ({}),
    getInputProps: () => ({}),
  }),
}));

vi.mock("@/components/qr/AssetQRCode", () => ({
  default: () => <div data-testid="asset-qr" />,
}));

import AssetModal from "../AssetModal";

describe("AssetModal", () => {
  const onUpdate = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses POST when creating an asset", async () => {
    httpPostMock.mockResolvedValue({
      data: { _id: "asset-1", name: "Created Asset" },
    });

    render(
      <AssetModal
        isOpen
        onClose={onClose}
        asset={null}
        onUpdate={onUpdate}
      />
    );

    const user = userEvent.setup();
    const [nameInput] = screen.getAllByRole("textbox");
    await user.type(nameInput, "New Asset");
    await user.click(screen.getByRole("button", { name: /Create Asset/i }));

    await waitFor(() => {
      expect(httpPostMock).toHaveBeenCalled();
    });

    expect(httpPostMock).toHaveBeenCalledWith(
      "/assets",
      expect.objectContaining({
        name: "New Asset",
        tenantId: "tenant-123",
      })
    );
    expect(httpPutMock).not.toHaveBeenCalled();
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "asset-1", name: "Created Asset" })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("uses PUT when updating an asset", async () => {
    httpPutMock.mockResolvedValue({
      data: { _id: "asset-1", name: "Updated Asset" },
    });

    render(
      <AssetModal
        isOpen
        onClose={onClose}
        asset={{ id: "asset-1", name: "Existing Asset" }}
        onUpdate={onUpdate}
      />
    );

    const user = userEvent.setup();
    const [nameInput] = screen.getAllByRole("textbox");
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Asset");
    await user.click(screen.getByRole("button", { name: /Update Asset/i }));

    await waitFor(() => {
      expect(httpPutMock).toHaveBeenCalled();
    });

    expect(httpPutMock).toHaveBeenCalledWith(
      "/assets/asset-1",
      expect.objectContaining({
        name: "Updated Asset",
        tenantId: "tenant-123",
      })
    );
    expect(httpPostMock).not.toHaveBeenCalled();
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "asset-1", name: "Updated Asset" })
    );
    expect(onClose).toHaveBeenCalled();
  });
});

