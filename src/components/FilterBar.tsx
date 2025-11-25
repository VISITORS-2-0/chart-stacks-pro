import { useState } from "react";
import { Search, Calendar, Users, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

interface FilterBarProps {
  patientId: string;
  onPatientIdChange: (id: string) => void;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  patientCount: number;
  onCloseAll: () => void;
  hasCharts: boolean;
}

export interface TimeRange {
  type: "relative" | "absolute";
  relative?: string;
  startDate?: Date;
  endDate?: Date;
}

const relativeOptions = [
  { label: "Last 15 minutes", value: "15m" },
  { label: "Last 1 hour", value: "1h" },
  { label: "Last 4 hours", value: "4h" },
  { label: "Last 24 hours", value: "24h" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
];

export const FilterBar = ({
  patientId,
  onPatientIdChange,
  timeRange,
  onTimeRangeChange,
  patientCount,
  onCloseAll,
  hasCharts,
}: FilterBarProps) => {
  const [localStartDate, setLocalStartDate] = useState<Date | undefined>(timeRange.startDate);
  const [localEndDate, setLocalEndDate] = useState<Date | undefined>(timeRange.endDate);
  const [isOpen, setIsOpen] = useState(false);

  const getTimeRangeLabel = () => {
    if (timeRange.type === "relative" && timeRange.relative) {
      const option = relativeOptions.find((opt) => opt.value === timeRange.relative);
      return option?.label || "Last 30 days";
    }
    if (timeRange.type === "absolute" && timeRange.startDate && timeRange.endDate) {
      return `${format(timeRange.startDate, "MMM d, yyyy")} - ${format(timeRange.endDate, "MMM d, yyyy")}`;
    }
    return "Last 30 days";
  };

  const handleRelativeSelect = (value: string) => {
    onTimeRangeChange({ type: "relative", relative: value });
    setIsOpen(false);
  };

  const handleAbsoluteApply = () => {
    if (localStartDate && localEndDate) {
      onTimeRangeChange({ type: "absolute", startDate: localStartDate, endDate: localEndDate });
      setIsOpen(false);
    }
  };

  return (
    <div className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Patient ID Search */}
        <div className="flex items-center gap-2 min-w-[250px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Patient ID..."
            value={patientId}
            onChange={(e) => onPatientIdChange(e.target.value)}
            className="h-9"
          />
        </div>

        {/* Time Picker */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 gap-2 min-w-[200px]">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">{getTimeRangeLabel()}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Tabs defaultValue={timeRange.type} className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="relative">Relative</TabsTrigger>
                <TabsTrigger value="absolute">Absolute</TabsTrigger>
              </TabsList>
              
              <TabsContent value="relative" className="p-4 space-y-2">
                {relativeOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={timeRange.relative === option.value ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => handleRelativeSelect(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </TabsContent>
              
              <TabsContent value="absolute" className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <CalendarComponent
                    mode="single"
                    selected={localStartDate}
                    onSelect={setLocalStartDate}
                    className="pointer-events-auto"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <CalendarComponent
                    mode="single"
                    selected={localEndDate}
                    onSelect={setLocalEndDate}
                    disabled={(date) => localStartDate ? date < localStartDate : false}
                    className="pointer-events-auto"
                  />
                </div>
                <Button 
                  onClick={handleAbsoluteApply} 
                  className="w-full"
                  disabled={!localStartDate || !localEndDate}
                >
                  Apply
                </Button>
              </TabsContent>
            </Tabs>
          </PopoverContent>
        </Popover>

        {/* Patient Count */}
        <div className="flex items-center gap-2 ml-auto bg-muted px-4 py-2 rounded-md">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {patientCount.toLocaleString()} Patients
          </span>
        </div>

        {/* Close All Button */}
        {hasCharts && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCloseAll}
            className="flex items-center gap-2 h-9"
          >
            <XCircle className="h-4 w-4" />
            Close All Charts
          </Button>
        )}
      </div>
    </div>
  );
};
