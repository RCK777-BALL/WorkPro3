/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useDropzone } from "react-dropzone";
import { X, Upload, Download } from "lucide-react";
import Button from "@common/Button";
import http from "@/lib/http";
import { useToast } from "@/context/ToastContext";
import { useScopeContext } from "@/context/ScopeContext";
import { useDepartmentStore } from "@/store/departmentStore";
import { useAuthStore, type AuthState } from "@/store/authStore";
import type { Asset, Department, Line, Station } from "@/types";
import AssetQRCode from "@/components/qr/AssetQRCode";
import {
  submitAssetRequest,
  normalizeAssetData,
  type AssetRequestClient,
} from "@/utils/assetSubmission";

type AssetTypeValue = NonNullable<Asset["type"]>;
type AssetStatusValue = NonNullable<Asset["status"]>;
type AssetCriticalityValue = NonNullable<Asset["criticality"]>;

export interface AssetFormValues {
  name: string;
  description: string;
  serialNumber: string;
  modelName: string;
  manufacturer: string;
  purchaseDate: string;
  warrantyStart: string;
  warrantyEnd: string;
  purchaseCost: string;
  expectedLifeMonths: string;
  replacementDate: string;
  installationDate: string;
  location: string;
  department: string;
  type: AssetTypeValue;
  status: AssetStatusValue;
  criticality: AssetCriticalityValue;
  departmentId: string;
  lineId: string;
  stationId: string;
}

const defaultAssetState: AssetFormValues = {
  name: "",
  description: "",
  serialNumber: "",
  modelName: "",
  manufacturer: "",
  purchaseDate: new Date().toISOString().split("T")[0],
  warrantyStart: "",
  warrantyEnd: "",
  purchaseCost: "",
  expectedLifeMonths: "",
  replacementDate: "",
  installationDate: new Date().toISOString().split("T")[0],
  location: "",
  department: "",
  type: "Electrical",
  status: "Active",
  criticality: "medium",
  departmentId: "",
  lineId: "",
  stationId: "",
};

type AssetWithHierarchy = Asset & {
  departmentId?: string;
  lineId?: string;
  stationId?: string;
};

const toFormValues = (source: Asset | null): AssetFormValues => {
  if (!source) {
    return { ...defaultAssetState };
  }

  const assetWithHierarchy = source as AssetWithHierarchy;
  const toInputDate = (value?: string | Date) => {
    if (!value) return "";
    if (value instanceof Date) return value.toISOString().split("T")[0];
    return value.split("T")[0];
  };

  return {
    ...defaultAssetState,
    name: source.name ?? defaultAssetState.name,
    description: source.description ?? defaultAssetState.description,
    serialNumber: source.serialNumber ?? defaultAssetState.serialNumber,
    modelName: source.modelName ?? defaultAssetState.modelName,
    manufacturer: source.manufacturer ?? defaultAssetState.manufacturer,
    purchaseDate: toInputDate(source.purchaseDate) || defaultAssetState.purchaseDate,
    warrantyStart: toInputDate(source.warrantyStart),
    warrantyEnd: toInputDate(source.warrantyEnd ?? source.warrantyExpiry),
    purchaseCost:
      source.purchaseCost !== undefined ? String(source.purchaseCost) : defaultAssetState.purchaseCost,
    expectedLifeMonths:
      source.expectedLifeMonths !== undefined ? String(source.expectedLifeMonths) : defaultAssetState.expectedLifeMonths,
    replacementDate: toInputDate(source.replacementDate),
    installationDate: toInputDate(source.installationDate) || defaultAssetState.installationDate,
    location: source.location ?? defaultAssetState.location,
    department: source.department ?? defaultAssetState.department,
    type: source.type ?? defaultAssetState.type,
    status: source.status ?? defaultAssetState.status,
    criticality: source.criticality ?? defaultAssetState.criticality,
    departmentId: assetWithHierarchy.departmentId ?? defaultAssetState.departmentId,
    lineId: assetWithHierarchy.lineId ?? defaultAssetState.lineId,
    stationId: assetWithHierarchy.stationId ?? defaultAssetState.stationId,
  };
};

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  onUpdate: (asset: Asset) => void;
}

