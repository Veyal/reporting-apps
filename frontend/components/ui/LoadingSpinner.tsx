interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  variant?: 'spinner' | 'skeleton';
  type?: 'card' | 'text' | 'title' | 'avatar' | 'button';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = '',
  variant = 'spinner',
  type = 'card'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  if (variant === 'skeleton') {
    const skeletonClasses = {
      card: 'skeleton-card h-32 w-full',
      text: 'skeleton-text w-full mb-2',
      title: 'skeleton-title w-3/4 mb-4',
      avatar: 'skeleton-avatar w-10 h-10',
      button: 'skeleton h-10 w-24 rounded-lg'
    };

    return <div className={`${skeletonClasses[type]} ${className}`} />;
  }

  return (
    <div className={`spinner ${sizeClasses[size]} ${className}`} />
  );
};

// Skeleton components for common patterns
export const SkeletonCard = ({ className = '' }: { className?: string }) => (
  <div className={`mobile-card animate-fade-in ${className}`}>
    <div className="animate-fade-in-up">
      <LoadingSpinner variant="skeleton" type="title" />
      <LoadingSpinner variant="skeleton" type="text" />
      <LoadingSpinner variant="skeleton" type="text" className="w-1/2" />
    </div>
  </div>
);

export const SkeletonList = ({ count = 3, className = '' }: { count?: number; className?: string }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="flex items-center space-x-3 p-4 bg-gothic-800 rounded-lg animate-stagger-in"
        style={{animationDelay: `${index * 0.1}s`}}
      >
        <LoadingSpinner variant="skeleton" type="avatar" />
        <div className="flex-1">
          <LoadingSpinner variant="skeleton" type="text" className="w-3/4 mb-2" />
          <LoadingSpinner variant="skeleton" type="text" className="w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export default LoadingSpinner;
