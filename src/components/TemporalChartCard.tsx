import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useOnePatientRaw, useMultiPatientAbstract, useMultiPatientRaw } from "../hooks/useTemporalData";
import { PatientStatusAnalytics } from "./PatientStatusAnalytics";
import { PatientStateGantt } from "./PatientStateGantt";
import { PatientMultiStateGantt } from "./PatientMultiStateGantt";
import { PatientContinuousIntervalChart } from "./PatientContinuousIntervalChart";
import { PatientMultiLineChart } from "./PatientMultiLineChart";
import { SinglePatientAbstractionPanel, AbstractionInterval, ValueLevel } from "./SinglePatientAbstractionPanel";
import { RangeCutoffConfig } from "./RangeCutoffConfig";
import { useState, useMemo, useCallback, useRef } from "react";
import { GraphContextModal } from "./GraphContextModal";
import { MappingAbstractionsModal } from "./MappingAbstractionsModal";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export type ZoomLevel = 'years' | 'months' | 'days';

interface TemporalChartCardProps {
    id: string;
    title: string;
    onRemove: (id: string) => void;
    patientIds?: string[];
    isRaw?: boolean;
    chartType?: string;
    externalData?: any[];
    conceptData?: any;
    onDrillDown?: (date: Date, currentLevel: ZoomLevel) => void;
    onZoomOut?: (currentLevel: ZoomLevel) => void;
    onNavigate?: (direction: 'next' | 'prev', currentZoom: ZoomLevel, focusDate: Date | null) => void;
    cutoffs?: number[];
    isCutoffsBalanced?: boolean;
    onApplyCutoffs?: (cutoffs: number[], isBalanced: boolean) => void;
    currentInterval?: string;
    isRelative?: boolean;
    relativeEventName?: string;
    globalStart?: string | number;
    globalEnd?: string | number;
    viewType?: 'summary' | 'pure';
}

