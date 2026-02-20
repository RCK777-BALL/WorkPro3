/* eslint-disable react-hooks/exhaustive-deps */
/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Package, Search, Warehouse } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { adjustStockLevel, upsertPart } from "@/api/inventory";
import { usePermissions } from "@/auth/usePermissions";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import Input from "@/components/common/Input";
import Modal from "@/components/common/Modal";
import Tag from "@/components/common/Tag";
import { useToast } from "@/context/ToastContext";
import type { Part, StockItem } from "@/types";
import {
  INVENTORY_HISTORY_QUERY_KEY,
  INVENTORY_PARTS_QUERY_KEY,
  INVENTORY_STOCK_QUERY_KEY,
  usePartsQuery,
  useStockItemsQuery,
} from "@/features/inventory";

const PAGE_SIZE = 10;

const ReceiveStockModal = ({
  isOpen,
  onClose,
  part,
  stockItems,
}: {
  isOpen: boolean;
  onClose: () => void;
  part: Part | null;
  stockItems: StockItem[];
}) => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [stockItemId, setStockItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locationsForPart = useMemo(() => stockItems.filter((item) => item.partId === part?.id), [stockItems, part?.id]);

  const reset = () => {
    setStockItemId("");
    setQuantity(1);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!stockItemId || !part) return;
    if (quantity <= 0) {
      setError("Quantity must be greater than zero");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await adjustStockLevel({ stockItemId, delta: quantity, reason: "Receive" });
      addToast(`Received ${quantity} into ${part.name}`, "success");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: INVENTORY_STOCK_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: INVENTORY_HISTORY_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: INVENTORY_PARTS_QUERY_KEY }),
      ]);
      reset();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to receive stock";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Receive stock">
      <div className="space-y-3">
        {part ? (
          <p className="text-sm text-[var(--wp-color-text-muted)]">Add quantity to an existing location for {part.name}.</p>
        ) : (
          <p className="text-sm text-[var(--wp-color-text-muted)]">Select a part to receive stock.</p>
        )}
        <label className="text-sm font-medium text-[var(--wp-color-text)]">Location</label>
        <select
          value={stockItemId}
          onChange={(event) => setStockItemId(event.target.value)}
          className="w-full rounded-md border border-[var(--wp-color-border)] px-3 py-2 text-sm"
          disabled={!part || !locationsForPart.length}
        >
          <option value="">Select location</option>
          {locationsForPart.map((item) => (
            <option key={item.id} value={item.id}>
              {item.location?.store ?? "Store"} / {item.location?.room ?? "Room"} / {item.location?.bin ?? "Bin"}
            </option>
          ))}
        </select>
        {!locationsForPart.length && <p className="text-xs text-warning-700">No locations exist for this part yet.</p>}
        <Input
          type="number"
          label="Quantity"
          min={1}
          value={quantity}
          onChange={(event) => setQuantity(Number(event.target.value))}
        />
        {error && <p className="text-sm text-error-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading} disabled={!stockItemId || !part}>
            Receive
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default function InventoryParts() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [receiveTarget, setReceiveTarget] = useState<Part | null>(null);

  const partsQuery = usePartsQuery({ page, pageSize: PAGE_SIZE, search: search.trim() || undefined });
  const stockQuery = useStockItemsQuery();

  const parts = partsQuery.data?.items ?? [];
  const totalPages = partsQuery.data?.totalPages ?? 1;

  const filteredParts = useMemo(() => {
    if (tagFilter === "all") return parts;
    return parts.filter((part) => (part.alertState?.severity ?? "ok") === tagFilter);
  }, [parts, tagFilter]);

  const handleSave = async (payload: Partial<Part> & { name: string }) => {
    const saved = await upsertPart(payload);
    addToast("Part saved", "success");
    await queryClient.invalidateQueries({ queryKey: INVENTORY_PARTS_QUERY_KEY });
    return saved;
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <p className="text-sm text-[var(--wp-color-text-muted)]">Inventory</p>
          <h1 className="text-2xl font-semibold text-[var(--wp-color-text)]">Parts library</h1>
          <p className="text-sm text-[var(--wp-color-text-muted)]">Search, filter, and manage stock across all stores.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon={<Package className="h-4 w-4" />} onClick={() => navigate("/inventory/items")}>View stock</Button>
          <Button
            variant="outline"
            icon={<Warehouse className="h-4 w-4" />}
            onClick={() => navigate("/inventory/locations")}
          >
            Locations
          </Button>
        </div>
      </header>

      <Card>
        <Card.Header>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--wp-color-text-muted)]" />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search parts, vendors, tags"
                className="min-w-[220px] rounded-md border border-[var(--wp-color-border)] px-3 py-2 pl-8 text-sm"
              />
            </div>
            <label className="text-sm text-[var(--wp-color-text)]">
              <span className="mr-2 font-medium">Tag</span>
              <select
                className="rounded-md border border-[var(--wp-color-border)] px-2 py-1 text-sm"
                value={tagFilter}
                onChange={(event) => {
                  setTagFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All</option>
                <option value="ok">OK</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </label>
          </div>
        </Card.Header>
        <Card.Content>
          {partsQuery.isLoading ? (
            <p className="text-sm text-[var(--wp-color-text-muted)]">Loading parts…</p>
          ) : partsQuery.error ? (
            <p className="text-sm text-error-600">Unable to load parts.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-sm">
                <thead className="bg-[var(--wp-color-surface)]">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Part</th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Number</th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Stock</th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Reorder point</th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Status</th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredParts.map((part) => {
                    const severity = part.alertState?.severity ?? "ok";
                    const badgeColor = severity === "critical" ? "error" : severity === "warning" ? "warning" : "success";
                    return (
                      <tr key={part.id} className="hover:bg-[var(--wp-color-surface)]">
                        <td className="px-3 py-2 text-[var(--wp-color-text)]">
                          <div className="font-semibold">{part.name}</div>
                          <p className="text-xs text-[var(--wp-color-text-muted)]">Vendor: {part.vendor?.name ?? "—"}</p>
                        </td>
                        <td className="px-3 py-2 text-[var(--wp-color-text)]">{part.partNo ?? part.partNumber ?? "—"}</td>
                        <td className="px-3 py-2 text-[var(--wp-color-text)]">{part.quantity}</td>
                        <td className="px-3 py-2 text-[var(--wp-color-text)]">{part.reorderPoint}</td>
                        <td className="px-3 py-2 text-[var(--wp-color-text)]">
                          <div className="flex flex-wrap gap-2">
                            <Badge text={severity} color={badgeColor} />
                            {part.alertState?.needsReorder && (
                              <Tag color="red" label="Needs reorder" />
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-[var(--wp-color-text)]">
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => navigate(`/inventory/parts/${part.id}`)}>
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setReceiveTarget(part)}
                              disabled={!can("inventory.manage")}
                            >
                              Receive
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredParts.length && (
                    <tr>
                      <td className="px-3 py-6 text-center text-[var(--wp-color-text-muted)]" colSpan={6}>
                        No parts match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card.Content>
        <Card.Footer className="flex items-center justify-between text-sm text-[var(--wp-color-text)]">
          <div>
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </Card.Footer>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>Quick add</Card.Title>
          <Card.Description>Capture new parts with reorder thresholds.</Card.Description>
        </Card.Header>
        <Card.Content className="grid gap-3 md:grid-cols-2">
          <Input
            label="Name"
            placeholder="Spare part"
            required
            onBlur={(event) => event.target.value && handleSave({ name: event.target.value })}
          />
          <div className="flex items-center gap-2 text-sm text-[var(--wp-color-text-muted)]">
            <CheckCircle className="h-4 w-4 text-success-600" />
            <span>Save a name to create the record, then enrich details on the detail page.</span>
          </div>
        </Card.Content>
      </Card>

      <ReceiveStockModal isOpen={Boolean(receiveTarget)} onClose={() => setReceiveTarget(null)} part={receiveTarget} stockItems={stockQuery.data ?? []} />
    </div>
  );
}



