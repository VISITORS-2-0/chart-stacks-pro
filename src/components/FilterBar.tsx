import { useState, useEffect } from "react";
import { Search, Calendar, Users, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PatientMultiSelect } from "@/components/PatientMultiSelect";
import { GroupMultiSelect } from "@/components/GroupMultiSelect";
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
import type { Group } from "@/services/groupsApi";

interface FilterBarProps {
  patientIds: string[];
  onPatientIdsChange: (ids: string[]) => void;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  patientCount: number;
  onCloseAll: () => void;
  hasCharts: boolean;
  groups?: Group[];
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
  { label: "Last 1 year", value: "1y" },
  { label: "Last 5 years", value: "5y" },
  { label: "Last 10 years", value: "10y" },
];

export const FilterBar = ({
  patientIds,
  onPatientIdsChange,
  timeRange,
  onTimeRangeChange,
  patientCount,
  onCloseAll,
  hasCharts,
  groups,
}: FilterBarProps) => {
  const [localStartDate, setLocalStartDate] = useState<Date | undefined>(timeRange.startDate);
  const [localEndDate, setLocalEndDate] = useState<Date | undefined>(timeRange.endDate);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalStartDate(timeRange.startDate);
      setLocalEndDate(timeRange.endDate);
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
    if (localStartDate && localEndDate) {
      // Ensure start is before end
      const start = localStartDate > localEndDate ? localEndDate : localStartDate;
      const end = localStartDate > localEndDate ? localStartDate : localEndDate;

      onTimeRangeChange({ type: "absolute", startDate: start, endDate: end });
      setIsOpen(false);
    }
  };

  // Split patientIds into individual patients and group ids
  const selectedPatients = patientIds.filter(id => !id.startsWith("group:"));
  const selectedGroups = patientIds.filter(id => id.startsWith("group:"));

  const handlePatientsChange = (newPatients: string[]) => {
    onPatientIdsChange([...newPatients, ...selectedGroups]);
  };

  const handleGroupsChange = (newGroups: string[]) => {
    onPatientIdsChange([...selectedPatients, ...newGroups]);
  };

  return (
    <div className="bg-card border-b border-border px-6 py-4 space-y-4">

      {/* Row 1: Patient & Group Selection */}
      <div className="w-full flex gap-4 flex-col sm:flex-row">
        <div className="flex-1">
          <Label className="mb-1.5 block text-xs text-muted-foreground">Select Patients</Label>
          <PatientMultiSelect
            selectedIds={selectedPatients}
            onChange={handlePatientsChange}
          />
        </div>
        <div className="flex-1">
          <Label className="mb-1.5 block text-xs text-muted-foreground">Select Groups</Label>
          <GroupMultiSelect
            selectedIds={selectedGroups}
            onChange={handleGroupsChange}
            groups={groups}
          />
        </div>
      </div>

      {/* Row 2: Controls */}
      <div className="flex items-center gap-4 flex-wrap">

        {/* Time Picker */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 gap-2 min-w-[200px]">
              <Calendar className="h-4 w-4" />
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
                    toYear={new Date().getFullYear()}
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
                    toYear={new Date().getFullYear()}
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

        {/* Close All Button */}
        {hasCharts && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCloseAll}
            className="flex items-center gap-2 h-9 ml-auto"
          >
            <XCircle className="h-4 w-4" />
            Close All Charts
          </Button>
        )}
      </div>
    </div>
  );
};;
