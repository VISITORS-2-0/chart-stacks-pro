import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TemporalRow, PatientStatusProcessedRow } from '../types/temporal';
import { formatRelativeTimeFromMonthKey } from '@/utils/dateUtils';

import { Button } from '@/components/ui/button';

interface PatientStatusAnalyticsProps {
    data: (TemporalRow | PatientStatusProcessedRow)[];
    zoomLevel?: 'years' | 'months' | 'days';
    onDrillDown?: (dateStr: string) => void;
    conceptData?: any;
    focusDate?: Date | null;
    onNavigate?: (direction: 'next' | 'prev') => void;
    isRelative?: boolean;
    relativeGranularity?: 'D' | 'ME' | 'YE';
    globalStart?: string | number;
    globalEnd?: string | number;
    isMultiPatient?: boolean;
}

export function PatientStatusAnalytics({ data, zoomLevel = 'years', onDrillDown, conceptData, focusDate, onNavigate, isRelative = false, relativeGranularity = 'YE', globalStart, globalEnd, isMultiPatient = false }: PatientStatusAnalyticsProps) {
    const componentId = React.useId();
    const syncId = `patientStatus-${componentId}`;

    const categories = React.useMemo(() => {
        if (conceptData && conceptData.values && conceptData.values.length > 0) {
            return conceptData.values;
        }
        if (conceptData && conceptData.allowed_values && conceptData.allowed_values.values) {
            return conceptData.allowed_values.values;
        }
        
        // Dynamically extract from data
        if (data && data.length > 0) {
            if ('month' in data[0] || 'NormalPct' in data[0]) {
                // Pre-processed data
                const dynamicCategories = new Set<string>();
                data.forEach((row: any) => {
                    Object.keys(row).forEach(k => {
                        if (k !== 'month' && !k.endsWith('Pct') && k !== 'total' && k !== 'TotalPatientsWithData') {
                            dynamicCategories.add(k);
                        }
                    });
                });
                const dynamicArray = Array.from(dynamicCategories);
                if (dynamicArray.length > 0) return dynamicArray.sort();
            } else {
                // Raw data
                const vals = new Set((data as TemporalRow[]).map(d => String(d.Value)));
                if (vals.size > 0) return Array.from(vals).sort();
            }
        }
        return ['High', 'Normal', 'Moderately_low']; // Fallback
    }, [conceptData, data]);

    const categoryColors: Record<string, string> = React.useMemo(() => {
        const colors: Record<string, string> = {
            'High': '#ef4444', // red-500
            'Normal': '#22c55e', // green-500
            'Moderately_low': '#f59e0b', // amber-500
            'Low': '#3b82f6', // blue-500
            'Medium': '#f59e0b', // amber-500
        };
        // Auto-assign colors if not present?
        // For now rely on defaults and extended palette
        const palette = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
        categories.forEach((cat: string, index: number) => {
            if (!colors[cat as any]) { // Cast to avoid index error in TS if cat is string
                colors[cat] = palette[index % palette.length];
            }
        });
        return colors;
    }, [categories]);

    // Aggregate Data if it is Raw TemporalRow[]
    const chartData = React.useMemo(() => {
        let processedData: any[] = [];

        if (data && data.length > 0) {
            const normalizedData = data.map((d: any) => {
                if (!('month' in d) && !('NormalPct' in d)) return d;
                const newRow: any = { ...d };
                categories.forEach(cat => {
                    // find a key in d that matches cat case-insensitively
                    const match = Object.keys(d).find(k => k.toLowerCase() === cat.toLowerCase());
                    if (match && match !== cat) {
                        newRow[cat] = d[match];
                        newRow[`${cat}Pct`] = d[`${match}Pct`];
                    }
                    if (newRow[cat] === undefined) newRow[cat] = 0;
                    if (newRow[`${cat}Pct`] === undefined) newRow[`${cat}Pct`] = 0;
                });
                return newRow;
            });

            // Detect if already processed
            if ('NormalPct' in normalizedData[0] || 'month' in normalizedData[0]) {
                const isMonthFormat = normalizedData[0].month && normalizedData[0].month.split('-').length === 2;
                
                if (zoomLevel === 'years' && isMonthFormat) {
                    // Re-aggregate monthly processed data into yearly
                    const buckets = new Map<string, any>();
                    normalizedData.forEach((d: any) => {
                        const year = d.month.split('-')[0];
                        if (!buckets.has(year)) {
                            const newEntry: any = { month: year, total: 0 };
                            categories.forEach(c => newEntry[c] = 0);
                            buckets.set(year, newEntry);
                        }
                        const entry = buckets.get(year)!;
                        let rowTotal = 0;
                        categories.forEach(c => {
                            if (d[c] !== undefined) {
                                entry[c] += d[c];
                                rowTotal += d[c];
                            }
                        });
                        entry.total += rowTotal;
                    });
                    
                    Array.from(buckets.keys()).sort().forEach(year => {
                        const entry = buckets.get(year)!;
                        const row: any = { month: year };
                        categories.forEach(cat => {
                            row[cat] = entry[cat];
                            row[`${cat}Pct`] = entry.total > 0 ? (entry[cat] / entry.total) * 100 : 0;
                        });
                        processedData.push(row);
                    });
                } else {
                    processedData = normalizedData as PatientStatusProcessedRow[];
                }
            } else {
                // Processing Raw Data (TemporalRow[])
                const rawData = normalizedData as TemporalRow[];
                const buckets = new Map<string, Record<string, number>>();

                rawData.forEach(row => {
                    const date = new Date(row.StartTime);
                    if (isNaN(date.getTime())) return;

                    let key;
                    if (zoomLevel === 'years') {
                        key = isRelative ? `${date.getUTCFullYear()}` : `${date.getFullYear()}`;
                    } else if (zoomLevel === 'months') {
                        key = isRelative 
                            ? `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
                            : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    } else {
                        // Days
                        key = isRelative
                            ? `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
                            : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    }

                    if (!buckets.has(key)) {
                        buckets.set(key, { total: 0 });
                        categories.forEach((c: string) => buckets.get(key)![c] = 0);
                    }

                    const entry = buckets.get(key)!;
                    const val = String(row.Value); // Ensure string matching
                    if (categories.includes(val)) {
                        entry[val] = (entry[val] || 0) + 1;
                        entry.total += 1;
                    }
                });

                // Convert buckets to rows with Percentages
                const sortedKeys = Array.from(buckets.keys()).sort();
                sortedKeys.forEach(key => {
                    const entry = buckets.get(key)!;
                    const row: any = { month: key }; // Using 'month' as XAxis key for compatibility

                    categories.forEach((cat: string) => {
                        row[cat] = entry[cat];
                        row[`${cat}Pct`] = entry.total > 0 ? (entry[cat] / entry.total) * 100 : 0;
                    });
                    processedData.push(row);
                });
            }
        } // Close the if (data && data.length > 0) block here

        // --- PADDING LOGIC ---
        const dataMap = new Map();
        processedData.forEach(d => dataMap.set(d.month, d));

        let keysToGenerate: string[] = [];

        let eStartMs = globalStart !== undefined ? new Date(globalStart).getTime() : NaN;
        let eEndMs = globalEnd !== undefined ? new Date(globalEnd).getTime() : NaN;

        if (isRelative && !isNaN(eEndMs)) {
            eEndMs = eEndMs - 1;
        }

        if (isNaN(eStartMs) || isNaN(eEndMs)) {
            if (processedData.length === 0) return [];
            eStartMs = Infinity;
            eEndMs = -Infinity;
            processedData.forEach(d => {
                const parts = d.month.split('-');
                let ms;
                if (parts.length === 3) ms = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();
                else if (parts.length === 2) ms = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1).getTime();
                else ms = new Date(parseInt(parts[0], 10), 0, 1).getTime();
                if (ms < eStartMs) eStartMs = ms;
                if (ms > eEndMs) eEndMs = ms;
            });
        }

        if (focusDate && zoomLevel !== 'years') {
            if (zoomLevel === 'months') {
                const y = isRelative ? focusDate.getUTCFullYear() : focusDate.getFullYear();
                for (let m = 1; m <= 12; m++) {
                    keysToGenerate.push(`${y}-${String(m).padStart(2, '0')}`);
                }
            } else if (zoomLevel === 'days') {
                const y = isRelative ? focusDate.getUTCFullYear() : focusDate.getFullYear();
                const m = isRelative ? focusDate.getUTCMonth() + 1 : focusDate.getMonth() + 1;
                const daysInMonth = isRelative 
                    ? new Date(Date.UTC(y, m, 0)).getUTCDate() 
                    : new Date(y, m, 0).getDate();
                for (let d = 1; d <= daysInMonth; d++) {
                    keysToGenerate.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
                }
            }
        } else {
            const sDate = new Date(eStartMs);
            const eDate = new Date(eEndMs);
            if (zoomLevel === 'years') {
                let startY = isRelative ? sDate.getUTCFullYear() : sDate.getFullYear();
                let endY = isRelative ? eDate.getUTCFullYear() : eDate.getFullYear();
                // safeguard against crazy bounds
                if (endY - startY > 100) endY = startY + 100;
                for (let y = startY; y <= endY; y++) {
                    keysToGenerate.push(`${y}`);
                }
            } else if (zoomLevel === 'months') {
                let currY = isRelative ? sDate.getUTCFullYear() : sDate.getFullYear();
                let currM = isRelative ? sDate.getUTCMonth() + 1 : sDate.getMonth() + 1;
                const endY = isRelative ? eDate.getUTCFullYear() : eDate.getFullYear();
                const endM = isRelative ? eDate.getUTCMonth() + 1 : eDate.getMonth() + 1;
                let sanity = 0;
                while ((currY < endY || (currY === endY && currM <= endM)) && sanity < 1200) {
                    keysToGenerate.push(`${currY}-${String(currM).padStart(2, '0')}`);
                    currM++;
                    if (currM > 12) { currM = 1; currY++; }
                    sanity++;
                }
            } else if (zoomLevel === 'days') {
                const curr = isRelative 
                    ? new Date(Date.UTC(sDate.getUTCFullYear(), sDate.getUTCMonth(), sDate.getUTCDate()))
                    : new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate());
                const end = isRelative
                    ? new Date(Date.UTC(eDate.getUTCFullYear(), eDate.getUTCMonth(), eDate.getUTCDate()))
                    : new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate());
                let sanity = 0;
                while (curr.getTime() <= end.getTime() && sanity < 36500) {
                    if (isRelative) {
                        keysToGenerate.push(`${curr.getUTCFullYear()}-${String(curr.getUTCMonth() + 1).padStart(2, '0')}-${String(curr.getUTCDate()).padStart(2, '0')}`);
                        curr.setUTCDate(curr.getUTCDate() + 1);
                    } else {
                        keysToGenerate.push(`${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`);
                        curr.setDate(curr.getDate() + 1);
                    }
                    sanity++;
                }
            }
        }

        const padded: any[] = [];
        keysToGenerate.forEach(k => {
            if (dataMap.has(k)) {
                padded.push(dataMap.get(k));
            } else {
                const empty: any = { month: k };
                categories.forEach(cat => {
                    empty[cat] = 0;
                    empty[`${cat}Pct`] = 0;
                });
                padded.push(empty);
            }
        });

        return padded;

    }, [data, categories, zoomLevel, focusDate]);

    const handleBarClick = (data: any) => {
        if (onDrillDown && data && data.month) {
            const parts = data.month.split('-');
            let validDate;
            if (isRelative) {
                if (parts.length === 3) {
                    validDate = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
                } else if (parts.length === 2) {
                    validDate = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1));
                } else {
                    validDate = new Date(Date.UTC(parseInt(parts[0], 10), 0, 1));
                }
            } else {
                validDate = new Date(data.month + '-01'); // Force 1st of month
            }
            if (validDate && !isNaN(validDate.getTime())) {
                onDrillDown(validDate.toISOString());
            }
        }
    };

    // Custom Tooltip to show Count (and Percentage)
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            const dataKey = payload[0].dataKey as string; // e.g., 'NormalPct'
            const category = dataKey.replace('Pct', ''); // 'Normal'
            const count = dataPoint[category];
            const pct = payload[0].value;
            const color = payload[0].fill;

            const timeLabel = isRelative && label
                ? formatRelativeTimeFromMonthKey(label, relativeGranularity)
                : label;

            return (
                <div className="bg-background border border-border p-2 rounded shadow-md text-xs">
                    <p className="font-semibold mb-1">{`Time: ${timeLabel}`}</p>
                    <p style={{ color }}>
                        {`${category.replace('_', ' ')}: ${count} patients (${Number(pct).toFixed(1)}%)`}
                    </p>
                </div>
            );
        }
        return null;
    };

    const isZoomedIn = zoomLevel === 'months' || zoomLevel === 'days';

    return (
        <div className="w-full h-full overflow-y-visible p-4 relative flex flex-col">
            <div
                className="w-full flex-1 flex flex-col space-y-4 min-h-0"
                style={{ minHeight: `${(categories.length * 125) + 30}px` }}
            >
                {[...categories].reverse().map((category: string, index: number) => {
                    const isLast = index === categories.length - 1;

                    return (
                        <div
                            key={category}
                            className="flex flex-col relative w-full min-h-0"
                            style={{ flex: isLast ? '1 1 155px' : '1 1 125px' }}
                        >
                            <h3 className="text-sm font-medium mb-1 text-left ml-[15px] shrink-0" style={{ color: categoryColors[category] }}>
                                {category.replace('_', ' ')}
                            </h3>
                            <div className="w-full flex-1 min-h-0 min-w-0 relative">
                                <div className="absolute inset-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={chartData}
                                            syncId={syncId}
                                            margin={{ top: 5, right: 30, left: 20, bottom: isLast ? 35 : 5 }}
                                            onClick={(e: any) => {
                                                if (e && e.activePayload && e.activePayload[0]) {
                                                    handleBarClick(e.activePayload[0].payload);
                                                }
                                            }}
                                        >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis
                                            dataKey="month"
                                            hide={!isLast}
                                            tick={{ fontSize: 12 }}
                                            interval={0}
                                            height={30}
                                            tickFormatter={(val) => {
                                                if (!val) return val;

                                                // Relative time mode: compute offset from anchor date
                                                if (isRelative) {
                                                    return formatRelativeTimeFromMonthKey(val, relativeGranularity);
                                                }

                                                const parts = val.split('-');

                                                // Determine exactly what the data string represents to prevent async mismatches
                                                if (parts.length === 3) {
                                                    // Data is YYYY-MM-DD -> Render Day
                                                    return parseInt(parts[2], 10).toString();
                                                } else if (parts.length === 2) {
                                                    // Data is YYYY-MM -> Render Month
                                                    const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
                                                    if (!isNaN(date.getTime())) {
                                                        return date.toLocaleDateString(undefined, { month: 'short' });
                                                    }
                                                }

                                                // Data is YYYY -> Render Year
                                                return parts[0];
                                            }}
                                        />
                                        <YAxis
                                            domain={[0, 100]}
                                            ticks={[0, 50, 100]}
                                            tickFormatter={(value) => `${value}%`}
                                            fontSize={12}
                                            width={45}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar
                                            dataKey={`${category}Pct`}
                                            fill={categoryColors[category] || "#8884d8"}
                                            radius={[4, 4, 0, 0]}
                                            cursor="pointer"
                                            onClick={handleBarClick}
                                            isAnimationActive={false}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
