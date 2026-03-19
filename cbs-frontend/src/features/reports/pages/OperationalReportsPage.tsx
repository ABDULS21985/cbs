import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth } from 'date-fns';
import { PageHeader } from '@/components/layout/PageHeader';
import { DateRangePicker } from '@/components/shared';
import { operationalReportApi } from '../api/operationalReportApi';
import { OpsStatsCards } from '../components/operations/OpsStatsCards';
import { SlaPerformanceTable } from '../components/operations/SlaPerformanceTable';
import { SlaTrendChart } from '../components/operations/SlaTrendChart';
import { QueueAnalyticsCharts } from '../components/operations/QueueAnalyticsCharts';
import { StaffProductivityTable } from '../components/operations/StaffProductivityTable';
import { EfficiencyTrendChart } from '../components/operations/EfficiencyTrendChart';
import { SystemUptimeTable } from '../components/operations/SystemUptimeTable';
import { IncidentTrendChart } from '../components/operations/IncidentTrendChart';
import { AutomationRateChart } from '../components/operations/AutomationRateChart';

function toDateString(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function OperationalReportsPage() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  const params = {
    dateFrom: toDateString(dateRange.from),
    dateTo: toDateString(dateRange.to),
  };

  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    if (range.from && range.to) {
      setDateRange({ from: range.from, to: range.to });
    } else if (range.from) {
      setDateRange({ from: range.from, to: range.from });
    }
  };

  const statsQuery = useQuery({
    queryKey: ['ops-reports', 'stats', params],
    queryFn: () => operationalReportApi.getStats(params),
    staleTime: 5 * 60 * 1000,
  });

  const slaQuery = useQuery({
    queryKey: ['ops-reports', 'sla', params],
    queryFn: () => operationalReportApi.getSlaPerformance(params),
    staleTime: 5 * 60 * 1000,
  });

  const slaTrendQuery = useQuery({
    queryKey: ['ops-reports', 'sla-trend', params],
    queryFn: () => operationalReportApi.getSlaTrend(params),
    staleTime: 5 * 60 * 1000,
  });

  const queueQuery = useQuery({
    queryKey: ['ops-reports', 'queue', params],
    queryFn: () => operationalReportApi.getQueueAnalytics(params),
    staleTime: 5 * 60 * 1000,
  });

  const staffQuery = useQuery({
    queryKey: ['ops-reports', 'staff', params],
    queryFn: () => operationalReportApi.getStaffProductivity(params),
    staleTime: 5 * 60 * 1000,
  });

  const efficiencyQuery = useQuery({
    queryKey: ['ops-reports', 'efficiency-trend'],
    queryFn: () => operationalReportApi.getEfficiencyTrend(12),
    staleTime: 5 * 60 * 1000,
  });

  const uptimeQuery = useQuery({
    queryKey: ['ops-reports', 'uptime', params],
    queryFn: () => operationalReportApi.getSystemUptime(params),
    staleTime: 5 * 60 * 1000,
  });

  const incidentQuery = useQuery({
    queryKey: ['ops-reports', 'incidents'],
    queryFn: () => operationalReportApi.getIncidentTrend(12),
    staleTime: 5 * 60 * 1000,
  });

  const automationQuery = useQuery({
    queryKey: ['ops-reports', 'automation', params],
    queryFn: () => operationalReportApi.getAutomationStats(params),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <>
      <PageHeader
        title="Operational Reports"
        subtitle={`${format(dateRange.from, 'dd MMM yyyy')} — ${format(dateRange.to, 'dd MMM yyyy')}`}
        actions={
          <DateRangePicker
            value={{ from: dateRange.from, to: dateRange.to }}
            onChange={handleDateRangeChange}
          />
        }
      />

      <div className="page-container space-y-6">
        {/* Stats Overview */}
        <OpsStatsCards stats={statsQuery.data} isLoading={statsQuery.isLoading} />

        {/* SLA: Table + Trend side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SlaPerformanceTable data={slaQuery.data ?? []} isLoading={slaQuery.isLoading} />
          <SlaTrendChart data={slaTrendQuery.data ?? []} isLoading={slaTrendQuery.isLoading} />
        </div>

        {/* Queue Analytics */}
        <QueueAnalyticsCharts
          metrics={queueQuery.data?.metrics ?? []}
          peakHours={queueQuery.data?.peakHours ?? []}
          isLoading={queueQuery.isLoading}
        />

        {/* Staff Productivity */}
        <StaffProductivityTable data={staffQuery.data ?? []} isLoading={staffQuery.isLoading} />

        {/* Efficiency Trend */}
        <EfficiencyTrendChart data={efficiencyQuery.data ?? []} isLoading={efficiencyQuery.isLoading} />

        {/* System Uptime + Incident Trend side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SystemUptimeTable data={uptimeQuery.data ?? []} isLoading={uptimeQuery.isLoading} />
          <IncidentTrendChart data={incidentQuery.data ?? []} isLoading={incidentQuery.isLoading} />
        </div>

        {/* Automation Rate */}
        <AutomationRateChart data={automationQuery.data ?? []} isLoading={automationQuery.isLoading} />
      </div>
    </>
  );
}
