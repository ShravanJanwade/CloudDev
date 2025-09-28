
import { useEffect, useState, useCallback } from 'react';
import { getWebContainer, cleanup, getBootStatus } from '@/lib/webcontainer/instance';

export function useWebContainer() {
  const [isBooting, setIsBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const retry = useCallback(() => {
    setIsBooting(true);
    setError(null);
    // Force a re-mount by triggering the effect
    cleanup();
    window.location.reload();
  }, []);

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    const baseDelay = 1000;

    async function boot() {
      while (mounted && retryCount < maxRetries) {
        try {
          await getWebContainer();
          
          if (mounted) {
            setIsBooting(false);
            setError(null);
            setIsReady(true);
          }
          return; // Success, exit retry loop
          
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          console.error(`[useWebContainer] Boot attempt ${retryCount + 1} failed:`, message);
          
          // Don't retry for multi-tab errors - user needs to take action
          if (message.includes('already running in another tab')) {
            if (mounted) {
              setError(message);
              setIsBooting(false);
            }
            return;
          }
          
          retryCount++;
          
          // If we've exhausted retries, show error
          if (retryCount >= maxRetries) {
            if (mounted) {
              setError(`Failed to start environment after ${maxRetries} attempts: ${message}`);
              setIsBooting(false);
            }
            return;
          }
          
          // Wait before retry with exponential backoff
          const delay = baseDelay * Math.pow(2, retryCount - 1);
          console.log(`[useWebContainer] Retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    boot();
    
    return () => {
      mounted = false;
    };
  }, []);

  return { isBooting, error, isReady, retry };
}
