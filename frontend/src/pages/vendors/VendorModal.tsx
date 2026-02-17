import {
  Modal,
  Button,
  TextInput,
  Group,
  Grid,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { createVendor, updateVendor } from "../../utils/api";
import type { Vendor } from "../../types";

interface Props {
  opened: boolean;
  vendor: Vendor | null;
  onClose: () => void;
  onSaved: () => void;
}

const VendorModal = ({ opened, vendor, onClose, onSaved }: Props) => {
  const [form, setForm] = useState({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    province: "",
    country: "",
  });

  useEffect(() => {
    if (vendor) {
      setForm({
        name: vendor.name,
        contactPerson: vendor.contactPerson || "",
        email: vendor.email || "",
        phone: vendor.phone || "",
        street: vendor.address?.street || "",
        city: vendor.address?.city || "",
        province: vendor.address?.province || "",
        country: vendor.address?.country || "",
      });
    } else {
      setForm({
        name: "",
        contactPerson: "",
        email: "",
        phone: "",
        street: "",
        city: "",
        province: "",
        country: "",
      });
    }
  }, [vendor]);

  const handleSave = async () => {
    const payload = {
      name: form.name,
      contactPerson: form.contactPerson,
      email: form.email,
      phone: form.phone,
      address: {
        street: form.street,
        city: form.city,
        province: form.province,
        country: form.country,
      },
    };

    if (vendor) await updateVendor(vendor._id ?? vendor.id, payload);
    else await createVendor(payload);

    onSaved();
  };

  return (
    <Modal opened={opened} onClose={onClose} title={vendor ? "Edit Vendor" : "Add Vendor"} size="lg">
      <Grid gutter="md">
        <Grid.Col span={12}>
          <TextInput
            label="Vendor Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Grid.Col>

        <Grid.Col span={12}>
          <TextInput
            label="Contact Person"
            value={form.contactPerson}
            onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
          />
        </Grid.Col>

        <Grid.Col span={6}>
          <TextInput
            label="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Grid.Col>

        <Grid.Col span={6}>
          <TextInput
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </Grid.Col>

        <Grid.Col span={6}>
          <TextInput
            label="Street"
            value={form.street}
            onChange={(e) => setForm({ ...form, street: e.target.value })}
          />
        </Grid.Col>

        <Grid.Col span={6}>
          <TextInput
            label="City"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </Grid.Col>

        <Grid.Col span={6}>
          <TextInput
            label="Province"
            value={form.province}
            onChange={(e) => setForm({ ...form, province: e.target.value })}
          />
        </Grid.Col>

        <Grid.Col span={6}>
          <TextInput
            label="Country"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
          />
        </Grid.Col>
      </Grid>

      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave}>Save</Button>
      </Group>
    </Modal>
  );
};

export default VendorModal;

