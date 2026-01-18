
import React, { useMemo, useState, useLayoutEffect, useRef } from 'react';
import { ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, Scatter } from 'recharts';
import { TemporalRow } from '../types/temporal';

interface PatientStateGanttProps {
    data: TemporalRow[];
    zoomLevel?: 'years' | 'months' | 'days';
    onDrillDown?: (dateStr: string) => void;
    conceptData?: any;
    onZoomOut?: () => void;
    focusDate?: Date | null;
}

// Custom Shape to render the "Gantt" bars using Scatter points
const GanttBar = (props: any) => {
    const { cx, cy, payload, xAxis, yAxis } = props;
    if (!xAxis || !yAxis || !payload) return null;

    const xStart = xAxis.scale(payload.start);
    const xEnd = xAxis.scale(payload.end);

    const width = Math.max(Math.abs(xEnd - xStart), 3);
    const height = 26;

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
                style={{ pointerEvents: 'none' }}
            />
        </g>
    );
};

export function PatientStateGantt({ data, zoomLevel = 'years', onDrillDown, conceptData, focusDate }: PatientStateGanttProps) {
    const [hoveredRange, setHoveredRange] = useState<{ start: number, end: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // 1. Process Categories (Y-Axis)
    const categories = useMemo(() => {
        if (conceptData?.allowed_values?.values) {
            return conceptData.allowed_values.values;
        }
        const vals = new Set(data.map(d => String(d.Value)));
        return Array.from(vals).sort();
    }, [conceptData, data]);

    // 2. Generate Gradient Colors
    const colorMap = useMemo(() => {
        const map: Record<string, string> = {};
        const len = categories.length;
        const startHue = 260;
        const endHue = 0;

        categories.forEach((cat: string, i: number) => {
            const ratio = len > 1 ? i / (len - 1) : 0;
            const hue = startHue - (ratio * (startHue - endHue));
            map[cat] = `hsl(${hue}, 70%, 55%)`;
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
            const yIndex = categories.indexOf(val);

            return {
                id: i,
                x: start,
                y: yIndex,
                start: start,
                end: end,
                value: val,
                fill: colorMap[val] || '#888',
                stroke: 'transparent'
            };
        });
    }, [data, colorMap, categories]);

    // 4. Calculate Dynamic X-Axis Domain & Width based on Full Range
    const { xDomain, ticks, chartWidth } = useMemo(() => {
        if (!chartData.length) return { xDomain: ['dataMin', 'dataMax'], ticks: [], chartWidth: '100%' };

        const allPoints = chartData.flatMap(d => [d.start, d.end]);
        const minTime = Math.min(...allPoints);
        const maxTime = Math.max(...allPoints);

        const minDate = new Date(minTime);
        const maxDate = new Date(maxTime);
        // Start from start of year to end of end year for cleanliness
        const globalStart = new Date(minDate.getFullYear(), 0, 1).getTime();
        const globalEnd = new Date(maxDate.getFullYear(), 11, 31, 23, 59, 59).getTime();

        const totalDuration = globalEnd - globalStart;
        const DAYS = 1000 * 60 * 60 * 24;
        const totalDays = totalDuration / DAYS;

        // Define Pixels per Day based on Zoom
        let pixelsPerDay = 0.5; // Default (Years view - compressed)

        if (zoomLevel === 'years') {
            // Ensure whole range fits or is reasonable.
            // If range > 10 years, maybe scroll? 
            // 365 days * 10 = 3650 days. * 0.2 px = 700px. Fits.
            pixelsPerDay = totalDays > 3650 ? 0.2 : (1000 / totalDays); // Fit roughly 1000px
            if (pixelsPerDay < 0.1) pixelsPerDay = 0.1;
        } else if (zoomLevel === 'months') {
            // ~50px per month -> 1.6 px per day
            pixelsPerDay = 3;
        } else {
            // Days view: ~30px per day
            pixelsPerDay = 40;
        }

        let calculatedWidth = totalDays * pixelsPerDay;
        // Ensure Min Width of 100% of container (which is usually ~800px)
        if (calculatedWidth < 800) calculatedWidth = 800; // Simplified min width

        // Generate Ticks
        const generatedTicks = [];
        let curr = new Date(globalStart);
        const end = new Date(globalEnd);

        // Tick Granularity
        while (curr.getTime() <= end.getTime()) {
            generatedTicks.push(curr.getTime());
            if (zoomLevel === 'years') curr.setFullYear(curr.getFullYear() + 1);
            else if (zoomLevel === 'months') curr.setMonth(curr.getMonth() + 1);
            else curr.setDate(curr.getDate() + 1);
        }

        return {
            xDomain: [globalStart, globalEnd],
            ticks: generatedTicks,
            chartWidth: calculatedWidth
        };

    }, [chartData, zoomLevel]);

    // 5. Auto Scroll to Focus Date
    useLayoutEffect(() => {
        if (!containerRef.current || !focusDate) return;

        // Find position of focusDate
        const startDomain = (xDomain as any)[0];
        const endDomain = (xDomain as any)[1];
        if (typeof startDomain !== 'number') return;

        const focusTime = focusDate.getTime();
        if (focusTime < startDomain || focusTime > endDomain) return;

        const ratio = (focusTime - startDomain) / (endDomain - startDomain);

        // Width is numeric (pixels)
        const contentWidth = Number(chartWidth);
        if (isNaN(contentWidth)) return;

        const targetX = contentWidth * ratio;
        const containerWidth = containerRef.current.clientWidth;

        // Center it
        const scrollLeft = targetX - (containerWidth / 2);

        containerRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });

    }, [focusDate, zoomLevel, chartWidth, xDomain]);


    // Handlers
    const handleMouseMove = (e: any) => {
        if (e && e.activeLabel) {
            const time = Number(e.activeLabel);
            if (!isNaN(time)) {
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

    const tickFormatter = (time: number) => {
        const d = new Date(time);
        if (zoomLevel === 'years') return d.getFullYear().toString();
        if (zoomLevel === 'months') return d.toLocaleDateString(undefined, { month: 'short' });
        return d.getDate().toString();
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
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

    const interactionLayerData = useMemo(() => {
        return ticks.map(t => ({
            time: t,
            y: 0,
            dummy: true
        }));
    }, [ticks]);

    return (
        <div className="w-full h-full p-4 relative select-none flex flex-col">
            <div
                ref={containerRef}
                className="flex-1 w-full overflow-x-auto overflow-y-hidden"
                style={{ scrollBehavior: 'smooth' }}
            >
                {/* Dynamically Sized Container */}
                <div style={{ height: '100%', width: chartWidth, minWidth: '100%' }}>
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
                                domain={[-0.5, categories.length - 0.5]}
                                tickCount={categories.length}
                                ticks={categories.map((_, i) => i)}
                                tickFormatter={(i) => categories[i] || ''}
                                width={90}
                                tick={{ fontSize: 13, fontWeight: 500 }}
                                interval={0}
                            />

                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'transparent' }} />

                            <Scatter
                                data={interactionLayerData}
                                dataKey="time"
                                name="hidden-interaction"
                                opacity={0}
                                shape="circle"
                                isAnimationActive={false}
                            />

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
            </div>
        </div>
    );
}
