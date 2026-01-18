import React, { useMemo, useState } from 'react';
import { ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, Scatter } from 'recharts';
import { TemporalRow } from '../types/temporal';

interface PatientStateGanttProps {
    data: TemporalRow[];
    zoomLevel?: 'years' | 'months' | 'days';
    onDrillDown?: (dateStr: string) => void;
    conceptData?: any;
    onZoomOut?: () => void;
}

// Custom Shape to render the "Gantt" bars using Scatter points
// We use the start/end time from the payload to draw the rect
const GanttBar = (props: any) => {
    const { cx, cy, payload, xAxis, yAxis } = props;
    if (!xAxis || !yAxis || !payload) return null;

    // Calculate Coordinates
    // cx, cy are the coordinates of the "point" (start time, category center)
    // We need to calculate the width based on duration

    // xAxis scale maps timestamp -> pixel x
    const xStart = xAxis.scale(payload.start);
    const xEnd = xAxis.scale(payload.end);

    const width = Math.max(Math.abs(xEnd - xStart), 3); // Min width 3px for visibility
    const height = 26; // Bar height

    // Center bar vertically around cy
    const y = cy - (height / 2);

    return (
        <g>
            <rect
                x={xStart}
                y={y}
                width={width}
                height={height}
                fill={payload.fill}
                rx={3}
                ry={3}
                stroke={payload.stroke}
                strokeWidth={1}
                className="transition-opacity hover:opacity-80"
                style={{ pointerEvents: 'none' }} // Let mouse events pass to chart for zoom logic
            />
        </g>
    );
};

