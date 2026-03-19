import { ShieldX, ArrowLeft, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ForbiddenPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
        <ShieldX className="w-10 h-10 text-red-500" />
      </div>
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold text-foreground">403</h1>
        <h2 className="text-xl font-semibold mt-2">Access Denied</h2>
        <p className="text-muted-foreground mt-2">You don't have permission to access this page. If you believe this is an error, contact your administrator.</p>
      </div>
      <div className="flex gap-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" /> Go back
        </button>
        <a href="mailto:support@bellbank.com" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Mail className="w-4 h-4" /> Contact admin
        </a>
      </div>
    </div>
  );
}
