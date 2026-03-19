import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export function ServerErrorPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
        <AlertTriangle className="w-10 h-10 text-amber-500" />
      </div>
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold">500</h1>
        <h2 className="text-xl font-semibold mt-2">Something Went Wrong</h2>
        <p className="text-muted-foreground mt-2">We encountered an unexpected error. Please try again or contact support if the problem persists.</p>
      </div>
      <div className="flex gap-3">
        <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
        <a href="/dashboard" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Home className="w-4 h-4" /> Dashboard
        </a>
      </div>
    </div>
  );
}
