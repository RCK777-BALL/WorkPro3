import { Table, ActionIcon, Group, Text } from "@mantine/core";
import { IconEdit } from "@tabler/icons-react";
import type { Vendor } from "../../types";

interface Props {
  vendors: Vendor[];
  onEdit: (vendor: Vendor) => void;
}

const VendorList = ({ vendors, onEdit }: Props) => {
  return (
    <Table striped highlightOnHover withColumnBorders>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Name</Table.Th>
          <Table.Th>Contact</Table.Th>
          <Table.Th>Email</Table.Th>
          <Table.Th>Phone</Table.Th>
          <Table.Th>Address</Table.Th>
          <Table.Th></Table.Th>
        </Table.Tr>
      </Table.Thead>

      <Table.Tbody>
        {vendors.map((vendor) => (
          <Table.Tr key={vendor._id}>
            <Table.Td>{vendor.name}</Table.Td>
            <Table.Td>{vendor.contactPerson || "—"}</Table.Td>
            <Table.Td>{vendor.email || "—"}</Table.Td>
            <Table.Td>{vendor.phone || "—"}</Table.Td>
            <Table.Td>
              <Text size="sm">
                {vendor.address?.street}, {vendor.address?.city}
              </Text>
            </Table.Td>

            <Table.Td>
              <Group justify="flex-end">
                <ActionIcon
                  variant="light"
                  color="blue"
                  onClick={() => onEdit(vendor)}
                >
                  <IconEdit size={18} />
                </ActionIcon>
              </Group>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
};

export default VendorList;

