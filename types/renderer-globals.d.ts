type LauncherResult<T = Record<string, unknown>> = Promise<T>;

interface Window {
  launcherAPI?: Record<string, (...args: unknown[]) => unknown>;
  pywebview?: {
    api?: Record<string, (...args: unknown[]) => unknown>;
  };
  BrowserControlMode?: {
    getHostname(value: unknown): string;
    isInteractiveControllerPage(url: string): boolean;
    resolveBrowserOpenMode(url: string, requestedMode?: string): string;
  };
  bootstrap?: Record<string, unknown>;
}

declare const bootstrap: Record<string, any>;
