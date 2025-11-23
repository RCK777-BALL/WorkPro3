/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader, MessageCircle, Send } from 'lucide-react';
import clsx from 'clsx';
import type { Comment, User } from '@/types';
import { createComment, fetchComments } from '@/api/comments';
import http from '@/lib/http';

interface CommentThreadProps {
  entityType: 'WO' | 'Asset';
  entityId: string;
}

interface MentionSuggestionProps {
  users: User[];
  query: string;
  onSelect: (user: User) => void;
}

const MentionSuggestions = ({ users, query, onSelect }: MentionSuggestionProps) => {
  if (!query) return null;
  const lowerQuery = query.toLowerCase();
  const filtered = users.filter((user) =>
    user.name.toLowerCase().includes(lowerQuery) || user.email.toLowerCase().includes(lowerQuery),
  );

  if (!filtered.length) return null;

  return (
    <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-neutral-300 bg-white shadow">
      {filtered.slice(0, 6).map((user) => (
        <button
          key={user.id}
          type="button"
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-100"
          onClick={() => onSelect(user)}
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <p className="font-medium text-neutral-900">{user.name}</p>
            <p className="text-xs text-neutral-500">{user.email}</p>
          </div>
        </button>
      ))}
    </div>
  );
};

const formatCommentBody = (body: string) => {
  const mentionPattern = /@\{([^|}]+)\|([a-fA-F0-9]{24})\}/g;
  const parts: Array<string | { label: string; id: string }> = [];
  let lastIndex = 0;

  for (const match of body.matchAll(mentionPattern)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      parts.push(body.slice(lastIndex, start));
    }
    parts.push({ label: match[1], id: match[2] });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < body.length) {
    parts.push(body.slice(lastIndex));
  }

  return parts.map((part, idx) =>
    typeof part === 'string' ? (
      <span key={`text-${idx}`}>{part}</span>
    ) : (
      <span key={`mention-${part.id}-${idx}`} className="font-semibold text-indigo-600">
        @{part.label}
      </span>
    ),
  );
};

const CommentThread = ({ entityId, entityType }: CommentThreadProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const hasMore = comments.length < total;

  const loadUsers = async () => {
    try {
      const res = await http.get('/users');
      const mapped = (res.data as any[]).map((u) => ({
        id: u._id ?? u.id ?? '',
        name: u.name ?? 'Unnamed',
        email: u.email ?? '',
        role: u.role ?? 'viewer',
        department: u.department ?? '',
        avatar: u.avatar,
      }));
      setUsers(mapped);
    } catch (err) {
      console.error('Failed to load users for mentions', err);
    }
  };

  const loadComments = async (nextPage = 1, append = false) => {
    setLoading(true);
    try {
      const result = await fetchComments(entityType, entityId, nextPage, 10);
      setComments((prev) => (append ? [...prev, ...result.items] : result.items));
      setTotal(result.total);
      setPage(result.page);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Unable to load comments right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  useEffect(() => {
    void loadComments(1, false);
  }, [entityId, entityType]);

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setBody(value);

    const cursor = e.target.selectionStart ?? value.length;
    const uptoCursor = value.slice(0, cursor);
    const match = uptoCursor.match(/@([A-Za-z\s]*)$/);
    setMentionQuery(match ? match[1] : '');
  };

  const handleSelectMention = (selected: User) => {
    if (!inputRef.current) return;
    const cursor = inputRef.current.selectionStart ?? body.length;
    const uptoCursor = body.slice(0, cursor);
    const afterCursor = body.slice(cursor);
    const replaced = uptoCursor.replace(/@([A-Za-z\s]*)$/, `@{${selected.name}|${selected.id}} `);
    const nextBody = `${replaced}${afterCursor}`;
    setBody(nextBody);
    setMentionQuery('');
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const created = await createComment(entityType, entityId, body.trim());
      setComments((prev) => [created, ...prev]);
      setTotal((prev) => prev + 1);
      setBody('');
      setMentionQuery('');
    } catch (err) {
      console.error(err);
      setError('Unable to post your comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderTimestamp = (value: Comment['createdAt']) => {
    const date = typeof value === 'string' ? new Date(value) : value;
    return date.toISOString();
  };

  const emptyState = useMemo(
    () => (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-sm text-neutral-500">
        <MessageCircle className="h-6 w-6 text-neutral-400" />
        <p>No comments yet. Start the conversation!</p>
      </div>
    ),
    [],
  );

  return (
    <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-neutral-900">Comments</h3>
        {loading && <Loader className="h-4 w-4 animate-spin text-neutral-500" />}
      </div>
      <form onSubmit={handleSubmit} className="relative space-y-2">
        <label className="text-sm font-medium text-neutral-700">Add a comment</label>
        <div className="relative">
          <textarea
            ref={inputRef}
            value={body}
            onChange={handleBodyChange}
            rows={3}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-inner focus:border-indigo-500 focus:outline-none"
            placeholder="Share an update. Use @ to mention a teammate"
          />
          <MentionSuggestions users={users} query={mentionQuery} onSelect={handleSelectMention} />
        </div>
        <div className="flex items-center justify-end gap-2">
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <button
            type="submit"
            className={clsx(
              'inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1',
              submitting && 'opacity-70',
            )}
            disabled={submitting}
          >
            <Send className="h-4 w-4" />
            Post
          </button>
        </div>
      </form>
      <div className="space-y-3">
        {comments.map((comment) => (
          <article key={comment.id} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <header className="mb-2 flex items-center justify-between gap-2 text-sm text-neutral-600">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                  {(comment.author?.name ?? comment.author?.email ?? 'U').slice(0, 1).toUpperCase()}
                </span>
                <div className="leading-tight">
                  <p className="font-semibold text-neutral-900">{comment.author?.name ?? 'Unknown user'}</p>
                  <p className="text-xs text-neutral-500">{comment.author?.email}</p>
                </div>
              </div>
              <time className="text-xs text-neutral-500" dateTime={renderTimestamp(comment.createdAt)}>
                {renderTimestamp(comment.createdAt)}
              </time>
            </header>
            <p className="text-sm text-neutral-800">{formatCommentBody(comment.body)}</p>
          </article>
        ))}
        {!comments.length && !loading && emptyState}
        {hasMore && (
          <div className="flex justify-center">
            <button
              type="button"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              onClick={() => void loadComments(page + 1, true)}
            >
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentThread;