const AssetModal: React.FC<AssetModalProps> = ({
  isOpen,
  onClose,
  asset,
  onUpdate,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const isEditing = Boolean(asset);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AssetFormValues>({
    defaultValues: toFormValues(asset),
  });
  const departments = useDepartmentStore((s) => s.departments);
  const linesMap = useDepartmentStore((s) => s.linesByDepartment);
  const stationsMap = useDepartmentStore((s) => s.stationsByLine);
  const fetchDepartments = useDepartmentStore((s) => s.fetchDepartments);
  const fetchLines = useDepartmentStore((s) => s.fetchLines);
  const fetchStations = useDepartmentStore((s) => s.fetchStations);
  const tenantId = useAuthStore((s: AuthState) => s.user?.tenantId);
  const departmentId = watch("departmentId");
  const lineId = watch("lineId");
  const stationId = watch("stationId");
  const lines = departmentId ? linesMap[departmentId] || [] : [];
  const stations = lineId ? stationsMap[lineId] || [] : [];
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();
  const { activePlant } = useScopeContext();

  useEffect(() => {
    reset(toFormValues(asset));
    setFiles([]);
  }, [asset, reset]);

  useEffect(() => {
    fetchDepartments().catch(() => {
      addToast("Failed to load departments", "error");
    });
  }, [fetchDepartments, addToast]);

  useEffect(() => {
    if (!departmentId) {
      setValue("lineId", "");
      setValue("stationId", "");
      return;
    }
    fetchLines(departmentId).catch(() => {
      addToast("Failed to load lines", "error");
    });
  }, [departmentId, fetchLines, setValue, addToast]);

  useEffect(() => {
    if (!departmentId || !lineId) {
      setValue("stationId", "");
      return;
    }
    fetchStations(departmentId, lineId).catch(() => {
      addToast("Failed to load stations", "error");
    });
  }, [departmentId, lineId, fetchStations, setValue, addToast]);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "image/*": [".png", ".jpg", ".jpeg"],
      "application/pdf": [".pdf"],
    },
    onDrop: (acceptedFiles) => {
      setFiles([...files, ...acceptedFiles]);
    },
  });

  const assetHttpClient = useMemo<AssetRequestClient>(() => ({
    post: (url, data, config) =>
      http.post(url, data, config).then((response) => ({ data: response.data })),
    put: (url, data, config) =>
      http.put(url, data, config).then((response) => ({ data: response.data })),
  }), []);

  const departmentField = register("departmentId");
  const lineField = register("lineId");
  const stationField = register("stationId");

  const onSubmit = async (data: AssetFormValues) => {
    setError(null);

    const { departmentId: formDepartmentId, lineId: formLineId, stationId: formStationId, ...rest } = data;
    const resolvedSiteId = activePlant?.id ?? asset?.plantId ?? asset?.siteId ?? undefined;

    const payload: Record<string, any> = {
      ...rest,
      purchaseCost: rest.purchaseCost ? Number(rest.purchaseCost) : undefined,
      expectedLifeMonths: rest.expectedLifeMonths ? Number(rest.expectedLifeMonths) : undefined,
      warrantyStart: rest.warrantyStart || undefined,
      warrantyEnd: rest.warrantyEnd || undefined,
      replacementDate: rest.replacementDate || undefined,
      purchaseDate: rest.purchaseDate || undefined,
      installationDate: rest.installationDate || undefined,
      ...(isEditing
        ? {
            departmentId: formDepartmentId || undefined,
            lineId: formLineId || undefined,
            stationId: formStationId || undefined,
          }
        : {}),
      plantId: activePlant?.id ?? asset?.plantId ?? undefined,
      siteId: resolvedSiteId ?? undefined,
      ...(tenantId ? { tenantId } : {}),
    };

    const requestConfig = resolvedSiteId ? { headers: { "x-site-id": resolvedSiteId } } : undefined;

    try {
      const raw = await submitAssetRequest({
        asset,
        files,
        payload,
        httpClient: assetHttpClient,
        requestConfig,
      });

      const fallback: Partial<Asset> = {
        ...(asset ?? {}),
        ...(payload as Partial<Asset>),
      };

      const normalized = normalizeAssetData(raw, fallback);
      onUpdate(normalized);
      onClose();
    } catch (err: any) {
      const defaultMessage = asset ? "Failed to update asset" : "Failed to create asset";
      const message =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.errors)
          ? err.response.data.errors.map((e: any) => e.msg).join(", ")
          : defaultMessage);
      setError(message);
      addToast(message, "error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-neutral-950/50 dark:bg-neutral-950/80 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-transparent dark:border-neutral-700/80">
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            {asset ? "Edit Asset" : "Create Asset"}
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {error && <p className="text-error-500 dark:text-error-400">{error}</p>}
          <AssetQRCode value="ABC123" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                Name
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800"
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && (
                <p className="text-error-500 dark:text-error-400 text-sm mt-1">
                  {errors.name.message as string}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                Serial Number
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800"
                {...register("serialNumber")}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
              Description
            </label>
            <textarea
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800"
              rows={4}
              {...register("description")}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                Model
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800"
                {...register("modelName")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                Manufacturer
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800"
                {...register("manufacturer")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                Purchase Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800"
                {...register("purchaseDate")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                Installation Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800"
                {...register("installationDate")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                Warranty Start
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800"
                {...register("warrantyStart")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                Warranty End
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800"
                {...register("warrantyEnd")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                Purchase Cost
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800"
                {...register("purchaseCost")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                Expected Life (months)
              </label>
              <input
                type="number"
                min="1"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800"
                {...register("expectedLifeMonths")}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
              Planned Replacement Date
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800"
              {...register("replacementDate")}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                Location
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800"
                {...register("location")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                Type
              </label>
              <select
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800"
                {...register("type")}
              >
                <option value="Electrical">Electrical</option>
                <option value="Mechanical">Mechanical</option>
                <option value="Tooling">Tooling</option>
                <option value="Interface">Interface</option>
                <option value="Welding">Welding</option>
              </select>
            </div>
          </div>

          {isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                  Department
                </label>
                <select
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800"
                  value={departmentId}
                  onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
                    departmentField.onChange(event);
                    setValue("lineId", "", { shouldDirty: true, shouldValidate: true });
                    setValue("stationId", "", { shouldDirty: true, shouldValidate: true });
                  }}
                  onBlur={departmentField.onBlur}
                  name={departmentField.name}
                  ref={departmentField.ref}
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                  Line
                </label>
                <select
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800"
                  value={lineId}
                  onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
                    lineField.onChange(event);
                    setValue("stationId", "", { shouldDirty: true, shouldValidate: true });
                  }}
                  onBlur={lineField.onBlur}
                  name={lineField.name}
                  ref={lineField.ref}
                  disabled={!departmentId}
                >
                  <option value="">Select Line</option>
                  {lines.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                  Station
                </label>
                <select
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800"
                  value={stationId}
                  onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
                    stationField.onChange(event);
                  }}
                  onBlur={stationField.onBlur}
                  name={stationField.name}
                  ref={stationField.ref}
                  disabled={!lineId}
                >
                  <option value="">Select Station</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-300">
              Create the asset first, then assign it to a department, line, or station later as an add-on.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                Status
              </label>
              <select
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800"
                {...register("status")}
              >
                <option value="Active">Active</option>
                <option value="Offline">Offline</option>
                <option value="In Repair">In Repair</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                Criticality
              </label>
              <select
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800"
                {...register("criticality")}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
              Documents & Images
            </label>
            <div
              {...getRootProps()}
              className="border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg p-6 text-center cursor-pointer hover:border-primary-500 dark:hover:border-primary-400 transition-colors bg-white/40 dark:bg-neutral-900/40"
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-neutral-400 dark:text-neutral-500" />
              <p className="mt-2 text-sm text-neutral-900 dark:text-neutral-100">
                Drag & drop files here, or click to select files
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Supports: Images, PDFs, and documents
              </p>
            </div>
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-800 rounded-md"
                  >
                    <div className="flex items-center">
                      <Download size={16} className="text-neutral-500 dark:text-neutral-400 mr-2" />
                      <span className="text-sm text-neutral-900 dark:text-neutral-100">
                        {file.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFiles(files.filter((_, i) => i !== index))
                      }
                      className="text-neutral-400 hover:text-error-500 dark:text-neutral-500 dark:hover:text-error-400"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-neutral-200 dark:border-neutral-700">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {asset ? "Update Asset" : "Create Asset"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssetModal;
