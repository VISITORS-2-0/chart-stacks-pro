import { useState, useEffect } from "react";
import {
  fetchConceptGroups,
  createConceptGroup,
  updateConceptGroup,
  deleteConceptGroup,
  ConceptGroup,
  ConceptValue,
} from "@/services/conceptGroupsApi";
import { fetchGroups, Group as UserGroup } from "@/services/groupsApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, Edit2, Plus, Loader2, Check, ChevronsUpDown, AlertCircle } from "lucide-react";
import { getApiUrl } from "@/config/api";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Interface for concept details from backend API
interface ConceptDetails {
  min?: number;
  max?: number;
  values?: string[];
}

type ConceptValuesDict = Record<string, ConceptDetails>;

// Subcomponent for Autocomplete Dropdown
interface ConceptAutocompleteProps {
  concepts: string[];
  selected: string;
  onSelect: (concept: string) => void;
  placeholder?: string;
}

export function ConceptAutocomplete({ concepts, selected, onSelect, placeholder = "Select concept..." }: ConceptAutocompleteProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal text-left h-10 bg-background/50 border-muted-foreground/30 hover:border-primary/50 transition-colors"
        >
          <span className="truncate">{selected || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search concept name..." />
          <CommandList className="max-h-[250px] overflow-y-auto">
            <CommandEmpty>No concept found.</CommandEmpty>
            <CommandGroup>
              {concepts.map((concept) => (
                <CommandItem
                  key={concept}
                  value={concept}
                  onSelect={() => {
                    onSelect(concept);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 text-primary",
                      selected === concept ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{concept}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function ManageConceptGroups() {
  const [groups, setGroups] = useState<ConceptGroup[]>([]);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [conceptDict, setConceptDict] = useState<ConceptValuesDict>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [currentGroup, setCurrentGroup] = useState<ConceptGroup | null>(null);
  const [editName, setEditName] = useState("");
  const [editConcepts, setEditConcepts] = useState<ConceptValue[]>([]);

  const { toast } = useToast();

  const loadConceptGroups = async () => {
    setIsLoading(true);
    try {
      const data = await fetchConceptGroups();
      setGroups(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load concept groups.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const loadConceptValues = async () => {
    try {
      const response = await fetch(getApiUrl("/api/v1/concept/concept-values"));
      if (!response.ok) {
        throw new Error("Failed to load concept optional values");
      }
      const data = await response.json();
      setConceptDict(data);
    } catch (error) {
      console.error("Failed to load concept values dict:", error);
      toast({
        title: "Configuration Error",
        description: "Failed to load the autocomplete concept list.",
        variant: "destructive",
      });
    }
  };

  const loadUserGroups = async () => {
    try {
      const data = await fetchGroups();
      setUserGroups(data);
    } catch (error) {
      console.error("Failed to load user groups:", error);
    }
  };

  useEffect(() => {
    Promise.all([loadConceptGroups(), loadConceptValues(), loadUserGroups()]);
  }, []);

  const handleOpenCreateDialog = () => {
    loadConceptGroups();
    loadUserGroups();
    setCurrentGroup(null);
    setEditName("");
    setEditConcepts([{ concept: "" }]);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (group: ConceptGroup) => {
    loadConceptGroups();
    loadUserGroups();
    setCurrentGroup(group);
    setEditName(group.name);
    setEditConcepts(
      group.concepts.map((c) => ({
        concept: c.concept,
        value: c.value,
        min: c.min,
        max: c.max,
      }))
    );
    setIsDialogOpen(true);
  };

  const handleOpenDeleteDialog = (group: ConceptGroup) => {
    setCurrentGroup(group);
    setIsDeleteDialogOpen(true);
  };

  const handleAddConceptRow = () => {
    setEditConcepts([...editConcepts, { concept: "" }]);
  };

  const handleRemoveConceptRow = (index: number) => {
    const updated = editConcepts.filter((_, i) => i !== index);
    setEditConcepts(updated.length > 0 ? updated : [{ concept: "" }]);
  };

  const handleConceptSelect = (index: number, conceptName: string) => {
    const updated = [...editConcepts];
    const details = conceptDict[conceptName];

    updated[index] = {
      concept: conceptName,
      value: undefined,
      min: undefined,
      max: undefined,
    };

    // Prefill default range if it is a range concept
    if (details && typeof details.min === "number" && typeof details.max === "number") {
      updated[index].min = details.min;
      updated[index].max = details.max;
    }

    // Auto-choose option if it's categorical with exactly 1 value (e.g. TRUE)
    if (details && details.values && details.values.length === 1) {
      updated[index].value = details.values[0];
    }

    setEditConcepts(updated);
  };

  const handleValueChange = (index: number, val: string) => {
    const updated = [...editConcepts];
    updated[index].value = val;
    setEditConcepts(updated);
  };

  const handleRangeMinChange = (index: number, val: string) => {
    const updated = [...editConcepts];
    const num = val === "" ? undefined : parseFloat(val);
    updated[index].min = num;
    setEditConcepts(updated);
  };

  const handleRangeMaxChange = (index: number, val: string) => {
    const updated = [...editConcepts];
    const num = val === "" ? undefined : parseFloat(val);
    updated[index].max = num;
    setEditConcepts(updated);
  };

  const handleSaveGroup = async () => {
    if (!editName.trim()) {
      toast({ title: "Validation Error", description: "Group name is required.", variant: "destructive" });
      return;
    }

    // Validate duplicate group name
    const lowerName = editName.trim().toLowerCase();
    const duplicateConceptGroup = groups.find(
      (g) => g.name.trim().toLowerCase() === lowerName && g._id !== currentGroup?._id
    );
    if (duplicateConceptGroup) {
      toast({
        title: "Validation Error",
        description: `A concept group named "${editName}" already exists.`,
        variant: "destructive",
      });
      return;
    }

    const duplicateUserGroup = userGroups.find(
      (g) => g.name.trim().toLowerCase() === lowerName
    );
    if (duplicateUserGroup) {
      toast({
        title: "Validation Error",
        description: `A user group named "${editName}" already exists. Group names must be unique across both user groups and concept groups.`,
        variant: "destructive",
      });
      return;
    }

    const validConcepts: ConceptValue[] = [];
    const seenConceptValues = new Set<string>();

    for (let i = 0; i < editConcepts.length; i++) {
      const row = editConcepts[i];
      if (!row.concept) {
        toast({
          title: "Validation Error",
          description: `Concept is not selected in row ${i + 1}.`,
          variant: "destructive",
        });
        return;
      }

      const details = conceptDict[row.concept];
      if (!details) {
        toast({
          title: "Validation Error",
          description: `Unknown concept "${row.concept}" in row ${i + 1}.`,
          variant: "destructive",
        });
        return;
      }

      // Check categorical
      if (details.values) {
        if (!row.value) {
          toast({
            title: "Validation Error",
            description: `Please select a value for categorical concept "${row.concept}" in row ${i + 1}.`,
            variant: "destructive",
          });
          return;
        }

        const key = `${row.concept}::val:${row.value}`;
        if (seenConceptValues.has(key)) {
          toast({
            title: "Validation Error",
            description: `Duplicate entry: Concept "${row.concept}" with value "${row.value}" is entered more than once.`,
            variant: "destructive",
          });
          return;
        }
        seenConceptValues.add(key);

        validConcepts.push({
          concept: row.concept,
          value: row.value,
        });
      } else if (typeof details.min === "number" && typeof details.max === "number") {
        // Check range
        if (row.min === undefined || row.max === undefined) {
          toast({
            title: "Validation Error",
            description: `Please specify both Min and Max for numeric concept "${row.concept}" in row ${i + 1}.`,
            variant: "destructive",
          });
          return;
        }
        if (row.min > row.max) {
          toast({
            title: "Validation Error",
            description: `Min (${row.min}) cannot be greater than Max (${row.max}) for concept "${row.concept}" in row ${i + 1}.`,
            variant: "destructive",
          });
          return;
        }
        if (row.min < details.min || row.max > details.max) {
          toast({
            title: "Validation Error",
            description: `Subrange [${row.min}, ${row.max}] is outside the allowed range [${details.min}, ${details.max}] for "${row.concept}" in row ${i + 1}.`,
            variant: "destructive",
          });
          return;
        }

        const key = `${row.concept}::range:${row.min}-${row.max}`;
        if (seenConceptValues.has(key)) {
          toast({
            title: "Validation Error",
            description: `Duplicate entry: Concept "${row.concept}" with subrange [${row.min}, ${row.max}] is entered more than once.`,
            variant: "destructive",
          });
          return;
        }
        seenConceptValues.add(key);

        validConcepts.push({
          concept: row.concept,
          min: row.min,
          max: row.max,
        });
      } else {
        toast({
          title: "Validation Error",
          description: `Concept "${row.concept}" in row ${i + 1} has invalid API schema.`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      if (currentGroup) {
        await updateConceptGroup(currentGroup._id, editName, validConcepts);
        toast({ title: "Success", description: "Concept group updated successfully." });
      } else {
        await createConceptGroup(editName, validConcepts);
        toast({ title: "Success", description: "Concept group created successfully." });
      }
      setIsDialogOpen(false);
      loadConceptGroups();
    } catch (error) {
      toast({ title: "Error", description: "Failed to save concept group.", variant: "destructive" });
    }
  };

  const handleDeleteGroup = async () => {
    if (!currentGroup) return;
    try {
      await deleteConceptGroup(currentGroup._id);
      toast({ title: "Success", description: "Concept group deleted successfully." });
      setIsDeleteDialogOpen(false);
      loadConceptGroups();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete concept group.", variant: "destructive" });
    }
  };

  const renderConceptValuePreview = (concepts: ConceptValue[]) => {
    if (!concepts || concepts.length === 0) return "No concepts defined";
    return (
      <div className="flex flex-wrap gap-1 max-w-xl">
        {concepts.slice(0, 3).map((c, i) => {
          const detailStr = c.value ? `: ${c.value}` : `: [${c.min}, ${c.max}]`;
          return (
            <Badge key={i} variant="secondary" className="text-xs bg-muted text-foreground border border-border">
              {c.concept}
              {detailStr}
            </Badge>
          );
        })}
        {concepts.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{concepts.length - 3} more
          </Badge>
        )}
      </div>
    );
  };

  const conceptsList = Object.keys(conceptDict);

  return (
    <div className="flex-1 overflow-auto p-6 bg-gradient-to-br from-background via-background/95 to-secondary/10">
      <div className="container max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Manage Concept Values Groups
            </h1>
            <p className="text-muted-foreground mt-1">Create and manage groups of concept values and subranges.</p>
          </div>
          <Button onClick={handleOpenCreateDialog} className="shadow-md hover:shadow-lg transition-shadow">
            <Plus className="mr-2 h-4 w-4" /> Add Concept Group
          </Button>
        </div>

        <div className="rounded-xl border bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-1/4 font-semibold">Group Name</TableHead>
                <TableHead className="w-1/2 font-semibold">Concept Values</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-32 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground mt-2 block">Loading groups...</span>
                  </TableCell>
                </TableRow>
              ) : groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                    No concept value groups found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                groups.map((group) => (
                  <TableRow key={group._id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>{renderConceptValuePreview(group.concepts)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="icon" onClick={() => handleOpenEditDialog(group)} className="hover:border-primary/50 hover:text-primary">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleOpenDeleteDialog(group)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] flex flex-col p-6 rounded-2xl border shadow-xl">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-xl font-bold">
              {currentGroup ? "Edit Concept Values Group" : "Create Concept Values Group"}
            </DialogTitle>
            <DialogDescription>
              Assign a name and configure the list of concept values and subranges.
            </DialogDescription>
          </DialogHeader>

          {/* Dialog Body - Scrollable Area */}
          <div className="flex-1 overflow-y-auto py-4 space-y-5 my-1 pr-1">
            <div className="space-y-2">
              <Label htmlFor="concept-group-name" className="text-sm font-semibold">Group Name</Label>
              <Input
                id="concept-group-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g., Critical Lab Ranges"
                className="h-10 bg-background/50 focus-visible:ring-primary border-muted-foreground/30"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-semibold">Concept Values Setup</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddConceptRow} className="text-xs h-8">
                  <Plus className="mr-1 h-3 w-3" /> Add Value Row
                </Button>
              </div>

              <div className="space-y-3">
                {editConcepts.map((row, index) => {
                  const details = row.concept ? conceptDict[row.concept] : undefined;
                  const isCategorical = details && details.values !== undefined;
                  const isRange = details && typeof details.min === "number" && typeof details.max === "number";

                  return (
                    <div key={index} className="flex flex-col md:flex-row md:items-center gap-3 p-4 border rounded-xl bg-muted/20 backdrop-blur-sm relative group hover:border-muted-foreground/30 transition-all">
                      {/* Left: Concept Autocomplete */}
                      <div className="flex-1 space-y-1.5 min-w-[200px]">
                        <Label className="text-xs text-muted-foreground font-medium">Concept Name</Label>
                        <ConceptAutocomplete
                          concepts={conceptsList}
                          selected={row.concept}
                          onSelect={(conceptName) => handleConceptSelect(index, conceptName)}
                        />
                      </div>

                      {/* Right: Value input based on concept type */}
                      <div className="flex-1 space-y-1.5 min-w-[200px]">
                        <Label className="text-xs text-muted-foreground font-medium">Value Selection</Label>
                        {!row.concept ? (
                          <div className="text-xs text-muted-foreground italic h-10 border border-dashed rounded-lg flex items-center justify-center px-3 bg-background/30 border-muted-foreground/20">
                            Please select a concept first
                          </div>
                        ) : isCategorical ? (
                          <Select value={row.value || ""} onValueChange={(val) => handleValueChange(index, val)}>
                            <SelectTrigger className="w-full h-10 bg-background/50 border-muted-foreground/30">
                              <SelectValue placeholder="Select optional value..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {details.values?.map((val) => (
                                <SelectItem key={val} value={val}>
                                  {val}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : isRange ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                placeholder="Min"
                                value={row.min ?? ""}
                                onChange={(e) => handleRangeMinChange(index, e.target.value)}
                                className="h-10 bg-background/50 border-muted-foreground/30"
                              />
                              <span className="text-muted-foreground text-xs font-medium">to</span>
                              <Input
                                type="number"
                                placeholder="Max"
                                value={row.max ?? ""}
                                onChange={(e) => handleRangeMaxChange(index, e.target.value)}
                                className="h-10 bg-background/50 border-muted-foreground/30"
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground block pl-1">
                              Allowed subrange: {details.min} to {details.max}
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs text-destructive flex items-center gap-1 h-10 pl-1">
                            <AlertCircle className="h-4 w-4" /> Unknown concept type mapping.
                          </div>
                        )}
                      </div>

                      {/* Remove Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive self-center h-10 w-10 shrink-0 hover:bg-destructive/10"
                        onClick={() => handleRemoveConceptRow(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-muted-foreground/30">
              Cancel
            </Button>
            <Button onClick={handleSaveGroup}>
              Save Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Delete Concept Values Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the concept group "{currentGroup?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteGroup}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
