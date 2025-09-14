import { Types } from 'mongoose';

export type RawPart = {
  partId: string;
  quantity: number;
  cost?: number;
};

export function mapPartsUsed(parts: RawPart[]) {
  return parts.map((p) => ({
    partId: new Types.ObjectId(p.partId),
    qty: p.quantity,
    cost: p.cost ?? 0,
  }));
}

export function mapAssignees(ids: string[]) {
  return ids.map((id) => new Types.ObjectId(id));
}

export type RawChecklist = {
  description: string;
  completed?: boolean;
};

export function mapChecklists(items: RawChecklist[]) {
  return items.map((c) => ({
    text: c.description,
    description: c.description,
    done: Boolean(c.completed),
    completed: Boolean(c.completed),
  }));
}

export type RawSignature = {
  userId: string;
  signedAt?: Date;
};

export function mapSignatures(items: RawSignature[]) {
  return items.map((s) => {
    const signed = s.signedAt ? new Date(s.signedAt) : new Date();
    return {
      by: new Types.ObjectId(s.userId),
      userId: s.userId,
      ts: signed,
      signedAt: signed,
    };
  });
}
