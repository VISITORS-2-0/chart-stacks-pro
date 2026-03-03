import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
    ComposedChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceArea as ReferenceAreaOriginal,
    Brush as BrushOriginal,
    ReferenceLine as ReferenceLineOriginal
} from 'recharts';
const ReferenceLine = ReferenceLineOriginal as any;
const ReferenceArea = ReferenceAreaOriginal as any;
const Brush = BrushOriginal as any;
import {
    Info,
    ZoomIn,
    ZoomOut,
    Calendar,
    Settings2,
    Maximize2
} from "lucide-react";
import { Button as ButtonOriginal } from "@/components/ui/button";
const Button = ButtonOriginal as any;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// --- Types ---
export interface AbstractionInterval {
    start: Date | string;
    end: Date | string;
    valueLabel: string;
    valueOrderIndex: number; // 0-based index corresponding to y-axis level
    contextId?: string;
    provenance?: string;
    meta?: any;
}

export interface ValueLevel {
    label: string;
    order: number;
    color?: string; // Optional custom color per level
}

export interface ReferenceEvent {
    id: string;
    type: string;
    time: Date | string;
    label?: string;
}

interface SinglePatientAbstractionPanelProps {
    patientId: string;
    conceptId: string;
    conceptDisplayName: string;
    intervals: AbstractionInterval[];
    valueLevels: ValueLevel[];
    // Initial State
    initialTimelineMode?: "absolute" | "relative";
    referenceEvents?: ReferenceEvent[];
    // Callbacks
    onIntervalClick?: (interval: AbstractionInterval) => void;
    onOpenConcept?: (conceptId: string) => void;
    onDrillDown?: (dateStr: string) => void;
    onZoomOut?: () => void;
    zoomLevel?: 'years' | 'months' | 'days';
    className?: string;
}

type ZoomGranularity = 'years' | 'months' | 'days';

// --- Helper Components ---

// Custom Shape for the Gantt Bars
const IntervalBar = (props: any) => {
    const { cx, cy, payload, xAxis, yAxis, height } = props;

    // Safety check
    if (!payload || !xAxis || !yAxis) return null;

    // Calculate x/width based on time
    // payload.start and payload.end are numeric timestamps
    const x1 = xAxis.scale(payload.start);
    const x2 = xAxis.scale(payload.end);

    const barHeight = 24; // Fixed height or calculated based on bandwidth
    const width = Math.max(x2 - x1, 2); // Min width 2px for visibility

    // yAxis.scale(val) gives the center position for categorical axis
    // We want to center the bar on that y

    const barY = cy - barHeight / 2;

    return (
        <rect
            x={x1}
            y={barY}
            width={width}
            height={barHeight}
            fill={payload.color || "#8884d8"}
            rx={2}
            ry={2}
            className="transition-opacity hover:opacity-80 cursor-pointer"
        />
    );
};

// --- Main Component ---

