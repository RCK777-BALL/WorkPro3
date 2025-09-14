/*
 * SPDX-License-Identifier: MIT
 */

import { parse } from 'csv-parse/sync';
import Asset from '../models/Asset';
import InventoryItem from '../models/InventoryItem';
import type { AuthedRequestHandler } from '../types/http';

export const importAssets: AuthedRequestHandler = async (req: { tenantId: any; siteId: any; }, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { message: string; }): void; new(): any; }; }; json: (arg0: { imported: number; }) => void; }, next: (arg0: unknown) => void) => {
  try {
    const file = (req as any).file;
    if (!file) {
      res.status(400).json({ message: 'CSV file required' });
      return;
    }
    const records = parse(file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const tenantId = req.tenantId!;
    const siteId = req.siteId;

    const docs = records.map((r: any) => ({
      name: r.name,
      type: r.type,
      location: r.location,
      description: r.description,
      tenantId,
      ...(siteId ? { siteId } : {}),
    }));

    const created = await Asset.insertMany(docs, { ordered: false });
    res.json({ imported: created.length });
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const importParts: AuthedRequestHandler = async (req: { tenantId: any; siteId: any; }, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { message: string; }): void; new(): any; }; }; json: (arg0: { imported: number; }) => void; }, next: (arg0: unknown) => void) => {
  try {
    const file = (req as any).file;
    if (!file) {
      res.status(400).json({ message: 'CSV file required' });
      return;
    }

    const records = parse(file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const tenantId = req.tenantId!;
    const siteId = req.siteId;

    const docs = records.map((r: any) => ({
      tenantId,
      ...(siteId ? { siteId } : {}),
      name: r.name,
      sku: r.sku,
      description: r.description,
      quantity: r.quantity ? Number(r.quantity) : 0,
      unitCost: r.unitCost ? Number(r.unitCost) : undefined,
      location: r.location,
    }));

    const created = await InventoryItem.insertMany(docs, { ordered: false });
    res.json({ imported: created.length });
    return;
  } catch (err) {
    next(err);
    return;
  }
};

