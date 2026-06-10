import { useState, useEffect } from "react";

import { TemporalChartCard } from "@/components/TemporalChartCard";
import { FilterBar, TimeRange } from "@/components/FilterBar";
import { RelativeTimeBar } from "@/components/RelativeTimeBar";
import type { RelativeTimeConfig } from "@/components/RelativeTimeBar";
// import { generateMockData } from "@/utils/chartData"; // Deprecated
import type { MenuItem } from "@/components/DashboardSidebar";
import type { ZoomLevel } from "@/components/TemporalChartCard";
import type { Group } from "@/services/groupsApi";
import { calculateDateRange, ANCHOR_MS } from "@/utils/dateUtils";

interface ActiveChart extends MenuItem {
  externalData?: any[];
  conceptData?: any;
  isRaw?: boolean;
  currentInterval?: string;
  cutoffs?: number[];
  isBalanced?: boolean;
  patientIds?: string[];
  isRelative?: boolean;
  relativeEventName?: string;
  relativeConfig?: RelativeTimeConfig;
  relativeConfigHistory?: RelativeTimeConfig[];
  originalStart?: string;
  originalEnd?: string;
  viewType?: 'summary' | 'pure';
  loading?: boolean;
}

interface DataExplorationProps {
  activeCharts: ActiveChart[];
  onAddChart: (item: MenuItem) => void;
  onRemoveChart: (id: string) => void;
  onCloseAll: () => void;
  patientIds: string[];
  setPatientIds: (ids: string[]) => void;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  patientCount: number;
  onChartDrillDown?: (chartId: string, date: Date, currentZoomLevel: ZoomLevel) => void;
  onChartZoomOut?: (chartId: string) => void;
  onChartNavigate?: (chartId: string, direction: 'next' | 'prev', currentZoom: ZoomLevel, focusDate: Date | null) => void;
  onApplyCutoffs?: (chartId: string, cutoffs: number[], isBalanced: boolean) => void;
  isPureIntervalsMode: boolean;
  onPureIntervalsModeChange: (val: boolean) => void;
  // Relative time props
  isRelativeMode: boolean;
  setIsRelativeMode: (enabled: boolean) => void;
  relativeConfig: RelativeTimeConfig;
  setRelativeConfig: (config: RelativeTimeConfig) => void;
  groups?: Group[];
}

export function DataExploration({
  activeCharts,
  onAddChart,
  onRemoveChart,
  onCloseAll,
  patientIds,
  setPatientIds,
  timeRange,
  setTimeRange,
  patientCount,
  onChartDrillDown,
  onChartZoomOut,
  onChartNavigate,
  onApplyCutoffs,
  isPureIntervalsMode,
  onPureIntervalsModeChange,
  isRelativeMode,
  setIsRelativeMode,
  relativeConfig,
  setRelativeConfig,
  groups
}: DataExplorationProps) {
  const [brushRange, setBrushRange] = useState<{ startIndex?: number; endIndex?: number }>({});

  useEffect(() => {
    // Synchronize horizontal scrolling across all chart containers
    const scrollContainers = document.querySelectorAll('[id^="chart-scroll-"]');

    const handleScroll = (e: Event) => {
      const scrollLeft = (e.target as HTMLElement).scrollLeft;
      scrollContainers.forEach((container) => {
        if (container !== e.target) {
          (container as HTMLElement).scrollLeft = scrollLeft;
        }
      });
    };

    scrollContainers.forEach((container) => {
      container.addEventListener('scroll', handleScroll);
    });

    return () => {
      scrollContainers.forEach((container) => {
        container.removeEventListener('scroll', handleScroll);
      });
    };
  }, [activeCharts]);

  const handleBrushChange = (startIndex: number, endIndex: number) => {
    setBrushRange({ startIndex, endIndex });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <FilterBar
        patientIds={patientIds}
        onPatientIdsChange={setPatientIds}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        patientCount={patientCount}
        onCloseAll={onCloseAll}
        hasCharts={activeCharts.length > 0}
        groups={groups}
        isPureIntervalsMode={isPureIntervalsMode}
        onPureIntervalsModeChange={onPureIntervalsModeChange}
      />
      <RelativeTimeBar
        isEnabled={isRelativeMode}
        onToggle={setIsRelativeMode}
        config={relativeConfig}
        onConfigChange={setRelativeConfig}
      />

      <div className="flex-1 overflow-auto">
        <div className="container max-w-7xl p-6">
          {activeCharts.length === 0 ? (
            <div className="flex h-[calc(100vh-12rem)] items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  Welcome to Medical Data Dashboard
                </h2>
                <p className="text-muted-foreground">
                  Select a metric from the sidebar to view its data visualization
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {activeCharts.map((chart) => {
                let globalStart: string | number | undefined = undefined;
                let globalEnd: string | number | undefined = undefined;

                const chartIsRelative = chart.isRelative ?? false;
                const chartRelativeConfig = chart.relativeConfig;

                if (chartIsRelative && chartRelativeConfig?.reference_concepts?.length) {
                  // Compute precise UTC relative boundaries
                  const getMs = (value: number, unit: string) => {
                    if (unit === 'y') return Date.UTC(1970 + value, 0, 1);
                    if (unit === 'm') return Date.UTC(1970, value, 1);
                    return Date.UTC(1970, 0, 1 + value); // 'd'
                  };
                  globalStart = getMs(chartRelativeConfig.start_delta, chartRelativeConfig.unit);
                  globalEnd = getMs(chartRelativeConfig.end_delta, chartRelativeConfig.unit);
                } else {
                  globalStart = chart.originalStart || calculateDateRange(timeRange).start_date;
                  globalEnd = chart.originalEnd || calculateDateRange(timeRange).end_date;
                }

                return (
                  <TemporalChartCard
                    key={chart.id}
                    id={chart.id}
                    title={chart.title}
                    onRemove={onRemoveChart}
                    patientIds={chart.patientIds || patientIds}
                    isRaw={chart.isRaw}
                    chartType={chart.chartType}
                    externalData={chart.externalData}
                    conceptData={chart.conceptData}
                    currentInterval={chart.currentInterval}
                    isRelative={chart.isRelative}
                    relativeEventName={chart.relativeEventName}
                    globalStart={globalStart}
                    globalEnd={globalEnd}
                    onDrillDown={(date, level) => onChartDrillDown && onChartDrillDown(chart.id, date, level)}
                    onZoomOut={() => onChartZoomOut && onChartZoomOut(chart.id)}
                    onNavigate={(direction, currentZoom, focusDate) => onChartNavigate && onChartNavigate(chart.id, direction, currentZoom, focusDate)}
                    cutoffs={chart.cutoffs}
                    isCutoffsBalanced={chart.isBalanced}
                    onApplyCutoffs={(cutoffs, isBalanced) => onApplyCutoffs && onApplyCutoffs(chart.id, cutoffs, isBalanced)}
                    viewType={chart.viewType}
                    relativeConfigHistory={chart.relativeConfigHistory}
                    loading={chart.loading}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
