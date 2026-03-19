import { useState } from 'react';
import { Camera, Lock, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

export function PortalProfilePage() {
  const [editMode, setEditMode] = useState(false);

  const profile = {
    firstName: 'Adewale',
    lastName: 'Ogundimu',
    email: 'adewale@example.com',
    phone: '+234 801 234 5678',
    address: '15 Marina Street, Lagos Island, Lagos',
    dob: '1985-06-15',
    bvn: '12345678901',
  };

  const sensitiveFields = ['firstName', 'lastName', 'dob', 'bvn', 'address'];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">My Profile</h1>

      {/* Photo */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
            {profile.firstName[0]}{profile.lastName[0]}
          </div>
          <button className="absolute bottom-0 right-0 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow">
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>
        <div>
          <h2 className="font-semibold">{profile.firstName} {profile.lastName}</h2>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
      </div>

      {/* Profile fields */}
      <div className="rounded-lg border bg-card divide-y">
        {Object.entries(profile).map(([key, value]) => {
          const isSensitive = sensitiveFields.includes(key);
          const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
          return (
            <div key={key} className="px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
                <p className="text-sm mt-0.5">{value}</p>
              </div>
              {isSensitive ? (
                <button
                  onClick={() => toast.info('Change request submitted for bank approval')}
                  className="flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-muted"
                >
                  <Lock className="w-3 h-3" /> Request Change
                </button>
              ) : (
                <button className="flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-muted">
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
