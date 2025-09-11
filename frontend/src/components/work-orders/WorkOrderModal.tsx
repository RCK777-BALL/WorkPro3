/*
 * SPDX-License-Identifier: MIT
 */

   
import React, { useState, useRef, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import SignaturePad from "react-signature-canvas";
import { useDropzone } from "react-dropzone";
import { X, Upload, Download, Camera } from "lucide-react";
import Button from "@/common/Button";
import AutoCompleteInput from "@/common/AutoCompleteInput";
import type { WorkOrder, Department } from "@/types";
import http from "@/lib/http";
import { searchAssets } from "@/api/search";
import { useDepartmentStore } from "@/store/departmentStore";
import { useToast } from "@/context/ToastContext";
   

interface WorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: WorkOrder | null;
  onUpdate: (payload: FormData | Record<string, any>) => void;
  initialData?: Partial<WorkOrder>;
}

const WorkOrderModal: React.FC<WorkOrderModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  onUpdate,
  initialData,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const signaturePadRef = useRef<SignaturePad>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const departments = useDepartmentStore((s) => s.departments);
  const fetchDepartments = useDepartmentStore((s) => s.fetchDepartments);
  const [loadingDeps, setLoadingDeps] = useState(true);
  const { addToast } = useToast();
  
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      departmentId: workOrder?.department || "",
      title: workOrder?.title || "",
      description: workOrder?.description || "",
      priority: workOrder?.priority || "medium",
      status: workOrder?.status || "open",
      type: workOrder?.type || "corrective",
      scheduledDate:
        workOrder?.scheduledDate || new Date().toISOString().split("T")[0],
      assetId: workOrder?.assetId || "",
    },
  });
  
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "image/*": [".png", ".jpg", ".jpeg"],
      "application/pdf": [".pdf"],
    },
    onDrop: (acceptedFiles) => {
      setFiles([...files, ...acceptedFiles]);
    },
  });

  useEffect(() => {
    fetchDepartments()
      .catch(() => {
        addToast("Failed to load departments", "error");
      })
      .finally(() => setLoadingDeps(false));
  }, [fetchDepartments, addToast]);

  if (!isOpen) return null;

 
  const onSubmit = async (data: any) => {
 
    let signature = null;
    if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
      signature = signaturePadRef.current.toDataURL();
    }

    const payload: Record<string, any> = {
      departmentId: data.departmentId,
      title: data.title,
      priority: data.priority,
      description: data.description,
      status: data.status,
      scheduledDate: data.scheduledDate,
      assetId: data.assetId,
    };

    if (signature) payload.signature = signature;

    if (files.length > 0) {
      const fd = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          fd.append(key, value as any);
        }
      });
      files.forEach((f) => fd.append("files", f));
      onUpdate(fd);
    } else {
      onUpdate(payload);
    }
  };

  const handleCaptureImage = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      // Implementation for capturing image from camera
      // This would typically involve creating a video element and canvas
      // to capture the image
    } catch {
      addToast('Error accessing camera', 'error');
    }
  };

  if (!isOpen) return null;

  return (
 
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-xl font-semibold text-neutral-900">
            {workOrder ? "Edit Work Order" : "Create Work Order"}
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
 
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Department
            </label>
            {loadingDeps ? (
              <div className="flex justify-center py-2">
                <svg
                  className="animate-spin h-5 w-5 text-neutral-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            ) : (
              <>
                <select
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                  value={watch("departmentId")}
                  onChange={(e) => setValue("departmentId", e.target.value)}
                  {...register("departmentId", {
                    required: "Department is required",
                  })}
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                {errors.departmentId && (
                  <p className="text-error-500 text-sm mt-1">
                    {errors.departmentId.message as string}
                  </p>
                )}
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Title
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                {...register("title", { required: "Title is required" })}
              />
              {errors.title && (
                <p className="text-error-500 text-sm mt-1">
                  {errors.title.message as string}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Priority
              </label>
              <select
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                {...register("priority", { required: "Priority is required" })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              {errors.priority && (
                <p className="text-error-500 text-sm mt-1">
                  {errors.priority.message as string}
                </p>
              )}
            </div>
          </div>

          <AutoCompleteInput
            label="Asset"
            name="assetId"
            control={control}
            fetchOptions={searchAssets}
            placeholder="Search assets..."
          />

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Description
            </label>
            <textarea
              className="w-full px-3 py-2 border border-neutral-300 rounded-md"
              rows={4}
              {...register("description")}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Status
              </label>
              <select
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                {...register("status", { required: "Status is required" })}
              >
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
              {errors.status && (
                <p className="text-error-500 text-sm mt-1">
                  {errors.status.message as string}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Scheduled Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                {...register("scheduledDate", { required: "Date is required" })}
              />
              {errors.scheduledDate && (
                <p className="text-error-500 text-sm mt-1">
                  {errors.scheduledDate.message as string}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Attachments
            </label>
            <div
              {...getRootProps()}
              className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary-500 transition-colors"
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-neutral-400" />
              <p className="mt-2 text-sm text-neutral-600">
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
                      <span className="text-sm text-neutral-600">
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

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Capture Image
            </label>
            <Button
              type="button"
              variant="outline"
              icon={<Camera size={16} />}
              onClick={handleCaptureImage}
              className="w-full"
            >
              Take Photo
            </Button>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Signature
            </label>
            {showSignaturePad ? (
              <div className="border border-neutral-300 rounded-md p-2">
                <SignaturePad
                  ref={signaturePadRef}
                  canvasProps={{
                    className: "w-full h-40 border rounded-md",
                  }}
                />
                <div className="mt-2 flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => signaturePadRef.current?.clear()}
                  >
                    Clear
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => setShowSignaturePad(false)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSignaturePad(true)}
                className="w-full"
              >
                Add Signature
              </Button>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-neutral-200">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {workOrder ? "Update Work Order" : "Create Work Order"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkOrderModal;
