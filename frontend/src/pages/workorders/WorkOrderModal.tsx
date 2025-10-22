import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import type { WorkOrder } from "@/types/cmms";
import { WORK_ORDER_STATUS_OPTIONS } from "@/types/cmms";

const schema = z.object({
  title: z.string().min(2, 'Title is required'),
  assetId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['requested', 'assigned', 'in_progress', 'completed', 'cancelled']),
  dueDate: z.string().optional(),
});

type WorkOrderForm = z.infer<typeof schema>;

interface WorkOrderModalProps {
  wo?: WorkOrder;
  onClose: () => void;
  onSaved: () => void;
}

export default function WorkOrderModal({ wo, onClose, onSaved }: WorkOrderModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<WorkOrderForm>({
    resolver: zodResolver(schema),
    defaultValues: wo
      ? {
          title: wo.title,
          assetId: wo.assetId ?? '',
          priority: wo.priority,
          status: wo.status,
          dueDate: wo.dueDate ? wo.dueDate.slice(0, 10) : '',
        }
      : {
          title: '',
          assetId: '',
          priority: 'medium',
          status: 'requested',
          dueDate: '',
        },
  });

  const onSubmit = async (values: WorkOrderForm) => {
    try {
      const payload: Record<string, unknown> = {
        title: values.title,
        priority: values.priority,
        status: values.status,
      };
      if (values.assetId) payload.assetId = values.assetId;
      if (values.dueDate) payload.dueDate = values.dueDate;

      if (wo) {
        await api.put(`/workorders/${wo.id}`, payload);
      } else {
        await api.post('/workorders', payload);
      }
      toast.success('Work order saved');
      onSaved();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save work order');
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{wo ? 'Edit Work Order' : 'Create Work Order'}</h2>
          <button
            type="button"
            className="rounded bg-slate-800 px-2 py-1 text-sm font-medium hover:bg-slate-700"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <input
            className="w-full rounded bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Title"
            {...register('title')}
          />
          <input
            className="w-full rounded bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Asset ID"
            {...register('assetId')}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <select
              className="w-full rounded bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              {...register('priority')}
            >
              {['low', 'medium', 'high', 'critical'].map((option) => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              {...register('status')}
            >
              {WORK_ORDER_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="w-full rounded bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              {...register('dueDate')}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded bg-slate-700 px-3 py-2 text-sm font-medium hover:bg-slate-600"
            onClick={() =>
              reset(
                wo
                  ? {
                      title: wo.title,
                      assetId: wo.assetId ?? '',
                      priority: wo.priority,
                      status: wo.status,
                      dueDate: wo.dueDate ? wo.dueDate.slice(0, 10) : '',
                    }
                  : {
                      title: '',
                      assetId: '',
                      priority: 'medium',
                      status: 'requested',
                      dueDate: '',
                    },
              )
            }
          >
            Reset
          </button>
            <button
              type="submit"
              className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
