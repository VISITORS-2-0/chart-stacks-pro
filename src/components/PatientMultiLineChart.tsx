import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceArea } from 'recharts';
import { TemporalRow } from '../types/temporal';

interface PatientMultiLineChartProps {
    data: TemporalRow[];
    zoomLevel?: 'years' | 'months' | 'days';
    focusDate?: Date | null;
    onDrillDown?: (dateStr: string) => void;
    onZoomOut?: () => void;
}

export function PatientMultiLineChart({ data, zoomLevel = 'years', focusDate, onDrillDown, onZoomOut }: PatientMultiLineChartProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    // Shared X-Axis logic: Use numeric timestamps to allow precise plotting
    const [hoveredRange, setHoveredRange] = useState<{ start: number, end: number } | null>(null);

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
                patientId: row.PatientID
            };
        }).filter(Boolean) as any[];
    }, [data]);

    // 2. Prepare Monthly Max/Min Data
    const { maxLineData, minLineData } = useMemo(() => {
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
                buckets.set(key, { maxPoint: point, minPoint: point });
            } else {
                const entry = buckets.get(key)!;
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

        return { maxLineData: maxData, minLineData: minData };
    }, [scatterData, zoomLevel]);

    const handlePointClick = (data: any) => {
        if (onDrillDown && data && data.date) {
            onDrillDown(data.date.toISOString());
        }
    };

    // 3. Generate X-Axis Ticks based on Zoom Level
    const { detailAxisTicks, contextAxisTicks, xDomain } = useMemo(() => {
        if (!scatterData.length) return { detailAxisTicks: [], contextAxisTicks: [], xDomain: ['dataMin', 'dataMax'] };

        const timestamps = scatterData.map(d => d.x);
        const minTime = Math.min(...timestamps);
        const maxTime = Math.max(...timestamps);
        const minDate = new Date(minTime);
        const maxDate = new Date(maxTime);

        // Determine bounds based on bucket start of minDate and bucket end of maxDate
        // focusDate is now only used for auto-scrolling to the clicked point

        let domainStart = minTime;
        let domainEnd = maxTime;

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

        const detailTicks: number[] = [];
        const contextTicks: number[] = [];

        const startYear = minDate.getFullYear();
        const endYear = maxDate.getFullYear();

        if (zoomLevel === 'years') {
            // Detail: Years
            for (let y = startYear; y <= endYear + 1; y++) {
                detailTicks.push(new Date(y, 0, 1).getTime());
            }

        } else if (zoomLevel === 'months') {
            // Context: Year
            for (let y = startYear; y <= endYear + 1; y++) {
                const tickTime = new Date(y, 0, 1).getTime();
                if (tickTime >= domainStart && tickTime <= domainEnd) {
                    contextTicks.push(tickTime);
                }

                // Detail: Months
                for (let m = 0; m < 12; m++) {
                    const monthTickTime = new Date(y, m, 1).getTime();
                    if (monthTickTime >= domainStart && monthTickTime <= domainEnd) {
                        detailTicks.push(monthTickTime);
                    }
                }
            }
        } else {
            // zoomLevel === 'days'
            // Performance warning: plotting days for multiple years will create thousands of ticks.
            // But since the user wants horizontal scrolling across the whole span at any zoom,
            // we must generate them, or relies on Rechart's auto ticks. We'll generate them here.
            for (let y = startYear; y <= endYear; y++) {
                for (let m = 0; m < 12; m++) {
                    // Context: Month
                    contextTicks.push(new Date(y, m, 15).getTime());

                    const lastDay = new Date(y, m + 1, 0).getDate();
                    // Detail: Days
                    for (let d = 1; d <= lastDay; d++) {
                        const tickTime = new Date(y, m, d).getTime();
                        if (tickTime >= domainStart && tickTime <= domainEnd) {
                            detailTicks.push(tickTime);
                        }
                    }
                }
            }
        }
        return { detailAxisTicks: detailTicks, contextAxisTicks: contextTicks, xDomain: [domainStart, domainEnd] };
    }, [scatterData, zoomLevel]);

    const detailTickFormatter = (unixTime: number) => {
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
                const date = new Date(hoveredRange.start);
                let dateStr = "";
                if (zoomLevel === 'years') dateStr = date.getFullYear().toString();
                else if (zoomLevel === 'months') dateStr = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
                else dateStr = date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

                return (
                    <div className="bg-popover border border-border text-popover-foreground rounded-md shadow-md p-3 text-sm">
                        <div className="font-semibold mb-1">{dateStr}</div>
                        <div className="text-muted-foreground mt-1 text-xs">No data for this period.<br />Click to zoom in.</div>
                    </div>
                );
            }

            let displayPoint = pointsInBucket[0];
            if (payload && payload.length) {
                const nearestPoint = payload[0].payload;
                if (!nearestPoint.isDummy && nearestPoint.x >= hoveredRange.start && nearestPoint.x <= hoveredRange.end) {
                    displayPoint = nearestPoint;
                }
            }

            return (
                <div className="bg-popover border border-border text-popover-foreground rounded-md shadow-md p-3 text-sm">
                    <div className="font-semibold mb-1">
                        {new Date(displayPoint.date).toLocaleString()}
                    </div>
                    <div className="grid gap-1 mt-1">
                        <div className="text-muted-foreground">Value: <span className="font-medium text-foreground">{displayPoint.y}</span></div>
                        {displayPoint.patientId && <div className="text-muted-foreground">Patient: <span className="font-medium text-foreground">{displayPoint.patientId}</span></div>}
                        {displayPoint.isMaxBucket && <div className="text-red-500 font-medium text-xs">Bucket Max Value</div>}
                        {displayPoint.isMinBucket && <div className="text-blue-500 font-medium text-xs">Bucket Min Value</div>}
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

        // Scroll so the focusDate is roughly centered
        const targetScrollLeft = (scrollWidth * focusPercentage) - (clientWidth / 2);

        // Use timeout to ensure it runs after render/layout if width changed
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTo({ left: Math.max(0, targetScrollLeft), behavior: 'smooth' });
            }
        }, 100);
    }, [focusDate, zoomLevel, xDomain, scatterData.length, chartWidth]);

    return (
        <div className="w-full h-full p-4 overflow-hidden flex flex-col">
            {/* Fixed Legend outside of scrolling area */}
            <div className="flex justify-center gap-6 mb-2 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff0000]"></div>
                    <span className="text-foreground">Max</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#0000ff]"></div>
                    <span className="text-foreground">Min</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#888888]"></div>
                    <span className="text-foreground">Patient Values</span>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 w-full overflow-x-auto overflow-y-hidden custom-scrollbar">
                <div style={{ minWidth: `${chartWidth}px`, height: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart
                            data={scatterData}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
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
                                tickFormatter={detailTickFormatter}
                                scale="time"
                                allowDuplicatedCategory={false}
                                interval={0}
                                orientation="bottom"
                                height={30}
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
                                    dy={15}
                                    tickLine={false}
                                    axisLine={false}
                                    onClick={() => {
                                        if (onZoomOut) onZoomOut();
                                    }}
                                    cursor="pointer"
                                />
                            )}
                            <YAxis dataKey="y" />
                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={false} // Disable default cursor line since we use ReferenceArea
                            />

                            {/* Max Line - Red */}
                            <Scatter
                                xAxisId="detail"
                                data={maxLineData}
                                dataKey="y"
                                line={{ stroke: '#ff0000', strokeWidth: 2 }}
                                fill="#ff0000"
                                shape="circle"
                                name="Max"
                                isAnimationActive={false}
                            />

                            {/* Min Line - Blue */}
                            <Scatter
                                xAxisId="detail"
                                data={minLineData}
                                dataKey="y"
                                line={{ stroke: '#0000ff', strokeWidth: 2 }}
                                fill="#0000ff"
                                shape="circle"
                                name="Min"
                                isAnimationActive={false}
                            />

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
                            />

                            {/* Dummy Data for Hovering Empty Buckets */}
                            <Scatter
                                xAxisId="detail"
                                data={dummyData}
                                dataKey="y"
                                name="Empty"
                                opacity={0}
                                isAnimationActive={false}
                                activeShape={() => null}
                            />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
