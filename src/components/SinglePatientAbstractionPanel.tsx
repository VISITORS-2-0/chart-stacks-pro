import { useState, useMemo, useEffect } from 'react';
import { 
    ComposedChart, 
    Scatter, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    Cell,
    ReferenceLine as ReferenceLineOriginal,
    Brush as BrushOriginal
} from 'recharts';
const ReferenceLine = ReferenceLineOriginal as any;
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
            onMouseEnter={(e) => props.onHover?.(payload, { x: e.clientX, y: e.clientY })}
            onMouseMove={(e) => props.onHover?.(payload, { x: e.clientX, y: e.clientY })}
            onMouseLeave={() => props.onLeave?.()}
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
    className
}: SinglePatientAbstractionPanelProps) {
    // --- State ---
    const [selectedRefEventId, setSelectedRefEventId] = useState<string>(referenceEvents[0]?.id || "");
    const [zoomLevel, setZoomLevel] = useState<ZoomGranularity>('years');
    const [brushIndexes, setBrushIndexes] = useState<{ startIndex?: number; endIndex?: number }>({});
    
    // Custom Tooltip State
    const [hoveredInterval, setHoveredInterval] = useState<any | null>(null);
    const [tooltipPos, setTooltipPos] = useState<{ x: number, y: number } | null>(null);

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
        return intervals
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
    }, [intervals, referenceEvents, sortedValueLevels]);

    // Handle Click to Zoom
    const handleIntervalClick = (data: any) => {
        // Trigger external callback
        onIntervalClick?.(data);

        // Find index of this interval in chartData
        const index = chartData.findIndex(d => d.start === data.start && d.end === data.end && d.valueLabel === data.valueLabel);
        if (index !== -1) {
            // Check duration to auto-switch zoom context
            const interval = chartData[index];
            const durationDays = interval.durationMs / (1000 * 60 * 60 * 24);
            
            if (durationDays < 60) {
                setZoomLevel('days');
            }

            // Zoom EXACTLY to this item
            setBrushIndexes({ startIndex: index, endIndex: index });
        }
    };

    // Calculate Domain
    const xDomain = useMemo(() => {
        if (chartData.length === 0) return [0, 100];

        // Determine visible data slice
        const startIdx = brushIndexes.startIndex ?? 0;
        const endIdx = brushIndexes.endIndex ?? chartData.length - 1;
        
        // Safety clamp
        const safeStartIdx = Math.max(0, Math.min(startIdx, chartData.length - 1));
        const safeEndIdx = Math.min(chartData.length - 1, Math.max(endIdx, safeStartIdx));

        const visibleData = chartData.slice(safeStartIdx, safeEndIdx + 1);
        
        if (visibleData.length === 0) return [0, 100];

        const min = Math.min(...visibleData.map(d => d.start as number));
        const max = Math.max(...visibleData.map(d => d.end as number));

        // If single item, visual padding is 0 to show exact start/end match
        if (visibleData.length === 1) {
             return [min, max];
        }

        // Add padding otherwise
        const padding = (max - min) * 0.05;
        return [min - padding, max + padding];
    }, [chartData, brushIndexes]);

    // Dynamic Zoom Level Effect
    const durationMs = xDomain[1] - xDomain[0];
    
    useEffect(() => {
        const days = durationMs / (1000 * 60 * 60 * 24);
        let targetLevel: ZoomGranularity = 'years';
        
        if (days < 90) targetLevel = 'days';
        else if (days < 365 * 3) targetLevel = 'months';
        
        setZoomLevel(prev => {
            if (prev !== targetLevel) return targetLevel;
            return prev;
        });
    }, [durationMs]);
    


    // --- Formatters ---
    
    const xTickFormatter = (value: number) => {
        const d = new Date(value);
        if (zoomLevel === 'years') return d.getFullYear().toString();
        if (zoomLevel === 'months') return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const startDate = new Date(data.start);
            const endDate = new Date(data.end);

            const fmt = (d: Date) => d.toLocaleDateString(undefined, { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return (
                <div className="bg-popover border border-border text-popover-foreground rounded-md shadow-md p-3 text-sm">
                   <div className="font-semibold mb-1">{data.valueLabel}</div>
                   <div className="text-muted-foreground text-xs grid gap-1">
                        <div><span className="font-medium">Start:</span> {fmt(startDate)}</div> 
                        <div><span className="font-medium">End:</span> {fmt(endDate)}</div>
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
        if (range < 30) setZoomLevel('days');
        else if (range < 365) setZoomLevel('months');
    };

    const handleZoomOut = () => {
        const currentStart = brushIndexes.startIndex ?? 0;
        const currentEnd = brushIndexes.endIndex ?? chartData.length - 1;
        const range = currentEnd - currentStart;

        if (range >= chartData.length - 1) return; // Max Zoom Out

        const newRange = Math.min(chartData.length, range * 2);
        const center = currentStart + Math.floor(range / 2);
        
        let newStart = center - Math.floor(newRange / 2);
        let newEnd = center + Math.floor(newRange / 2);

        if (newStart < 0) { newStart = 0; newEnd = Math.min(chartData.length - 1, newRange); }
        if (newEnd >= chartData.length) { newEnd = chartData.length - 1; newStart = Math.max(0, chartData.length - 1 - newRange); }

        setBrushIndexes({ startIndex: newStart, endIndex: newEnd });
        
        // Update Label approximation
        if (newRange > 365) setZoomLevel('years');
        else if (newRange > 30) setZoomLevel('months');
    };

    const handleResetZoom = () => {
        if (chartData.length > 0) {
            setBrushIndexes({ startIndex: 0, endIndex: chartData.length - 1 });
        } else {
             setBrushIndexes({});
        }
        setZoomLevel('years');
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
                    
                    {/* Zoom Controls */}
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut} disabled={zoomLevel === 'years'}>
                            <ZoomOut className="w-4 h-4" />
                        </Button>
                        <span className="text-xs font-mono w-12 text-center capitalize">{zoomLevel}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn} disabled={zoomLevel === 'days'}>
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
                            >
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="hsl(var(--border))" />
                            
                            {/* X Axis: Time */}
                            <XAxis 
                                type="number" 
                                dataKey="start" 
                                domain={xDomain} 
                                tickFormatter={xTickFormatter}
                        stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                            />
                            
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

                            {/* Intervals as custom shapes */}
                            <Scatter 
                                shape={<IntervalBar onHover={(d: any, pos: any) => {
                                    setHoveredInterval(d);
                                    setTooltipPos(pos);
                                }} onLeave={() => {
                                    setHoveredInterval(null);
                                    setTooltipPos(null);
                                }} />} 
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

                {/* Manual Tooltip Portal */}
                {hoveredInterval && tooltipPos && (
                    <div 
                        className="fixed z-50 pointer-events-none"
                        style={{ 
                            left: tooltipPos.x + 10, 
                            top: tooltipPos.y + 10 
                        }}
                    >
                        <div className="bg-popover border border-border text-popover-foreground rounded-md shadow-md p-3 text-sm animate-in fade-in-0 zoom-in-95">
                            <div className="font-semibold mb-1">{hoveredInterval.valueLabel}</div>
                            <div className="text-muted-foreground text-xs grid gap-1">
                                <div><span className="font-medium">Start:</span> {new Date(hoveredInterval.start).toLocaleDateString()}</div> 
                                <div><span className="font-medium">End:</span> {new Date(hoveredInterval.end).toLocaleDateString()}</div>
                                {hoveredInterval.contextId && <div>Context: {hoveredInterval.contextId}</div>}
                                {hoveredInterval.provenance && <div>Source: {hoveredInterval.provenance}</div>}
                            </div>
                        </div>
                    </div>
                )}

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