export function TemporalChartCard({
    id,
    title,
    onRemove,
    isRaw = false,
    chartType,
    externalData,
    conceptData,
    onDrillDown,
    onZoomOut,
    onNavigate,
    cutoffs,
    isCutoffsBalanced,
    onApplyCutoffs,
    patientIds,
    currentInterval,
    isRelative = false,
    relativeEventName,
    globalStart,
    globalEnd,
    viewType,
}: TemporalChartCardProps) {
    const isMultiPatient = patientIds ? patientIds.length > 1 : false;

    // Derive granularity for relative-time formatting
    const relativeGranularity: 'D' | 'ME' | 'YE' =
        currentInterval === 'D' ? 'D' :
        currentInterval === 'ME' ? 'ME' : 'YE';

    const singlePatient = useOnePatientRaw();
    const multiPatientAbstract = useMultiPatientAbstract();
    const multiPatientRaw = useMultiPatientRaw();

    // Zoom State
    const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(
        currentInterval === 'D' ? 'days' :
            currentInterval === 'ME' ? 'months' :
                'years'
    );
    const [focusDate, setFocusDate] = useState<Date | null>(null);
    const [scrolledFocusDate, setScrolledFocusDate] = useState<Date | null>(null);

    const handleVisibleRangeChange = useCallback((date: Date) => {
        setScrolledFocusDate(date);
    }, []);

    // Determine which data hook to use (only if no externalData)
    let dataHook;
    if (isMultiPatient) {
        if (isRaw) {
            dataHook = multiPatientRaw;
        } else {
            // Force abstract for non-raw multi-patient (as per previous logic for demo)
            dataHook = multiPatientAbstract;
        }
    } else {
        dataHook = singlePatient;
    }

    const { data: hookData, loading: hookLoading, error: hookError } = dataHook;

    // prioritized external data if available
    const data = externalData || hookData;
    const loading = externalData ? false : hookLoading;
    const error = externalData ? null : hookError;

    const globalBounds = useMemo(() => {
        if (!data || data.length === 0) return { min: null, max: null };
        let minTime = Infinity, maxTime = -Infinity;
        data.forEach((row: any) => {
            let t1 = NaN, t2 = NaN;
            if (row.StartTime) t1 = new Date(row.StartTime).getTime();
            if (row.EndTime) t2 = new Date(row.EndTime).getTime();
            else if (row.month) {
                const parts = row.month.split('-');
                if (parts.length === 3) t1 = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])).getTime();
                else if (parts.length === 2) t1 = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1).getTime();
                else t1 = new Date(parseInt(parts[0]), 0, 1).getTime();
            }
            if (!isNaN(t1)) {
                if (t1 < minTime) minTime = t1;
                if (t1 > maxTime) maxTime = t1;
            }
            if (!isNaN(t2)) {
                if (t2 < minTime) minTime = t2;
                if (t2 > maxTime) maxTime = t2;
            }
        });
        if (minTime === Infinity) return { min: null, max: null };
        return { min: new Date(minTime), max: new Date(maxTime) };
    }, [data]);

    const navMinDate = useMemo(() => {
        if (globalStart !== undefined && globalStart !== null && globalStart !== '') {
            const d = new Date(globalStart);
            if (!isNaN(d.getTime())) return d;
        }
        return globalBounds.min;
    }, [globalStart, globalBounds.min]);

    const navMaxDate = useMemo(() => {
        if (globalEnd !== undefined && globalEnd !== null && globalEnd !== '') {
            const d = new Date(globalEnd);
            if (!isNaN(d.getTime())) return d;
        }
        return globalBounds.max;
    }, [globalEnd, globalBounds.max]);

    // Filter Data based on Zoom Level
    const filteredData = useMemo(() => {
        if (!data) return [];

        // We no longer bypass filtering here even if onDrillDown is provided,
        // because we still want to benefit from the generic client-side filtering 
        // fallback for single patients or raw data sets.

        // If 'years', show everything (charts handle aggregation)
        // If 'months', filter by focusDate year
        // If 'days', filter by focusDate month

        // For raw data, filter the dataset to only load the zoomed year when in days view
        // to avoid loading too many data points and causing lag.
        if (isRaw) {
            if (zoomLevel === 'days' && focusDate) {
                const targetYear = focusDate.getFullYear();
                return data.filter((row: any) => {
                    if (row.StartTime) {
                        const rowStart = new Date(row.StartTime);
                        if (isNaN(rowStart.getTime())) return false;
                        return rowStart.getFullYear() === targetYear;
                    }
                    return false;
                });
            }
            return data;
        }

        if (zoomLevel === 'years') return data;
        if (!focusDate) return data;

        return data.filter((row: any) => {
            if (row.StartTime) {
                const rowStart = new Date(row.StartTime);
                if (isNaN(rowStart.getTime())) return false;

                let rowEnd = rowStart;
                if (row.EndTime) {
                    const parsedEnd = new Date(row.EndTime);
                    if (!isNaN(parsedEnd.getTime())) {
                        rowEnd = parsedEnd;
                    }
                }

                if (zoomLevel === 'months') {
                    const viewStart = new Date(focusDate.getFullYear(), 0, 1).getTime();
                    const viewEnd = new Date(focusDate.getFullYear(), 11, 31, 23, 59, 59, 999).getTime();
                    return rowStart.getTime() <= viewEnd && rowEnd.getTime() >= viewStart;
                }
                if (zoomLevel === 'days') {
                    const viewStart = new Date(focusDate.getFullYear(), focusDate.getMonth(), 1).getTime();
                    const viewEnd = new Date(focusDate.getFullYear(), focusDate.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
                    return rowStart.getTime() <= viewEnd && rowEnd.getTime() >= viewStart;
                }
                return true;
            } else if (row.month) {
                // Abstract data row.month is 'YYYY-MM'
                const parts = row.month.split('-');
                const rowYear = parseInt(parts[0], 10);

                if (zoomLevel === 'months') {
                    return rowYear === focusDate.getFullYear();
                }
                if (zoomLevel === 'days') {
                    const rowMonth = parts.length > 1 ? parseInt(parts[1], 10) - 1 : 0;
                    return rowYear === focusDate.getFullYear() && rowMonth === focusDate.getMonth();
                }
                return true;
            }
            return false;
        });
    }, [data, zoomLevel, focusDate, onDrillDown]);

    // Data Transformation for SinglePatientAbstractionPanel
    const { abstractionIntervals, valueLevels } = useMemo(() => {
        if (!conceptData || !filteredData || chartType !== 'bar') {
            return { abstractionIntervals: [], valueLevels: [] };
        }

        // 1. Value Levels
        const values = conceptData.values || [];
        const levels: ValueLevel[] = values.map((val: string, index: number) => ({
            label: val,
            order: index,
            color: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]
        }));

        // 2. Intervals
        const intervals: AbstractionInterval[] = filteredData.map((row: any) => {
            const val = String(row.Value);
            const level = levels.find(l => l.label === val);
            return {
                start: row.StartTime,
                end: row.EndTime,
                valueLabel: val,
                valueOrderIndex: level ? level.order : 0,
                contextId: String(row.PatientID), // showing patient ID as context
            };
        });

        return { abstractionIntervals: intervals, valueLevels: levels };

    }, [filteredData, conceptData, chartType]);

    const handleDrillDown = (dateStr: string) => {
        const clickedDate = new Date(dateStr);
        if (isNaN(clickedDate.getTime())) return;

        // Set local focus reference
        let targetDate = clickedDate;
        if (zoomLevel === 'years') {
            // We are drilling down to 'months', so force focusDate to Jan 1st of that year
            targetDate = new Date(clickedDate.getFullYear(), 0, 1);
        } else if (zoomLevel === 'months') {
            // We are drilling down to 'days', so force focusDate to the 1st of that month
            targetDate = new Date(clickedDate.getFullYear(), clickedDate.getMonth(), 1);
        }
        setFocusDate(targetDate);
        setScrolledFocusDate(null);

        // Update local zoom level for UI state
        if (zoomLevel === 'years') {
            setZoomLevel('months');
        } else if (zoomLevel === 'months') {
            setZoomLevel('days');
        }

        // Always notify parent just in case it wants to do server-side fetching
        if (onDrillDown) {
            onDrillDown(clickedDate, zoomLevel);
        }
    };

    const handleZoomOut = () => {
        if (onZoomOut) {
            onZoomOut(zoomLevel);
            // Manually revert local zoom state?
            // If parent manages data, we should probably follow suit or trust data update.
            // But we might need to sync local zoom for display reasons if not controlled.
            // Assuming strict hierarchy YE -> ME -> D.
            if (zoomLevel === 'days') setZoomLevel('months');
            else if (zoomLevel === 'months') {
                setZoomLevel('years');
                setFocusDate(null);
            }
            return;
        }

        if (zoomLevel === 'days') setZoomLevel('months');
        else if (zoomLevel === 'months') {
            setZoomLevel('years');
            setFocusDate(null);
        }
    };

    const getCurrentFocus = useCallback(() => {
        if (scrolledFocusDate) return scrolledFocusDate;
        if (focusDate) return focusDate;
        if (!filteredData || filteredData.length === 0) {
            const fallbackDate = globalStart ? new Date(globalStart as string | number) : new Date();
            return !isNaN(fallbackDate.getTime()) ? fallbackDate : new Date();
        }
        const firstRow = filteredData[0];
        let dateVal: Date | null = null;
        if (firstRow.StartTime) {
            dateVal = new Date(firstRow.StartTime);
        } else if (firstRow.month) {
            const parts = firstRow.month.split('-');
            if (parts.length >= 2) {
                dateVal = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
            } else {
                dateVal = new Date(parseInt(parts[0], 10), 0, 1);
            }
        }
        if (!dateVal || isNaN(dateVal.getTime())) {
            const fallbackDate = globalStart ? new Date(globalStart as string | number) : new Date();
            return !isNaN(fallbackDate.getTime()) ? fallbackDate : new Date();
        }
        return dateVal;
    }, [scrolledFocusDate, focusDate, filteredData, globalStart]);

    const handleNavigateWrapper = (dir: 'next' | 'prev', type: 'month' | 'year' = 'month') => {
        let currentFocus = getCurrentFocus();

        const y = currentFocus.getFullYear();
        const m = currentFocus.getMonth();
        let newFocus: Date;
        
        if (zoomLevel === 'months') {
            // In months zoom, arrows navigate by year. Align directly to Jan 1st of target year.
            newFocus = new Date(y + (dir === 'next' ? 1 : -1), 0, 1);
        } else if (zoomLevel === 'days') {
            // In days zoom, align to 1st of target month/year.
            if (type === 'year') {
                newFocus = new Date(y + (dir === 'next' ? 1 : -1), m, 1);
            } else {
                newFocus = new Date(y, m + (dir === 'next' ? 1 : -1), 1);
            }
        } else {
            newFocus = new Date(currentFocus);
            if (type === 'year') {
                newFocus.setFullYear(y + (dir === 'next' ? 1 : -1));
            } else {
                newFocus.setMonth(m + (dir === 'next' ? 1 : -1));
            }
        }
        setFocusDate(newFocus);
        setScrolledFocusDate(null);
        if (onNavigate) {
            onNavigate(dir, zoomLevel, newFocus);
        }
    };

    const isNavDisabled = (dir: 'next' | 'prev', type: 'month' | 'year' = 'month') => {
        if (!navMinDate || !navMaxDate) return false;
        const currentFocus = getCurrentFocus();
        let y = currentFocus.getFullYear();
        let m = currentFocus.getMonth();

        if (type === 'year') {
            y += (dir === 'next' ? 1 : -1);
        } else {
            if (zoomLevel === 'months') {
                y += (dir === 'next' ? 1 : -1);
            } else if (zoomLevel === 'days') {
                m += (dir === 'next' ? 1 : -1);
                if (m > 11) { m = 0; y += 1; }
                if (m < 0) { m = 11; y -= 1; }
            }
        }

        if (dir === 'next') {
            if (y > navMaxDate.getFullYear()) return true;
            if (y === navMaxDate.getFullYear() && zoomLevel === 'days' && m > navMaxDate.getMonth()) return true;
        } else {
            if (y < navMinDate.getFullYear()) return true;
            if (y === navMinDate.getFullYear() && zoomLevel === 'days' && m < navMinDate.getMonth()) return true;
        }
        return false;
    };

    const getNavigationLabel = () => {
        const d = scrolledFocusDate || focusDate;
        if (d) {
            return zoomLevel === 'months'
                ? d.getFullYear().toString()
                : d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
        }
        if (!filteredData || filteredData.length === 0) return '';

        let minTime = Infinity, maxTime = -Infinity;

        filteredData.forEach((row: any) => {
            let t = NaN;
            if (row.StartTime) t = new Date(row.StartTime).getTime();
            else if (row.month) {
                const parts = row.month.split('-');
                if (parts.length === 3) t = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])).getTime();
                else if (parts.length === 2) t = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1).getTime();
                else t = new Date(parseInt(parts[0]), 0, 1).getTime();
            }
            if (!isNaN(t)) {
                if (t < minTime) minTime = t;
                if (t > maxTime) maxTime = t;
            }
        });

        if (minTime === Infinity) return '';

        const minD = new Date(minTime);
        const maxD = new Date(maxTime);

        if (zoomLevel === 'months') {
            if (minD.getFullYear() === maxD.getFullYear()) return minD.getFullYear().toString();
            return `${minD.getFullYear()}-${maxD.getFullYear()}`;
        } else if (zoomLevel === 'days') {
            const minStr = minD.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
            const maxStr = maxD.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
            if (minStr === maxStr) return minStr;
            return `${minStr} - ${maxStr}`;
        }
        return '';
    };

    return (
        <Card className={`border border-border shadow-sm animate-in fade-in-50 duration-300 w-full flex flex-col ${
            (chartType !== 'continuous-interval' && chartType !== 'bar')
                ? 'h-auto min-h-[500px]'
                : 'h-[500px]'
        }`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
                        {patientIds && patientIds.length > 0 && (
                            <TooltipProvider>
                                <Tooltip delayDuration={300}>
                                    <TooltipTrigger>
                                        <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded cursor-help inline-flex items-center">
                                            {patientIds.length === 1
                                                ? `Patient ${patientIds[0]}`
                                                : `${patientIds.length} Patients: ${patientIds.slice(0, 3).join(', ')}${patientIds.length > 3 ? '...' : ''}`}
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[300px] flex-wrap break-words" side="bottom" align="start">
                                        <p className="text-xs font-semibold mb-1 w-full flex">Patients Included:</p>
                                        <p className="text-xs w-full flex">{patientIds.join(', ')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        <GraphContextModal conceptName={title} showLabel={true} />
                        <MappingAbstractionsModal
                            conceptName={title}
                            conceptType={conceptData?.concept_type || conceptData?.["@concept-type"]}
                            showLabel={true}
                        />
                        {isRelative && (
                            <TooltipProvider>
                                <Tooltip delayDuration={200}>
                                    <TooltipTrigger>
                                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 cursor-help">
                                            <Clock className="h-3 w-3" />
                                            Relative
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" align="start" className="max-w-[280px]">
                                        <p className="text-xs font-semibold mb-0.5">Relative Time Mode</p>
                                        <p className="text-xs text-muted-foreground">
                                            Data aligned to event: <span className="font-medium text-foreground">{relativeEventName || 'Unknown'}</span>
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {loading ? "Loading..." : `${filteredData.length} data points`} ({isRelative ? relativeGranularity === 'D' ? 'daily' : relativeGranularity === 'ME' ? 'monthly' : 'yearly' : zoomLevel})
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {(zoomLevel === 'months' || zoomLevel === 'days') && !!onNavigate && !isRelative && (
                        <div className="flex justify-center items-center gap-1 shrink-0 bg-muted/50 rounded-md p-1 border">
                            {zoomLevel === 'days' && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 disabled:opacity-50"
                                    onClick={() => handleNavigateWrapper('prev', 'year')}
                                    disabled={isNavDisabled('prev', 'year')}
                                    title="Previous Year"
                                >
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 disabled:opacity-50"
                                onClick={() => handleNavigateWrapper('prev', 'month')}
                                disabled={isNavDisabled('prev', 'month')}
                                title={zoomLevel === 'days' ? "Previous Month" : "Previous Year"}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-xs font-semibold text-muted-foreground px-2 text-center min-w-[90px]">
                                {getNavigationLabel()}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 disabled:opacity-50"
                                onClick={() => handleNavigateWrapper('next', 'month')}
                                disabled={isNavDisabled('next', 'month')}
                                title={zoomLevel === 'days' ? "Next Month" : "Next Year"}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            {zoomLevel === 'days' && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 disabled:opacity-50"
                                    onClick={() => handleNavigateWrapper('next', 'year')}
                                    disabled={isNavDisabled('next', 'year')}
                                    title="Next Year"
                                >
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    )}

                    {onApplyCutoffs && isMultiPatient && conceptData !== undefined && chartType === 'analytics' && (conceptData.min !== undefined || conceptData['min-value'] !== undefined) && (
                        <RangeCutoffConfig
                            minValue={conceptData.min ?? conceptData['min-value'] ?? 0}
                            maxValue={conceptData.max ?? conceptData['max-value'] ?? 100}
                            currentCutoffs={cutoffs}
                            isBalanced={isCutoffsBalanced}
                            onApply={onApplyCutoffs}
                        />
                    )}
                    {zoomLevel !== 'years' && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1"
                            onClick={handleZoomOut}
                        >
                            <ZoomOut className="h-3 w-3" />
                            Zoom Out
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => onRemove(id)}
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remove</span>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 px-2 pb-0 pt-0">
                {loading && <div className="h-full flex items-center justify-center text-blue-600">Loading temporal data...</div>}
                {error && <div className="h-full flex items-center justify-center text-red-600">Error: {error.message}</div>}

                {!loading && !error && (
                    chartType === 'continuous-interval' ? (
                        <PatientContinuousIntervalChart
                            data={data as any || []}
                            zoomLevel={zoomLevel}
                            onDrillDown={handleDrillDown}
                            conceptData={conceptData}
                            focusDate={focusDate}
                            isRelative={isRelative}
                            relativeGranularity={relativeGranularity}
                            globalStart={globalStart}
                            globalEnd={globalEnd}
                            onVisibleRangeChange={handleVisibleRangeChange}
                        />
                    ) : isRaw ? (
                        <PatientMultiLineChart
                            data={(filteredData as any) || []}
                            zoomLevel={zoomLevel}
                            focusDate={focusDate}
                            onDrillDown={handleDrillDown}
                            onZoomOut={handleZoomOut}
                            isRelative={isRelative}
                            relativeGranularity={relativeGranularity}
                            globalStart={globalStart}
                            globalEnd={globalEnd}
                            onVisibleRangeChange={handleVisibleRangeChange}
                        />
                    ) : viewType === 'pure' ? (
                        <PatientMultiStateGantt
                            data={data as any || []}
                            zoomLevel={zoomLevel}
                            onDrillDown={handleDrillDown}
                            conceptData={conceptData}
                            focusDate={focusDate}
                            isRelative={isRelative}
                            relativeGranularity={relativeGranularity}
                            globalStart={globalStart}
                            globalEnd={globalEnd}
                            onVisibleRangeChange={handleVisibleRangeChange}
                        />
                    ) : chartType === 'bar' ? (
                        <PatientStateGantt
                            data={data as any || []}
                            zoomLevel={zoomLevel}
                            onDrillDown={handleDrillDown}
                            conceptData={conceptData}
                            focusDate={focusDate}
                            isRelative={isRelative}
                            relativeGranularity={relativeGranularity}
                            globalStart={globalStart}
                            globalEnd={globalEnd}
                            onVisibleRangeChange={handleVisibleRangeChange}
                        />
                    ) : (
                        <PatientStatusAnalytics
                            data={(filteredData as any) || []}
                            zoomLevel={zoomLevel}
                            focusDate={focusDate}
                            onDrillDown={handleDrillDown}
                            conceptData={conceptData}
                            onNavigate={handleNavigateWrapper}
                            isRelative={isRelative}
                            relativeGranularity={relativeGranularity}
                            globalStart={globalStart}
                            globalEnd={globalEnd}
                        />
                    )
                )}
            </CardContent>
        </Card>
    );
}
