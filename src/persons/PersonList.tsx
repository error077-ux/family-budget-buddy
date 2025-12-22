import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Loader2, User, UserCheck } from 'lucide-react';
import { personsApi, type Person } from '@/api/supabase-api';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PersonList: React.FC = () => {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [saving, setSaving] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const data = await personsApi.getAll();
      setPersons(data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load family members', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPerson = async () => {
    if (!newPersonName.trim()) return;
    setSaving(true);
    
    try {
      await personsApi.create(newPersonName.trim());
      toast({ title: 'Success', description: `Added ${newPersonName} to family members` });
      setNewPersonName('');
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to add person', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPerson) return;
    setSaving(true);
    
    try {
      await personsApi.delete(selectedPerson.id);
      toast({ title: 'Success', description: `Removed ${selectedPerson.name}` });
      setDeleteDialogOpen(false);
      setSelectedPerson(null);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Family Members</h1>
          <p className="text-muted-foreground">Manage people for expense tracking and loans</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Add Person</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {persons.map((person) => (
          <div key={person.id} className="card-finance p-5">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${person.is_self ? 'bg-primary/10' : 'bg-muted'}`}>
                {person.is_self ? (
                  <UserCheck className="w-6 h-6 text-primary" />
                ) : (
                  <User className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{person.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {person.is_self ? 'Self (No loan created)' : 'Loan will be created'}
                </p>
              </div>
              {!person.is_self && (
                <button 
                  onClick={() => { setSelectedPerson(person); setDeleteDialogOpen(true); }}
                  className="p-2 rounded-lg hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {persons.length === 0 && (
        <div className="card-finance p-12 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">No family members added yet</p>
          <Button onClick={() => setDialogOpen(true)} className="mt-4 gap-2">
            <Plus className="w-4 h-4" />Add Person
          </Button>
        </div>
      )}

      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <h4 className="font-medium mb-2">How it works</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• When you create a transaction with "Me" as owner, no loan is created</li>
          <li>• When you select another family member, a loan is automatically created for them</li>
          <li>• The loan tracks the amount they need to repay and to which bank/card</li>
        </ul>
      </div>

      {/* Add Person Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Family Member</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input 
                value={newPersonName} 
                onChange={(e) => setNewPersonName(e.target.value)} 
                placeholder="e.g., Dad, Mom, Brother" 
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
              />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setNewPersonName(''); }} className="flex-1">Cancel</Button>
              <Button onClick={handleAddPerson} disabled={saving || !newPersonName.trim()} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Person'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Remove Person</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">Are you sure you want to remove "{selectedPerson?.name}"? Existing loans and transactions will not be affected.</p>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)} className="flex-1">Cancel</Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PersonList;