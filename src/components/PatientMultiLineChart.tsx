import React, { useMemo, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceArea } from 'recharts';
import { TemporalRow } from '../types/temporal';
import { formatRelativeTime, formatRelativeTooltipTime } from '@/utils/dateUtils';

interface PatientMultiLineChartProps {
    data: TemporalRow[];
    zoomLevel?: 'years' | 'months' | 'days';
    focusDate?: Date | null;
    onDrillDown?: (dateStr: string) => void;
    onZoomOut?: () => void;
    isRelative?: boolean;
    relativeGranularity?: 'D' | 'ME' | 'YE';
    globalStart?: string | number;
    globalEnd?: string | number;
    onVisibleRangeChange?: (date: Date) => void;
    isMultiPatient?: boolean;
}

export function PatientMultiLineChart({ data, zoomLevel = 'years', focusDate, onDrillDown, onZoomOut, isRelative = false, relativeGranularity = 'YE', globalStart, globalEnd, onVisibleRangeChange, isMultiPatient = false }: PatientMultiLineChartProps) {
    const isScrollEnabled = isRelative ? (!isMultiPatient && !!focusDate) : true;
    const scrollRef = useRef<HTMLDivElement>(null);
    // Shared X-Axis logic: Use numeric timestamps to allow precise plotting
    const [hoveredRange, setHoveredRange] = useState<{ start: number, end: number } | null>(null);
    const [showMinMax, setShowMinMax] = useState(false);
    const [showAverage, setShowAverage] = useState(false);

    const PATIENT_COLORS = [
        '#3b82f6', // blue
        '#8b5cf6', // violet
        '#f59e0b', // amber
        '#ec4899', // pink
        '#06b6d4', // cyan
        '#f97316', // orange
        '#14b8a6', // teal
        '#ef4444', // red
        '#6366f1', // indigo
        '#a855f7', // purple
    ];

    // 1. Prepare Scatter Data (All Points)
    const scatterData = useMemo(() => {
        return data.map(row => {
            const val = parseFloat(row.Value as any);
            const date = new Date(row.StartTime);
            if (isNaN(val) || isNaN(date.getTime())) return null;
            return {
                x: date.getTime(),
                y: val,
                date: date,
                patientId: row.PatientID ? String(row.PatientID) : undefined
            };
        }).filter(Boolean) as any[];
    }, [data]);

    const patientsList = useMemo(() => {
        const set = new Set<string>();
        scatterData.forEach(pt => {
            if (pt.patientId) set.add(pt.patientId);
        });
        return Array.from(set).sort();
    }, [scatterData]);

    const patientColorMap = useMemo(() => {
        const map = new Map<string, string>();
        patientsList.forEach((pid, index) => {
            map.set(pid, PATIENT_COLORS[index % PATIENT_COLORS.length]);
        });
        return map;
    }, [patientsList]);

    const scatterDataByPatient = useMemo(() => {
        const groups: Record<string, any[]> = {};
        patientsList.forEach(pid => {
            groups[pid] = [];
        });
        scatterData.forEach(pt => {
            if (pt.patientId) {
                groups[pt.patientId].push(pt);
            }
        });
        return groups;
    }, [patientsList, scatterData]);

    // 2. Prepare Monthly Max/Min/Average Data
    const { maxLineData, minLineData, averageLineData } = useMemo(() => {
        // Reset flags for the current zoom calculation so old zoom bucket flags don't persist
        scatterData.forEach(pt => {
            if (pt) {
                (pt as any).isMaxBucket = false;
                (pt as any).isMinBucket = false;
            }
        });

        const buckets = new Map<string, {
            maxPoint: { x: number, y: number, date: Date } | null;
            minPoint: { x: number, y: number, date: Date } | null;
            points: { x: number, y: number, date: Date }[];
        }>();

        scatterData.forEach(point => {
            let key;
            if (zoomLevel === 'years') {
                // Year buckets
                key = `${point.date.getFullYear()}`;
            } else if (zoomLevel === 'months') {
                // Monthly buckets
                key = `${point.date.getFullYear()}-${String(point.date.getMonth() + 1).padStart(2, '0')}`;
            } else {
                // Daily buckets
                key = `${point.date.getFullYear()}-${String(point.date.getMonth() + 1).padStart(2, '0')}-${String(point.date.getDate()).padStart(2, '0')}`;
            }

            if (!buckets.has(key)) {
                buckets.set(key, { maxPoint: point, minPoint: point, points: [point] });
            } else {
                const entry = buckets.get(key)!;
                entry.points.push(point);
                if (point.y > entry.maxPoint!.y) {
                    entry.maxPoint = point;
                }
                if (point.y < entry.minPoint!.y) {
                    entry.minPoint = point;
                }
            }
        });

        // Convert to sorted arrays
        const sortedKeys = Array.from(buckets.keys()).sort();
        const maxData = sortedKeys.map(k => {
            const pt = buckets.get(k)!.maxPoint;
            if (pt) (pt as any).isMaxBucket = true;
            return pt;
        }).filter(Boolean);
        const minData = sortedKeys.map(k => {
            const pt = buckets.get(k)!.minPoint;
            if (pt) (pt as any).isMinBucket = true;
            return pt;
        }).filter(Boolean);

        const avgData = sortedKeys.map(k => {
            const entry = buckets.get(k)!;
            if (entry.points.length === 0) return null;
            const sumY = entry.points.reduce((sum, p) => sum + p.y, 0);
            const avgY = sumY / entry.points.length;
            const sumX = entry.points.reduce((sum, p) => sum + p.x, 0);
            const avgX = sumX / entry.points.length;
            return {
                x: avgX,
                y: avgY,
                date: new Date(avgX),
                isAverageBucket: true
            };
        }).filter(Boolean);

        return { maxLineData: maxData, minLineData: minData, averageLineData: avgData };
    }, [scatterData, zoomLevel]);

    const handlePointClick = (data: any) => {
        if (onDrillDown && data && data.date) {
            onDrillDown(data.date.toISOString());
        }
    };

    // 3. Generate X-Axis Ticks based on Zoom Level
    const { detailAxisTicks, contextAxisTicks, xDomain } = useMemo(() => {
        let minTime = 0;
        let maxTime = 100;

        if (isRelative) {
            const isScrollEnabled = !isMultiPatient && !!focusDate;
            if (isScrollEnabled && zoomLevel === 'days' && focusDate) {
                minTime = new Date(focusDate.getFullYear(), 0, 1).getTime();
                maxTime = new Date(focusDate.getFullYear(), 11, 31, 23, 59, 59).getTime();
            } else {
                minTime = new Date(globalStart!).getTime();
                maxTime = new Date(globalEnd!).getTime();
            }
        } else {
            if (zoomLevel === 'days' && focusDate) {
                minTime = new Date(focusDate.getFullYear(), 0, 1).getTime();
                maxTime = new Date(focusDate.getFullYear(), 11, 31, 23, 59, 59).getTime();
            } else if (globalStart !== undefined && globalEnd !== undefined) {
                minTime = new Date(globalStart).getTime();
                maxTime = new Date(globalEnd).getTime();
            } else if (scatterData.length > 0) {
                const timestamps = scatterData.map(d => d.x);
                minTime = Math.min(...timestamps);
                maxTime = Math.max(...timestamps);
            }
        }

        const minDate = new Date(minTime);
        const maxDate = new Date(maxTime);

        let domainStart = minTime;
        let domainEnd = maxTime;

        if (isRelative) {
            domainStart = minTime;
            domainEnd = maxTime;
        } else {
            if (zoomLevel === 'years') {
                domainStart = new Date(minDate.getFullYear(), 0, 1).getTime();
                domainEnd = new Date(maxDate.getFullYear(), 11, 31, 23, 59, 59).getTime();
            } else if (zoomLevel === 'months') {
                domainStart = new Date(minDate.getFullYear(), minDate.getMonth(), 1).getTime();
                const lastDay = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0).getDate();
                domainEnd = new Date(maxDate.getFullYear(), maxDate.getMonth(), lastDay, 23, 59, 59).getTime();
            } else {
                // days
                domainStart = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()).getTime();
                domainEnd = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate(), 23, 59, 59).getTime();
            }
        }

        const detailTicks: number[] = [];
        const contextTicks: number[] = [];

        if (isRelative) {
            let curr = new Date(domainStart);
            if (zoomLevel === 'years') curr = new Date(Date.UTC(curr.getUTCFullYear(), 0, 1));
            else if (zoomLevel === 'months') curr = new Date(Date.UTC(curr.getUTCFullYear(), curr.getUTCMonth(), 1));
            else curr = new Date(Date.UTC(curr.getUTCFullYear(), curr.getUTCMonth(), curr.getUTCDate()));

            while (curr.getTime() <= domainEnd) {
                const t = curr.getTime();
                if (t >= domainStart && t <= domainEnd) {
                    detailTicks.push(t);
                }

                if (zoomLevel === 'years') curr.setUTCFullYear(curr.getUTCFullYear() + 1);
                else if (zoomLevel === 'months') curr.setUTCMonth(curr.getUTCMonth() + 1);
                else curr.setUTCDate(curr.getUTCDate() + 1);
            }

            if (zoomLevel === 'days') {
                let ctxCurr = new Date(domainStart);
                ctxCurr = new Date(Date.UTC(ctxCurr.getUTCFullYear(), ctxCurr.getUTCMonth(), 1));
                while (ctxCurr.getTime() <= domainEnd) {
                    const t = ctxCurr.getTime();
                    if (t >= domainStart && t <= domainEnd) {
                        contextTicks.push(t);
                    }
                    ctxCurr.setUTCMonth(ctxCurr.getUTCMonth() + 1);
                }
            }
        } else {
            const startYear = minDate.getFullYear();
            const endYear = maxDate.getFullYear();

            if (zoomLevel === 'years') {
                for (let y = startYear; y <= endYear + 1; y++) {
                    detailTicks.push(new Date(y, 0, 1).getTime());
                }
            } else if (zoomLevel === 'months') {
                for (let y = startYear; y <= endYear; y++) {
                    const yearStart = new Date(y, 0, 1).getTime();
                    const yearEnd = new Date(y, 11, 31, 23, 59, 59).getTime();
                    const visibleStart = Math.max(yearStart, domainStart);
                    const visibleEnd = Math.min(yearEnd, domainEnd);

                    if (visibleStart <= visibleEnd) {
                        contextTicks.push(visibleStart);
                    }

                    for (let m = 0; m < 12; m++) {
                        const monthTickTime = new Date(y, m, 1).getTime();
                        if (monthTickTime >= domainStart && monthTickTime <= domainEnd) {
                            detailTicks.push(monthTickTime);
                        }
                    }
                }
            } else {
                for (let y = startYear; y <= endYear; y++) {
                    for (let m = 0; m < 12; m++) {
                        const monthStart = new Date(y, m, 1).getTime();
                        const monthEnd = new Date(y, m + 1, 0, 23, 59, 59).getTime();
                        const visibleStart = Math.max(monthStart, domainStart);
                        const visibleEnd = Math.min(monthEnd, domainEnd);

                        if (visibleStart <= visibleEnd) {
                            contextTicks.push(visibleStart);
                        }

                        const lastDay = new Date(y, m + 1, 0).getDate();
                        for (let d = 1; d <= lastDay; d++) {
                            const tickTime = new Date(y, m, d).getTime();
                            if (tickTime >= domainStart && tickTime <= domainEnd) {
                                detailTicks.push(tickTime);
                            }
                        }
                    }
                }
            }
        }

        return { detailAxisTicks: detailTicks, contextAxisTicks: contextTicks, xDomain: [domainStart, domainEnd] };
    }, [scatterData, zoomLevel, globalStart, globalEnd, focusDate, isRelative, isMultiPatient]);

    const bottomMargin = useMemo(() => (contextAxisTicks.length > 0 ? 40 : 22), [contextAxisTicks]);

    const detailTickFormatter = (unixTime: number) => {
        if (isRelative) {
            // Use zoomLevel (local state, updates on every zoom) rather than
            // relativeGranularity (only updates after a server re-fetch).
            const gran = zoomLevel === 'days' ? 'D' : zoomLevel === 'months' ? 'ME' : 'YE';
            return formatRelativeTime(unixTime, gran);
        }
        const date = new Date(unixTime);
        if (zoomLevel === 'years') {
            return date.getFullYear().toString();
        } else if (zoomLevel === 'months') {
            return date.toLocaleDateString(undefined, { month: 'short' });
        } else {
            return date.getDate().toString();
        }
    };

    const contextTickFormatter = (unixTime: number) => {
        if (isRelative) {
            // Show the coarser-unit label as a context axis when zoomed in.
            // e.g. when viewing days, show the month label as context below.
            if (zoomLevel === 'days') {
                const gran: 'ME' = 'ME';
                return formatRelativeTime(unixTime, gran);
            }
            // For years/months zoom levels, suppress the context axis.
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

    const handleMouseMove = (e: any) => {
        if (!e || !e.activeLabel) {
            setHoveredRange(null);
            return;
        }

        const date = new Date(e.activeLabel);
        let start, end;

        if (zoomLevel === 'years') {
            start = new Date(date.getFullYear(), 0, 1).getTime();
            end = new Date(date.getFullYear(), 11, 31, 23, 59, 59).getTime();
        } else if (zoomLevel === 'months') {
            start = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
            end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).getTime();
        } else {
            // Days
            start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
            end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).getTime();
        }
        setHoveredRange({ start, end });
    };

    // 4. Dummy Data for Empty Buckets
    const dummyData = useMemo(() => {
        if (!detailAxisTicks || detailAxisTicks.length === 0) return [];
        const constY = scatterData.length > 0 ? scatterData[0].y : 0;
        return detailAxisTicks.map(tick => {
            const date = new Date(tick);
            let middleTime = tick;
            if (zoomLevel === 'years') {
                middleTime = new Date(date.getFullYear(), 6, 1).getTime();
            } else if (zoomLevel === 'months') {
                middleTime = new Date(date.getFullYear(), date.getMonth(), 15).getTime();
            } else {
                middleTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0).getTime();
            }
            return {
                x: middleTime,
                y: constY,
                isDummy: true
            };
        });
    }, [detailAxisTicks, scatterData, zoomLevel]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && hoveredRange) {
            const pointsInBucket = scatterData.filter(pt => pt.x >= hoveredRange.start && pt.x <= hoveredRange.end);

            if (pointsInBucket.length === 0) {
                let dateStr = "";
                if (isRelative) {
                    dateStr = formatRelativeTooltipTime(hoveredRange.start);
                } else {
                    const date = new Date(hoveredRange.start);
                    if (zoomLevel === 'years') dateStr = date.getFullYear().toString();
                    else if (zoomLevel === 'months') dateStr = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
                    else dateStr = date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
                }

                return (
                    <div className="bg-popover border border-border text-popover-foreground rounded-md shadow-md p-3 text-sm">
                        <div className="font-semibold mb-1">{dateStr}</div>
                        <div className="text-muted-foreground mt-1 text-xs">No data for this period.<br />Click to zoom in.</div>
                    </div>
                );
            }

            // Calculate bucket stats
            const yValues = pointsInBucket.map(pt => pt.y);
            const bucketMax = Math.max(...yValues);
            const bucketMin = Math.min(...yValues);
            const bucketAvg = yValues.reduce((a, b) => a + b, 0) / yValues.length;

            let displayPoint = pointsInBucket[0];
            if (payload && payload.length) {
                const nearestPoint = payload[0].payload;
                if (!nearestPoint.isDummy && nearestPoint.x >= hoveredRange.start && nearestPoint.x <= hoveredRange.end) {
                    displayPoint = nearestPoint;
                }
            }

            const timeLabel = isRelative
                ? formatRelativeTooltipTime(displayPoint.date.getTime())
                : new Date(displayPoint.date).toLocaleString();

            return (
                <div className="bg-popover border border-border text-popover-foreground rounded-md shadow-md p-3 text-sm">
                    <div className="font-semibold mb-1 border-b pb-1">
                        {timeLabel}
                    </div>
                    <div className="grid gap-1 mt-1.5">
                        <div className="text-muted-foreground">Value: <span className="font-medium text-foreground">{displayPoint.y}</span></div>
                        {displayPoint.patientId && (
                            <div className="text-muted-foreground">
                                Patient: <span className="font-semibold" style={{ color: patientColorMap.get(String(displayPoint.patientId)) }}>{displayPoint.patientId}</span>
                            </div>
                        )}
                        
                        <div className="border-t pt-1.5 mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <div className="text-muted-foreground">Bucket Max: <span className="font-medium text-red-500">{bucketMax.toFixed(2)}</span></div>
                            <div className="text-muted-foreground">Bucket Min: <span className="font-medium text-blue-500">{bucketMin.toFixed(2)}</span></div>
                            <div className="text-muted-foreground col-span-2">Bucket Avg: <span className="font-medium text-emerald-500">{bucketAvg.toFixed(2)}</span></div>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    // 4. Calculate Dynamic Width for Horizontal Scrolling
    const chartWidth = useMemo(() => {
        const [start, end] = xDomain as [number, number];
        const durationMs = end - start;
        const days = durationMs / (1000 * 60 * 60 * 24);

        let minWidth = 800; // Base minimum width

        if (zoomLevel === 'years') {
            const years = days / 365;
            minWidth = Math.max(800, years * 100); // 100px per year
        } else if (zoomLevel === 'months') {
            const months = days / 30;
            minWidth = Math.max(800, months * 80); // 80px per month
        } else if (zoomLevel === 'days') {
            minWidth = Math.max(800, days * 40); // 40px per day
        }

        return minWidth;
    }, [xDomain, zoomLevel]);

    const pixelsPerMs = useMemo(() => {
        if (!xDomain || xDomain[0] === 'dataMin') return 1;
        const [start, end] = xDomain as [number, number];
        const duration = end - start;
        return duration > 0 ? chartWidth / duration : 1;
    }, [xDomain, chartWidth]);

    const handleScroll = () => {
        if (!scrollRef.current || !xDomain || xDomain[0] === 'dataMin') return;

        const scrollLeft = scrollRef.current.scrollLeft;
        const containerWidth = scrollRef.current.clientWidth;
        const [domainStart] = xDomain as [number, number];

        if (onVisibleRangeChange) {
            const visibleStart = domainStart + (scrollLeft / pixelsPerMs);
            const centerTime = visibleStart + (containerWidth / 2) / pixelsPerMs;
            if (!isNaN(centerTime)) {
                onVisibleRangeChange(new Date(centerTime));
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

    useLayoutEffect(() => {
        if (chartWidth) {
            handleScroll();
        }
    }, [chartWidth, pixelsPerMs]);

    const scrollTimeoutRef = useRef<any>(null);

    // 5. Scroll to focusDate when zoom changes
    useEffect(() => {
        if (!scrollRef.current || !focusDate || !scatterData.length) return;

        const [domainStart, domainEnd] = xDomain as [number, number];
        const focusTime = focusDate.getTime();

        // Calculate the percentage position of focusDate within the domain
        const totalDuration = domainEnd - domainStart;
        if (totalDuration <= 0) return;

        const focusPercentage = (focusTime - domainStart) / totalDuration;

        // Calculate scroll position based on scrollWidth and visible clientWidth
        const scrollWidth = scrollRef.current.scrollWidth;
        const clientWidth = scrollRef.current.clientWidth;

        // Scroll so the focusDate aligns to the left of the visible area
        // Left margin is 10, right margin is 30 in ScatterChart. We offset targetScrollLeft to account for these margins.
        // We subtract 20px so that the viewport starts a little before the 1st of the month, making the tick label fully visible.
        const leftMargin = 10;
        const rightMargin = 30;
        const targetScrollLeft = leftMargin + focusPercentage * (scrollWidth - leftMargin - rightMargin) - 10;

        // Cancel any pending scroll timeouts
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        // Use timeout to ensure it runs after render/layout if width changed
        scrollTimeoutRef.current = setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTo({ left: Math.max(0, targetScrollLeft), behavior: 'auto' });
            }
        }, 50);

        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, [focusDate, zoomLevel, xDomain, scatterData.length, chartWidth]);

    return (
        <div className="w-full h-auto px-4 pb-1 pt-4 overflow-hidden flex flex-col">
            {/* Legend & Toggle Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-3 pb-2 border-b text-sm">
                {/* Legend */}
                <div className="flex flex-wrap items-center gap-2">
                    {showMinMax && (
                        <>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#ff0000]"></div>
                                <span className="text-foreground text-xs font-semibold">Max</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#0000ff]"></div>
                                <span className="text-foreground text-xs font-semibold">Min</span>
                            </div>
                        </>
                    )}
                    {showAverage && (
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
                            <span className="text-foreground text-xs font-semibold">Average</span>
                        </div>
                    )}
                    {patientsList.length > 1 ? (
                        patientsList.map(pid => (
                            <div key={pid} className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded border border-border/80">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: patientColorMap.get(pid) }}></div>
                                <span className="text-foreground text-[11px] font-semibold">{pid}</span>
                            </div>
                        ))
                    ) : (
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-[#888888]"></div>
                            <span className="text-foreground text-xs font-semibold">Patient Values</span>
                        </div>
                    )}
                </div>

                {/* Checkbox Toggles */}
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                        <input
                            type="checkbox"
                            checked={showMinMax}
                            onChange={(e) => setShowMinMax(e.target.checked)}
                            className="rounded border-input text-primary focus:ring-ring h-3.5 w-3.5"
                        />
                        <span>Show Min/Max Lines</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                        <input
                            type="checkbox"
                            checked={showAverage}
                            onChange={(e) => setShowAverage(e.target.checked)}
                            className="rounded border-input text-primary focus:ring-ring h-3.5 w-3.5"
                        />
                        <span>Show Average Line</span>
                    </label>
                </div>
            </div>

            <div className="w-full flex flex-row h-[380px]">
                {/* Sticky Y-Axis */}
                <div className="w-[90px] h-[380px] shrink-0 border-r bg-background/95 backdrop-blur-sm z-10 select-none pb-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart
                            data={scatterData}
                            margin={{ top: 5, right: 0, left: 10, bottom: bottomMargin }}
                        >
                            <XAxis xAxisId="detail" tick={false} tickLine={false} axisLine={false} height={20} />
                            {contextAxisTicks.length > 0 && (
                                <XAxis xAxisId="context" tick={false} tickLine={false} axisLine={false} height={15} />
                            )}
                            <YAxis
                                dataKey="y"
                                width={80}
                                tick={{ fontSize: 13, fontWeight: 500 }}
                            />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>

                {/* Scrollable Chart */}
                <div ref={scrollRef} className={`flex-1 h-[380px] ${isScrollEnabled ? 'overflow-x-auto' : 'overflow-x-hidden'} overflow-y-hidden custom-scrollbar`} onScroll={onContainerScroll}>
                    <div style={{ width: isScrollEnabled ? `${chartWidth}px` : '100%', minWidth: isScrollEnabled ? `${chartWidth}px` : '100%', height: '380px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart
                                data={scatterData}
                                margin={{ top: 5, right: 30, left: 10, bottom: bottomMargin }}
                                onMouseMove={handleMouseMove}
                                onMouseLeave={() => setHoveredRange(null)}
                                onClick={(e: any) => {
                                    // Capture clicks on the chart area for zooming
                                    if (onDrillDown && hoveredRange) {
                                        onDrillDown(new Date(hoveredRange.start).toISOString());
                                    }
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    xAxisId="detail"
                                    dataKey="x"
                                    type="number"
                                    domain={xDomain as any}
                                    allowDataOverflow={true}
                                    ticks={detailAxisTicks}
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
                                                {detailTickFormatter(payload.value)}
                                            </text>
                                        );
                                    }}
                                    scale="time"
                                    allowDuplicatedCategory={false}
                                    interval={0}
                                    orientation="bottom"
                                    height={20}
                                    onClick={(e) => {
                                        if (onDrillDown && e && e.value) {
                                            const date = new Date(e.value);
                                            onDrillDown(date.toISOString());
                                        }
                                    }}
                                    cursor="pointer"
                                />

                                {/* Hover Highlight */}
                                {hoveredRange && (
                                    <ReferenceArea
                                        xAxisId="detail"
                                        x1={hoveredRange.start}
                                        x2={hoveredRange.end}
                                        fill="#9ca3af" // tailwind gray-400
                                        fillOpacity={0.3}
                                        ifOverflow="extendDomain"
                                    />
                                )}

                                {contextAxisTicks.length > 0 && (
                                    <XAxis
                                        xAxisId="context"
                                        dataKey="x"
                                        type="number"
                                        domain={xDomain as any}
                                        allowDataOverflow={true}
                                        ticks={contextAxisTicks}
                                        tickFormatter={contextTickFormatter}
                                        scale="time"
                                        allowDuplicatedCategory={false}
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
                                <YAxis hide={true} dataKey="y" width={80} />
                                <Tooltip
                                    content={<CustomTooltip />}
                                    cursor={false} // Disable default cursor line since we use ReferenceArea
                                />

                                {/* Max Line - Red */}
                                {showMinMax && (
                                    <Scatter
                                        xAxisId="detail"
                                        data={maxLineData}
                                        dataKey="y"
                                        line={{ stroke: '#ff0000', strokeWidth: 2 }}
                                        fill="#ff0000"
                                        shape="circle"
                                        name="Max"
                                        isAnimationActive={false}
                                        activeShape={false}
                                    />
                                )}

                                {/* Min Line - Blue */}
                                {showMinMax && (
                                    <Scatter
                                        xAxisId="detail"
                                        data={minLineData}
                                        dataKey="y"
                                        line={{ stroke: '#0000ff', strokeWidth: 2 }}
                                        fill="#0000ff"
                                        shape="circle"
                                        name="Min"
                                        isAnimationActive={false}
                                        activeShape={false}
                                    />
                                )}

                                {/* Average Line - Emerald Green Dashed */}
                                {showAverage && (
                                    <Scatter
                                        xAxisId="detail"
                                        data={averageLineData}
                                        dataKey="y"
                                        line={{ stroke: '#10b981', strokeWidth: 2, strokeDasharray: '4 4' }}
                                        fill="#10b981"
                                        shape="circle"
                                        name="Average"
                                        isAnimationActive={false}
                                        activeShape={false}
                                    />
                                )}

                                {patientsList.length > 0 ? (
                                    patientsList.map((pid) => (
                                        <Scatter
                                            key={pid}
                                            xAxisId="detail"
                                            data={scatterDataByPatient[pid] || []}
                                            dataKey="y"
                                            name={`Patient ${pid}`}
                                            fill={patientColorMap.get(pid)}
                                            shape="circle"
                                            line={false}
                                            onClick={handlePointClick}
                                            cursor="pointer"
                                            isAnimationActive={false}
                                            activeShape={false}
                                        />
                                    ))
                                ) : (
                                    <Scatter
                                        xAxisId="detail"
                                        data={scatterData}
                                        dataKey="y"
                                        name="Patient Values"
                                        fill="#888888"
                                        shape="circle"
                                        line={false}
                                        onClick={handlePointClick}
                                        cursor="pointer"
                                        isAnimationActive={false}
                                        activeShape={false}
                                    />
                                )}

                                {/* Dummy Data for Hovering Empty Buckets */}
                                <Scatter
                                    xAxisId="detail"
                                    data={dummyData}
                                    dataKey="y"
                                    name="Empty"
                                    opacity={0}
                                    isAnimationActive={false}
                                    activeShape={false}
                                />
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
