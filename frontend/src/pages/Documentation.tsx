/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState } from 'react';
import { Search, Book, Video, FileText, MessageCircle, ChevronRight, Plus, Trash2, FolderPlus, Edit2 } from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import DocumentUploader from '@/components/documentation/DocumentUploader';

interface Category {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  articles: Array<{
    title: string;
    time: string;
  }>;
}

const Documentation: React.FC = () => {
  const [showUploader, setShowUploader] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categories, setCategories] = useState<Category[]>([
    {
      id: '1',
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
      id: '2',
      title: 'Asset Management',
      description: 'Track and maintain your equipment',
      icon: <FileText className="h-6 w-6 text-teal-600" />,
      articles: [
        { title: 'Adding New Assets', time: '7 min read' },
        { title: 'Asset Categories', time: '5 min read' },
        { title: 'Maintenance Schedules', time: '15 min read' },
        { title: 'Asset Reports', time: '10 min read' }
      ]
    },
    {
      id: '3',
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
      id: '4',
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

  const [newCategory, setNewCategory] = useState({
    title: '',
    description: '',
  });

  const handleDocumentUpload = (_files: File[]) => {
    setShowUploader(false);
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
                  onChange={(e) => setNewCategory({ ...newCategory, title: e.target.value })}
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
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
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
          </Card>
        )}

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
            <Card key={category.id} className="hover:border-primary-200 transition-colors duration-200">
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
                    <button className="flex items-center flex-1">
                      <span className="text-sm font-medium text-neutral-900">{article.title}</span>
                      <span className="ml-2 text-xs text-neutral-500">{article.time}</span>
                    </button>
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
        <Card className="bg-gradient-to-r from-primary-950 to-primary-900 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">Need Help?</h3>
              <p className="mt-1 text-primary-200">Our support team is here to assist you</p>
            </div>
            <button className="px-4 py-2 bg-white text-primary-950 rounded-lg hover:bg-primary-50 transition-colors duration-150">
              Contact Support
            </button>
          </div>
        </Card>
      </div>
  );
};

export default Documentation;
