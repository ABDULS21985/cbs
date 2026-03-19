import { Package, Truck, Monitor, Factory } from 'lucide-react';
import { InfoGrid } from '@/components/shared';
import type { LeaseContract } from '../../types/lease';

interface LeasedAssetCardProps {
  lease: LeaseContract;
}

function AssetTypeIcon({ assetType }: { assetType: string }) {
  const type = assetType.toUpperCase();
  if (type.includes('VEHICLE') || type.includes('CAR') || type.includes('TRUCK')) {
    return <Truck className="w-5 h-5 text-muted-foreground" />;
  }
  if (type.includes('COMPUTER') || type.includes('IT') || type.includes('TECH')) {
    return <Monitor className="w-5 h-5 text-muted-foreground" />;
  }
  if (type.includes('MACHINERY') || type.includes('EQUIPMENT')) {
    return <Factory className="w-5 h-5 text-muted-foreground" />;
  }
  return <Package className="w-5 h-5 text-muted-foreground" />;
}

export function LeasedAssetCard({ lease }: LeasedAssetCardProps) {
  return (
    <div className="bg-card border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Leased Asset Details</h3>
        <AssetTypeIcon assetType={lease.assetType} />
      </div>
      <InfoGrid
        columns={2}
        items={[
          {
            label: 'Asset Description',
            value: lease.assetDescription,
            span: 2,
          },
          {
            label: 'Asset Type',
            value: lease.assetType,
          },
          {
            label: 'Manufacturer',
            value: lease.manufacturer ?? '—',
          },
          {
            label: 'Model',
            value: lease.model ?? '—',
          },
          {
            label: 'Serial Number',
            value: lease.serialNumber ?? '—',
            copyable: !!lease.serialNumber,
          },
          {
            label: 'Condition',
            value: lease.condition ?? '—',
          },
          {
            label: 'Location',
            value: lease.location ?? '—',
          },
        ]}
      />
    </div>
  );
}
