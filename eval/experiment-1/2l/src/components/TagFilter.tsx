'use client';

import type { Tag } from '@/lib/types';

interface TagFilterProps {
  tags: Tag[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

export function TagFilter({ tags, selectedTag, onSelectTag }: TagFilterProps) {
  const totalBookmarks = tags.reduce((sum, tag) => sum + (tag.count || 0), 0);

  return (
    <div className="space-y-1">
      <h2 className="text-sm font-semibold text-gray-900 mb-3">Tags</h2>

      {/* All bookmarks option */}
      <button
        onClick={() => onSelectTag(null)}
        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
          selectedTag === null
            ? 'bg-blue-100 text-blue-800 font-medium'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <span className="flex justify-between items-center">
          <span>All bookmarks</span>
          <span className="text-xs text-gray-500">{totalBookmarks}</span>
        </span>
      </button>

      {/* Individual tags */}
      {tags.length > 0 ? (
        <div className="space-y-1 mt-2">
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => onSelectTag(tag.name)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedTag === tag.name
                  ? 'bg-blue-100 text-blue-800 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="flex justify-between items-center">
                <span className="truncate">{tag.name}</span>
                <span className="text-xs text-gray-500 ml-2">{tag.count || 0}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 px-3 py-2">No tags yet</p>
      )}
    </div>
  );
}
