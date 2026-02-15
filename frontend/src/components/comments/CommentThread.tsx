/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownRight, Loader, MessageCircle, Send } from 'lucide-react';
import clsx from 'clsx';
import type { Comment, User } from '@/types';
import { createComment, fetchComments } from '@/api/comments';
import http from '@/lib/http';

type ThreadNode = Comment & { replies: Comment[] };

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

const formatCommentBody = (content: string) => {
  const mentionPattern = /@\{([^|}]+)\|([a-fA-F0-9]{24})\}/g;
  const parts: Array<string | { label: string; id: string }> = [];
  let lastIndex = 0;

  for (const match of content.matchAll(mentionPattern)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      parts.push(content.slice(lastIndex, start));
    }
    parts.push({ label: match[1], id: match[2] });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
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
  const [content, setContent] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const hasMore = comments.length < total;

  const sortByCreatedAt = (items: Comment[]) =>
    [...items].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  const ensureThreadNode = (comment: Comment | ThreadNode): ThreadNode => {
    if ('replies' in comment && Array.isArray(comment.replies)) {
      return comment;
    }

    return { ...comment, replies: [] };
  };

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
      setComments((prev) => {
        const merged = append ? [...prev, ...result.items] : result.items;
        const unique = new Map<string, Comment>();
        merged.forEach((item) => {
          unique.set(item.id, item);
        });
        return sortByCreatedAt(Array.from(unique.values()));
      });
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

  const threadedComments = useMemo<ThreadNode[]>(() => {
    const nodes = new Map<string, ThreadNode>();
    sortByCreatedAt(comments).forEach((comment) => {
      nodes.set(comment.id, ensureThreadNode(comment));
    });

    const roots: ThreadNode[] = [];
    nodes.forEach((node) => {
      if (node.parentId && nodes.has(node.parentId)) {
        nodes.get(node.parentId)?.replies.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [comments]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);

    const cursor = e.target.selectionStart ?? value.length;
    const uptoCursor = value.slice(0, cursor);
    const match = uptoCursor.match(/@([A-Za-z\s]*)$/);
    setMentionQuery(match ? match[1] : '');
  };

  const handleSelectMention = (selected: User) => {
    if (!inputRef.current) return;
    const cursor = inputRef.current.selectionStart ?? content.length;
    const uptoCursor = content.slice(0, cursor);
    const afterCursor = content.slice(cursor);
    const replaced = uptoCursor.replace(/@([A-Za-z\s]*)$/, `@{${selected.name}|${selected.id}} `);
    const nextBody = `${replaced}${afterCursor}`;
    setContent(nextBody);
    setMentionQuery('');
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleReply = (comment: Comment) => {
    setReplyTo(comment);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const created = await createComment(entityType, entityId, content.trim(), replyTo?.id);
      setComments((prev) => {
        const merged = [...prev.filter((c) => c.id !== created.id), created];
        return sortByCreatedAt(merged);
      });
      setTotal((prev) => prev + 1);
      setContent('');
      setMentionQuery('');
      setReplyTo(null);
    } catch (err) {
      console.error(err);
      setError('Unable to post your comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderTimestamp = (value: Comment['createdAt']) => {
    const date = typeof value === 'string' ? new Date(value) : value;
    return date.toLocaleString();
  };

  const renderCommentNode = (comment: Comment | ThreadNode, depth = 0): JSX.Element => {
    const node = ensureThreadNode(comment);
    const initials = (node.user?.name ?? node.user?.email ?? 'U').slice(0, 1).toUpperCase();

    return (
      <article key={node.id} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
        <header className="mb-2 flex items-center justify-between gap-2 text-sm text-neutral-600">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
              {initials}
            </span>
            <div className="leading-tight">
              <p className="font-semibold text-neutral-900">{node.user?.name ?? 'Unknown user'}</p>
              <p className="text-xs text-neutral-500">{node.user?.email}</p>
              {depth > 0 && (
                <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-neutral-500">
                  <CornerDownRight className="h-3 w-3" /> Reply
                </span>
              )}
            </div>
          </div>
          <time className="text-xs text-neutral-500" dateTime={renderTimestamp(node.createdAt)}>
            {renderTimestamp(node.createdAt)}
          </time>
        </header>
        <p className="text-sm text-neutral-800">{formatCommentBody(node.content)}</p>
        <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500">
          <button
            type="button"
            className="font-semibold text-indigo-600 hover:text-indigo-700"
            onClick={() => handleReply(node)}
          >
            Reply
          </button>
        </div>
        {node.replies.length > 0 && (
          <div className="mt-3 space-y-3 border-l border-neutral-200 pl-4">
            {node.replies.map((child) => (
              <div key={child.id} className="pt-2">
                {renderCommentNode(child, depth + 1)}
              </div>
            ))}
          </div>
        )}
      </article>
    );
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
        <div className="flex items-center justify-between gap-2 text-sm text-neutral-700">
          <label className="font-medium">Add a comment</label>
          {replyTo && (
            <div className="flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700">
              <CornerDownRight className="h-3 w-3" />
              <span>Replying to {replyTo.user?.name ?? 'comment'}</span>
              <button
                type="button"
                className="text-indigo-600 underline-offset-2 hover:underline"
                onClick={() => setReplyTo(null)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        <div className="relative">
          <textarea
            ref={inputRef}
            value={content}
            onChange={handleContentChange}
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
        {threadedComments.map((comment) => renderCommentNode(comment))}
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
