import { api } from "@/lib/api";

// Vendors
export const fetchVendors = async () => {
  const res = await api.get("/vendors");
  return res.data;
};

export const createVendor = async (data: any) => {
  const res = await api.post("/vendors", data);
  return res.data;
};

export const updateVendor = async (id: string, data: any) => {
  const res = await api.put(`/vendors/${id}`, data);
  return res.data;
};
