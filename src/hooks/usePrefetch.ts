import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Prefetch route data on hover/touch
 * For React Router, we can prefetch by navigating to the route in the background
 */
export function usePrefetch() {
  const navigate = useNavigate();

  const prefetchRoute = useCallback((path: string) => {
    // Prefetch by creating a link element (browser will prefetch)
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = path;
    document.head.appendChild(link);
  }, []);

  const prefetchOnHover = useCallback(
    (url: string, apiUrl?: string) => {
      return (e: React.SyntheticEvent) => {
        if ((e as any).type === 'mouseenter' || (e as any).type === 'touchstart') {
          // Prefetch the route
          prefetchRoute(url);
          
          // Optionally prefetch API data
          if (apiUrl) {
            // Use fetch with cache to prefetch API data
            fetch(apiUrl, { method: 'GET', mode: 'cors', cache: 'force-cache' }).catch(() => {
              // Ignore errors, this is just prefetching
            });
          }
        }
      };
    },
    [prefetchRoute]
  );

  return { prefetchRoute, prefetchOnHover };
}

