export function LoadingSpinner({ size = 'default' }: { size?: 'sm' | 'default' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 border-2',
    default: 'w-16 h-16 border-4',
    lg: 'w-24 h-24 border-8'
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div
        className={`${sizeClasses[size]} border-blue-500 border-t-transparent rounded-full animate-spin`}
        role="status"
        aria-label="Yükleniyor"
      />
    </div>
  )
}
