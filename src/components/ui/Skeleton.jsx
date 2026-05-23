const Skeleton = ({ className = '', count = 1 }) => {
  const items = Array.from({ length: count }, (_, i) => i)
  return (
    <>
      {items.map((i) => (
        <div
          key={i}
          className={`animate-skeleton bg-gray-100 rounded-xl ${className}`}
        />
      ))}
    </>
  )
}

export const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
    <div className="flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-16" />
      </div>
    </div>
  </div>
)

export const SkeletonLine = ({ width = 'w-full' }) => (
  <Skeleton className={`h-4 ${width}`} />
)

export default Skeleton
