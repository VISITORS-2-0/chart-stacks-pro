import React, { useMemo, useState, useLayoutEffect, useRef } from 'react';
import { ComposedChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceArea, Scatter, ReferenceLine } from 'recharts';
import { TemporalRow } from '../types/temporal';
import { formatRelativeTime, formatRelativeCompact } from '@/utils/dateUtils';

interface PatientMultiStateGanttProps {
    data: TemporalRow[];
    zoomLevel?: 'years' | 'months' | 'days';
    onDrillDown?: (dateStr: string) => void;
    conceptData?: any;
    onZoomOut?: () => void;
    focusDate?: Date | null;
    isRelative?: boolean;
    relativeGranularity?: 'D' | 'ME' | 'YE';
    globalStart?: string | number;
    globalEnd?: string | number;
    onVisibleRangeChange?: (date: Date) => void;
}

// Custom Shape to render the Gantt bars
const GanttBar = (props: any) => {
    const { cx, cy, payload, xAxis, yAxis, setBarTooltip } = props;
    if (!xAxis || !yAxis || !payload) return null;

    const xStart = xAxis.scale(payload.start);
    const xEnd = xAxis.scale(payload.end);

    const width = Math.max(Math.abs(xEnd - xStart), 3);
    const height = payload.barHeight || 8;

    const y = cy - (height / 2);

    return (
        <g>
            <rect
                x={xStart}
                y={y}
                width={width}
                height={height}
                fill={payload.fill}
                rx={2}
                ry={2}
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

export function PatientMultiStateGantt({
    data,
    zoomLevel = 'years',
    onDrillDown,
    conceptData,
    onZoomOut,
    focusDate,
    isRelative = false,
    relativeGranularity = 'YE',
    globalStart: globalStartProp,
    globalEnd: globalEndProp,
    onVisibleRangeChange
}: PatientMultiStateGanttProps) {
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

    const gridTicks = useMemo(() => {
        return Array.from({ length: categories.length + 1 }, (_, i) => i - 0.5);
    }, [categories]);

    // 2. Identify Unique Patients and assign distinct HSL colors
    const uniquePatients = useMemo(() => {
        const pids = new Set(data.map(d => String(d.PatientID)));
        return Array.from(pids).sort();
    }, [data]);

    const patientColors = useMemo(() => {
        const colors: Record<string, string> = {};
        const count = uniquePatients.length;
        // Predefined beautiful palette for high contrast
        const baseColors = [
            '#3b82f6', // blue
            '#ef4444', // red
            '#10b981', // green
            '#f59e0b', // amber
            '#8b5cf6', // violet
            '#ec4899', // pink
            '#06b6d4', // cyan
            '#f97316', // orange
        ];

        uniquePatients.forEach((pid, i) => {
            if (i < baseColors.length) {
                colors[pid] = baseColors[i];
            } else {
                // Procedural generation if more patients than baseColors
                const hue = (i * 360) / count;
                colors[pid] = `hsl(${hue}, 75%, 55%)`;
            }
        });
        return colors;
    }, [uniquePatients]);

    // 3. Process Full Data with offsets per patient track
    const fullChartData = useMemo(() => {
        const P = uniquePatients.length;
        const barHeight = P > 1 ? Math.max(6, 12 - P) : 12;

        return data.map((d, i) => {
            const start = new Date(d.StartTime).getTime();
            let end = d.EndTime ? new Date(d.EndTime).getTime() : start;
            if (end < start) end = start;

            const val = String(d.Value);
            const yIndex = categories.indexOf(val);

            const patientId = String(d.PatientID);
            const patientIdx = uniquePatients.indexOf(patientId);

            // Spacing offset to lay patient intervals in parallel tracks
            // Range offset is constrained between [-0.35, 0.35]
            const offset = P > 1 ? -0.3 + (patientIdx / (P - 1)) * 0.6 : 0;
            const y = yIndex + offset;

            return {
                id: i,
                x: start, // We connect starts, similar to PatientStateGantt
                y: y,
                start: start,
                end: end,
                value: val,
                patientId: patientId,
                fill: patientColors[patientId] || '#888',
                stroke: 'transparent',
                barHeight: barHeight
            };
        });
    }, [data, patientColors, categories, uniquePatients]);

    // Group the data by patient ID for rendering individual Scatter series (lines)
    const patientScatterData = useMemo(() => {
        const grouped: Record<string, any[]> = {};
        uniquePatients.forEach(pid => {
            grouped[pid] = [];
        });

        // Filter full data down to visible window bounds (similar to virtualData)
        const windowStart = visibleWindow ? visibleWindow.start : -Infinity;
        const windowEnd = visibleWindow ? visibleWindow.end : Infinity;

        fullChartData.forEach(d => {
            if (d.end >= windowStart && d.start <= windowEnd) {
                if (grouped[d.patientId]) {
                    grouped[d.patientId].push(d);
                }
            }
        });

        // Sort chronologically for each patient series
        Object.keys(grouped).forEach(pid => {
            grouped[pid].sort((a, b) => a.start - b.start);
        });

        return grouped;
    }, [fullChartData, uniquePatients, visibleWindow]);

    // 4. Calculate domains & dimensions
    const { xDomain, pixelsPerMs, globalStart, globalEnd, chartWidth } = useMemo(() => {
        let minTime = 0;
        let maxTime = 100;

        if (globalStartProp !== undefined && globalEndProp !== undefined) {
            minTime = new Date(globalStartProp).getTime();
            maxTime = new Date(globalEndProp).getTime();
        } else if (fullChartData.length > 0) {
            const allPoints = fullChartData.flatMap(d => [d.start, d.end]);
            minTime = Math.min(...allPoints);
            maxTime = Math.max(...allPoints);
        } else {
            return { xDomain: [0, 100], pixelsPerMs: 1, globalStart: 0, globalEnd: 100, chartWidth: '100%' };
        }

        const minDate = new Date(minTime);
        const maxDate = new Date(maxTime);

        let gStart, gEnd;
        if (zoomLevel === 'days') {
            gStart = new Date(minDate.getFullYear(), minDate.getMonth(), 1).getTime();
            gEnd = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0, 23, 59, 59).getTime();
        } else {
            gStart = new Date(minDate.getFullYear(), 0, 1).getTime();
            gEnd = new Date(maxDate.getFullYear(), 11, 31, 23, 59, 59).getTime();
        }

        const totalDuration = gEnd - gStart;
        const DAYS = 1000 * 60 * 60 * 24;
        const totalDays = totalDuration / DAYS;

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
        if (width < 800) width = 800;

        const ppms = width / totalDuration;

        return {
            xDomain: [gStart, gEnd],
            pixelsPerMs: ppms,
            globalStart: gStart,
            globalEnd: gEnd,
            chartWidth: width
        };
    }, [fullChartData, zoomLevel, globalStartProp, globalEndProp]);

    const handleScroll = () => {
        if (!containerRef.current) return;

        const scrollLeft = containerRef.current.scrollLeft;
        const containerWidth = containerRef.current.clientWidth;

        const visibleStart = globalStart + (scrollLeft / pixelsPerMs);
        const visibleEnd = visibleStart + (containerWidth / pixelsPerMs);

        if (onVisibleRangeChange) {
            const centerTime = visibleStart + (containerWidth / 2) / pixelsPerMs;
            if (!isNaN(centerTime)) {
                onVisibleRangeChange(new Date(centerTime));
            }
        }

        let bufferMs = 0;
        const YEAR_MS = 31536000000;
        if (zoomLevel === 'years') bufferMs = 5 * YEAR_MS;
        else if (zoomLevel === 'months') bufferMs = 1 * YEAR_MS;
        else bufferMs = 60 * 24 * 60 * 60 * 1000;

        setVisibleWindow({
            start: visibleStart - bufferMs,
            end: visibleEnd + bufferMs
        });
    };

    useLayoutEffect(() => {
        if (chartWidth) {
            handleScroll();
        }
    }, [chartWidth, pixelsPerMs]);

    useLayoutEffect(() => {
        if (!containerRef.current || !focusDate) return;

        const focusTime = focusDate.getTime();
        if (focusTime < globalStart || focusTime > globalEnd) return;

        const ratio = (focusTime - globalStart) / (globalEnd - globalStart);
        const contentWidth = Number(chartWidth);
        if (isNaN(contentWidth)) return;

        const leftMargin = 10;
        const rightMargin = 30;
        const scrollLeft = leftMargin + ratio * (contentWidth - leftMargin - rightMargin) - 20;

        containerRef.current.scrollTo({ left: scrollLeft, behavior: 'instant' });
        setTimeout(() => handleScroll(), 0);
    }, [focusDate, zoomLevel, chartWidth, globalStart, globalEnd]);

    const { virtualTicks, virtualContextTicks } = useMemo(() => {
        const windowStart = visibleWindow ? visibleWindow.start : globalStart;
        const windowEnd = visibleWindow ? visibleWindow.end : globalEnd;

        const vTicks = [];
        let curr = new Date(Math.max(globalStart, windowStart));
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

        const vContextTicks: number[] = [];
        const startYear = new Date(Math.max(globalStart, windowStart)).getFullYear();
        const endYear = new Date(Math.min(globalEnd, windowEnd)).getFullYear();

        if (zoomLevel === 'months') {
            for (let y = startYear; y <= endYear; y++) {
                const yearStart = new Date(y, 0, 1).getTime();
                const yearEnd = new Date(y, 11, 31, 23, 59, 59).getTime();
                const visibleStart = Math.max(yearStart, windowStart);
                const visibleEnd = Math.min(yearEnd, windowEnd);

                if (visibleStart <= visibleEnd) {
                    vContextTicks.push(visibleStart);
                }
            }
        } else if (zoomLevel === 'days') {
            for (let y = startYear; y <= endYear; y++) {
                for (let m = 0; m < 12; m++) {
                    const monthStart = new Date(y, m, 1).getTime();
                    const monthEnd = new Date(y, m + 1, 0, 23, 59, 59).getTime();
                    const visibleStart = Math.max(monthStart, windowStart);
                    const visibleEnd = Math.min(monthEnd, windowEnd);

                    if (visibleStart <= visibleEnd) {
                        vContextTicks.push(visibleStart);
                    }
                }
            }
        }

        return { virtualTicks: vTicks, virtualContextTicks: vContextTicks };
    }, [visibleWindow, zoomLevel, globalStart, globalEnd]);

    const bottomMargin = useMemo(() => (virtualContextTicks.length > 0 ? 40 : 22), [virtualContextTicks]);

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
        if (isRelative) {
            const gran = zoomLevel === 'days' ? 'D' : zoomLevel === 'months' ? 'ME' : 'YE';
            return formatRelativeTime(time, gran);
        }
        const d = new Date(time);
        if (zoomLevel === 'years') return d.getFullYear().toString();
        if (zoomLevel === 'months') return d.toLocaleDateString(undefined, { month: 'short' });
        return d.getDate().toString();
    };

    const contextTickFormatter = (unixTime: number) => {
        if (isRelative) {
            if (zoomLevel === 'days') {
                const gran: 'ME' = 'ME';
                return formatRelativeTime(unixTime, gran);
            }
            return '';
        }
        const date = new Date(unixTime);
        if (zoomLevel === 'years' || zoomLevel === 'months') {
            return date.getFullYear().toString();
        } else {
            return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        }
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

    // Calculate category height multiplier based on patient count:
    // 1 to 5 patients = multiplier 1
    // 6 to 10 patients = multiplier 2
    // 11 to 15 patients = multiplier 3
    // etc.
    const multiplier = useMemo(() => {
        return Math.ceil(uniquePatients.length / 5) || 1;
    }, [uniquePatients]);

    const chartHeight = useMemo(() => {
        const baseCategoryHeight = 120;
        return Math.max(300, categories.length * baseCategoryHeight * multiplier);
    }, [categories, multiplier]);

    return (
        <div className="w-full px-4 pb-1 pt-4 flex flex-col">
            {/* Beautiful Patient Legend */}
            <div className="flex flex-wrap items-center gap-4 mb-3 pb-2 border-b text-sm">
                <div className="flex flex-wrap items-center gap-6">
                    {uniquePatients.map((patientId) => (
                        <div key={patientId} className="flex items-center gap-2">
                            <div className="w-3.5 h-3.5 rounded" style={{ backgroundColor: patientColors[patientId] }}></div>
                            <span className="text-foreground text-xs font-semibold">{patientId}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="w-full flex flex-row min-h-0" style={{ height: `${chartHeight}px` }}>
                {/* Sticky Y-Axis */}
                <div className="w-[90px] h-full shrink-0 border-r bg-background/95 backdrop-blur-sm z-10 select-none pb-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            margin={{ top: 20, right: 0, left: 10, bottom: bottomMargin }}
                        >
                            <XAxis xAxisId="detail" tick={false} tickLine={false} axisLine={false} height={20} />
                            {virtualContextTicks.length > 0 && (
                                <XAxis xAxisId="context" tick={false} tickLine={false} axisLine={false} height={15} />
                            )}
                            <YAxis
                                dataKey="y"
                                type="number"
                                domain={[-0.5, categories.length - 0.5]}
                                tickCount={categories.length}
                                ticks={categories.map((_, i) => i)}
                                tickFormatter={(i) => categories[i] || ''}
                                width={80}
                                tick={{ fontSize: 13, fontWeight: 500 }}
                                interval={0}
                            />
                            {categories.slice(0, -1).map((_, i) => (
                                <ReferenceLine
                                    key={i}
                                    xAxisId="detail"
                                    y={i + 0.5}
                                    stroke="#cbd5e1"
                                    strokeWidth={1.5}
                                />
                            ))}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* Scrollable Chart */}
                <div
                    ref={containerRef}
                    className="flex-1 w-full overflow-x-auto overflow-y-hidden custom-scrollbar"
                    style={{ scrollBehavior: 'auto' }}
                    onScroll={onContainerScroll}
                >
                    <div style={{ height: '100%', width: chartWidth, minWidth: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                                margin={{ top: 20, right: 30, left: 10, bottom: bottomMargin }}
                                onMouseMove={handleMouseMove}
                                onMouseLeave={() => setHoveredRange(null)}
                                onClick={handleClick}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} strokeOpacity={0.2} />

                                {categories.slice(0, -1).map((_, i) => (
                                    <ReferenceLine
                                        key={i}
                                        xAxisId="detail"
                                        y={i + 0.5}
                                        stroke="#cbd5e1"
                                        strokeWidth={1.5}
                                    />
                                ))}

                                <XAxis
                                    xAxisId="detail"
                                    dataKey="time"
                                    type="number"
                                    domain={xDomain as any}
                                    ticks={virtualTicks}
                                    scale="time"
                                    interval={0}
                                    cursor="pointer"
                                    height={20}
                                    tick={(props) => {
                                        const { x, y, payload, index } = props;
                                        return (
                                            <text
                                                x={x}
                                                y={y}
                                                dy={8}
                                                textAnchor={index === 0 ? "start" : "middle"}
                                                fill="#6b7280"
                                                fontSize={12}
                                                fontWeight={500}
                                            >
                                                {tickFormatter(payload.value)}
                                            </text>
                                        );
                                    }}
                                />

                                {virtualContextTicks.length > 0 && (
                                    <XAxis
                                        xAxisId="context"
                                        dataKey="time"
                                        type="number"
                                        domain={xDomain as any}
                                        ticks={virtualContextTicks}
                                        tickFormatter={contextTickFormatter}
                                        scale="time"
                                        interval={0}
                                        orientation="bottom"
                                        dy={5}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ textAnchor: 'start' }}
                                        onClick={() => {
                                            if (onZoomOut) onZoomOut();
                                        }}
                                        cursor="pointer"
                                        height={15}
                                    />
                                )}

                                <YAxis
                                    hide={true}
                                    dataKey="y"
                                    type="number"
                                    domain={[-0.5, categories.length - 0.5]}
                                    tickCount={gridTicks.length}
                                    ticks={gridTicks}
                                    width={80}
                                    interval={0}
                                />

                                <Scatter
                                    xAxisId="detail"
                                    data={interactionLayerData}
                                    dataKey="time"
                                    name="hidden-interaction"
                                    opacity={0}
                                    shape="circle"
                                    isAnimationActive={false}
                                />

                                {hoveredRange && (
                                    <ReferenceArea
                                        xAxisId="detail"
                                        x1={hoveredRange.start}
                                        x2={hoveredRange.end}
                                        fill="currentColor"
                                        className="text-muted-foreground"
                                        fillOpacity={0.1}
                                        ifOverflow="extendDomain"
                                    />
                                )}

                                {/* Render Scatter Series (and connecting transition lines) for each Patient */}
                                {uniquePatients.map((patientId) => {
                                    const pData = patientScatterData[patientId] || [];
                                    return (
                                        <Scatter
                                            key={patientId}
                                            xAxisId="detail"
                                            data={pData}
                                            shape={<GanttBar setBarTooltip={setBarTooltip} />}
                                            line={{ stroke: patientColors[patientId], strokeWidth: 1.5, strokeOpacity: 0.8 }}
                                            fill={patientColors[patientId]}
                                            isAnimationActive={false}
                                            legendType="none"
                                            cursor="pointer"
                                        />
                                    );
                                })}

                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
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
                    <div className="flex items-center gap-1.5 font-bold mb-1.5 pb-1 border-b">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: barTooltip.data.fill }}></div>
                        <span style={{ color: barTooltip.data.fill }}>Patient {barTooltip.data.patientId}</span>
                    </div>
                    <div className="grid gap-1">
                        <div>Value: <span className="font-semibold">{barTooltip.data.value}</span></div>
                        <div>Start: {isRelative ? formatRelativeCompact(barTooltip.data.start) : new Date(barTooltip.data.start).toLocaleString()}</div>
                        <div>End: {isRelative ? formatRelativeCompact(barTooltip.data.end) : new Date(barTooltip.data.end).toLocaleString()}</div>
                        <div>Duration: {Math.round((barTooltip.data.end - barTooltip.data.start) / (1000 * 60 * 60))} hrs</div>
                    </div>
                </div>
            )}
        </div>
    );
}
