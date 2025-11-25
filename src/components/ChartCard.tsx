import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
} from "recharts";
import type { ChartType } from "./DashboardSidebar";
import { DataTable } from "./DataTable";

interface ChartData {
  date: string;
  value: number;
}

interface ChartCardProps {
  id: string;
  title: string;
  chartType: ChartType;
  data: ChartData[];
  onRemove: (id: string) => void;
  scrollContainerId?: string;
  onBrushChange?: (startIndex: number, endIndex: number) => void;
  brushStartIndex?: number;
  brushEndIndex?: number;
}

export function ChartCard({
  id,
  title,
  chartType,
  data,
  onRemove,
  scrollContainerId,
  onBrushChange,
  brushStartIndex,
  brushEndIndex,
}: ChartCardProps) {
  const [zoomedData, setZoomedData] = useState(data);
  const [isRawCategory, setIsRawCategory] = useState(false);

  useEffect(() => {
    // Check if this is a Raw category chart (scatter plot)
    setIsRawCategory(chartType === "scatter");
    
    // Update zoomed data when brush indices change
    if (brushStartIndex !== undefined && brushEndIndex !== undefined) {
      setZoomedData(data.slice(brushStartIndex, brushEndIndex + 1));
    } else {
      setZoomedData(data);
    }
  }, [data, brushStartIndex, brushEndIndex, chartType]);

  const handleBrushChange = (brushData: any) => {
    if (brushData && onBrushChange) {
      const { startIndex, endIndex } = brushData;
      if (startIndex !== undefined && endIndex !== undefined) {
        onBrushChange(startIndex, endIndex);
      }
    }
  };

  const renderChart = (dataToRender: ChartData[], showBrush: boolean = false) => {
    const chartWidth = showBrush ? "200%" : "100%";
    
    switch (chartType) {
      case "scatter":
        return (
          <div className={showBrush ? "overflow-x-auto" : ""} id={scrollContainerId}>
            <ResponsiveContainer width={chartWidth} height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Scatter
                  data={dataToRender}
                  fill="hsl(var(--primary))"
                  shape="circle"
                />
                {showBrush && (
                  <Brush
                    dataKey="date"
                    height={30}
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--muted))"
                    onChange={handleBrushChange}
                  />
                )}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        );

      case "bar":
        return (
          <div className={showBrush ? "overflow-x-auto" : ""} id={scrollContainerId}>
            <ResponsiveContainer width={chartWidth} height={300}>
              <BarChart data={dataToRender}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                {showBrush && (
                  <Brush
                    dataKey="date"
                    height={30}
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--muted))"
                    onChange={handleBrushChange}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case "line":
        return (
          <div className={showBrush ? "overflow-x-auto" : ""} id={scrollContainerId}>
            <ResponsiveContainer width={chartWidth} height={300}>
              <LineChart data={dataToRender}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
                {showBrush && (
                  <Brush
                    dataKey="date"
                    height={30}
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--muted))"
                    onChange={handleBrushChange}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="border border-border shadow-sm animate-in fade-in-50 duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(id)}
          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isRawCategory ? (
          <Tabs defaultValue="chart" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="chart">Chart View</TabsTrigger>
              <TabsTrigger value="data">Raw Data</TabsTrigger>
            </TabsList>
            <TabsContent value="chart" className="mt-4">
              {renderChart(data, true)}
            </TabsContent>
            <TabsContent value="data" className="mt-4">
              <DataTable data={zoomedData} />
            </TabsContent>
          </Tabs>
        ) : (
          renderChart(data, true)
        )}
      </CardContent>
    </Card>
  );
}
