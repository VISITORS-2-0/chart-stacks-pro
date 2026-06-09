import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
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
import { cn } from "@/lib/utils";

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
  { label: "Last 1 year", value: "1y" },
  { label: "Last 5 years", value: "5y" },
  { label: "Last 10 years", value: "10y" },
];

interface TimeRangePickerProps {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
}

export const TimeRangePicker = ({
  timeRange,
  onTimeRangeChange,
}: TimeRangePickerProps) => {
  const [localStartDate, setLocalStartDate] = useState<Date | undefined>(timeRange.startDate);
  const [localEndDate, setLocalEndDate] = useState<Date | undefined>(timeRange.endDate);
  const [isOpen, setIsOpen] = useState(false);

  const [absMode, setAbsMode] = useState<"calendar" | "startDuration">("startDuration");
  const [startMonth, setStartMonth] = useState<number>(timeRange.startDate ? timeRange.startDate.getMonth() : 0);
  const [startYear, setStartYear] = useState<number>(timeRange.startDate ? timeRange.startDate.getFullYear() : 2015);
  const [sizeAmount, setSizeAmount] = useState<number>(10);
  const [sizeUnit, setSizeUnit] = useState<"days" | "months" | "years">("years");

  const calculateEndFromStartAndSize = (start: Date, amount: number, unit: "days" | "months" | "years"): Date => {
    const end = new Date(start);
    if (unit === "years") {
      end.setFullYear(start.getFullYear() + amount);
    } else if (unit === "months") {
      end.setMonth(start.getMonth() + amount);
    } else {
      end.setDate(start.getDate() + amount);
    }
    return end;
  };

  useEffect(() => {
    if (isOpen) {
      setLocalStartDate(timeRange.startDate);
      setLocalEndDate(timeRange.endDate);

      if (timeRange.startDate) {
        setStartMonth(timeRange.startDate.getMonth());
        setStartYear(timeRange.startDate.getFullYear());
      }

      if (timeRange.startDate && timeRange.endDate) {
        const diffYears = timeRange.endDate.getFullYear() - timeRange.startDate.getFullYear();
        const diffMonths = (timeRange.endDate.getFullYear() - timeRange.startDate.getFullYear()) * 12 + (timeRange.endDate.getMonth() - timeRange.startDate.getMonth());
        const diffDays = Math.round((timeRange.endDate.getTime() - timeRange.startDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffYears > 0 && diffMonths % 12 === 0) {
          setSizeAmount(diffYears);
          setSizeUnit("years");
        } else if (diffMonths > 0) {
          setSizeAmount(diffMonths);
          setSizeUnit("months");
        } else {
          setSizeAmount(diffDays > 0 ? diffDays : 10);
          setSizeUnit(diffDays > 0 ? "days" : "years");
        }
      }
    }
  }, [isOpen, timeRange.startDate, timeRange.endDate]);

  const getTimeRangeLabel = () => {
    if (timeRange.type === "relative" && timeRange.relative) {
      const option = relativeOptions.find((opt) => opt.value === timeRange.relative);
      return option?.label || "Last 30 days";
    }
    if (timeRange.type === "absolute" && timeRange.startDate && timeRange.endDate) {
      return `${format(timeRange.startDate, "MMM d, yyyy")} - ${format(timeRange.endDate, "MMM d, yyyy")}`;
    }
    return "Last 5 years";
  };

  const handleRelativeSelect = (value: string) => {
    onTimeRangeChange({ type: "relative", relative: value });
    setIsOpen(false);
  };

  const handleAbsoluteApply = () => {
    if (absMode === "calendar") {
      if (localStartDate && localEndDate) {
        const start = localStartDate > localEndDate ? localEndDate : localStartDate;
        const end = localStartDate > localEndDate ? localStartDate : localEndDate;

        onTimeRangeChange({ type: "absolute", startDate: start, endDate: end });
        setIsOpen(false);
      }
    } else {
      const start = new Date(startYear, startMonth, 1);
      const end = calculateEndFromStartAndSize(start, sizeAmount, sizeUnit);
      onTimeRangeChange({ type: "absolute", startDate: start, endDate: end });
      setIsOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Label className="text-sm font-semibold text-muted-foreground shrink-0 hidden sm:block">Time Range:</Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-2 min-w-[200px] justify-start font-normal bg-background">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{getTimeRangeLabel()}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[400px] p-0 max-h-[80vh] overflow-y-auto" align="start">
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
              <div className="flex bg-muted p-1 rounded-md mb-2">
                <button
                  type="button"
                  onClick={() => setAbsMode("calendar")}
                  className={cn(
                    "flex-1 text-center py-1.5 text-xs font-semibold rounded-sm transition-all",
                    absMode === "calendar"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Calendar Pick
                </button>
                <button
                  type="button"
                  onClick={() => setAbsMode("startDuration")}
                  className={cn(
                    "flex-1 text-center py-1.5 text-xs font-semibold rounded-sm transition-all",
                    absMode === "startDuration"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Start & Duration
                </button>
              </div>

              {absMode === "calendar" ? (
                <>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <CalendarComponent
                      mode="single"
                      selected={localStartDate}
                      defaultMonth={localStartDate}
                      onSelect={setLocalStartDate}
                      className="pointer-events-auto"
                      captionLayout="dropdown-buttons"
                      fromYear={1900}
                      toYear={new Date().getFullYear() + 10}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <CalendarComponent
                      mode="single"
                      selected={localEndDate}
                      defaultMonth={localEndDate || localStartDate}
                      onSelect={setLocalEndDate}
                      disabled={(date) => localStartDate ? date < localStartDate : false}
                      className="pointer-events-auto"
                      captionLayout="dropdown-buttons"
                      fromYear={1900}
                      toYear={new Date().getFullYear() + 10}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Starting Point</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Month</Label>
                        <select
                          value={startMonth}
                          onChange={(e) => setStartMonth(parseInt(e.target.value))}
                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {Array.from({ length: 12 }, (_, i) => {
                            const d = new Date(2000, i, 1);
                            return (
                              <option key={i} value={i}>
                                {format(d, "MMMM")}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Year</Label>
                        <select
                          value={startYear}
                          onChange={(e) => setStartYear(parseInt(e.target.value))}
                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {Array.from({ length: 70 }, (_, i) => {
                            const year = 1970 + i;
                            return (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duration From Start</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Amount</Label>
                        <select
                          value={sizeAmount}
                          onChange={(e) => setSizeAmount(parseInt(e.target.value))}
                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {Array.from({ length: 50 }, (_, i) => i + 1).map((val) => (
                            <option key={val} value={val}>
                              {val}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Unit</Label>
                        <select
                          value={sizeUnit}
                          onChange={(e) => setSizeUnit(e.target.value as any)}
                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="days">Days</option>
                          <option value="months">Months</option>
                          <option value="years">Years</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <Button
                onClick={handleAbsoluteApply}
                className="w-full"
                disabled={absMode === "calendar" && (!localStartDate || !localEndDate)}
              >
                Apply
              </Button>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>
    </div>
  );
};
