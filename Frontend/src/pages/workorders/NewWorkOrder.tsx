import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

const schema = z.object({
  title: z.string().min(3, "Title is required"),
  assetId: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  dueDate: z.string().optional(),
  description: z.string().optional(),
});

type FormType = z.infer<typeof schema>;

export default function NewWorkOrder() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormType>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormType) => {
    try {
      await api.post("/workorders", data);
      toast.success("Work order created");
      reset();
    } catch (e: unknown) {
      const error = e as { response?: { data?: { message?: string } } };
      toast.error(error?.response?.data?.message ?? "Failed to create work order");
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 text-xl font-semibold text-zinc-100">New Work Order</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-300">Title</label>
          <input
            {...register("title")}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-100"
          />
          {errors.title ? (
            <p className="mt-1 text-sm text-red-400">{errors.title.message}</p>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-sm text-zinc-300">Asset ID</label>
            <input
              {...register("assetId")}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-100"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-300">Priority</label>
            <select
              {...register("priority")}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-100"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-zinc-300">Due Date</label>
          <input
            type="date"
            {...register("dueDate")}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-100"
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-300">Description</label>
          <textarea
            rows={4}
            {...register("description")}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-100"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {isSubmitting ? "Saving…" : "Create Work Order"}
        </button>
      </form>
    </div>
  );
}
