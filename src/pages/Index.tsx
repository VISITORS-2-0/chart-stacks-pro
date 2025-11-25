import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar, MenuItem } from "@/components/DashboardSidebar";
import { ChartCard } from "@/components/ChartCard";
import { generateMockData } from "@/utils/chartData";

interface ActiveChart extends MenuItem {
  data: Array<{ date: string; value: number }>;
}

const Index = () => {
  const [activeCharts, setActiveCharts] = useState<ActiveChart[]>([]);
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

  const handleItemClick = (item: MenuItem) => {
    // Check if chart already exists
    const exists = activeCharts.some((chart) => chart.id === item.id);
    if (exists) return;

    // Generate new chart with mock data
    const newChart: ActiveChart = {
      ...item,
      data: generateMockData(),
    };

    setActiveCharts((prev) => [...prev, newChart]);
  };

  const handleRemoveChart = (id: string) => {
    setActiveCharts((prev) => prev.filter((chart) => chart.id !== id));
  };

  const handleBrushChange = (startIndex: number, endIndex: number) => {
    setBrushRange({ startIndex, endIndex });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <DashboardSidebar onItemClick={handleItemClick} />
        
        <main className="flex-1 overflow-auto">
          <div className="container max-w-7xl p-6">
            {activeCharts.length === 0 ? (
              <div className="flex h-[calc(100vh-3rem)] items-center justify-center">
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
                  <ChartCard
                    key={chart.id}
                    id={chart.id}
                    title={chart.title}
                    chartType={chart.chartType}
                    data={chart.data}
                    onRemove={handleRemoveChart}
                    scrollContainerId={`chart-scroll-${chart.id}`}
                    onBrushChange={handleBrushChange}
                    brushStartIndex={brushRange.startIndex}
                    brushEndIndex={brushRange.endIndex}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;
