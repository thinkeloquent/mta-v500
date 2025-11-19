import { useEffect, useRef, useState } from 'react';

export const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const defaultOptions = {
      threshold: 0.1,
      rootMargin: '50px',
      ...options,
    };

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      const isCurrentlyIntersecting = entry.isIntersecting;

      setIsIntersecting(isCurrentlyIntersecting);

      // Once intersected, keep track (useful for lazy loading)
      if (isCurrentlyIntersecting && !hasIntersected) {
        setHasIntersected(true);
      }
    }, defaultOptions);

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [options, hasIntersected]);

  return {
    elementRef,
    isIntersecting,
    hasIntersected,
  };
};

export const useLazyLoading = (options = {}) => {
  const { elementRef, hasIntersected } = useIntersectionObserver(options);

  return {
    ref: elementRef,
    shouldLoad: hasIntersected,
  };
};
