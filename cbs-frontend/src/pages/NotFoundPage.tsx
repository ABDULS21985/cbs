import { SearchX, ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
        <SearchX className="w-10 h-10 text-muted-foreground" />
      </div>
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold text-foreground">404</h1>
        <h2 className="text-xl font-semibold mt-2">Page Not Found</h2>
        <p className="text-muted-foreground mt-2">The page you're looking for doesn't exist or has been moved.</p>
      </div>
      <div className="flex gap-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" /> Go back
        </button>
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Home className="w-4 h-4" /> Dashboard
        </button>
      </div>
    </div>
  );
}
