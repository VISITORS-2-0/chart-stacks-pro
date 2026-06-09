import { useState, useMemo, useEffect } from "react";
import {
  Clock,
  ChevronDown,
  Anchor,
  Hash,
  ArrowRight,
  CircleDot,
  Layers,
  Plus,
  Trash2,
  AlertCircle,
  Check,
  ChevronsUpDown,
  XCircle,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useTakMenu } from "@/services/takApi";
import type { RelativeTimeConfig, RelativeTimeDelta, ReferenceConcept } from "@/api/temporal";
import { fetchConceptGroups, ConceptGroup } from "@/services/conceptGroupsApi";
import { cn } from "@/lib/utils";
import { getApiUrl } from "@/config/api";
import { TimeRangePicker } from "@/components/TimeRangePicker";
import type { TimeRange } from "@/components/TimeRangePicker";
import { GlobalToggle } from "@/components/GlobalToggle";

export type { RelativeTimeConfig };

interface RelativeTimeBarProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  config: RelativeTimeConfig;
  onConfigChange: (config: RelativeTimeConfig) => void;
  isPureIntervalsMode: boolean;
  onPureIntervalsModeChange: (val: boolean) => void;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  hasCharts?: boolean;
  onCloseAll?: () => void;
}

const TIME_UNITS: { value: RelativeTimeDelta["unit"]; label: string; short: string }[] = [
  { value: "h", label: "Hours", short: "h" },
  { value: "d", label: "Days", short: "d" },
  { value: "w", label: "Weeks", short: "w" },
  { value: "m", label: "Months", short: "m" },
  { value: "y", label: "Years", short: "y" },
];

const OCCURRENCE_OPTIONS = [
  { value: "-1", label: "Last occurrence" },
  { value: "0", label: "1st occurrence" },
  { value: "1", label: "2nd occurrence" },
  { value: "2", label: "3rd occurrence" },
  { value: "3", label: "4th occurrence" },
  { value: "4", label: "5th occurrence" },
];

// Subcomponent for Autocomplete Dropdown
interface ConceptAutocompleteProps {
  concepts: string[];
  selected: string;
  onSelect: (concept: string) => void;
  placeholder?: string;
}

