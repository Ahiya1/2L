// Hebrew date formatting utilities

export function formatHebrewDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date

  return new Intl.DateTimeFormat('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
  // Output: "26 בנובמבר 2025"
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInMs = now.getTime() - d.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInDays === 0) return 'היום'
  if (diffInDays === 1) return 'אתמול'
  if (diffInDays < 7) return `לפני ${diffInDays} ימים`
  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7)
    return `לפני ${weeks} ${weeks === 1 ? 'שבוע' : 'שבועות'}`
  }
  if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30)
    return `לפני ${months} ${months === 1 ? 'חודש' : 'חודשים'}`
  }

  return formatHebrewDate(d)
}

export function formatLastAccessed(date: Date | null): string {
  if (!date) return 'טרם נצפה'
  return formatRelativeTime(date)
}

export function formatViewCount(count: number): string {
  if (count === 0) return '0 צפיות'
  if (count === 1) return 'צפייה אחת'
  if (count === 2) return 'שתי צפיות'
  return `${count} צפיות`
}
