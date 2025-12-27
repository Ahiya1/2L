'use client';

interface TagBadgeProps {
  name: string;
  count?: number;
  onClick?: () => void;
  onRemove?: () => void;
  isActive?: boolean;
}

export function TagBadge({ name, count, onClick, onRemove, isActive = false }: TagBadgeProps) {
  const baseClasses = 'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full transition-colors';
  const interactiveClasses = onClick ? 'cursor-pointer' : '';
  const colorClasses = isActive
    ? 'bg-blue-600 text-white'
    : 'bg-blue-100 text-blue-800 hover:bg-blue-200';

  return (
    <span
      className={`${baseClasses} ${interactiveClasses} ${colorClasses}`}
      onClick={onClick}
    >
      {name}
      {count !== undefined && (
        <span className={`${isActive ? 'text-blue-200' : 'text-blue-600'}`}>
          ({count})
        </span>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={`ml-1 rounded-full p-0.5 ${isActive ? 'hover:bg-blue-700' : 'hover:bg-blue-300'}`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}
