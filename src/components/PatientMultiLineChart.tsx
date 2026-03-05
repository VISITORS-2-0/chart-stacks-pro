import React, { useMemo, useState } from 'react';
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

        // Determine bounds based on focus date or data bounds
        let domainStart = minTime;
        let domainEnd = maxTime;

        const detailTicks: number[] = [];
        const contextTicks: number[] = [];

        const baseDate = focusDate || minDate;

        if (zoomLevel === 'years') {
            const startYear = minDate.getFullYear();
            let endYear = maxDate.getFullYear();

            // Enforce minimum 5 years domain for consistent "bucket size" visual
            if (endYear - startYear < 5) {
                endYear = startYear + 4;
            }

            domainStart = new Date(startYear, 0, 1).getTime();
            domainEnd = new Date(endYear, 11, 31, 23, 59, 59).getTime();

            // Detail: Years
            for (let y = startYear; y <= endYear; y++) {
                detailTicks.push(new Date(y, 0, 1).getTime());
            }

        } else if (zoomLevel === 'months') {
            const year = baseDate.getFullYear();

            domainStart = new Date(year, 0, 1).getTime();
            domainEnd = new Date(year, 11, 31, 23, 59, 59).getTime();

            // Context: Year
            contextTicks.push(new Date(year, 0, 1).getTime());

            // Detail: Months
            for (let m = 0; m < 12; m++) {
                detailTicks.push(new Date(year, m, 1).getTime());
            }
        } else {
            // zoomLevel === 'days'
            const year = baseDate.getFullYear();
            const month = baseDate.getMonth();

            domainStart = new Date(year, month, 1).getTime();
            const lastDayObj = new Date(year, month + 1, 0);
            const lastDay = lastDayObj.getDate();
            domainEnd = new Date(year, month, lastDay, 23, 59, 59).getTime();

            // Context: Month
            contextTicks.push(new Date(year, month, 15).getTime());

            // Detail: Days
            for (let d = 1; d <= lastDay; d++) {
                detailTicks.push(new Date(year, month, d).getTime());
            }
        }
        return { detailAxisTicks: detailTicks, contextAxisTicks: contextTicks, xDomain: [domainStart, domainEnd] };
    }, [scatterData, zoomLevel, focusDate]);

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

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            return (
                <div className="bg-popover border border-border text-popover-foreground rounded-md shadow-md p-3 text-sm">
                    <div className="font-semibold mb-1">
                        {dataPoint.date ? new Date(dataPoint.date).toLocaleString() : new Date(label).toLocaleString()}
                    </div>
                    <div className="grid gap-1 mt-1">
                        <div className="text-muted-foreground">Value: <span className="font-medium text-foreground">{dataPoint.y}</span></div>
                        {dataPoint.patientId && <div className="text-muted-foreground">Patient: <span className="font-medium text-foreground">{dataPoint.patientId}</span></div>}
                        {dataPoint.isMaxBucket && <div className="text-red-500 font-medium text-xs">Bucket Max Value</div>}
                        {dataPoint.isMinBucket && <div className="text-blue-500 font-medium text-xs">Bucket Min Value</div>}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-full p-4">
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                    data={scatterData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoveredRange(null)}
                    onClick={(e: any) => {
                        // Attempt to capture clicks on the chart area if specific element click fails
                        if (e && e.activePayload && e.activePayload[0]) {
                            handlePointClick(e.activePayload[0].payload);
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
                    <Legend />

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
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
}
