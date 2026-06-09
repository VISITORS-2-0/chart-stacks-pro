import { useState } from "react";
import { Users, XCircle, Layers } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PatientMultiSelect } from "@/components/PatientMultiSelect";
import { GroupMultiSelect } from "@/components/GroupMultiSelect";
import type { Group } from "@/services/groupsApi";
import type { TimeRange } from "@/components/TimeRangePicker";

export type { TimeRange };

interface FilterBarProps {
  patientIds: string[];
  onPatientIdsChange: (ids: string[]) => void;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  patientCount: number;
  onCloseAll: () => void;
  hasCharts: boolean;
  groups?: Group[];
  isPureIntervalsMode: boolean;
  onPureIntervalsModeChange: (val: boolean) => void;
}

export const FilterBar = ({
  patientIds,
  onPatientIdsChange,
  timeRange,
  onTimeRangeChange,
  patientCount,
  onCloseAll,
  hasCharts,
  groups,
  isPureIntervalsMode,
  onPureIntervalsModeChange,
}: FilterBarProps) => {

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
    <div className="bg-card border-b border-border px-6 py-4 flex flex-col gap-4">
      {/* Top Row for Clear All Button (if needed) */}
      {hasCharts && (
        <div className="flex justify-end w-full">
          {/* Close All Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onCloseAll}
            className="flex items-center gap-2 h-8 px-3 text-red-500 border-red-200 bg-transparent hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-colors shrink-0"
          >
            <XCircle className="h-3.5 w-3.5" />
            Clear All
          </Button>
        </div>
      )}

      {/* Patient & Group Selection Row */}
      <div className="flex flex-wrap items-start gap-8 w-full">
        {/* Patient Selection */}
        <div>
          <Label className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Patients</Label>
          <PatientMultiSelect
            selectedIds={selectedPatients}
            onChange={handlePatientsChange}
          />
        </div>

        {/* Group Selection */}
        <div>
          <Label className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Groups</Label>
          <GroupMultiSelect
            selectedIds={selectedGroups}
            onChange={handleGroupsChange}
            groups={groups}
          />
        </div>
      </div>
    </div>
  );
};;
