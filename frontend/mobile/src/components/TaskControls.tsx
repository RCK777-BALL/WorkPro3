/*
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo, useState } from 'react';
import { useMobileSync, type OfflineAction } from '../useMobileSync';

type ChecklistItem = { id: string; label: string; done?: boolean };

export const ChecklistWidget: React.FC<{ items: ChecklistItem[]; entityId: string; entityType: string }> = ({
  items,
  entityId,
  entityType,
}) => {
  const [localItems, setLocalItems] = useState(items);
  const { enqueue } = useMobileSync();

  const toggleItem = (item: ChecklistItem) => {
    setLocalItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, done: !entry.done } : entry)));
    const action: OfflineAction = {
      id: `${entityId}-${item.id}-${Date.now()}`,
      entityType,
      entityId,
      operation: 'update-checklist',
      payload: { itemId: item.id, done: !item.done },
      version: Date.now(),
    };
    enqueue(action);
  };

  return (
    <div className="space-y-2 rounded-lg border border-neutral-200 p-3">
      <header className="flex items-center justify-between">
        <p className="text-sm font-semibold text-neutral-900">Checklist</p>
        <span className="text-xs text-neutral-600">Optimistic updates enabled</span>
      </header>
      <ul className="space-y-2 text-sm text-neutral-800">
        {localItems.map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded border border-neutral-100 px-3 py-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={Boolean(item.done)}
                onChange={() => toggleItem(item)}
              />
              <span className={item.done ? 'line-through text-neutral-500' : ''}>{item.label}</span>
            </label>
            {item.done && <span className="text-xs text-green-600">Queued</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export const NotesWidget: React.FC<{ entityId: string; entityType: string }> = ({ entityId, entityType }) => {
  const [notes, setNotes] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const { enqueue } = useMobileSync();

  const saveNote = () => {
    if (!notes.trim()) return;
    const note = notes.trim();
    setHistory((prev) => [note, ...prev]);
    setNotes('');

    const action: OfflineAction = {
      id: `${entityId}-note-${Date.now()}`,
      entityType,
      entityId,
      operation: 'add-note',
      payload: { body: note },
      version: Date.now(),
    };
    enqueue(action);
  };

  return (
    <div className="space-y-2 rounded-lg border border-neutral-200 p-3">
      <header className="flex items-center justify-between">
        <p className="text-sm font-semibold text-neutral-900">Notes</p>
        <span className="text-xs text-neutral-600">Offline friendly</span>
      </header>
      <textarea
        className="w-full rounded border border-neutral-200 p-2 text-sm"
        rows={3}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Add technician notes"
      />
      <div className="flex justify-end">
        <button className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white" onClick={saveNote}>
          Save note
        </button>
      </div>
      <ul className="space-y-1 text-xs text-neutral-700" aria-label="Notes history">
        {history.length === 0 && <li className="text-neutral-500">No notes captured yet.</li>}
        {history.map((note, index) => (
          <li key={`${note}-${index}`} className="rounded bg-neutral-50 px-2 py-1">
            {note}
          </li>
        ))}
      </ul>
    </div>
  );
};

type MediaItem = { id: string; name: string; status: 'queued' | 'synced' };

export const MediaUploadWidget: React.FC<{ entityId: string; entityType: string }> = ({ entityId, entityType }) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const { enqueue, markSynced } = useMobileSync();

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const nextMedia: MediaItem[] = [];
    Array.from(files).forEach((file) => {
      const id = `${entityId}-media-${Date.now()}-${file.name}`;
      nextMedia.push({ id, name: file.name, status: 'queued' });
      const action: OfflineAction = {
        id,
        entityType,
        entityId,
        operation: 'upload-media',
        payload: { filename: file.name, size: file.size },
        version: Date.now(),
      };
      enqueue(action);
    });
    setMedia((prev) => [...nextMedia, ...prev]);
  };

  const syncMedia = () => {
    setMedia((prev) => prev.map((item) => ({ ...item, status: 'synced' })));
    markSynced(media.map((item) => item.id));
  };

  const optimisticCaption = useMemo(
    () =>
      media.length > 0
        ? `${media.filter((item) => item.status === 'queued').length} item(s) queued`
        : 'No uploads queued',
    [media],
  );

  return (
    <div className="space-y-2 rounded-lg border border-neutral-200 p-3">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-neutral-900">Media uploads</p>
          <p className="text-xs text-neutral-600">{optimisticCaption}</p>
        </div>
        <button
          className="rounded bg-green-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
          disabled={media.length === 0}
          onClick={syncMedia}
        >
          Mark synced
        </button>
      </header>
      <input type="file" multiple className="text-sm" onChange={(event) => handleFiles(event.target.files)} />
      <ul className="space-y-1 text-xs text-neutral-700" aria-label="Media queue">
        {media.length === 0 && <li className="text-neutral-500">No media selected.</li>}
        {media.map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded bg-neutral-50 px-2 py-1">
            <span>{item.name}</span>
            <span className={item.status === 'queued' ? 'text-amber-700' : 'text-green-700'}>{item.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default { ChecklistWidget, NotesWidget, MediaUploadWidget };
