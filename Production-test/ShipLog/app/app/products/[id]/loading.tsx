export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div className="h-9 bg-gray-200 rounded w-64 animate-pulse"></div>
        <div className="flex gap-3">
          <div className="h-10 bg-gray-200 rounded w-20 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-20 animate-pulse"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="border rounded-lg p-6 space-y-4 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
          <div className="border rounded-lg p-6 space-y-4 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="border rounded-lg p-6 space-y-4 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
