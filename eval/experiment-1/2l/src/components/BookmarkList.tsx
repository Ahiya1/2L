'use client';

import type { Bookmark } from '@/lib/types';
import { BookmarkCard } from './BookmarkCard';
import { EmptyState } from './EmptyState';
import { LoadingSpinner } from './LoadingSpinner';

interface BookmarkListProps {
  bookmarks: Bookmark[];
  loading: boolean;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
  onTagClick?: (tag: string) => void;
  onAddBookmark?: () => void;
  hasFilters?: boolean;
}

export function BookmarkList({
  bookmarks,
  loading,
  onEdit,
  onDelete,
  onTagClick,
  onAddBookmark,
  hasFilters = false,
}: BookmarkListProps) {
  if (loading) {
    return (
      <div className="py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return hasFilters ? (
      <EmptyState
        title="No matching bookmarks"
        message="Try adjusting your search or filter to find what you're looking for."
      />
    ) : (
      <EmptyState
        title="No bookmarks yet"
        message="Add your first bookmark to get started organizing your favorite links."
        action={onAddBookmark ? { label: 'Add Bookmark', onClick: onAddBookmark } : undefined}
      />
    );
  }

  return (
    <div className="space-y-4">
      {bookmarks.map((bookmark) => (
        <BookmarkCard
          key={bookmark.id}
          bookmark={bookmark}
          onEdit={onEdit}
          onDelete={onDelete}
          onTagClick={onTagClick}
        />
      ))}
    </div>
  );
}
