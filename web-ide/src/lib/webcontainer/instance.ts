import type { WebContainer, WebContainerProcess } from '@webcontainer/api';

// Singleton state
let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;
let isBooting = false;
let bootError: Error | null = null;

// Multi-tab detection key
const WEBCONTAINER_TAB_KEY = 'clouddev_webcontainer_tab';
const WEBCONTAINER_TIMESTAMP_KEY = 'clouddev_webcontainer_timestamp';

/**
 * Check if another tab already has a WebContainer running
 */
function checkMultiTab(): boolean {
  try {
    const existingTab = sessionStorage.getItem(WEBCONTAINER_TAB_KEY);
    const timestamp = sessionStorage.getItem(WEBCONTAINER_TIMESTAMP_KEY);
    
    if (existingTab && existingTab !== window.name) {
      // Check if the other tab's timestamp is recent (within 30 seconds)
      if (timestamp) {
        const age = Date.now() - parseInt(timestamp, 10);
        if (age < 30000) {
          return true; // Another active tab has WebContainer
        }
      }
    }
    return false;
  } catch {
    return false; // sessionStorage may be unavailable
  }
}

/**
 * Mark this tab as the active WebContainer host
 */
function markTabActive(): void {
  try {
    if (!window.name) {
      window.name = `clouddev_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }
    sessionStorage.setItem(WEBCONTAINER_TAB_KEY, window.name);
    sessionStorage.setItem(WEBCONTAINER_TIMESTAMP_KEY, Date.now().toString());
  } catch {
    // sessionStorage may be unavailable
  }
}

/**
 * Keep-alive interval to update timestamp
 */
let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

function startKeepAlive(): void {
  if (keepAliveInterval) return;
  keepAliveInterval = setInterval(() => {
    try {
      sessionStorage.setItem(WEBCONTAINER_TIMESTAMP_KEY, Date.now().toString());
    } catch {
      // Ignore errors
    }
  }, 10000); // Update every 10 seconds
}

function stopKeepAlive(): void {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

/**
 * Get or boot the WebContainer instance
 * Returns the existing instance if already booted, or boots a new one
 */
export async function getWebContainer(): Promise<WebContainer> {
  // Return existing instance
  if (webcontainerInstance) {
    return webcontainerInstance;
  }
  
  // Return pending boot promise (prevents multiple concurrent boots)
  if (bootPromise) {
    return bootPromise;
  }
  
  // Check if another tab is using WebContainer
  if (checkMultiTab()) {
    const error = new Error(
      'A WebContainer is already running in another tab. Please close that tab or use it instead.'
    );
    bootError = error;
    throw error;
  }
  
  // Start boot process
  bootPromise = bootWebContainer();
  return bootPromise;
}

/**
 * Internal boot function
 */
async function bootWebContainer(): Promise<WebContainer> {
  // Prevent SSR execution
  if (typeof window === 'undefined') {
    throw new Error('WebContainer cannot be booted on the server');
  }

  try {
    isBooting = true;
    bootError = null;
    
    // Mark this tab as active before booting
    markTabActive();
    
    console.log('[WebContainer] Booting...');
    const { WebContainer } = await import('@webcontainer/api');
    webcontainerInstance = await WebContainer.boot();
    console.log('[WebContainer] Boot successful');
    
    // Start keep-alive updates
    startKeepAlive();
    
    // Setup cleanup handlers
    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('unload', cleanup);
    
    return webcontainerInstance;
  } catch (error) {
    console.error('[WebContainer] Boot failed:', error);
    bootError = error as Error;
    cleanup();
    throw error;
  } finally {
    isBooting = false;
  }
}

/**
 * Cleanup function called on tab close or error
 */
export function cleanup(): void {
  stopKeepAlive();
  try {
    const currentTab = sessionStorage.getItem(WEBCONTAINER_TAB_KEY);
    if (currentTab === window.name) {
      sessionStorage.removeItem(WEBCONTAINER_TAB_KEY);
      sessionStorage.removeItem(WEBCONTAINER_TIMESTAMP_KEY);
    }
  } catch {
    // Ignore errors
  }
  bootPromise = null;
  // Note: We don't null webcontainerInstance as it may still be in use
}

/**
 * Force teardown of WebContainer (for testing/recovery)
 */
export function teardown(): void {
  cleanup();
  webcontainerInstance = null;
  bootError = null;
}

/**
 * Get current boot status for UI
 */
export function getBootStatus(): {
  isBooting: boolean;
  bootError: Error | null;
  isReady: boolean;
} {
  return {
    isBooting,
    bootError,
    isReady: webcontainerInstance !== null
  };
}

/**
 * Check if WebContainer is ready
 */
export function isWebContainerReady(): boolean {
  return webcontainerInstance !== null;
}

/**
 * Remove all files from the WebContainer filesystem
 */
export async function cleanFileSystem(): Promise<void> {
  const container = await getWebContainer();
  try {
    const entries = await container.fs.readdir('.', { withFileTypes: true });
    for (const entry of entries) {
      // Don't remove system folders if any (though usually fine to remove all at root)
      if (entry.name !== '.' && entry.name !== '..') {
         await container.fs.rm(entry.name, { recursive: true });
      }
    }
  } catch (err) {
    console.error('[WebContainer] Failed to clean filesystem:', err);
  }
}

/**
 * Export the current filesystem state (recursively)
 * Skips node_modules and other generated folders
 */
export async function exportFileSystem(): Promise<Record<string, any>> {
  const container = await getWebContainer();
  const result: Record<string, any> = {};

  async function walk(dir: string, obj: any) {
    try {
      const entries = await container.fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (['node_modules', '.git', 'dist', '.next', '.swc', '.npm'].includes(entry.name)) continue;
        
        // Construct full path for reading, but we build the tree object structure
        const fullPath = dir === '.' ? entry.name : `${dir}/${entry.name}`;
        
        if (entry.isDirectory()) {
          obj[entry.name] = { directory: {} };
          await walk(fullPath, obj[entry.name].directory);
        } else if (entry.isFile()) {
          try {
            // Only read text files efficiently? WebContainer readFile assumes text? 
            // Binary files might be an issue if we try to read utf-8.
            // For now assume source code is text.
            const content = await container.fs.readFile(fullPath, 'utf-8');
            obj[entry.name] = { file: { contents: content } };
          } catch (e) {
            console.warn(`[exportFileSystem] Failed to read file ${fullPath}`, e);
          }
        }
      }
    } catch (e) {
      console.error(`[exportFileSystem] Failed to read dir ${dir}`, e);
    }
  }

  await walk('.', result);
  return result;
}

/**
 * Mount files to the WebContainer filesystem
 */
export async function mountFiles(
  files: Record<string, any>
): Promise<void> {
  const container = await getWebContainer();
  await container.mount(files);
}

/**
 * Run a command in the WebContainer
 */
export async function runCommand(
  command: string,
  args: string[]
): Promise<WebContainerProcess> {
  const container = await getWebContainer();
  return container.spawn(command, args);
}

/**
 * Start the development server and return the URL
 */
export async function startDevServer(): Promise<string> {
  const container = await getWebContainer();
  
  // Install dependencies
  console.log('[WebContainer] Running npm install...');
  const installProcess = await container.spawn('npm', ['install']);
  
  // Wait for install to finish
  const installExitCode = await installProcess.exit;
  if (installExitCode !== 0) {
    throw new Error('npm install failed');
  }
  console.log('[WebContainer] npm install complete');
  
  // Start dev server
  console.log('[WebContainer] Starting dev server...');
  await container.spawn('npm', ['run', 'dev']);
  
  // Wait for server URL with timeout
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Dev server did not start within 60 seconds'));
    }, 60000);
    
    container.on('server-ready', (port, url) => {
      clearTimeout(timeout);
      console.log(`[WebContainer] Server ready on port ${port}: ${url}`);
      resolve(url);
    });
  });
}
