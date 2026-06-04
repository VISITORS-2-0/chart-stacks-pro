import { useState, useMemo, useEffect } from "react";
import {
  Clock,
  ChevronDown,
  Anchor,
  Hash,
  ArrowRight,
  CircleDot,
  Layers,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useTakMenu } from "@/services/takApi";
import type { RelativeTimeConfig, RelativeTimeDelta } from "@/api/temporal";

export type { RelativeTimeConfig };

interface RelativeTimeBarProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  config: RelativeTimeConfig;
  onConfigChange: (config: RelativeTimeConfig) => void;
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

const DeltaInput = ({
  label,
  delta,
  onChange,
}: {
  label: string;
  delta: RelativeTimeDelta;
  onChange: (d: RelativeTimeDelta) => void;
}) => (
  <div className="flex flex-col gap-1">
    <Label className="text-xs text-muted-foreground uppercase tracking-wide">
      {label}
    </Label>
    <div className="flex gap-1.5 items-center">
      <Input
        type="number"
        min={0}
        value={delta.value}
        onChange={(e) =>
          onChange({ ...delta, value: Math.max(0, parseInt(e.target.value) || 0) })
        }
        className="w-16 h-8 text-sm text-center"
      />
      <Select
        value={delta.unit}
        onValueChange={(v) => onChange({ ...delta, unit: v as RelativeTimeDelta["unit"] })}
      >
        <SelectTrigger className="w-24 h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIME_UNITS.map((u) => (
            <SelectItem key={u.value} value={u.value}>
              {u.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>
);

const formatDelta = (d: RelativeTimeDelta) =>
  `${d.value}${d.unit}`;

const formatOccurrence = (idx: number) => {
  const opt = OCCURRENCE_OPTIONS.find((o) => o.value === String(idx));
  return opt?.label ?? `Occurrence #${idx}`;
};

export function RelativeTimeBar({
  isEnabled,
  onToggle,
  config,
  onConfigChange,
}: RelativeTimeBarProps) {
  const { data: takData } = useTakMenu();
  const [isOpen, setIsOpen] = useState(false);

  // Local editable state inside the popover
  const [draft, setDraft] = useState<RelativeTimeConfig>(config);

  // Sync draft when external config changes (e.g. reset)
  useEffect(() => {
    setDraft(config);
  }, [config]);

  // Filter event-type concepts from the TAK menu
  const eventConcepts = useMemo(() => {
    if (!takData) return [];
    return takData
      .filter((item) => item.concept_type?.toLowerCase() === "event")
      .map((item) => item.name);
  }, [takData]);

  const hasValidConfig =
    isEnabled && config.reference_concept.trim() !== "";

  const handleApply = () => {
    onConfigChange(draft);
    setIsOpen(false);
  };

  const handleReset = () => {
    const defaultConfig: RelativeTimeConfig = {
      reference_concept: "",
      reference_value: null,
      occurrence_index: -1,
      start_delta: { value: 0, unit: "d" },
      end_delta: { value: 35, unit: "d" },
    };
    setDraft(defaultConfig);
    onConfigChange(defaultConfig);
  };

  return (
    <div
      className={`border-b transition-all duration-300 ${isEnabled
        ? "bg-gradient-to-r from-emerald-950/60 via-green-950/50 to-emerald-950/60 border-emerald-400/40"
        : "bg-card border-border"
        }`}
    >
      <div className="px-6 py-2.5 flex items-center gap-4">
        {/* Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            id="relative-time-toggle"
            checked={isEnabled}
            onCheckedChange={onToggle}
            className="data-[state=checked]:bg-emerald-500"
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
        <div className={`h-5 w-px ${isEnabled ? "bg-emerald-400/50" : "bg-border"}`} />

        {/* Summary badges / configure button — only when enabled */}
        {isEnabled ? (
          <>
            {hasValidConfig ? (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Reference concept badge */}
                <Badge
                  variant="outline"
                  className="h-7 gap-1.5 text-xs font-semibold border-emerald-400/60 text-emerald-100 bg-emerald-900/50"
                >
                  <Anchor className="h-3 w-3" />
                  {config.reference_concept}
                </Badge>

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
              <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs font-semibold gap-1.5 border-emerald-400/60 text-emerald-400 hover:bg-emerald-900/50 hover:text-white"
                  >
                    Configure
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent
                  className="w-80 p-4 space-y-5"
                  align="end"
                  sideOffset={6}
                >
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold">Relative Time Configuration</h4>
                    <p className="text-xs text-muted-foreground">
                      Align all chart data relative to a reference event.
                    </p>
                  </div>

                  {/* Reference Event */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <Anchor className="h-3 w-3" />
                      Reference Event
                    </Label>
                    <Select
                      value={draft.reference_concept}
                      onValueChange={(v) =>
                        setDraft((d) => ({ ...d, reference_concept: v }))
                      }
                    >
                      <SelectTrigger className="h-8 text-sm w-full">
                        <SelectValue placeholder="Select an event…" />
                      </SelectTrigger>
                      <SelectContent className="max-h-52 overflow-y-auto">
                        {eventConcepts.length > 0 ? (
                          eventConcepts.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__none" disabled>
                            No events available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Occurrence Index */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      Occurrence
                    </Label>
                    <Select
                      value={String(draft.occurrence_index)}
                      onValueChange={(v) =>
                        setDraft((d) => ({ ...d, occurrence_index: parseInt(v) }))
                      }
                    >
                      <SelectTrigger className="h-8 text-sm w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OCCURRENCE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Time window */}
                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <CircleDot className="h-3 w-3" />
                      Time Window (after event)
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
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
                    <p className="text-xs text-muted-foreground">
                      Negative values show data <em>before</em> the event.
                    </p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={handleReset}
                    >
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                      onClick={handleApply}
                      disabled={!draft.reference_concept}
                    >
                      Apply
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">
            Enable to view data relative to a reference event
          </span>
        )}
      </div>
    </div>
  );
}
