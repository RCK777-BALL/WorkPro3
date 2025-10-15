import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const schema = z.object({
  title: z.string().min(3, 'Title is required'),
  assetId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  dueDate: z.string().optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function WorkOrderForm() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium' },
  });

  const onSubmit = async (values: FormData) => {
    try {
      const payload = {
        ...values,
        dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : undefined,
      };
      await api.post('/workorders', payload);
      toast.success('Work order created successfully!');
      navigate('/dashboard/work-orders');
    } catch (err) {
      console.error(err);
      toast.error('Failed to create work order.');
    }
  };

  return (
    <div className="p-8 text-white max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">New Work Order</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-slate-900/60 p-6 rounded-xl border border-slate-800">
        <div>
          <label className="block text-sm mb-1">Title</label>
          <input
            {...register('title')}
            className="w-full bg-slate-800 px-3 py-2 rounded"
            placeholder="Enter work order title"
          />
          {errors.title && <p className="text-red-400 text-sm">{errors.title.message}</p>}
        </div>

        <div>
          <label className="block text-sm mb-1">Asset ID</label>
          <input
            {...register('assetId')}
            className="w-full bg-slate-800 px-3 py-2 rounded"
            placeholder="Machine ID"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm mb-1">Priority</label>
            <select {...register('priority')} className="w-full bg-slate-800 px-3 py-2 rounded">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Due Date</label>
            <input type="date" {...register('dueDate')} className="w-full bg-slate-800 px-3 py-2 rounded" />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Description</label>
          <textarea {...register('description')} className="w-full bg-slate-800 px-3 py-2 rounded" rows={4} />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600"
            onClick={() => navigate('/dashboard/work-orders')}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Create Work Order'}
          </button>
        </div>
      </form>
    </div>
  );
}
