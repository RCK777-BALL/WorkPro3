/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Download, History, Package, PlusCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { adjustStockLevel } from "@/api/inventory";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import Modal from "@/components/common/Modal";
import { useToast } from "@/context/ToastContext";
import {
  formatInventoryLocation,
  StockHistoryList,
  useLocationsQuery,
  usePartQuery,
  useStockHistoryQuery,
  useStockItemsQuery,
} from "@/features/inventory";
import {
  INVENTORY_HISTORY_QUERY_KEY,
  INVENTORY_PARTS_QUERY_KEY,
  INVENTORY_STOCK_QUERY_KEY,
} from "@/features/inventory/hooks";
import type { InventoryLocation, StockHistoryEntry, StockItem } from "@/types";

const PAGE_SIZE = 5;

const buildLocationMap = (locations: InventoryLocation[]) =>
  new Map<string, InventoryLocation>(locations.map((location) => [location.id, location]));

const ReceiveModal = ({
  isOpen,
  onClose,
  partId,
  stockItems,
}: {
  isOpen: boolean;
  onClose: () => void;
  partId?: string;
  stockItems: StockItem[];
}) => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [stockItemId, setStockItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStockItemId("");
    setQuantity(1);
    setError(null);
  }, [partId, isOpen]);

  const availableLocations = useMemo(
    () => stockItems.filter((item) => item.partId === partId),
    [stockItems, partId],
  );

  const submit = async () => {
    if (!stockItemId || !partId) return;
    if (quantity <= 0) {
      setError("Quantity must be greater than zero");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await adjustStockLevel({ stockItemId, delta: quantity, reason: "Receive" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: INVENTORY_STOCK_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: INVENTORY_HISTORY_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: INVENTORY_PARTS_QUERY_KEY }),
      ]);
      addToast("Stock received", "success");
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
        <label className="text-sm font-medium text-[var(--wp-color-text)]">Location</label>
        <select
          value={stockItemId}
          onChange={(event) => setStockItemId(event.target.value)}
          className="w-full rounded-md border border-[var(--wp-color-border)] px-3 py-2 text-sm"
          disabled={!availableLocations.length}
        >
          <option value="">Choose location</option>
          {availableLocations.map((item) => (
            <option key={item.id} value={item.id}>
              {formatInventoryLocation(item.location ?? undefined)}
            </option>
          ))}
        </select>
        {!availableLocations.length && (
          <p className="text-xs text-warning-700">Create a stock location before receiving inventory.</p>
        )}
        <label className="text-sm font-medium text-[var(--wp-color-text)]">Quantity</label>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(event) => setQuantity(Number(event.target.value))}
          className="w-full rounded-md border border-[var(--wp-color-border)] px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-error-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={submit} loading={loading} disabled={!stockItemId}>
            Receive
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const InventoryPartDetail = () => {
  const { partId } = useParams();
  const [searchParams] = useSearchParams();
  const siteFilter = searchParams.get("siteId") ?? "all";
  const binFilter = searchParams.get("bin") ?? "all";
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const partQuery = usePartQuery(partId);
  const stockHistoryQuery = useStockHistoryQuery();
  const stockQuery = useStockItemsQuery();
  const locationsQuery = useLocationsQuery();
  const hasPartError = Boolean(partQuery.error);
  const hasHistoryError = Boolean(stockHistoryQuery.error);

  const locationMap = useMemo(() => buildLocationMap(locationsQuery.data ?? []), [locationsQuery.data]);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"overview" | "stock" | "history">("overview");
  const [receiveOpen, setReceiveOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [siteFilter, binFilter, partId]);

  const partStock = useMemo(
    () => (stockQuery.data ?? []).filter((item) => item.partId === partId),
    [partId, stockQuery.data],
  );

  const filteredHistory: StockHistoryEntry[] = useMemo(() => {
    const entries = (stockHistoryQuery.data ?? []).filter((entry) => entry.partId === partId);
    return entries.filter((entry) => {
      const locationSiteId = locationMap.get(entry.location.locationId)?.siteId;
      const matchesSite = siteFilter === "all" || locationSiteId === siteFilter;
      const binValue = entry.location.bin ?? locationMap.get(entry.location.locationId)?.bin;
      const matchesBin = binFilter === "all" || binValue === binFilter;
      return matchesSite && matchesBin;
    });
  }, [stockHistoryQuery.data, partId, siteFilter, binFilter, locationMap]);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
  const paginatedHistory = filteredHistory.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const queryString = searchParams.toString();
  const backLink = `/inventory/items${queryString ? `?${queryString}` : ""}`;

  const totalQuantity = partStock.reduce((sum, stock) => sum + stock.quantity, 0);

  const handleQuickAdjust = async (item: StockItem, delta: number) => {
    await adjustStockLevel({ stockItemId: item.id, delta, reason: delta > 0 ? "Receive" : "Issue" });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: INVENTORY_STOCK_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: INVENTORY_HISTORY_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: INVENTORY_PARTS_QUERY_KEY }),
    ]);
    addToast("Stock updated", "success");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--wp-color-text-muted)]">Inventory</p>
          <h1 className="text-2xl font-semibold text-[var(--wp-color-text)]">Part details</h1>
          <p className="text-sm text-[var(--wp-color-text-muted)]">Site and bin filters carry through to history and navigation.</p>
        </div>
        <Link to={backLink} className="text-sm text-blue-600 hover:underline">
          Back to list
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant={activeTab === "overview" ? "primary" : "outline"} icon={<Package className="h-4 w-4" />} onClick={() => setActiveTab("overview")}>
          Overview
        </Button>
        <Button variant={activeTab === "stock" ? "primary" : "outline"} icon={<Download className="h-4 w-4" />} onClick={() => setActiveTab("stock")}>
          Stock balances
        </Button>
        <Button variant={activeTab === "history" ? "primary" : "outline"} icon={<History className="h-4 w-4" />} onClick={() => setActiveTab("history")}>
          Movement history
        </Button>
        <Button variant="ghost" icon={<PlusCircle className="h-4 w-4" />} onClick={() => setReceiveOpen(true)}>
          Receive stock
        </Button>
      </div>

      <Card>
        <Card.Header>
          <Card.Title>{partQuery.data?.name ?? "Loading part…"}</Card.Title>
          <Card.Description>Core fields and live stock totals.</Card.Description>
        </Card.Header>
        <Card.Content className="space-y-3">
          {(partQuery.isLoading || stockQuery.isLoading) && (
            <div className="flex items-center gap-2 text-sm text-[var(--wp-color-text-muted)]" role="status">
              <LoadingSpinner />
              <span>Loading part details…</span>
            </div>
          )}
          {hasPartError && <p className="text-sm text-error-600">Unable to load part details.</p>}
          {!partQuery.isLoading && !hasPartError && partQuery.data && (
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase text-[var(--wp-color-text-muted)]">Part number</p>
                <p className="font-medium text-[var(--wp-color-text)]">{partQuery.data.partNo ?? partQuery.data.partNumber ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--wp-color-text-muted)]">Reorder point</p>
                <p className="font-medium text-[var(--wp-color-text)]">{partQuery.data.reorderPoint}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--wp-color-text-muted)]">Unit cost</p>
                <p className="font-medium text-[var(--wp-color-text)]">{partQuery.data.unitCost ?? partQuery.data.cost ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--wp-color-text-muted)]">Total on hand</p>
                <p className="font-medium text-[var(--wp-color-text)]">{totalQuantity}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--wp-color-text-muted)]">Vendor</p>
                <p className="font-medium text-[var(--wp-color-text)]">{partQuery.data.vendor?.name ?? "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge text={partQuery.data.alertState?.severity ?? "ok"} color="warning" />
                {partQuery.data.alertState?.needsReorder && <Badge text="Reorder" color="error" />}
              </div>
            </div>
          )}

          {activeTab === "stock" && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--wp-color-text)]">Stock by location</p>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 text-sm">
                  <thead className="bg-[var(--wp-color-surface)]">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Location</th>
                      <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Quantity</th>
                      <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {partStock.map((stock) => {
                      const location = stock.location ?? locationMap.get(stock.locationId);
                      return (
                        <tr key={stock.id}>
                          <td className="px-3 py-2 text-[var(--wp-color-text)]">{formatInventoryLocation(location ?? undefined)}</td>
                          <td className="px-3 py-2 text-[var(--wp-color-text)]">{stock.quantity}</td>
                          <td className="px-3 py-2 text-[var(--wp-color-text)]">
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => void handleQuickAdjust(stock, 1)}>
                                +1
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => void handleQuickAdjust(stock, -1)}>
                                -1
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!partStock.length && (
                  <p className="p-3 text-sm text-[var(--wp-color-text-muted)]">No stock items recorded for this part.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-3">
              {stockHistoryQuery.isLoading && (
                <div className="flex items-center gap-2 text-sm text-[var(--wp-color-text-muted)]" role="status">
                  <LoadingSpinner />
                  <span>Loading history…</span>
                </div>
              )}
              {hasHistoryError && (
                <p className="text-sm text-error-600">Unable to load transaction history.</p>
              )}
              {!stockHistoryQuery.isLoading && !hasHistoryError && (
                <>
                  <StockHistoryList entries={paginatedHistory} />
                  <div className="flex items-center gap-3 text-sm text-[var(--wp-color-text)]">
                    <button
                      type="button"
                      className="rounded border border-[var(--wp-color-border)] px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={page <= 1}
                    >
                      Previous
                    </button>
                    <span>
                      Page {page} of {totalPages}
                    </span>
                    <button
                      type="button"
                      className="rounded border border-[var(--wp-color-border)] px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={page >= totalPages}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "overview" && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--wp-color-text)]">Highlights</p>
              <ul className="list-inside list-disc text-sm text-[var(--wp-color-text)]">
                <li>Track reorder points and vendor readiness for this part.</li>
                <li>Use the tabs above to review movement history or adjust balances.</li>
              </ul>
            </div>
          )}
        </Card.Content>
      </Card>

      <ReceiveModal isOpen={receiveOpen} onClose={() => setReceiveOpen(false)} partId={partId} stockItems={stockQuery.data ?? []} />
    </div>
  );
};

export default InventoryPartDetail;


