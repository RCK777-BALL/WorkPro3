/*
 * SPDX-License-Identifier: MIT
 */

export interface ConflictEntry {
  entityType: string;
  entityId: string;
  serverTimestamp: Date;
  clientVersion?: number;
  resolvedWith: 'server' | 'client';
}

class ConflictLog {
  private conflicts: ConflictEntry[] = [];

  add(entry: ConflictEntry): void {
    this.conflicts.push(entry);
  }

  all(): ConflictEntry[] {
    return this.conflicts;
  }
}

export default ConflictLog;