function ConceptAutocomplete({
  concepts,
  selected,
  onSelect,
  placeholder = "Select concept..."
}: ConceptAutocompleteProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal text-left h-8 bg-background/50 border-muted-foreground/30 hover:border-primary/50 transition-colors text-xs"
        >
          <span className="truncate">{selected || placeholder}</span>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search concept name..." className="h-8 text-xs" />
          <CommandList className="max-h-[200px] overflow-y-auto">
            <CommandEmpty className="text-xs p-2">No concept found.</CommandEmpty>
            <CommandGroup>
              {concepts.map((concept) => (
                <CommandItem
                  key={concept}
                  value={concept}
                  onSelect={() => {
                    onSelect(concept);
                    setOpen(false);
                  }}
                  className="text-xs py-1.5"
                >
                  <Check
                    className={cn(
                      "mr-2 h-3.5 w-3.5 text-primary",
                      selected === concept ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{concept}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const DeltaInput = ({
  label,
  delta,
  onChange,
}: {
  label: string;
  delta: RelativeTimeDelta;
  onChange: (d: RelativeTimeDelta) => void;
}) => {
  const [valStr, setValStr] = useState(delta.value.toString());

  useEffect(() => {
    setValStr(delta.value.toString());
  }, [delta.value]);

  return (
    <div className="flex flex-col gap-1.5 w-full max-w-[140px]">
      <Label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
        {label}
      </Label>
      <div className="flex gap-1.5 items-center w-full">
        <Input
          type="number"
          value={valStr}
          onChange={(e) => {
            const raw = e.target.value;
            setValStr(raw);
            const parsed = parseInt(raw, 10);
            if (!isNaN(parsed)) {
              onChange({ ...delta, value: parsed });
            }
          }}
          className="w-14 h-8 text-xs text-center bg-background/50 border-muted-foreground/30 focus-visible:ring-primary"
        />
        <Select
          value={delta.unit}
          onValueChange={(v) => onChange({ ...delta, unit: v as RelativeTimeDelta["unit"] })}
        >
          <SelectTrigger className="w-20 h-8 text-xs bg-background/50 border-muted-foreground/30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="text-xs">
            {TIME_UNITS.map((u) => (
              <SelectItem key={u.value} value={u.value}>
                {u.short}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

const formatDelta = (d: RelativeTimeDelta) =>
  `${d.value}${d.unit}`;

const formatOccurrence = (idx: number) => {
  const opt = OCCURRENCE_OPTIONS.find((o) => o.value === String(idx));
  return opt?.label ?? `Occurrence #${idx}`;
};

const getRangeMin = (val?: string): string => {
  if (!val || !val.startsWith("[") || !val.endsWith("]")) return "";
  const parts = val.slice(1, -1).split(",");
  return parts[0]?.trim() || "";
};

const getRangeMax = (val?: string): string => {
  if (!val || !val.startsWith("[") || !val.endsWith("]")) return "";
  const parts = val.slice(1, -1).split(",");
  return parts[1]?.trim() || "";
};

export function RelativeTimeBar({
  isEnabled,
  onToggle,
  config,
  onConfigChange,
  isPureIntervalsMode,
  onPureIntervalsModeChange,
  timeRange,
  onTimeRangeChange,
  hasCharts,
  onCloseAll,
}: RelativeTimeBarProps) {
  const { data: takData } = useTakMenu();
  const [isOpen, setIsOpen] = useState(false);

  // Local config states
  const [configMode, setConfigMode] = useState<'concepts' | 'group'>(
    config.selected_group_id ? 'group' : 'concepts'
  );
  const [draft, setDraft] = useState<RelativeTimeConfig>(config);
  const [draftConcepts, setDraftConcepts] = useState<ReferenceConcept[]>(
    config.reference_concepts && config.reference_concepts.length > 0
      ? config.reference_concepts
      : [{ concept_name: "", concept_value: undefined }]
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    config.selected_group_id || ""
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const [conceptDict, setConceptDict] = useState<Record<string, any>>({});
  const [conceptGroups, setConceptGroups] = useState<ConceptGroup[]>([]);

  // Sync draft and config modes when config changes (e.g. on reset or parent change)
  useEffect(() => {
    setDraft(config);
    setConfigMode(config.selected_group_id ? 'group' : 'concepts');
    setDraftConcepts(
      config.reference_concepts && config.reference_concepts.length > 0
        ? config.reference_concepts
        : [{ concept_name: "", concept_value: undefined }]
    );
    setSelectedGroupId(config.selected_group_id || "");
    setValidationError(null);
  }, [config]);

  // Load concept values dictionary (like in ManageConceptGroups)
  useEffect(() => {
    fetch(getApiUrl("/api/v1/concept/concept-values"))
      .then((res) => res.json())
      .then((data) => setConceptDict(data))
      .catch((err) => console.error("Failed to load concept values:", err));
  }, []);

  // Load concept groups when popover is open
  useEffect(() => {
    if (isOpen) {
      fetchConceptGroups()
        .then((data) => setConceptGroups(data))
        .catch((err) => console.error("Failed to load concept groups:", err));
    }
  }, [isOpen]);

  // Filter event-type concepts from the TAK menu (Event TAKs)
  const eventConcepts = useMemo(() => {
    if (!takData) return [];
    return takData
      .filter((item) => item.concept_type?.toLowerCase() === "event")
      .map((item) => item.name);
  }, [takData]);

  // Combined concepts list for dropdown/autocomplete options
  const allConceptsList = useMemo(() => {
    const set = new Set([...eventConcepts, ...Object.keys(conceptDict)]);
    return Array.from(set).sort();
  }, [eventConcepts, conceptDict]);

  const hasValidConfig =
    isEnabled && config.reference_concepts && config.reference_concepts.length > 0;

  const handleAddConceptRow = () => {
    setDraftConcepts([...draftConcepts, { concept_name: "", concept_value: undefined }]);
  };

  const handleRemoveConceptRow = (index: number) => {
    const updated = draftConcepts.filter((_, i) => i !== index);
    setDraftConcepts(updated.length > 0 ? updated : [{ concept_name: "", concept_value: undefined }]);
  };

  const handleConceptSelect = (index: number, conceptName: string) => {
    const updated = [...draftConcepts];
    updated[index] = {
      concept_name: conceptName,
      concept_value: undefined,
    };

    // Auto-choose defaults if concept details are available
    const details = conceptDict[conceptName];
    if (details) {
      if (typeof details.min === "number" && typeof details.max === "number") {
        updated[index].concept_value = `[${details.min}, ${details.max}]`;
      } else if (details.values && details.values.length === 1) {
        updated[index].concept_value = details.values[0];
      }
    }

    setDraftConcepts(updated);
  };

  const handleValueChange = (index: number, val: string) => {
    const updated = [...draftConcepts];
    updated[index].concept_value = val;
    setDraftConcepts(updated);
  };

  const handleRangeChange = (index: number, minStr: string, maxStr: string) => {
    const updated = [...draftConcepts];
    if (minStr === "" && maxStr === "") {
      updated[index].concept_value = undefined;
    } else {
      updated[index].concept_value = `[${minStr}, ${maxStr}]`;
    }
    setDraftConcepts(updated);
  };

  const handleApply = () => {
    if (configMode === 'concepts') {
      const validConcepts = draftConcepts.filter(rc => rc.concept_name.trim() !== "");
      
      // Perform same validation checks as ManageConceptGroups
      for (let i = 0; i < validConcepts.length; i++) {
        const rc = validConcepts[i];
        if (!rc.concept_name) {
          setValidationError(`Concept name is required in row ${i + 1}.`);
          return;
        }

        const details = conceptDict[rc.concept_name];
        const isEventTak = eventConcepts.includes(rc.concept_name);

        if (details && !isEventTak) {
          if (typeof details.min === "number" && typeof details.max === "number") {
            const minValStr = getRangeMin(rc.concept_value);
            const maxValStr = getRangeMax(rc.concept_value);
            if (minValStr === "" || maxValStr === "") {
              setValidationError(`Please specify both Min and Max for numeric concept "${rc.concept_name}" in row ${i + 1}.`);
              return;
            }
            const minVal = parseFloat(minValStr);
            const maxVal = parseFloat(maxValStr);
            if (minVal > maxVal) {
              setValidationError(`Min (${minVal}) cannot be greater than Max (${maxVal}) for concept "${rc.concept_name}" in row ${i + 1}.`);
              return;
            }
            if (minVal < details.min || maxVal > details.max) {
              setValidationError(`Subrange [${minVal}, ${maxVal}] is outside the allowed range [${details.min}, ${details.max}] for "${rc.concept_name}" in row ${i + 1}.`);
              return;
            }
          } else if (details.values && details.values.length > 0) {
            if (!rc.concept_value) {
              setValidationError(`Please select a value for categorical concept "${rc.concept_name}" in row ${i + 1}.`);
              return;
            }
          }
        }
      }

      setValidationError(null);
      onConfigChange({
        ...draft,
        reference_concepts: validConcepts,
        selected_group_id: undefined,
        selected_group_name: undefined,
      });
    } else {
      const group = conceptGroups.find(g => g._id === selectedGroupId);
      if (group) {
        const reference_concepts = group.concepts.map(c => ({
          concept_name: c.concept,
          concept_value: c.value !== undefined ? c.value : (c.min !== undefined && c.max !== undefined ? `[${c.min}, ${c.max}]` : undefined)
        }));
        setValidationError(null);
        onConfigChange({
          ...draft,
          reference_concepts,
          selected_group_id: group._id,
          selected_group_name: group.name,
        });
      }
    }
    setIsOpen(false);
  };

  const handleReset = () => {
    const defaultConfig: RelativeTimeConfig = {
      reference_concepts: [],
      occurrence_index: -1,
      start_delta: { value: 0, unit: "d" },
      end_delta: { value: 35, unit: "d" },
    };
    setDraft(defaultConfig);
    setDraftConcepts([{ concept_name: "", concept_value: undefined }]);
    setSelectedGroupId("");
    setValidationError(null);
    onConfigChange(defaultConfig);
  };

  // Determine if apply button should be disabled
  const isApplyDisabled =
    configMode === 'concepts'
      ? draftConcepts.some(c => !c.concept_name)
      : !selectedGroupId;

  const selectedGroup = useMemo(() => {
    return conceptGroups.find(g => g._id === selectedGroupId);
  }, [conceptGroups, selectedGroupId]);

  return (
    <div
      className={`border-b transition-all duration-300 ${isEnabled
        ? "bg-gradient-to-r from-emerald-950/60 via-green-950/50 to-emerald-950/60 border-emerald-400/40"
        : "bg-card border-border"
        }`}
    >
      <div className="px-6 py-2.5 flex flex-wrap items-center gap-4">
        {/* Time Picker */}
        <TimeRangePicker timeRange={timeRange} onTimeRangeChange={onTimeRangeChange} />

        {/* Separator */}
        <div className={`h-4 w-px ${isEnabled ? "bg-emerald-400/50" : "bg-border"} shrink-0 hidden sm:block`} />

        {/* Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            id="relative-time-toggle"
            checked={isEnabled}
            onCheckedChange={onToggle}
            className="data-[state=checked]:bg-emerald-500 h-4 w-8"
          />
          <Label
            htmlFor="relative-time-toggle"
            className={`text-sm font-semibold cursor-pointer flex items-center gap-1.5 ${isEnabled ? "text-emerald-100" : "text-muted-foreground"
              }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Relative Time
          </Label>
        </div>

        {/* Separator */}
        <div className={`h-4 w-px ${isEnabled ? "bg-emerald-400/50" : "bg-border"} shrink-0 hidden sm:block`} />

        {/* Pure Intervals Global Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            id="pure-intervals-toggle"
            checked={isPureIntervalsMode}
            onCheckedChange={onPureIntervalsModeChange}
            className="data-[state=checked]:bg-primary h-4 w-8"
          />
          <Label
            htmlFor="pure-intervals-toggle"
            className={`text-sm font-semibold cursor-pointer flex items-center gap-1.5 transition-colors ${
              isPureIntervalsMode ? (isEnabled ? "text-emerald-100" : "text-foreground font-bold") : (isEnabled ? "text-emerald-100/70" : "text-muted-foreground")
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Pure Intervals Mode
          </Label>
        </div>

        {/* Separator */}
        <div className={`h-4 w-px ${isEnabled ? "bg-emerald-400/50" : "bg-border"} shrink-0 hidden sm:block`} />

        {/* Use Generated Data Global Toggle */}
        <GlobalToggle labelClassName={isEnabled ? "text-emerald-100 font-semibold" : undefined} />

        {/* Separator */}
        <div className={`h-5 w-px ${isEnabled ? "bg-emerald-400/50" : "bg-border"} shrink-0`} />

        {/* Summary badges / configure button — only when enabled */}
        {isEnabled && (
          <>
            {hasValidConfig ? (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Reference concept badge */}
                {config.selected_group_name ? (
                  <Badge
                    variant="outline"
                    className="h-7 gap-1.5 text-xs font-semibold border-emerald-400/60 text-emerald-100 bg-emerald-900/50"
                  >
                    <Layers className="h-3 w-3" />
                    Group: {config.selected_group_name}
                  </Badge>
                ) : (
                  config.reference_concepts.map((rc, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="h-7 gap-1.5 text-xs font-semibold border-emerald-400/60 text-emerald-100 bg-emerald-900/50"
                    >
                      <Anchor className="h-3 w-3" />
                      {rc.concept_name}
                      {rc.concept_value ? `: ${rc.concept_value}` : ''}
                    </Badge>
                  ))
                )}

                {/* Occurrence badge */}
                <Badge
                  variant="outline"
                  className="h-7 gap-1.5 text-xs font-semibold border-green-400/60 text-green-100 bg-green-900/50"
                >
                  <Hash className="h-3 w-3" />
                  {formatOccurrence(config.occurrence_index)}
                </Badge>

                {/* Time window badge */}
                <Badge
                  variant="outline"
                  className="h-7 gap-1.5 text-xs font-semibold border-teal-400/60 text-teal-100 bg-teal-900/50"
                >
                  <CircleDot className="h-3 w-3" />
                  {formatDelta(config.start_delta)}
                  <ArrowRight className="h-2.5 w-2.5" />
                  {formatDelta(config.end_delta)}
                </Badge>
              </div>
            ) : (
              <span className="text-xs text-emerald-200 italic">
                No reference event selected — configure below
              </span>
            )}

            <div className="ml-auto flex items-center gap-2">
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs font-semibold gap-1.5 border-emerald-400/60 text-emerald-400 hover:bg-emerald-900/50 hover:text-white"
                  onClick={() => setIsOpen(true)}
                >
                  Configure
                  <ChevronDown className="h-3 w-3" />
                </Button>

                <DialogContent
                  className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto p-6 rounded-2xl border shadow-xl bg-card/95 backdrop-blur-sm"
                >
                  <DialogHeader className="pb-4 border-b">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Relative Time Configuration
                    </DialogTitle>
                    <DialogDescription>
                      Align all chart data relative to a reference event.
                    </DialogDescription>
                  </DialogHeader>

                  {/* Dialog Body - Non-scrollable layout (the entire DialogContent is scrollable via overflow-y-auto on DialogContent) */}
                  <div className="py-4 space-y-5 my-1 pr-1">
                    {/* Mode Selector */}
                    <div className="grid grid-cols-2 gap-1 bg-muted p-1 rounded-lg text-sm">
                      <button
                        type="button"
                        className={cn(
                          "py-2 rounded-md font-semibold transition-all",
                          configMode === 'concepts'
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => setConfigMode('concepts')}
                      >
                        Specific Concepts
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "py-2 rounded-md font-semibold transition-all",
                          configMode === 'group'
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => setConfigMode('group')}
                      >
                        Concept Group
                      </button>
                    </div>

                    {configMode === 'concepts' ? (
                      /* Specific Concepts Setup */
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <Label className="text-sm font-semibold">Concept Values Setup</Label>
                          <Button type="button" variant="outline" size="sm" onClick={handleAddConceptRow} className="text-xs h-8">
                            <Plus className="mr-1 h-3 w-3" /> Add Concept
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {draftConcepts.map((item, index) => {
                            const details = conceptDict[item.concept_name];
                            const isEventTak = eventConcepts.includes(item.concept_name);
                            const isCategorical = details && details.values !== undefined;
                            const isRange = details && typeof details.min === "number" && typeof details.max === "number";

                            return (
                              <div key={index} className="flex flex-col md:flex-row md:items-center gap-3 p-4 border rounded-xl bg-muted/20 backdrop-blur-sm relative group hover:border-muted-foreground/30 transition-all">
                                {/* Left Column: Concept Autocomplete (comfortably-sized) */}
                                <div className="flex-1 space-y-1.5 max-w-[240px]">
                                  <Label className="text-xs text-muted-foreground font-medium">Concept Name</Label>
                                  <ConceptAutocomplete
                                    concepts={allConceptsList}
                                    selected={item.concept_name}
                                    onSelect={(conceptName) => handleConceptSelect(index, conceptName)}
                                  />
                                </div>

                                {/* Right Column: Value input based on concept type (comfortably-sized) */}
                                <div className="flex-1 space-y-1.5 max-w-[240px]">
                                  <Label className="text-xs text-muted-foreground font-medium">Value Selection</Label>
                                  {!item.concept_name ? (
                                    <div className="text-xs text-muted-foreground italic h-8 border border-dashed rounded-lg flex items-center justify-center px-3 bg-background/30 border-muted-foreground/20">
                                      Please select a concept first
                                    </div>
                                  ) : isEventTak ? (
                                    <div className="text-xs text-emerald-600/80 font-medium italic h-8 border border-dashed rounded-lg flex items-center justify-center px-3 bg-background/30 border-muted-foreground/20">
                                      Event TAK (no value needed)
                                    </div>
                                  ) : isCategorical ? (
                                    <Select
                                      value={item.concept_value || ""}
                                      onValueChange={(val) => handleValueChange(index, val)}
                                    >
                                      <SelectTrigger className="w-full h-8 bg-background/50 border-muted-foreground/30 text-xs">
                                        <SelectValue placeholder="Select optional value..." />
                                      </SelectTrigger>
                                      <SelectContent className="max-h-[200px]">
                                        {details.values?.map((val: string) => (
                                          <SelectItem key={val} value={val} className="text-xs">
                                            {val}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : isRange ? (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <Input
                                          type="number"
                                          placeholder="Min"
                                          value={getRangeMin(item.concept_value)}
                                          onChange={(e) => handleRangeChange(index, e.target.value, getRangeMax(item.concept_value))}
                                          className="h-8 text-xs bg-background/50 border-muted-foreground/30 text-center w-20"
                                        />
                                        <span className="text-muted-foreground text-xs font-medium">to</span>
                                        <Input
                                          type="number"
                                          placeholder="Max"
                                          value={getRangeMax(item.concept_value)}
                                          onChange={(e) => handleRangeChange(index, getRangeMin(item.concept_value), e.target.value)}
                                          className="h-8 text-xs bg-background/50 border-muted-foreground/30 text-center w-20"
                                        />
                                      </div>
                                      <span className="text-[10px] text-muted-foreground block pl-1">
                                        Allowed range: {details.min} to {details.max}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="text-xs text-destructive flex items-center gap-1 h-8 pl-1">
                                      <AlertCircle className="h-4 w-4" /> Unknown concept type mapping.
                                    </div>
                                  )}
                                </div>

                                {/* Remove Button */}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-muted-foreground hover:text-destructive self-center h-8 w-8 shrink-0 hover:bg-destructive/10"
                                  onClick={() => handleRemoveConceptRow(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      /* Concept Group Selection */
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="concept-group-dropdown" className="text-sm font-semibold">Concept Group</Label>
                          <Select
                            value={selectedGroupId}
                            onValueChange={(val) => setSelectedGroupId(val)}
                          >
                            <SelectTrigger id="concept-group-dropdown" className="h-8 text-xs w-[240px] bg-background/50 border-muted-foreground/30">
                              <SelectValue placeholder="Select a concept group…" />
                            </SelectTrigger>
                            <SelectContent className="max-h-52 overflow-y-auto">
                              {conceptGroups.length > 0 ? (
                                conceptGroups.map((g) => (
                                  <SelectItem key={g._id} value={g._id} className="text-xs">
                                    {g.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="__none" disabled className="text-xs">
                                  No concept groups available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Readonly preview of group contents */}
                        {selectedGroup && (
                          <div className="p-4 rounded-xl border bg-muted/25 space-y-2.5 max-w-[500px]">
                            <h5 className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Group Preview</h5>
                            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                              {selectedGroup.concepts.map((c, i) => {
                                const detailStr = c.value ? `: ${c.value}` : `: [${c.min}, ${c.max}]`;
                                return (
                                  <Badge key={i} variant="secondary" className="text-[10px] py-0.5 px-2 bg-background text-foreground border border-border">
                                    {c.concept}{detailStr}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <hr className="border-border" />

                    {/* Occurrence Index & Time Window Section - Smaller, comfortable layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                      {/* Occurrence Index */}
                      <div className="space-y-2">
                        <Label htmlFor="occurrence-select" className="text-sm font-semibold">Occurrence</Label>
                        <Select
                          value={String(draft.occurrence_index)}
                          onValueChange={(v) =>
                            setDraft((d) => ({ ...d, occurrence_index: parseInt(v) }))
                          }
                        >
                          <SelectTrigger id="occurrence-select" className="h-8 text-xs w-[200px] bg-background/50 border-muted-foreground/30">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
                            {OCCURRENCE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Time window */}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Time Window (after event)</Label>
                        <div className="flex gap-4">
                          <DeltaInput
                            label="From"
                            delta={draft.start_delta}
                            onChange={(d) => setDraft((prev) => ({ ...prev, start_delta: d }))}
                          />
                          <DeltaInput
                            label="To"
                            delta={draft.end_delta}
                            onChange={(d) => setDraft((prev) => ({ ...prev, end_delta: d }))}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Use negative numbers to capture events <em>before</em> reference.
                        </p>
                      </div>
                    </div>

                    {/* Validation Error Banner */}
                    {validationError && (
                      <div className="text-xs text-destructive flex items-center gap-1.5 bg-destructive/10 p-2.5 rounded-lg border border-destructive/20 mt-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{validationError}</span>
                      </div>
                    )}
                  </div>

                  {/* Dialog Footer */}
                  <div className="flex justify-end pt-4 border-t gap-2 sm:gap-2">
                    <Button
                      variant="outline"
                      className="border-muted-foreground/30 h-8 text-xs"
                      onClick={handleReset}
                    >
                      Reset
                    </Button>
                    <Button
                      className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold h-8 text-xs"
                      onClick={handleApply}
                      disabled={isApplyDisabled}
                    >
                      Apply Configuration
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </>
      </div>
    </div>
  );
}
