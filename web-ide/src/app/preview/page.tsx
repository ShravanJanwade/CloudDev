
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';

import { Suspense } from 'react';

function PreviewContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get('url');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (url) {
      document.title = 'App Preview | CloudDev';
    }
  }, [url]);

  useEffect(() => {
    // Safety timeout: Remove loader after 3s even if onLoad doesn't fire
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!url) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0d1117] text-white">
        <p className="text-red-400">Invalid Preview URL</p>
        <p className="text-gray-500 text-sm mt-2">Please close this tab and try again from the IDE.</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-white overflow-hidden relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117] z-10 transition-opacity duration-500 pointer-events-none">
           <div className="flex flex-col items-center gap-4">
             <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
             <p className="text-gray-400 text-sm">Loading preview...</p>
           </div>
        </div>
      )}
      <iframe
        src={url}
        className="w-full h-full border-0"
        title="App Preview"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
        allow="cross-origin-isolated"
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={
       <div className="h-screen w-screen flex items-center justify-center bg-[#0d1117]">
         <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
       </div>
    }>
      <PreviewContent />
    </Suspense>
  );
}