export function PatientStateGantt({ data, zoomLevel = 'years', onDrillDown, conceptData }: PatientStateGanttProps) {
    const [hoveredRange, setHoveredRange] = useState<{ start: number, end: number } | null>(null);

    // 1. Process Categories (Y-Axis)
    const categories = useMemo(() => {
        if (conceptData?.allowed_values?.values) {
            return conceptData.allowed_values.values;
        }
        // Fallback: Derived from data
        const vals = new Set(data.map(d => String(d.Value)));
        return Array.from(vals).sort();
    }, [conceptData, data]);

    // 2. Generate Gradient Colors
    const colorMap = useMemo(() => {
        const map: Record<string, string> = {};
        const len = categories.length;

        // Gradient Strategy: HSL from startHue to endHue
        // User requested "gradient colors by the order of the values"
        // Let's go from Purple/Blue (Cool) to Red/Orange (Warm)
        const startHue = 260; // Purple
        const endHue = 0;     // Red

        categories.forEach((cat: string, i: number) => {
            const ratio = len > 1 ? i / (len - 1) : 0;
            const hue = startHue - (ratio * (startHue - endHue));
            map[cat] = `hsl(${hue}, 70%, 55%)`; // Moderate saturation/lightness
        });
        return map;
    }, [categories]);

    // 3. Process Data for Chart
    const chartData = useMemo(() => {
        return data.map((d, i) => {
            const start = new Date(d.StartTime).getTime();
            let end = d.EndTime ? new Date(d.EndTime).getTime() : start;
            if (end < start) end = start;

            const val = String(d.Value);
            const yIndex = categories.indexOf(val); // Map to numeric index

            return {
                id: i,
                x: start,
                y: yIndex,   // Numeric Y for Scatter placement
                start: start,
                end: end,
                value: val,
                fill: colorMap[val] || '#888',
                stroke: 'transparent'
            };
        });
    }, [data, colorMap, categories]);

    // 4. Calculate X-Axis Domain & Ticks (Logic copied from PatientMultiLineChart)
    // We must generate ticks that cover the full range for the "Grid" trick
    const { xDomain, ticks } = useMemo(() => {
        if (!chartData.length) return { xDomain: ['dataMin', 'dataMax'], ticks: [] };

        // ... (Same domain logic as before) ...
        const allPoints = chartData.flatMap(d => [d.start, d.end]);
        const minTime = Math.min(...allPoints);
        const maxTime = Math.max(...allPoints);

        const minDate = new Date(minTime);
        let startDomain = minTime;
        let endDomain = maxTime;

        if (zoomLevel === 'years') {
            const startYear = minDate.getFullYear();
            let endYear = new Date(maxTime).getFullYear();
            if (endYear - startYear < 5) endYear = startYear + 4;
            startDomain = new Date(startYear, 0, 1).getTime();
            endDomain = new Date(endYear, 11, 31, 23, 59, 59).getTime();
        } else if (zoomLevel === 'months') {
            const y = minDate.getFullYear();
            startDomain = new Date(y, 0, 1).getTime();
            endDomain = new Date(y, 11, 31, 23, 59, 59).getTime();
        } else {
            const y = minDate.getFullYear();
            const m = minDate.getMonth();
            startDomain = new Date(y, m, 1).getTime();
            const lastDay = new Date(y, m + 1, 0).getDate();
            endDomain = new Date(y, m, lastDay, 23, 59, 59).getTime();
        }

        // Generate Ticks for Interaction
        const generatedTicks = [];
        let curr = new Date(startDomain);
        const end = new Date(endDomain);
        while (curr.getTime() <= end.getTime()) {
            generatedTicks.push(curr.getTime());
            if (zoomLevel === 'years') curr.setFullYear(curr.getFullYear() + 1);
            else if (zoomLevel === 'months') curr.setMonth(curr.getMonth() + 1);
            else curr.setDate(curr.getDate() + 1);
        }
        return { xDomain: [startDomain, endDomain], ticks: generatedTicks };
    }, [chartData, zoomLevel]);

    // 5. Interaction Handlers
    const handleMouseMove = (e: any) => {
        if (e && e.activeLabel) {
            const time = Number(e.activeLabel);
            if (!isNaN(time)) {
                // Calculate range based on active tick
                const date = new Date(time);
                let start, end;
                const year = date.getFullYear();

                if (zoomLevel === 'years') {
                    start = new Date(year, 0, 1).getTime();
                    end = new Date(year, 11, 31, 23, 59, 59).getTime();
                } else if (zoomLevel === 'months') {
                    const month = date.getMonth();
                    start = new Date(year, month, 1).getTime();
                    end = new Date(year, month + 1, 0, 23, 59, 59).getTime();
                } else {
                    const month = date.getMonth();
                    const day = date.getDate();
                    start = new Date(year, month, day).getTime();
                    end = new Date(year, month, day, 23, 59, 59).getTime();
                }
                setHoveredRange({ start, end });
            }
        } else {
            setHoveredRange(null);
        }
    };

    const handleClick = (e: any) => {
        if (onDrillDown && e && e.activeLabel) {
            const date = new Date(Number(e.activeLabel));
            if (!isNaN(date.getTime())) {
                onDrillDown(date.toISOString());
            }
        }
    };

    // Formatters
    const tickFormatter = (time: number) => {
        const d = new Date(time);
        if (zoomLevel === 'years') return d.getFullYear().toString();
        if (zoomLevel === 'months') return d.toLocaleDateString(undefined, { month: 'short' });
        return d.getDate().toString();
    };

    // Tooltip
    // We only want to show the tool tip for the CHART ITEMS (the Gantt bars)
    // But Recharts Shared Tooltip shows for everything active.
    // We can filter inside content.
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            // Find the payload item corresponding to the Gantt Bar (from "chartData")
            // The "interaction" scatter layer has empty payload mostly or just time.
            // Filter dummy interaction
            const ganttItem = payload.find((p: any) => p.payload && p.payload.value);

            if (ganttItem) {
                const d = ganttItem.payload;
                return (
                    <div className="bg-popover text-popover-foreground border border-border p-3 rounded shadow-lg text-xs z-50">
                        <div className="font-bold mb-1" style={{ color: d.fill }}>{d.value}</div>
                        <div>Start: {new Date(d.start).toLocaleString()}</div>
                        <div>End: {new Date(d.end).toLocaleString()}</div>
                        <div>Duration: {Math.round((d.end - d.start) / (1000 * 60 * 60))} hrs</div>
                    </div>
                );
            }
        }
        return null;
    };

    // Dummy Data for Interaction Layer
    // We need points at every tick to ensure the mouse move triggers 'activeLabel' everywhere
    const interactionLayerData = useMemo(() => {
        // use -0.5 or 0 as Y to ensure it's in view? 
        // With numeric axis, we can just use 0.
        return ticks.map(t => ({
            time: t,
            y: 0,
            dummy: true
        }));
    }, [ticks]);

    return (
        <div className="w-full h-full p-4 relative select-none">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoveredRange(null)}
                    onClick={handleClick}
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} strokeOpacity={0.2} />

                    <XAxis
                        dataKey="time"
                        type="number"
                        domain={xDomain as any}
                        ticks={ticks}
                        tickFormatter={tickFormatter}
                        scale="time"
                        interval={0}
                        cursor="pointer"
                    />

                    <YAxis
                        dataKey="y"
                        type="number"
                        domain={[-0.5, categories.length - 0.5]} // Pad the domain
                        tickCount={categories.length}
                        ticks={categories.map((_, i) => i)} // Explicit ticks for each index
                        tickFormatter={(i) => categories[i] || ''} // Map index back to label
                        width={90}
                        tick={{ fontSize: 13, fontWeight: 500 }}
                        interval={0}
                    />

                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'transparent' }} />

                    {/* Interaction Layer: Invisible points to capture hover */}
                    <Scatter
                        data={interactionLayerData}
                        dataKey="time" // We map time->x, need category->y
                        name="hidden-interaction"
                        opacity={0}
                        shape="circle"
                        isAnimationActive={false}
                    />

                    {/* Highlight Layer */}
                    {hoveredRange && (
                        <ReferenceArea
                            x1={hoveredRange.start}
                            x2={hoveredRange.end}
                            fill="currentColor"
                            className="text-muted-foreground"
                            fillOpacity={0.1}
                            ifOverflow="extendDomain"
                        />
                    )}

                    {/* Main Data Layer: Gantt Bars */}
                    <Scatter
                        data={chartData}
                        shape={<GanttBar />}
                        isAnimationActive={false}
                        legendType="none"
                        cursor="pointer"
                    />

                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