export function SinglePatientAbstractionPanel({
    patientId,
    conceptId,
    conceptDisplayName,
    intervals,
    valueLevels,
    initialTimelineMode = "absolute",
    referenceEvents = [],
    onIntervalClick,
    onOpenConcept,
    onDrillDown,
    onZoomOut,
    zoomLevel: propZoomLevel,
    className
}: SinglePatientAbstractionPanelProps) {
    // --- State ---
    const [selectedRefEventId, setSelectedRefEventId] = useState<string>(referenceEvents[0]?.id || "");
    // Use prop zoom level if available, otherwise internal state
    const [internalZoomLevel, setInternalZoomLevel] = useState<ZoomGranularity>('years');
    const zoomLevel = propZoomLevel || internalZoomLevel;

    const [brushIndexes, setBrushIndexes] = useState<{ startIndex?: number; endIndex?: number }>({});
    const brushIndexesRef = useRef(brushIndexes);
    const [hoveredRange, setHoveredRange] = useState<{ start: number, end: number } | null>(null);

    // Keep ref in sync
    useEffect(() => {
        brushIndexesRef.current = brushIndexes;
    }, [brushIndexes]);

    const chartDataRef = useRef<any[]>([]);

    // Reset Brush when data changes significantly (e.g. parent zoom/drill down)
    useEffect(() => {
        setBrushIndexes({});
        // Ref sync happens in the other effect, but good to be safe if order matters (it shouldn't here)
    }, [intervals]); // Intervals change when parent filters data

    // --- Data Processing ---

    // Sort levels safely
    // Sort levels safely. 
    // We want "Very High" at the Top and "Very Low" at the Bottom.
    // In Recharts Vertical Layout (Category Axis as Y), the first item in domain is rendered at the BOTTOM.
    // So we should sort Ascending (0=Very Low -> Bottom, 4=Very High -> Top).
    const sortedValueLevels = useMemo(() => {
        // Recharts Vertical Layout renders category domain Top-to-Bottom by default (index 0 at top).
        // User wants Very High at Top, Very Low at Bottom.
        // So we need: [Very High, High, ..., Low, Very Low]
        return [...valueLevels].sort((a, b) => b.order - a.order);
    }, [valueLevels]);

    const yDomain = useMemo(() => sortedValueLevels.map(l => l.label), [sortedValueLevels]);

    // Flatten intervals for the scatter chart
    const chartData = useMemo(() => {
        const data = intervals
            .map(interval => {
                const start = new Date(interval.start).getTime();
                const end = new Date(interval.end).getTime();
                return { ...interval, start, end, origStart: start, origEnd: end };
            })
            .sort((a, b) => a.start - b.start) // Sort by start time for Brush
            .map(interval => {
                const start = interval.start;
                const end = interval.end;

                // Find color
                const level = sortedValueLevels.find(l => l.label === interval.valueLabel);
                const color = level?.color || "hsl(var(--primary))";

                return {
                    ...interval,
                    start,
                    end,
                    y: interval.valueLabel, // Categorical Y value
                    durationMs: end - start, // Actual duration for tooltip
                    color
                };
            });

        chartDataRef.current = data;
        return data;
    }, [intervals, referenceEvents, sortedValueLevels]);

    // Handle Click to Zoom
    const handleIntervalClick = (data: any) => {
        // Trigger external callback
        onIntervalClick?.(data);

        // Find index of this interval in chartData
        const index = chartData.findIndex(d => d.start === data.start && d.end === data.end && d.valueLabel === data.valueLabel);
        if (index !== -1) {
            // Zoom EXACTLY to this item
            setBrushIndexes({ startIndex: index, endIndex: index });
        }
    };




    // --- Formatters ---

    // Use useCallback and refs to keep function identity stable
    const xTickFormatter = useCallback((value: number) => {
        const d = new Date(value);

        // Use Refs to avoid dependency on state (which causes function recreation)
        const currentBrush = brushIndexesRef.current;
        const currentData = chartDataRef.current;

        const startIdx = currentBrush.startIndex ?? 0;
        const endIdx = currentBrush.endIndex ?? (currentData.length > 0 ? currentData.length - 1 : 0);

        if (currentData.length > 0) {
            const rangeStart = currentData[startIdx]?.origStart || currentData[startIdx]?.start as number;
            const rangeEnd = currentData[endIdx]?.origEnd || currentData[endIdx]?.end as number;
            const durationMs = rangeEnd - rangeStart;

            const DAYS_MS = 86400000;
            if (durationMs > 365 * DAYS_MS) return d.getFullYear().toString();
            if (durationMs > 60 * DAYS_MS) return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        }

        // Fallback
        if (zoomLevel === 'years') return d.getFullYear().toString();
        if (zoomLevel === 'months') return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }, [zoomLevel]);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;

            // data.start is absolute timestamp now


            // We need to fetch the original absolute time for display even in relative mode,
            // Or just re-calculate it. 
            // Better: 'data' has the original props merged in? 
            // Yes, we spread ...interval into chartData.
            // But wait, interval.start was Date|string. 
            // Let's rely on the original interval data we passed through.

            const rawStart = new Date(data.start as any); // This is what comes from chartData, which might be relative offset

            // Actually, let's just use the original fields we passed:
            // But we stored displayStart in 'start'.
            // Let's look at passed props. 
            // We should trust the 'data' object which contains everything from chartData map.
            // We need to be careful: payload[0].payload is the object from chartData.

            // Let's recalculate absolute times for display just to be safe/clear
            // Actually, we should probably pass 'originalStart' and 'originalEnd' in chartData to avoid confusion.
            // But we can just use the provided formatted dates if we want.

            return (
                <div className="bg-popover border border-border text-popover-foreground rounded-md shadow-md p-3 text-sm">
                    <div className="font-semibold mb-1">{data.valueLabel}</div>
                    <div className="text-muted-foreground text-xs grid gap-1">
                        <div>Start: {data.start}</div>
                        <div>End: {data.end}</div>
                        {/* Note: The above are raw numeric/relative values. Ideally we format them nice. */}
                        {data.contextId && <div>Context: {data.contextId}</div>}
                        {data.provenance && <div>Source: {data.provenance}</div>}
                    </div>
                </div>
            );
        }
        return null;
    };

    // --- Handlers ---

    const handleZoomIn = () => {
        const currentStart = brushIndexes.startIndex ?? 0;
        const currentEnd = brushIndexes.endIndex ?? chartData.length - 1;
        const range = currentEnd - currentStart;

        if (range <= 4) return; // Max Zoom

        const newRange = Math.floor(range / 2);
        const center = currentStart + Math.floor(range / 2);

        let newStart = center - Math.floor(newRange / 2);
        let newEnd = center + Math.floor(newRange / 2);

        // Clamp
        if (newStart < 0) {
            newEnd = Math.min(chartData.length - 1, newEnd + (-newStart));
            newStart = 0;
        }
        if (newEnd >= chartData.length) {
            newStart = Math.max(0, newStart - (newEnd - (chartData.length - 1)));
            newEnd = chartData.length - 1;
        }

        setBrushIndexes({ startIndex: newStart, endIndex: newEnd });

        // Update Label approximation
        // Only update internal zoom level if not controlled by parent
        if (!propZoomLevel) {
            if (range < 30) setInternalZoomLevel('days');
            else if (range < 365) setInternalZoomLevel('months');
        }
    };

    const handleLocalZoomOut = () => {
        const currentStart = brushIndexes.startIndex ?? 0;
        const currentEnd = brushIndexes.endIndex ?? chartData.length - 1;
        const range = currentEnd - currentStart;

        if (range >= chartData.length - 1) return; // Max Zoom Out locally

        const newRange = Math.min(chartData.length, range * 2);
        const center = currentStart + Math.floor(range / 2);

        let newStart = center - Math.floor(newRange / 2);
        let newEnd = center + Math.floor(newRange / 2);

        if (newStart < 0) { newStart = 0; newEnd = Math.min(chartData.length - 1, newRange); }
        if (newEnd >= chartData.length) { newEnd = chartData.length - 1; newStart = Math.max(0, chartData.length - 1 - newRange); }

        setBrushIndexes({ startIndex: newStart, endIndex: newEnd });

        // Update Label approximation
        if (!propZoomLevel) {
            if (newRange > 365) setInternalZoomLevel('years');
            else if (newRange > 30) setInternalZoomLevel('months');
        }
    };

    const handleZoomOutWrapper = () => {
        const currentStart = brushIndexes.startIndex ?? 0;
        const currentEnd = brushIndexes.endIndex ?? chartData.length - 1;

        // If not fully zoomed out locally, zoom out locally first
        if (currentStart > 0 || currentEnd < chartData.length - 1) {
            handleLocalZoomOut();
        } else {
            // Otherwise, trigger parent drill up
            if (onZoomOut) onZoomOut();
        }
    };

    const handleResetZoom = () => {
        if (chartData.length > 0) {
            setBrushIndexes({ startIndex: 0, endIndex: chartData.length - 1 });
        } else {
            setBrushIndexes({});
        }
        if (!propZoomLevel) setInternalZoomLevel('years');
        if (onZoomOut) onZoomOut(); // Trigger parent zoom out
    };

    return (
        <Card className={`w-full flex flex-col border-border shadow-sm ${className}`}>
            {/* Header Chrome */}
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b border-border bg-card/50">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            {conceptDisplayName}
                            <span className="text-muted-foreground font-normal text-sm">Patient: {patientId}</span>
                        </CardTitle>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Controls */}

                    {/* Zoom Controls (Internal or External) */}
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOutWrapper} title="Zoom Out / Drill Up">
                            <ZoomOut className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn} title="Zoom In">
                            <ZoomIn className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Meta/Info */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Info className="w-4 h-4 text-muted-foreground" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                            <div className="grid gap-4">
                                <h4 className="font-medium leading-none">Abstraction Details</h4>
                                <p className="text-sm text-muted-foreground">
                                    Concept ID: {conceptId}
                                </p>
                                <div className="grid gap-2">
                                    {onOpenConcept && (
                                        <Button variant="link" className="p-0 h-auto justify-start" onClick={() => onOpenConcept(conceptId)}>
                                            View Concept Definition
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </CardHeader>

            <CardContent className="flex-1 p-0 min-h-[400px] relative group">
                {/* Main Plot */}
                <div className="w-full h-[400px] p-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={chartData}
                            layout="vertical"
                            margin={{ top: 20, right: 30, left: 40, bottom: 20 }}
                            onMouseMove={(e: any) => {
                                // Mimic PatientMultiLineChart highlight logic
                                if (onDrillDown && e && e.activeLabel) {
                                    // activeLabel for Number Axis is the value
                                    const time = Number(e.activeLabel); // Should be timestamp
                                    if (!isNaN(time)) {
                                        const date = new Date(time);
                                        let start, end;

                                        if (zoomLevel === 'years') {
                                            start = new Date(date.getFullYear(), 0, 1).getTime();
                                            end = new Date(date.getFullYear(), 11, 31, 23, 59, 59).getTime();
                                        } else if (zoomLevel === 'months') {
                                            start = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
                                            end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).getTime();
                                        } else {
                                            start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
                                            end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).getTime();
                                        }

                                        // Only update if changed
                                        if (!hoveredRange || hoveredRange.start !== start || hoveredRange.end !== end) {
                                            setHoveredRange({ start, end });
                                        }
                                    }
                                } else {
                                    if (hoveredRange !== null) setHoveredRange(null);
                                }
                            }}
                            onMouseLeave={() => setHoveredRange(null)}
                            onClick={(e: any) => {
                                if (onDrillDown && e && e.activeLabel) {
                                    const date = new Date(Number(e.activeLabel));
                                    if (!isNaN(date.getTime())) {
                                        onDrillDown(date.toISOString());
                                    }
                                }
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="hsl(var(--border))" />

                            {/* X Axis: Time */}
                            <XAxis
                                type="number"
                                dataKey="start"
                                domain={['auto', 'auto']}
                                tickFormatter={xTickFormatter}
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                allowDataOverflow={true} // Allow zooming
                            />

                            {/* Hover Highlight Area */}
                            {hoveredRange && (
                                <ReferenceArea
                                    x1={hoveredRange.start}
                                    x2={hoveredRange.end}
                                    fill="hsl(var(--muted-foreground))"
                                    fillOpacity={0.1}
                                    ifOverflow="extendDomain"
                                />
                            )}

                            {/* Y Axis: Categories */}
                            <YAxis
                                type="category"
                                dataKey="y"
                                width={100}
                                stroke="hsl(var(--foreground))"
                                fontSize={12}
                                allowDuplicatedCategory={false}
                                domain={yDomain}
                            />

                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />

                            {/* Intervals as custom shapes */}
                            {/* Intervals as custom shapes */}
                            <Scatter
                                shape={<IntervalBar />}
                                onClick={(data) => handleIntervalClick(data.payload)}
                            />



                            <Brush
                                dataKey="start"
                                height={30}
                                stroke="#8884d8"
                                tickFormatter={xTickFormatter}
                                startIndex={brushIndexes.startIndex}
                                endIndex={brushIndexes.endIndex}
                                onChange={(e: any) => {
                                    if (e) setBrushIndexes({ startIndex: e.startIndex, endIndex: e.endIndex });
                                }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* Optional: Navigation/Brush could go here if we want the 'mini-map' style */}
                <div className="absolute bottom-5 right-5 z-10">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 text-xs shadow-sm bg-background border border-border opacity-75 hover:opacity-100 transition-opacity"
                        onClick={handleResetZoom}
                        title="Reset View"
                    >
                        <Maximize2 className="w-3 h-3 mr-1" /> Reset
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
