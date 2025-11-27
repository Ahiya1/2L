'use client'

import { TrendingUp } from 'lucide-react'

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 p-6 mb-4">
        <TrendingUp className="h-12 w-12 text-blue-600" />
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-2">
        אין פרויקטים עדיין
      </h3>
      <p className="text-slate-600 text-center max-w-md mb-6">
        צור פרויקט חדש כדי להתחיל בניתוח סטטיסטי מקצועי
      </p>
    </div>
  )
}
