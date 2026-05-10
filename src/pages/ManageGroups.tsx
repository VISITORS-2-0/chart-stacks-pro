import { useState, useEffect } from "react";
import { fetchGroups, createGroup, updateGroup, deleteGroup, Group } from "@/services/groupsApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { PatientMultiSelect } from "@/components/PatientMultiSelect";
import { Trash2, Edit2, Plus, Loader2 } from "lucide-react";

interface ManageGroupsProps {
  onGroupsChange?: () => void;
}

export function ManageGroups({ onGroupsChange }: ManageGroupsProps = {}) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [editName, setEditName] = useState("");
  const [editPatientIds, setEditPatientIds] = useState<string[]>([]);
  
  const { toast } = useToast();

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const data = await fetchGroups();
      setGroups(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load groups.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleOpenCreateDialog = () => {
    setCurrentGroup(null);
    setEditName("");
    setEditPatientIds([]);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (group: Group) => {
    setCurrentGroup(group);
    setEditName(group.name);
    setEditPatientIds(group.patientIds);
    setIsDialogOpen(true);
  };

  const handleOpenDeleteDialog = (group: Group) => {
    setCurrentGroup(group);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveGroup = async () => {
    if (!editName.trim()) {
      toast({ title: "Validation Error", description: "Group name is required.", variant: "destructive" });
      return;
    }
    
    if (editPatientIds.length === 0) {
      toast({ title: "Validation Error", description: "Please select at least one patient.", variant: "destructive" });
      return;
    }

    try {
      if (currentGroup) {
        await updateGroup(currentGroup._id, editName, editPatientIds);
        toast({ title: "Success", description: "Group updated successfully." });
      } else {
        await createGroup(editName, editPatientIds);
        toast({ title: "Success", description: "Group created successfully." });
      }
      setIsDialogOpen(false);
      loadGroups();
      onGroupsChange?.();
    } catch (error) {
      toast({ title: "Error", description: "Failed to save group.", variant: "destructive" });
    }
  };

  const handleDeleteGroup = async () => {
    if (!currentGroup) return;
    try {
      await deleteGroup(currentGroup._id);
      toast({ title: "Success", description: "Group deleted successfully." });
      setIsDeleteDialogOpen(false);
      loadGroups();
      onGroupsChange?.();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete group.", variant: "destructive" });
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="container max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manage Groups</h1>
            <p className="text-muted-foreground mt-1">Create and manage patient groups for exploration.</p>
          </div>
          <Button onClick={handleOpenCreateDialog}>
            <Plus className="mr-2 h-4 w-4" /> Add Group
          </Button>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Patients Count</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No groups found.
                  </TableCell>
                </TableRow>
              ) : (
                groups.map((group) => (
                  <TableRow key={group._id}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>{group.patientIds.length}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="icon" onClick={() => handleOpenEditDialog(group)}>
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{currentGroup ? "Edit Group" : "Create Group"}</DialogTitle>
            <DialogDescription>
              {currentGroup ? "Update the name and patients for this group." : "Add a new group and assign patients."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g., High Risk Patients"
              />
            </div>
            <div className="grid gap-2">
              <Label>Patients</Label>
              <PatientMultiSelect
                selectedIds={editPatientIds}
                onChange={setEditPatientIds}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveGroup}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the group "{currentGroup?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteGroup}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
