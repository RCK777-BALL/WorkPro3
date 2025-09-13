/*
 * SPDX-License-Identifier: MIT
 */

   
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useDropzone } from "react-dropzone";
import { X, Upload, Download, Camera } from "lucide-react";
import Button from "@/components/common/Button";
import AutoCompleteInput from "@/components/common/AutoCompleteInput";
import type { WorkOrder, Part } from "@/types";
import { searchAssets } from "@/api/search";
import http from "@/lib/http";
import { useDepartmentStore } from "@/store/departmentStore";
import { useToast } from "@/context/ToastContext";
   

interface WorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: WorkOrder | null;
  initialData?: Partial<WorkOrder>;
  onUpdate: (payload: FormData | Record<string, any>) => void;
}

const WorkOrderModal: React.FC<WorkOrderModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  initialData,
  onUpdate,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [signatures, setSignatures] = useState<{ by: string; ts: string }[]>(
    workOrder?.signatures || initialData?.signatures || []
  );
  const [newSignature, setNewSignature] = useState<{ by: string; ts: string }>({ by: '', ts: '' });

  const departments = useDepartmentStore((s) => s.departments);
  const fetchDepartments = useDepartmentStore((s) => s.fetchDepartments);
  const [loadingDeps, setLoadingDeps] = useState(true);
  const { addToast } = useToast();
  const [availableParts, setAvailableParts] = useState<Part[]>([]);
  const [parts, setParts] = useState<{ partId: string; qty: number; cost: number }[]>(
    workOrder?.partsUsed || initialData?.partsUsed || []
  );
  const [checklists, setChecklists] = useState<{ text: string; done: boolean }[]>(
    workOrder?.checklists || initialData?.checklists || []
  );
  const [newChecklist, setNewChecklist] = useState('');
  
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
      status: workOrder?.status || "requested",
      type: workOrder?.type || "corrective",
      scheduledDate:
        workOrder?.scheduledDate || new Date().toISOString().split("T")[0],
      assetId: workOrder?.assetId || initialData?.assetId || "",
    },
  });
  
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "image/*": [".png", ".jpg", ".jpeg"],
      "application/pdf": [".pdf"],
    },
    onDrop: (acceptedFiles: File[]) => {
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

  useEffect(() => {
    http
      .get('/parts')
      .then((res) => setAvailableParts(res.data as Part[]))
      .catch(() => {});
  }, []);

  if (!isOpen) return null;

 
  const onSubmit = async (data: any) => {
    const payload: Record<string, any> = {
      departmentId: data.departmentId,
      title: data.title,
      priority: data.priority,
      description: data.description,
      status: data.status,
      scheduledDate: data.scheduledDate,
      assetId: data.assetId,
      partsUsed: parts,
      signatures,
      checklists,
    };

    if (files.length > 0) {
      const fd = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((v) => fd.append(`${key}[]`, v as any));
          } else {
            fd.append(key, value as any);
          }
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

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const uploadDocument = async () => {
    try {
      if (docFile) {
        const base64 = await fileToBase64(docFile);
        await http.post('/documents', { name: docFile.name, base64 });
        addToast('Document uploaded', 'success');
        setDocFile(null);
      } else if (docUrl) {
        const name = docUrl.split('/').pop() || 'document';
        await http.post('/documents', { name, url: docUrl });
        addToast('Document uploaded', 'success');
        setDocUrl('');
      }
    } catch {
      addToast('Failed to upload document', 'error');
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
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setValue("departmentId", e.target.value)}
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
              Checklists
            </label>
            {checklists.map((c, idx) => (
              <div key={idx} className="flex items-center space-x-2 mb-1">
                <input
                  type="text"
                  className="flex-1 px-2 py-1 border border-neutral-300 rounded-md"
                  value={c.text}
                  onChange={(e) => {
                    const updated = [...checklists];
                    updated[idx].text = e.target.value;
                    setChecklists(updated);
                  }}
                />
                <input
                  type="checkbox"
                  checked={c.done}
                  onChange={(e) => {
                    const updated = [...checklists];
                    updated[idx].done = e.target.checked;
                    setChecklists(updated);
                  }}
                />
                <button type="button" onClick={() => setChecklists(checklists.filter((_, i) => i !== idx))}>
                  Remove
                </button>
              </div>
            ))}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                className="flex-1 px-2 py-1 border border-neutral-300 rounded-md"
                value={newChecklist}
                onChange={(e) => setNewChecklist(e.target.value)}
              />
              <button
                type="button"
                onClick={() => {
                  if (newChecklist) {
                    setChecklists([...checklists, { text: newChecklist, done: false }]);
                    setNewChecklist('');
                  }
                }}
              >
                Add
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Parts
            </label>
            <select
              className="w-full px-3 py-2 border border-neutral-300 rounded-md"
              onChange={(e) => {
                const id = e.target.value;
                if (id && !parts.find((p) => p.partId === id)) {
                  setParts([...parts, { partId: id, qty: 1, cost: 0 }]);
                }
                e.target.value = '';
              }}
            >
              <option value="">Select Part</option>
              {availableParts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ul className="mt-2 space-y-1">
              {parts.map((pt, idx) => {
                const p = availableParts.find((ap) => ap.id === pt.partId);
                return (
                  <li key={pt.partId} className="flex items-center space-x-2 text-sm">
                    <span className="flex-1">{p?.name || pt.partId}</span>
                    <input
                      type="number"
                      className="w-16 px-1 py-0.5 border border-neutral-300 rounded"
                      value={pt.qty}
                      onChange={(e) => {
                        const updated = [...parts];
                        updated[idx].qty = Number(e.target.value);
                        setParts(updated);
                      }}
                    />
                    <input
                      type="number"
                      className="w-20 px-1 py-0.5 border border-neutral-300 rounded"
                      value={pt.cost}
                      onChange={(e) => {
                        const updated = [...parts];
                        updated[idx].cost = Number(e.target.value);
                        setParts(updated);
                      }}
                    />
                    <button
                      type="button"
                      className="text-error-500"
                      onClick={() => setParts(parts.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

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
                <option value="requested">Requested</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
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
              Document
            </label>
            <input
              type="file"
              onChange={(e) => setDocFile(e.target.files?.[0] || null)}
              className="mb-2"
            />
            <input
              type="text"
              value={docUrl}
              onChange={(e) => setDocUrl(e.target.value)}
              placeholder="Or paste URL"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md mb-2"
            />
            <Button type="button" variant="outline" className="w-full" onClick={uploadDocument}>
              Upload Document
            </Button>
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
              Signatures
            </label>
            {signatures.map((s, idx) => (
              <div key={idx} className="flex items-center space-x-2 mb-1">
                <input
                  type="text"
                  className="px-2 py-1 border border-neutral-300 rounded-md"
                  value={s.by}
                  placeholder="User ID"
                  onChange={(e) => {
                    const updated = [...signatures];
                    updated[idx].by = e.target.value;
                    setSignatures(updated);
                  }}
                />
                <input
                  type="datetime-local"
                  className="px-2 py-1 border border-neutral-300 rounded-md"
                  value={s.ts}
                  onChange={(e) => {
                    const updated = [...signatures];
                    updated[idx].ts = e.target.value;
                    setSignatures(updated);
                  }}
                />
                <button
                  type="button"
                  onClick={() => setSignatures(signatures.filter((_, i) => i !== idx))}
                >
                  Remove
                </button>
              </div>
            ))}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                className="px-2 py-1 border border-neutral-300 rounded-md"
                value={newSignature.by}
                placeholder="User ID"
                onChange={(e) => setNewSignature((prev) => ({ ...prev, by: e.target.value }))}
              />
              <input
                type="datetime-local"
                className="px-2 py-1 border border-neutral-300 rounded-md"
                value={newSignature.ts}
                onChange={(e) => setNewSignature((prev) => ({ ...prev, ts: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => {
                  if (newSignature.by && newSignature.ts) {
                    setSignatures([...signatures, newSignature]);
                    setNewSignature({ by: '', ts: '' });
                  }
                }}
              >
                Add
              </button>
            </div>
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
