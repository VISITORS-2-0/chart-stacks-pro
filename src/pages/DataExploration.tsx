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
  relativeEventName?: string;
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

                if (isRelativeMode && relativeConfig.reference_concept) {
                  // Compute relative boundaries based on deltas
                  const getMs = (delta: { value: number; unit: string }) => {
                    const DAY = 1000 * 60 * 60 * 24;
                    if (delta.unit === 'y') return delta.value * DAY * 365.25;
                    if (delta.unit === 'm') return delta.value * DAY * 30.4375;
                    if (delta.unit === 'w') return delta.value * DAY * 7;
                    if (delta.unit === 'h') return delta.value * 1000 * 60 * 60;
                    return delta.value * DAY; // 'd'
                  };
                  // Negative for start_delta since it's "before event" if we assume start_delta means "time before event".
                  // Wait, relativeConfig has start_delta = { value: 0, unit: 'd' } and end_delta = { value: 35, unit: 'd' }.
                  // We should check how backend interprets it. Actually, start_delta is subtracted if it's before?
                  // Usually start_delta is subtracted from 0, but let's assume it's just from -getMs(start_delta) to +getMs(end_delta).
                  globalStart = ANCHOR_MS - getMs(relativeConfig.start_delta);
                  globalEnd = ANCHOR_MS + getMs(relativeConfig.end_delta);
                } else {
                  const { start_date, end_date } = calculateDateRange(timeRange);
                  globalStart = start_date;
                  globalEnd = end_date;
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
