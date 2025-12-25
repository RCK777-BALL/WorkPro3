/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from "react";
import { Button, Card, Group, Loader, Text, Title } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import VendorList from "./vendors/VendorList";
import VendorModal from "./vendors/VendorModal";
import { fetchVendors } from "../utils/api";
import type { Vendor } from "../types";

const VendorsPage = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const data = await fetchVendors();
      setVendors(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const handleAdd = () => {
    setEditingVendor(null);
    setOpened(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setOpened(true);
  };

  const handleSaved = async () => {
    setOpened(false);
    await loadVendors();
  };

  return (
    <div className="p-6 space-y-6">
      <Group justify="space-between">
        <Title order={2}>Vendors</Title>
        <Button leftSection={<IconPlus size={18} />} onClick={handleAdd}>
          Add Vendor
        </Button>
      </Group>

      <Card shadow="sm" p="lg" radius="md" className="bg-white dark:bg-zinc-900">
        {loading ? (
          <Group justify="center" className="py-10">
            <Loader size="lg" />
          </Group>
        ) : vendors.length === 0 ? (
          <Text ta="center" c="dimmed">
            No vendors added yet.
          </Text>
        ) : (
          <VendorList vendors={vendors} onEdit={handleEdit} />
        )}
      </Card>

      <VendorModal
        opened={opened}
        onClose={() => setOpened(false)}
        vendor={editingVendor}
        onSaved={handleSaved}
      />
    </div>
  );
};

export default VendorsPage;
