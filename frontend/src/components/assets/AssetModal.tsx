/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useDropzone } from "react-dropzone";
import { X, Upload, Download } from "lucide-react";
import Button from "@/common/Button";
import http from "@/lib/http";
import { useToast } from "@/context/ToastContext";
import { useDepartmentStore } from "@/store/departmentStore";
import { useAuthStore, type AuthState } from "@/store/authStore";
import type { Asset, Department, Line, Station } from "@/types";
import AssetQRCode from "@/qr/AssetQRCode";

const defaultAssetState = {
  name: "",
  description: "",
  serialNumber: "",
  modelName: "",
  manufacturer: "",
  purchaseDate: new Date().toISOString().split("T")[0],
  installationDate: new Date().toISOString().split("T")[0],
  location: "",
  department: "",
  type: "Electrical",
  status: "Active",
  criticality: "medium",
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
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({ defaultValues: asset || defaultAssetState });
  const departments = useDepartmentStore((s) => s.departments);
  const linesMap = useDepartmentStore((s) => s.linesByDepartment);
  const stationsMap = useDepartmentStore((s) => s.stationsByLine);
  const fetchDepartments = useDepartmentStore((s) => s.fetchDepartments);
  const fetchLines = useDepartmentStore((s) => s.fetchLines);
  const fetchStations = useDepartmentStore((s) => s.fetchStations);
  const tenantId = useAuthStore((s: AuthState) => s.user?.tenantId);
  const [departmentId, setDepartmentId] = useState("");
  const [lineId, setLineId] = useState("");
  const [stationId, setStationId] = useState("");
  const lines = departmentId ? linesMap[departmentId] || [] : [];
  const stations = lineId ? stationsMap[lineId] || [] : [];
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    reset(asset || defaultAssetState);
    setFiles([]);
    setDepartmentId(asset?.departmentId ?? "");
    setLineId(asset?.lineId ?? "");
    setStationId(asset?.stationId ?? "");
  }, [asset, reset]);

  useEffect(() => {
    fetchDepartments().catch(() => {
      addToast("Failed to load departments", "error");
    });
  }, [fetchDepartments, addToast]);

  useEffect(() => {
    if (!departmentId) {
      setLineId("");
      setStationId("");
      return;
    }
    fetchLines(departmentId).catch(() => {
      addToast("Failed to load lines", "error");
    });
  }, [departmentId, fetchLines, addToast]);

  useEffect(() => {
    if (!departmentId || !lineId) {
      setStationId("");
      return;
    }
    fetchStations(departmentId, lineId).catch(() => {
      addToast("Failed to load stations", "error");
    });
  }, [departmentId, lineId, fetchStations, addToast]);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "image/*": [".png", ".jpg", ".jpeg"],
      "application/pdf": [".pdf"],
    },
    onDrop: (acceptedFiles) => {
      setFiles([...files, ...acceptedFiles]);
    },
  });

  const onSubmit = async (data: any) => {
    setError(null);

    const payload: Record<string, any> = {
      ...data,
      departmentId,
      lineId,
      stationId,
      tenantId,
    };

    try {
      let res;
      if (files.length > 0) {
        const fd = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            fd.append(key, value as any);
          }
        });
        files.forEach((f) => fd.append("files", f));
        res = await http.post("/assets", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        res = await http.post("/assets", payload);
      }

      onUpdate({ ...(res.data as any), id: res.data._id } as Asset);
      onClose();
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.errors)
          ? err.response.data.errors.map((e: any) => e.msg).join(", ")
          : "Failed to create asset");
      setError(message);
      addToast(message, "error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-xl font-semibold text-neutral-900">
            {asset ? "Edit Asset" : "Create Asset"}
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {error && <p className="text-error-500">{error}</p>}
          <AssetQRCode value="ABC123" />
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-1">
                Name
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-neutral-900 bg-white"
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && (
                <p className="text-error-500 text-sm mt-1">
                  {errors.name.message as string}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-1">
                Serial Number
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-neutral-900 bg-white"
                {...register("serialNumber")}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-1">
              Description
            </label>
            <textarea
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-neutral-900 bg-white"
              rows={4}
              {...register("description")}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-1">
                Model
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-neutral-900 bg-white"
                {...register("modelName")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-1">
                Manufacturer
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-neutral-900 bg-white"
                {...register("manufacturer")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-1">
                Purchase Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-neutral-900 bg-white"
                {...register("purchaseDate")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-1">
                Installation Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-neutral-900 bg-white"
                {...register("installationDate")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-1">
                Location
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-neutral-900 bg-white"
                {...register("location")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-1">
                Type
              </label>
              <select
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-neutral-900 bg-white"
                {...register("type")}
              >
                <option value="Electrical">Electrical</option>
                <option value="Mechanical">Mechanical</option>
                <option value="Tooling">Tooling</option>
                <option value="Interface">Interface</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-1">
                Department
              </label>
              <select
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-neutral-900 bg-white"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
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
              <label className="block text-sm font-medium text-neutral-900 mb-1">
                Line
              </label>
              <select
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-neutral-900 bg-white"
                value={lineId}
                onChange={(e) => setLineId(e.target.value)}
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
              <label className="block text-sm font-medium text-neutral-900 mb-1">
                Station
              </label>
              <select
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-neutral-900 bg-white"
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
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

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-1">
                Status
              </label>
              <select
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-neutral-900 bg-white"
                {...register("status")}
              >
                <option value="Active">Active</option>
                <option value="Offline">Offline</option>
                <option value="In Repair">In Repair</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-1">
                Criticality
              </label>
              <select
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-neutral-900 bg-white"
                {...register("criticality")}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-1">
              Documents & Images
            </label>
            <div
              {...getRootProps()}
              className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary-500 transition-colors"
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-neutral-400" />
              <p className="mt-2 text-sm text-neutral-900">
                Drag & drop files here, or click to select files
              </p>
              <p className="text-xs text-neutral-500">
                Supports: Images, PDFs, and documents
              </p>
            </div>
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-neutral-50 rounded-md"
                  >
                    <div className="flex items-center">
                      <Download size={16} className="text-neutral-500 mr-2" />
                      <span className="text-sm text-neutral-900">
                        {file.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFiles(files.filter((_, i) => i !== index))
                      }
                      className="text-neutral-400 hover:text-error-500"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-neutral-200">
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
