'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Bookmark, Tag } from '@/lib/types';
import { BookmarkList } from '@/components/BookmarkList';
import { BookmarkForm } from '@/components/BookmarkForm';
import { TagFilter } from '@/components/TagFilter';
import { SearchBar } from '@/components/SearchBar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function HomePage() {
  // State
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | undefined>(undefined);
  const [deletingBookmark, setDeletingBookmark] = useState<Bookmark | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch bookmarks
  const fetchBookmarks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedTag) params.set('tag', selectedTag);

      const res = await fetch(`/api/bookmarks?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch bookmarks');

      const data = await res.json();
      setBookmarks(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookmarks');
    }
  }, [searchQuery, selectedTag]);

  // Fetch tags
  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch('/api/tags');
      if (!res.ok) throw new Error('Failed to fetch tags');

      const data = await res.json();
      setTags(data.data || []);
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchBookmarks(), fetchTags()]);
      setLoading(false);
    };
    loadData();
  }, [fetchBookmarks, fetchTags]);

  // Reload when filters change
  useEffect(() => {
    if (!loading) {
      fetchBookmarks();
    }
  }, [searchQuery, selectedTag, fetchBookmarks, loading]);

  // Handlers
  const handleAddBookmark = () => {
    setEditingBookmark(undefined);
    setShowForm(true);
  };

  const handleEditBookmark = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark);
    setShowForm(true);
  };

  const handleFormSubmit = () => {
    setShowForm(false);
    setEditingBookmark(undefined);
    fetchBookmarks();
    fetchTags();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingBookmark(undefined);
  };

  const handleDeleteClick = (bookmark: Bookmark) => {
    setDeletingBookmark(bookmark);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingBookmark) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/bookmarks/${deletingBookmark.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete bookmark');

      setDeletingBookmark(null);
      fetchBookmarks();
      fetchTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bookmark');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingBookmark(null);
  };

  const handleTagClick = (tag: string) => {
    setSelectedTag(tag);
  };

  const hasFilters = searchQuery !== '' || selectedTag !== null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Bookmark Manager</h1>
          <button
            onClick={handleAddBookmark}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Bookmark
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Search bar */}
        <div className="mb-6">
          <SearchBar onSearch={setSearchQuery} />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
          {/* Sidebar with tags */}
          <aside className="hidden md:block">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <TagFilter
                tags={tags}
                selectedTag={selectedTag}
                onSelectTag={setSelectedTag}
              />
            </div>
          </aside>

          {/* Bookmark list */}
          <section>
            {/* Mobile tag filter */}
            <div className="md:hidden mb-4">
              <select
                value={selectedTag || ''}
                onChange={(e) => setSelectedTag(e.target.value || null)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All bookmarks</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.name}>
                    {tag.name} ({tag.count || 0})
                  </option>
                ))}
              </select>
            </div>

            <BookmarkList
              bookmarks={bookmarks}
              loading={false}
              onEdit={handleEditBookmark}
              onDelete={handleDeleteClick}
              onTagClick={handleTagClick}
              onAddBookmark={handleAddBookmark}
              hasFilters={hasFilters}
            />
          </section>
        </div>
      </main>

      {/* Floating action button for mobile */}
      <button
        onClick={handleAddBookmark}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
        aria-label="Add bookmark"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Bookmark form modal */}
      {showForm && (
        <BookmarkForm
          bookmark={editingBookmark}
          existingTags={tags}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deletingBookmark !== null}
        title="Delete Bookmark"
        message={`Are you sure you want to delete "${deletingBookmark?.title}"? This action cannot be undone.`}
        confirmLabel={deleteLoading ? 'Deleting...' : 'Delete'}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        variant="danger"
      />
    </div>
  );
}
