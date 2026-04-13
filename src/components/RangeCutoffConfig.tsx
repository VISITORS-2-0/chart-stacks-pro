import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface RangeCutoffConfigProps {
    minValue: number;
    maxValue: number;
    currentCutoffs?: number[];
    isBalanced?: boolean;
    onApply: (cutoffs: number[], isBalanced: boolean) => void;
}

export function RangeCutoffConfig({ minValue, maxValue, currentCutoffs, isBalanced: initialIsBalanced = true, onApply }: RangeCutoffConfigProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isBalanced, setIsBalanced] = useState<boolean>(initialIsBalanced);
    const [cutoffCount, setCutoffCount] = useState<number>(currentCutoffs ? currentCutoffs.length : 3); // 3 cutoffs = 4 ranges default
    const [customCutoffs, setCustomCutoffs] = useState<string[]>(currentCutoffs ? currentCutoffs.map(String) : Array(3).fill(''));
    const [error, setError] = useState<string>('');

    // Reset local state if props change and popover opens
    useEffect(() => {
        if (isOpen) {
            setIsBalanced(initialIsBalanced);
            setCutoffCount(currentCutoffs ? currentCutoffs.length : 3);
            setCustomCutoffs(currentCutoffs ? currentCutoffs.map(String) : Array(3).fill(''));
            setError('');
        }
    }, [isOpen, initialIsBalanced, currentCutoffs]);

    const handleCountChange = (value: string) => {
        const count = parseInt(value, 10);
        setCutoffCount(count);
        
        // Adjust custom cutoffs array size
        setCustomCutoffs(prev => {
            if (prev.length === count) return prev;
            if (prev.length > count) return prev.slice(0, count);
            return [...prev, ...Array(count - prev.length).fill('')];
        });
    };

    const handleCustomChange = (index: number, value: string) => {
        setCustomCutoffs(prev => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    };

    const handleApply = () => {
        setError('');
        let finalCutoffs: number[] = [];

        if (isBalanced) {
            // Calculate balanced cutoffs
            const step = (maxValue - minValue) / (cutoffCount + 1);
            for (let i = 1; i <= cutoffCount; i++) {
                finalCutoffs.push(minValue + (step * i));
            }
        } else {
            // Validate custom cutoffs
            finalCutoffs = customCutoffs.map(c => parseFloat(c));
            
            // Check for valid numbers
            if (finalCutoffs.some(isNaN)) {
                setError('All cutoffs must be valid numbers.');
                return;
            }

            // Check boundaries
            if (finalCutoffs.some(c => c <= minValue || c >= maxValue)) {
                setError(`Cutoffs must be strictly between ${minValue} and ${maxValue}.`);
                return;
            }

            // Check sorted strictly increasing
            for (let i = 1; i < finalCutoffs.length; i++) {
                if (finalCutoffs[i] <= finalCutoffs[i - 1]) {
                    setError('Cutoffs must be in strictly increasing order.');
                    return;
                }
            }
        }

        onApply(finalCutoffs, isBalanced);
        setIsOpen(false);
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                    <Settings2 className="h-3 w-3" />
                    Range Settings
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                    <h4 className="font-medium leading-none text-sm">Numeric Ranges Configuration</h4>
                    <p className="text-sm text-muted-foreground">
                        Define how the data defaults to buckets. Range lies between {minValue} and {maxValue}.
                    </p>

                    <RadioGroup 
                        value={isBalanced ? "balanced" : "unbalanced"} 
                        onValueChange={(val) => setIsBalanced(val === "balanced")}
                        className="flex flex-col space-y-1"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="balanced" id="r1" />
                            <Label htmlFor="r1">Balanced (Equal steps)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="unbalanced" id="r2" />
                            <Label htmlFor="r2">Unbalanced (Custom)</Label>
                        </div>
                    </RadioGroup>

                    <div className="space-y-2">
                        <Label>Number of Cutoffs (1-4)</Label>
                        <Select value={String(cutoffCount)} onValueChange={handleCountChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select cutoffs" />
                            </SelectTrigger>
                            <SelectContent>
                                {[1, 2, 3, 4].map(n => (
                                    <SelectItem key={n} value={String(n)}>
                                        {n} cutoff{n > 1 ? 's' : ''} ({n + 1} ranges)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {!isBalanced && (
                        <div className="space-y-3 mt-4 border-t pt-4">
                            <Label>Custom Cutoff Values</Label>
                            {customCutoffs.map((val, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground w-12 text-right">Cutoff {idx + 1}</span>
                                    <Input 
                                        type="number" 
                                        step="any"
                                        value={val} 
                                        onChange={(e) => handleCustomChange(idx, e.target.value)}
                                        className="h-8"
                                        placeholder="Value"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {error && (
                        <p className="text-xs text-red-500 font-medium">{error}</p>
                    )}

                    <div className="flex justify-end pt-2">
                        <Button size="sm" onClick={handleApply}>
                            Apply
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
