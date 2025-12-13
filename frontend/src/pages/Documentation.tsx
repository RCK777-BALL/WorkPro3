/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Book,
  Video,
  FileText,
  MessageCircle,
  ChevronRight,
  Plus,
  Trash2,
  FolderPlus,
  Edit2,
  Download,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import DocumentUploader from '@/components/documentation/DocumentUploader';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useToast } from '@/context/ToastContext';
import http, { FALLBACK_TOKEN_KEY, SITE_KEY, TENANT_KEY, TOKEN_KEY } from '@/lib/http';
import {
  downloadDocument,
  getMimeTypeForType,
  inferDocumentTypeFromFilename,
  parseDocument,
  type DocumentMetadata,
} from '@/utils/documentation';
import { safeLocalStorage } from '@/utils/safeLocalStorage';

interface Category {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  articles: Array<{
    title: string;
    time: string;
    href?: string;
  }>;
}

interface ApiDocument {
  _id: string;
  name?: string;
  title?: string;
  url: string;
  metadata?: {
    size?: number;
    mimeType?: string;
    lastModified?: string;
    type?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface StoredDocument {
  id: string;
  url: string;
  metadata: DocumentMetadata;
}

const resolveApiOrigin = (): string => {
  const baseUrl = http.defaults.baseURL ?? '';
  if (!baseUrl) {
    return '';
  }
  return baseUrl.replace(/\/?api\/?$/, '');
};

const resolveAbsoluteUrl = (url: string): string => {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  const origin = resolveApiOrigin();
  const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
  const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
  return `${normalizedOrigin}${normalizedUrl}`;
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Unable to read file'));
        return;
      }
      const base64 = result.includes(',') ? result.split(',').pop() : result;
      if (!base64) {
        reject(new Error('Unable to encode file'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('File reading failed'));
    };
    reader.readAsDataURL(file);
  });

const isSupportedDocumentType = (
  value: string | undefined,
): value is DocumentMetadata['type'] =>
  value === 'pdf' || value === 'excel' || value === 'word';

const normaliseDocument = (doc: ApiDocument): StoredDocument => {
  const fallbackTitle = doc.name ?? doc.title ?? 'Untitled Document';

  let type: DocumentMetadata['type'];
  if (isSupportedDocumentType(doc.metadata?.type)) {
    type = doc.metadata.type;
  } else {
    try {
      type = inferDocumentTypeFromFilename(fallbackTitle);
    } catch {
      type = 'pdf';
    }
  }

  const mimeType = doc.metadata?.mimeType?.trim() || getMimeTypeForType(type);
  const lastModifiedSource = doc.metadata?.lastModified ?? doc.updatedAt ?? doc.createdAt;
  const lastModifiedCandidate = lastModifiedSource ? new Date(lastModifiedSource) : new Date();
  const lastModified = Number.isNaN(lastModifiedCandidate.getTime())
    ? new Date()
    : lastModifiedCandidate;
  const size = typeof doc.metadata?.size === 'number' ? doc.metadata.size : 0;

  return {
    id: doc._id,
    url: doc.url,
    metadata: {
      title: fallbackTitle,
      type,
      mimeType,
      size,
      lastModified,
    },
  };
};

const Documentation: React.FC = () => {
  const { addToast } = useToast();
  const [showUploader, setShowUploader] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categories, setCategories] = useState<Category[]>([
    {
      id: 'getting-started',
      title: 'Getting Started',
      description: 'Learn the basics and set up your environment',
      icon: <Book className="h-6 w-6 text-primary-600" />,
      articles: [
        { title: 'Quick Start Guide', time: '5 min read' },
        { title: 'Installation & Setup', time: '10 min read' },
        { title: 'Basic Configuration', time: '8 min read' },
        { title: 'User Management', time: '12 min read' }
      ]
    },
    {
      id: 'asset-management',
      title: 'Asset Management',
      description: 'Track and maintain your equipment',
      icon: <FileText className="h-6 w-6 text-teal-600" />,
      articles: [
        { title: 'Adding New Assets', time: '7 min read' },
        { title: 'Asset Categories', time: '5 min read' },
        { title: 'Maintenance Schedules', time: '15 min read' },
        { title: 'Asset Reports', time: '10 min read' },
        {
          title: 'Add Assets to Stations',
          time: 'Step-by-step',
          href: '/documentation/asset-management/assets/add-to-stations',
        },
        { title: 'Assets Setup Guide', time: 'Step-by-step', href: '/documentation/asset-management/assets' },
        { title: 'Asset Management Setup', time: 'Step-by-step', href: '/documentation/asset-management' }
      ]
    },
    {
      id: 'work-orders',
      title: 'Work Orders',
      description: 'Manage maintenance tasks efficiently',
      icon: <MessageCircle className="h-6 w-6 text-success-600" />,
      articles: [
        { title: 'Creating Work Orders', time: '8 min read' },
        { title: 'Assigning Tasks', time: '6 min read' },
        { title: 'Priority Levels', time: '4 min read' },
        { title: 'Work Order Tracking', time: '12 min read' }
      ]
    },
    {
      id: 'video-tutorials',
      title: 'Video Tutorials',
      description: 'Watch step-by-step guides',
      icon: <Video className="h-6 w-6 text-accent-600" />,
      articles: [
        { title: 'Dashboard Overview', time: '5 min video' },
        { title: 'Managing Assets', time: '8 min video' },
        { title: 'Work Order System', time: '10 min video' },
        { title: 'Reports & Analytics', time: '12 min video' }
      ]
    }
  ]);

  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [activeDownloadId, setActiveDownloadId] = useState<string | null>(null);
  const [activeDeleteId, setActiveDeleteId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({
    title: '',
    description: '',
  });

  useEffect(() => {
    let isMounted = true;

    const fetchDocuments = async () => {
      try {
        setIsLoadingDocuments(true);
        const response = await http.get<ApiDocument[]>('/documents');
        const items = Array.isArray(response.data) ? response.data : [];
        if (isMounted) {
          setDocuments(items.filter((item): item is ApiDocument => Boolean(item && item.url)).map(normaliseDocument));
        }
      } catch (error) {
        console.error('Error loading documents:', error);
        if (isMounted) {
          addToast('Failed to load documents', 'error');
        }
      } finally {
        if (isMounted) {
          setIsLoadingDocuments(false);
        }
      }
    };

    void fetchDocuments();

    return () => {
      isMounted = false;
    };
  }, [addToast]);

  const handleDocumentUpload = async (files: File[]) => {
    if (!files.length) {
      setShowUploader(false);
      return;
    }

    setIsUploading(true);
    try {
      const uploads = await Promise.all(
        files.map(async (file) => {
          const [parsed, base64] = await Promise.all([parseDocument(file), fileToBase64(file)]);
          const lastModified =
            parsed.metadata.lastModified instanceof Date
              ? parsed.metadata.lastModified
              : new Date(parsed.metadata.lastModified);
          const response = await http.post<ApiDocument>('/documents', {
            base64,
            name: file.name,
            metadata: {
              size: parsed.metadata.size,
              mimeType: parsed.metadata.mimeType,
              lastModified: lastModified.toISOString(),
              type: parsed.metadata.type,
            },
          });
          const saved = response.data;
          return normaliseDocument(saved);
        }),
      );

      setDocuments((prev) => [...uploads, ...prev]);
      addToast('Document uploaded', 'success');
      setShowUploader(false);
    } catch (error) {
      console.error('Error uploading documents:', error);
      addToast('Failed to upload document', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadDocument = async (doc: StoredDocument) => {
    try {
      setActiveDownloadId(doc.id);
      const token =
        safeLocalStorage.getItem(TOKEN_KEY) ?? safeLocalStorage.getItem(FALLBACK_TOKEN_KEY);
      const tenantId = safeLocalStorage.getItem(TENANT_KEY);
      const siteId = safeLocalStorage.getItem(SITE_KEY);
      const resolvedUrl = resolveAbsoluteUrl(doc.url);
      const response = await fetch(resolvedUrl, {
        credentials: 'include',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
          ...(siteId ? { 'x-site-id': siteId } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download document: ${response.status}`);
      }

      const blob = await response.blob();
      downloadDocument(blob, doc.metadata.title, doc.metadata.mimeType);
    } catch (error) {
      console.error('Error downloading document:', error);
      addToast('Failed to download document', 'error');
    } finally {
      setActiveDownloadId(null);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      setActiveDeleteId(docId);
      await http.delete(`/documents/${docId}`);
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
      addToast('Document deleted', 'success');
    } catch (error) {
      console.error('Error deleting document:', error);
      addToast('Failed to delete document', 'error');
    } finally {
      setActiveDeleteId(null);
    }
  };

  const handleDeleteArticle = (categoryIndex: number, articleIndex: number) => {
    const updatedCategories = [...categories];
    updatedCategories[categoryIndex].articles.splice(articleIndex, 1);
    setCategories(updatedCategories);
  };

  const handleAddCategory = () => {
    if (newCategory.title && newCategory.description) {
      const category: Category = {
        id: Date.now().toString(),
        title: newCategory.title,
        description: newCategory.description,
        icon: <FileText className="h-6 w-6 text-primary-600" />,
        articles: []
      };
      setCategories([...categories, category]);
      setNewCategory({ title: '', description: '' });
      setShowCategoryModal(false);
    }
  };

  const handleDeleteCategory = (categoryId: string) => {
    setCategories(categories.filter(category => category.id !== categoryId));
  };

  return (
          <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-neutral-900">Documentation</h2>
            <p className="text-neutral-500">Browse guides, tutorials, and reference materials</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:space-x-3">
            <Button
              variant="outline"
              icon={<FolderPlus size={16} />}
              onClick={() => setShowCategoryModal(true)}
            >
              New Category
            </Button>
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => setShowUploader(true)}
            >
              Add Document
            </Button>
          </div>
        </div>

        {showCategoryModal && (
          <Card>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Create New Category</h3>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Category Title
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                  value={newCategory.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCategory({ ...newCategory, title: e.target.value })}
                  placeholder="Enter category title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Description
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                  value={newCategory.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewCategory({ ...newCategory, description: e.target.value })}
                  placeholder="Enter category description"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCategoryModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleAddCategory}
                >
                  Create Category
                </Button>
              </div>
            </div>
          </Card>
        )}

        {showUploader && (
          <Card>
            <DocumentUploader onUpload={handleDocumentUpload} />
            {isUploading && (
              <div className="mt-3 text-sm text-neutral-500">Uploading documents…</div>
            )}
          </Card>
        )}

        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">Uploaded Documents</h3>
              <span className="text-sm text-neutral-500">
                {documents.length} document{documents.length === 1 ? '' : 's'}
              </span>
            </div>

            {isLoadingDocuments ? (
              <div className="flex items-center gap-3 text-sm text-neutral-500">
                <LoadingSpinner fullscreen={false} size="sm" />
                <span>Loading documents…</span>
              </div>
            ) : documents.length === 0 ? (
              <p className="text-sm text-neutral-500">No documents uploaded yet.</p>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-neutral-900">{doc.metadata.title}</p>
                      <p className="text-sm text-neutral-500">
                        {doc.metadata.type.toUpperCase()} · {(doc.metadata.size / 1024).toFixed(1)} KB ·{' '}
                        {(
                          doc.metadata.lastModified instanceof Date
                            ? doc.metadata.lastModified
                            : new Date(doc.metadata.lastModified)
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Download size={16} />}
                        onClick={() => handleDownloadDocument(doc)}
                        loading={activeDownloadId === doc.id}
                      >
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Trash2 size={16} />}
                        onClick={() => handleDeleteDocument(doc.id)}
                        loading={activeDeleteId === doc.id}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 bg-white p-4 rounded-lg shadow-sm border border-neutral-200">
          <Search className="text-neutral-500" size={20} />
          <input
            type="text"
            placeholder="Search documentation..."
            className="flex-1 bg-transparent border-none outline-none text-neutral-900 placeholder-neutral-400"
          />
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((category, index) => (
            <Card
              key={category.id}
              id={category.id}
              className="hover:border-primary-200 transition-colors duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <div className="p-3 rounded-lg bg-neutral-50">{category.icon}</div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-neutral-900">{category.title}</h3>
                    <p className="text-neutral-500 mt-1">{category.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Edit2 size={16} />}
                    onClick={() => {
                      setNewCategory({
                        title: category.title,
                        description: category.description,
                      });
                      setShowCategoryModal(true);
                    } } children={undefined}                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 size={16} />}
                    onClick={() => handleDeleteCategory(category.id)} children={undefined}                  />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {category.articles.map((article, articleIndex) => (
                  <div
                    key={articleIndex}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 transition-colors duration-150 group"
                  >
                    {article.href ? (
                      <Link to={article.href} className="flex items-center flex-1">
                        <span className="text-sm font-medium text-neutral-900">{article.title}</span>
                        <span className="ml-2 text-xs text-neutral-500">{article.time}</span>
                      </Link>
                    ) : (
                      <button className="flex items-center flex-1">
                        <span className="text-sm font-medium text-neutral-900">{article.title}</span>
                        <span className="ml-2 text-xs text-neutral-500">{article.time}</span>
                      </button>
                    )}
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 size={16} />}
                        onClick={() => handleDeleteArticle(index, articleIndex)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-150" children={undefined}                      />
                      <ChevronRight size={16} className="text-neutral-400 group-hover:text-primary-600 transition-colors duration-150" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Help Section */}
        <Card className="bg-gradient-to-r from-primary-dark to-primary text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">Need Help?</h3>
              <p className="mt-1 text-primary-200">Our support team is here to assist you</p>
            </div>
            <button className="px-4 py-2 bg-white text-primary-dark rounded-lg hover:bg-primary-light transition-colors duration-150">
              Contact Support
            </button>
          </div>
        </Card>
      </div>
  );
};

export default Documentation;
