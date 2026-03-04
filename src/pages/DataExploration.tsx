import { useState, useEffect } from "react";

import { TemporalChartCard } from "@/components/TemporalChartCard";
import { FilterBar, TimeRange } from "@/components/FilterBar";
// import { generateMockData } from "@/utils/chartData"; // Deprecated
import type { MenuItem } from "@/components/DashboardSidebar";
import type { ZoomLevel } from "@/components/TemporalChartCard";
// import { fetchAbstractionData, fetchRawData, QueryParams } from "@/api/temporal"; // Moved to Index
// import { calculateDateRange } from "@/utils/dateUtils"; // Moved to Index
// import { toast } from "sonner"; 
// import { useToast } from "@/components/ui/use-toast"; // Moved logic to Index

interface ActiveChart extends MenuItem {
  // data: Array<{ date: string; value: number }>; // Old structure
  externalData?: any[];
  conceptData?: any;
  isRaw?: boolean;
}

interface DataExplorationProps {
  activeCharts: ActiveChart[];
  onAddChart: (item: MenuItem) => void;
  onRemoveChart: (id: string) => void;
  onCloseAll: () => void;
  // Lifted Props
  patientIds: string[];
  setPatientIds: (ids: string[]) => void;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  patientCount: number;
  onChartDrillDown?: (chartId: string, date: Date, currentZoomLevel: ZoomLevel) => void;
  onChartZoomOut?: (chartId: string) => void;
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
  onChartZoomOut
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
              {activeCharts.map((chart) => (
                <TemporalChartCard
                  key={chart.id}
                  id={chart.id}
                  title={chart.title}
                  onRemove={onRemoveChart}
                  isMultiPatient={chart.chartType === 'line' || chart.chartType === 'scatter'} // 'scatter' from Raw is also multi-patient effectively for this purpose?
                  isRaw={chart.isRaw}
                  chartType={chart.chartType}
                  externalData={chart.externalData}
                  conceptData={chart.conceptData}
                  onDrillDown={(date, level) => onChartDrillDown && onChartDrillDown(chart.id, date, level)}
                  onZoomOut={() => onChartZoomOut && onChartZoomOut(chart.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
