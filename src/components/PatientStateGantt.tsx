
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
    const { cx, cy, payload, xAxis, yAxis, setBarTooltip } = props;
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
                className="transition-opacity hover:opacity-80 cursor-pointer"
                style={{ pointerEvents: 'auto' }}
                onMouseEnter={(e) => {
                    if (setBarTooltip) {
                        setBarTooltip({ x: e.clientX, y: e.clientY, data: payload });
                    }
                }}
                onMouseMove={(e) => {
                    if (setBarTooltip) {
                        setBarTooltip({ x: e.clientX, y: e.clientY, data: payload });
                    }
                }}
                onMouseLeave={() => {
                    if (setBarTooltip) {
                        setBarTooltip(null);
                    }
                }}
            />
        </g>
    );
};

export function PatientStateGantt({ data, zoomLevel = 'years', onDrillDown, conceptData, focusDate }: PatientStateGanttProps) {
    const [hoveredRange, setHoveredRange] = useState<{ start: number, end: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [visibleWindow, setVisibleWindow] = useState<{ start: number, end: number } | null>(null);
    const [barTooltip, setBarTooltip] = useState<{ x: number, y: number, data: any } | null>(null);

    // 1. Process Categories (Y-Axis)
    const categories = useMemo(() => {
        if (conceptData?.values) {
            return conceptData.values;
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

    // 3. Process Full Data
    const fullChartData = useMemo(() => {
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

    // 4. Transform Constants & Global Domain
    const { xDomain, pixelsPerMs, globalStart, globalEnd, chartWidth } = useMemo(() => {
        if (!fullChartData.length) return { xDomain: [0, 100], pixelsPerMs: 1, globalStart: 0, globalEnd: 100, chartWidth: '100%' };

        const allPoints = fullChartData.flatMap(d => [d.start, d.end]);
        const minTime = Math.min(...allPoints);
        const maxTime = Math.max(...allPoints);

        const minDate = new Date(minTime);
        const maxDate = new Date(maxTime);
        // Clean Boundaries


        let gStart, gEnd;
        if (zoomLevel === 'days') {
            // For monthly view (days zoom), respect the month boundaries of the data
            gStart = new Date(minDate.getFullYear(), minDate.getMonth(), 1).getTime();
            gEnd = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0, 23, 59, 59).getTime(); // Last day of month
        } else {
            // Default to full year for other views
            gStart = new Date(minDate.getFullYear(), 0, 1).getTime();
            gEnd = new Date(maxDate.getFullYear(), 11, 31, 23, 59, 59).getTime();
        }

        const totalDuration = gEnd - gStart;
        const DAYS = 1000 * 60 * 60 * 24;
        const totalDays = totalDuration / DAYS;

        // Pixels Per Day
        let ppd = 0.5;
        if (zoomLevel === 'years') {
            ppd = totalDays > 3650 ? 0.2 : (1000 / totalDays);
            if (ppd < 0.1) ppd = 0.1;
        } else if (zoomLevel === 'months') {
            ppd = 3;
        } else {
            ppd = 40;
        }

        let width = totalDays * ppd;
        if (width < 800) width = 800; // Min width

        const ppms = width / totalDuration;

        return {
            xDomain: [gStart, gEnd],
            pixelsPerMs: ppms,
            globalStart: gStart,
            globalEnd: gEnd,
            chartWidth: width
        };
    }, [fullChartData, zoomLevel]);

    // 5. Scroll Handling & Window calculation
    const handleScroll = () => {
        if (!containerRef.current) return;

        const scrollLeft = containerRef.current.scrollLeft;
        const containerWidth = containerRef.current.clientWidth;

        // Calculate Visible Time Range
        const visibleStart = globalStart + (scrollLeft / pixelsPerMs);
        const visibleEnd = visibleStart + (containerWidth / pixelsPerMs);

        // Define Buffer (2 "buckets" worth approx)
        // Years: Buffer 5 years. Months: 1 year. Days: 2 months.
        let bufferMs = 0;
        const YEAR_MS = 31536000000;
        if (zoomLevel === 'years') bufferMs = 5 * YEAR_MS;
        else if (zoomLevel === 'months') bufferMs = 1 * YEAR_MS;
        else bufferMs = 60 * 24 * 60 * 60 * 1000; // ~2 months

        setVisibleWindow({
            start: visibleStart - bufferMs,
            end: visibleEnd + bufferMs
        });
    };

    // Initialize Window on first data load
    useLayoutEffect(() => {
        if (!visibleWindow && chartWidth) {
            handleScroll();
        }
    }, [chartWidth, pixelsPerMs]);


    // Auto-Scroll to focusDate needs to update BEFORE window calculation logic for smoothness
    // Or simpler: Auto-scroll triggers scroll event, which triggers window update.
    useLayoutEffect(() => {
        if (!containerRef.current || !focusDate) return;

        const focusTime = focusDate.getTime();
        if (focusTime < globalStart || focusTime > globalEnd) return;

        const ratio = (focusTime - globalStart) / (globalEnd - globalStart);
        const contentWidth = Number(chartWidth);
        if (isNaN(contentWidth)) return;

        const targetX = contentWidth * ratio;
        const containerWidth = containerRef.current.clientWidth;
        const scrollLeft = targetX - (containerWidth / 2);

        containerRef.current.scrollTo({ left: scrollLeft, behavior: 'instant' }); // Instant to avoid painting wrong window during scroll

        // Manually trigger update immediately after scroll
        // handleScroll() will use the NEW scroll position
        // We might need to wait for layout?
        // Force a mini timeout to let DOM update scrollLeft property?
        setTimeout(() => handleScroll(), 0);

    }, [focusDate, zoomLevel, chartWidth, globalStart, globalEnd]);

    // 6. Virtualized Data Filtering
    const { virtualData, virtualTicks } = useMemo(() => {
        // If no window yet, show nothing or everything? Show everything if small, nothing if huge?
        // Let's safe-guard: if no window, show everything (initial render might be glitchy but ok)
        // Actually, if we wait for first scroll event, chart might be empty.
        // Better: Default window = full range if not set.

        const windowStart = visibleWindow ? visibleWindow.start : globalStart;
        const windowEnd = visibleWindow ? visibleWindow.end : globalEnd;

        // Filter Data
        const vData = fullChartData.filter(d => d.end >= windowStart && d.start <= windowEnd);

        // Generate Ticks (Only for window)
        // We still need to follow the Zoom Level cadence
        const vTicks = [];
        let curr = new Date(Math.max(globalStart, windowStart));
        // Align 'curr' to nice boundary?
        if (zoomLevel === 'years') curr = new Date(curr.getFullYear(), 0, 1);
        else if (zoomLevel === 'months') curr = new Date(curr.getFullYear(), curr.getMonth(), 1);
        else curr = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate());

        const endTs = Math.min(globalEnd, windowEnd);

        while (curr.getTime() <= endTs) {
            const t = curr.getTime();
            if (t >= windowStart) vTicks.push(t);

            if (zoomLevel === 'years') curr.setFullYear(curr.getFullYear() + 1);
            else if (zoomLevel === 'months') curr.setMonth(curr.getMonth() + 1);
            else curr.setDate(curr.getDate() + 1);
        }

        return { virtualData: vData, virtualTicks: vTicks };

    }, [fullChartData, visibleWindow, zoomLevel, globalStart, globalEnd]);


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

    // Throttle Scroll helper
    // We can use a simple flag ref
    const isScrolling = useRef(false);
    const onContainerScroll = () => {
        if (isScrolling.current) return;
        isScrolling.current = true;
        requestAnimationFrame(() => {
            handleScroll();
            isScrolling.current = false;
        });
    };

    const tickFormatter = (time: number) => {
        const d = new Date(time);
        if (zoomLevel === 'years') return d.getFullYear().toString();
        if (zoomLevel === 'months') return d.toLocaleDateString(undefined, { month: 'short' });
        return d.getDate().toString();
    };



    const interactionLayerData = useMemo(() => {
        return virtualTicks.map(t => {
            const date = new Date(t);
            const year = date.getFullYear();
            let end = t;

            if (zoomLevel === 'years') {
                end = new Date(year, 11, 31, 23, 59, 59).getTime();
            } else if (zoomLevel === 'months') {
                const month = date.getMonth();
                end = new Date(year, month + 1, 0, 23, 59, 59).getTime();
            } else {
                const month = date.getMonth();
                const day = date.getDate();
                end = new Date(year, month, day, 23, 59, 59).getTime();
            }

            return {
                time: t + (end - t) / 2,
                y: 0,
                dummy: true
            };
        });
    }, [virtualTicks, zoomLevel]);

    return (
        <div className="w-full h-full p-4 relative select-none flex flex-col">
            <div
                ref={containerRef}
                className="flex-1 w-full overflow-x-auto overflow-y-hidden"
                style={{ scrollBehavior: 'auto' }} // Set to auto to prevent smooth scroll fighting with drag
                onScroll={onContainerScroll}
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
                                domain={xDomain as any} // Global Domain
                                ticks={virtualTicks}    // Local Ticks
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
                                data={virtualData}
                                shape={<GanttBar setBarTooltip={setBarTooltip} />}
                                isAnimationActive={false}
                                legendType="none"
                                cursor="pointer"
                            />

                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Custom Tooltip Overlay */}
            {barTooltip && (
                <div
                    className="fixed pointer-events-none bg-popover text-popover-foreground border border-border p-3 rounded shadow-lg text-xs z-[100]"
                    style={{
                        left: Math.min(barTooltip.x + 15, window.innerWidth - 250),
                        top: Math.min(barTooltip.y + 15, window.innerHeight - 150)
                    }}
                >
                    <div className="font-bold mb-1" style={{ color: barTooltip.data.fill }}>{barTooltip.data.value}</div>
                    <div>Start: {new Date(barTooltip.data.start).toLocaleString()}</div>
                    <div>End: {new Date(barTooltip.data.end).toLocaleString()}</div>
                    <div>Duration: {Math.round((barTooltip.data.end - barTooltip.data.start) / (1000 * 60 * 60))} hrs</div>
                </div>
            )}
        </div>
    );
}
