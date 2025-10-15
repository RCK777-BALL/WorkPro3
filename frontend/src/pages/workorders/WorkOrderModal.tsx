import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import type { WorkOrder } from "@/types/cmms";

const schema = z.object({
  title: z.string().min(2, 'Title is required'),
  asset: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  status: z.enum(['Open', 'In Progress', 'On Hold', 'Completed', 'Cancelled']),
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
    defaultValues: wo ?? {
      title: '',
      asset: '',
      priority: 'Medium',
      status: 'Open',
      dueDate: '',
    },
  });

  const onSubmit = async (values: WorkOrderForm) => {
    try {
      if (wo) {
        await api.put(`/workorders/${wo.id}`, values);
      } else {
        await api.post('/workorders', values);
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
            placeholder="Asset"
            {...register('asset')}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <select
              className="w-full rounded bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              {...register('priority')}
            >
              {['Low', 'Medium', 'High', 'Critical'].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              {...register('status')}
            >
              {['Open', 'In Progress', 'On Hold', 'Completed', 'Cancelled'].map((option) => (
                <option key={option} value={option}>
                  {option}
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
                  wo ?? {
                    title: '',
                    asset: '',
                    priority: 'Medium',
                    status: 'Open',
                    dueDate: '',
                  }
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
