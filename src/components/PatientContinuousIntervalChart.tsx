import React, { useMemo, useState, useLayoutEffect, useRef } from 'react';
import { ComposedChart, XAxis, YAxis, CartesianGrid, ReferenceArea, Scatter, ResponsiveContainer } from 'recharts';
import { TemporalRow } from '../types/temporal';
import { formatRelativeTime, formatRelativeCompact } from '@/utils/dateUtils';

interface PatientContinuousIntervalChartProps {
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
    isMultiPatient?: boolean;
}

const GanttBar = (props: any) => {
    const { cx, cy, payload, xAxis, yAxis, setBarTooltip } = props;
    if (!xAxis || !yAxis || !payload) return null;

    const xStart = xAxis.scale(payload.start);
    const xEnd = xAxis.scale(payload.end);

    const width = Math.max(Math.abs(xEnd - xStart), 3);
    const height = 16;

    // Y-axis value scales properly depending on domain bounds directly mapping to the actual value
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

export function PatientContinuousIntervalChart({ data, zoomLevel = 'years', onDrillDown, conceptData, focusDate, isRelative = false, relativeGranularity = 'YE', globalStart: globalStartProp, globalEnd: globalEndProp, onVisibleRangeChange, isMultiPatient = false }: PatientContinuousIntervalChartProps) {
    const isScrollEnabled = isRelative ? (zoomLevel !== 'years') : true;
    const [hoveredRange, setHoveredRange] = useState<{ start: number, end: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [visibleWindow, setVisibleWindow] = useState<{ start: number, end: number } | null>(null);
    const [barTooltip, setBarTooltip] = useState<{ x: number, y: number, data: any } | null>(null);

    const { minVal, maxVal, yTicks } = useMemo(() => {
        let minRaw = conceptData?.['min-value'] ?? conceptData?.min_value ?? conceptData?.min;
        let maxRaw = conceptData?.['max-value'] ?? conceptData?.max_value ?? conceptData?.max;

        let min = minRaw !== undefined && minRaw !== null ? Number(minRaw) : undefined;
        let max = maxRaw !== undefined && maxRaw !== null ? Number(maxRaw) : undefined;

        if (min === undefined || max === undefined || isNaN(min) || isNaN(max)) {
            const values = data.map(d => Number(d.Value)).filter(v => !isNaN(v));
            if (values.length > 0) {
                if (min === undefined) min = Math.min(...values);
                if (max === undefined) max = Math.max(...values);
            } else {
                min = 0;
                max = 100;
            }
        }

        const yTicks = Array.from({ length: 6 }, (_, i) => min + i * (max - min) / 5);
        return { minVal: min, maxVal: max, yTicks };
    }, [data, conceptData]);

    const fullChartData = useMemo(() => {
        return data.map((d, i) => {
            const start = new Date(d.StartTime).getTime();
            let end = d.EndTime ? new Date(d.EndTime).getTime() : start;
            if (end < start) end = start;

            const val = Number(d.Value);

            return {
                id: i,
                x: start,
                y: val,
                start: start,
                end: end,
                value: val,
                fill: '#3b82f6', // Consistent primary color
                stroke: 'rgba(59, 130, 246, 0.4)'
            };
        });
    }, [data]);

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
            return { xDomain: [0, 100], pixelsPerMs: 1, globalStart: 0, globalEnd: 100, chartWidth: 800 };
        }

        let gStart, gEnd;
        if (isRelative) {
            gStart = new Date(globalStartProp!).getTime();
            gEnd = new Date(globalEndProp!).getTime();
        } else {
            const minDate = new Date(minTime);
            const maxDate = new Date(maxTime);
            if (zoomLevel === 'days') {
                gStart = new Date(minDate.getFullYear(), minDate.getMonth(), 1).getTime();
                gEnd = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0, 23, 59, 59).getTime(); // Last day of month
            } else {
                gStart = new Date(minDate.getFullYear(), 0, 1).getTime();
                gEnd = new Date(maxDate.getFullYear(), 11, 31, 23, 59, 59).getTime();
            }
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
        if (width < 800) width = 800; // Min width

        const ppms = width / totalDuration;

        return {
            xDomain: [gStart, gEnd],
            pixelsPerMs: ppms,
            globalStart: gStart,
            globalEnd: gEnd,
            chartWidth: width
        };
    }, [fullChartData, zoomLevel, globalStartProp, globalEndProp, isRelative]);

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

        // Left margin is 10, right margin is 30 in ComposedChart. We offset scrollLeft to account for these margins.
        // We subtract 20px so that the viewport starts a little before the 1st of the month, making the tick label fully visible.
        const leftMargin = 10;
        const rightMargin = 30;
        const scrollLeft = leftMargin + ratio * (contentWidth - leftMargin - rightMargin) - 20;

        containerRef.current.scrollTo({ left: scrollLeft, behavior: 'instant' });

        setTimeout(() => handleScroll(), 0);

    }, [focusDate, zoomLevel, chartWidth, globalStart, globalEnd]);

    const { virtualData, virtualTicks, virtualContextTicks } = useMemo(() => {
        const windowStart = visibleWindow ? visibleWindow.start : globalStart;
        const windowEnd = visibleWindow ? visibleWindow.end : globalEnd;

        const vData = fullChartData.filter(d => d.end >= windowStart && d.start <= windowEnd);

        const vTicks = [];
        const vContextTicks: number[] = [];
        const endTs = Math.min(globalEnd, windowEnd);

        if (isRelative) {
            const dayStep = 24 * 60 * 60 * 1000;
            const monthStep = 30.4375 * dayStep;
            const yearStep = 365.25 * dayStep;

            let step = dayStep;
            if (zoomLevel === 'years') step = yearStep;
            else if (zoomLevel === 'months') step = monthStep;

            const startLimit = Math.max(globalStart, windowStart);
            let firstTick = Math.ceil(startLimit / step) * step;

            if (firstTick - step >= startLimit) {
                firstTick -= step;
            }

            for (let t = firstTick; t <= endTs; t += step) {
                if (t >= windowStart && t >= globalStart && t <= globalEnd) {
                    vTicks.push(t);
                }
            }

            if (zoomLevel === 'days') {
                const firstContextTick = Math.ceil(startLimit / monthStep) * monthStep;
                for (let t = firstContextTick; t <= endTs; t += monthStep) {
                    if (t >= windowStart && t >= globalStart && t <= globalEnd) {
                        vContextTicks.push(t);
                    }
                }
            }
        } else {
            let curr = new Date(Math.max(globalStart, windowStart));
            if (zoomLevel === 'years') curr = new Date(curr.getFullYear(), 0, 1);
            else if (zoomLevel === 'months') curr = new Date(curr.getFullYear(), curr.getMonth(), 1);
            else curr = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate());

            while (curr.getTime() <= endTs) {
                const t = curr.getTime();
                if (t >= windowStart) vTicks.push(t);

                if (zoomLevel === 'years') curr.setFullYear(curr.getFullYear() + 1);
                else if (zoomLevel === 'months') curr.setMonth(curr.getMonth() + 1);
                else curr.setDate(curr.getDate() + 1);
            }

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
        }

        return { virtualData: vData, virtualTicks: vTicks, virtualContextTicks: vContextTicks };

    }, [fullChartData, visibleWindow, zoomLevel, globalStart, globalEnd, isRelative]);

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
        if (zoomLevel === 'years') {
            return date.getFullYear().toString();
        } else if (zoomLevel === 'months') {
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
                y: minVal,
                dummy: true
            };
        });
    }, [virtualTicks, zoomLevel, minVal]);

    return (
        <div className="w-full h-full px-4 pb-1 pt-4 relative select-none flex flex-row">
            {/* Sticky Y-Axis */}
            <div className="w-[90px] h-full shrink-0 border-r bg-background/95 backdrop-blur-sm z-10 select-none pb-2">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={virtualData}
                        margin={{ top: 20, right: 0, left: 10, bottom: bottomMargin }}
                    >
                        <XAxis xAxisId="detail" tick={false} tickLine={false} axisLine={false} height={20} />
                        {virtualContextTicks.length > 0 && (
                            <XAxis xAxisId="context" tick={false} tickLine={false} axisLine={false} height={15} />
                        )}
                        <YAxis
                            dataKey="y"
                            type="number"
                            domain={[minVal, maxVal]}
                            ticks={yTicks}
                            interval={0}
                            tickFormatter={(val) => parseFloat(Number(val).toFixed(2)).toString()}
                            width={80}
                            tick={{ fontSize: 13, fontWeight: 500 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Scrollable Chart */}
            <div
                ref={containerRef}
                className={`flex-1 w-full ${isScrollEnabled ? 'overflow-x-auto' : 'overflow-x-hidden'} overflow-y-hidden custom-scrollbar`}
                style={{ scrollBehavior: 'auto' }}
                onScroll={onContainerScroll}
            >
                <div style={{ height: '100%', width: isScrollEnabled ? `${chartWidth}px` : '100%', minWidth: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            margin={{ top: 20, right: 30, left: 10, bottom: bottomMargin }}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={() => setHoveredRange(null)}
                            onClick={handleClick}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} strokeOpacity={0.2} />

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
                                domain={[minVal, maxVal]}
                                ticks={yTicks}
                                interval={0}
                                width={80}
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

                            <Scatter
                                xAxisId="detail"
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

            {barTooltip && (
                <div
                    className="fixed pointer-events-none bg-popover text-popover-foreground border border-border p-3 rounded shadow-lg text-xs z-[100]"
                    style={{
                        left: Math.min(barTooltip.x + 15, window.innerWidth - 250),
                        top: Math.min(barTooltip.y + 15, window.innerHeight - 150)
                    }}
                >
                    <div className="font-bold mb-1" style={{ color: barTooltip.data.fill }}>Value: {Number(barTooltip.data.value).toFixed(2)}</div>
                    <div>Start: {isRelative ? formatRelativeCompact(barTooltip.data.start) : new Date(barTooltip.data.start).toLocaleString()}</div>
                    <div>End: {isRelative ? formatRelativeCompact(barTooltip.data.end) : new Date(barTooltip.data.end).toLocaleString()}</div>
                    <div>Duration: {Math.round((barTooltip.data.end - barTooltip.data.start) / (1000 * 60 * 60))} hrs</div>
                </div>
            )}
        </div>
    );
}
