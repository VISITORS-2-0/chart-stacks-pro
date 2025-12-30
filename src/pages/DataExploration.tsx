import { useState, useEffect } from "react";

import { TemporalChartCard } from "@/components/TemporalChartCard";
import { FilterBar, TimeRange } from "@/components/FilterBar";
import { generateMockData } from "@/utils/chartData";
import type { MenuItem } from "@/components/DashboardSidebar";

interface ActiveChart extends MenuItem {
  data: Array<{ date: string; value: number }>;
}

interface DataExplorationProps {
  activeCharts: ActiveChart[];
  onAddChart: (item: MenuItem) => void;
  onRemoveChart: (id: string) => void;
  onCloseAll: () => void;
  onCreateAssociation: () => void;
}

export function DataExploration({ activeCharts, onAddChart, onRemoveChart, onCloseAll, onCreateAssociation }: DataExplorationProps) {
  const [brushRange, setBrushRange] = useState<{ startIndex?: number; endIndex?: number }>({});
  const [patientId, setPatientId] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>({ type: "relative", relative: "30d" });
  const [patientCount] = useState(10000);

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
        patientId={patientId}
        onPatientIdChange={setPatientId}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        patientCount={patientCount}
        onCloseAll={onCloseAll}
        hasCharts={activeCharts.length > 0}
        onCreateAssociation={onCreateAssociation}
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
                  isMultiPatient={chart.chartType === 'line'}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
