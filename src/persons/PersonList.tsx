import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Loader2, User, UserCheck, Banknote, CreditCard } from 'lucide-react';
import { personsApi, loansApi, type Person, type Loan } from '@/api/supabase-api';
import { formatMoney } from '@/utils/formatMoney';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LoanSummary {
  totalOutstanding: number;
  totalPrincipal: number;
  loanCount: number;
  byBank: { bankName: string; bankId: string; outstanding: number; count: number }[];
  byCreditCard: { cardName: string; cardId: string; outstanding: number; count: number }[];
}

const PersonList: React.FC = () => {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
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
      const [personData, loanData] = await Promise.all([
        personsApi.getAll(),
        loansApi.getAll()
      ]);
      setPersons(personData);
      setLoans(loanData);
    } catch {
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Calculate loan summary for a specific person
  const getLoanSummary = (personName: string): LoanSummary => {
    const personLoans = loans.filter(l => l.borrower_name === personName && !l.is_paid);
    
    const byBankMap = new Map<string, { bankName: string; bankId: string; outstanding: number; count: number }>();
    const byCreditCardMap = new Map<string, { cardName: string; cardId: string; outstanding: number; count: number }>();
    
    personLoans.forEach(loan => {
      if (loan.source_bank_id && loan.source_bank_name) {
        const existing = byBankMap.get(loan.source_bank_id);
        if (existing) {
          existing.outstanding += Number(loan.outstanding_amount);
          existing.count += 1;
        } else {
          byBankMap.set(loan.source_bank_id, {
            bankName: loan.source_bank_name,
            bankId: loan.source_bank_id,
            outstanding: Number(loan.outstanding_amount),
            count: 1
          });
        }
      } else if (loan.source_credit_card_id && loan.source_credit_card_name) {
        const existing = byCreditCardMap.get(loan.source_credit_card_id);
        if (existing) {
          existing.outstanding += Number(loan.outstanding_amount);
          existing.count += 1;
        } else {
          byCreditCardMap.set(loan.source_credit_card_id, {
            cardName: loan.source_credit_card_name,
            cardId: loan.source_credit_card_id,
            outstanding: Number(loan.outstanding_amount),
            count: 1
          });
        }
      }
    });
    
    return {
      totalOutstanding: personLoans.reduce((sum, l) => sum + Number(l.outstanding_amount), 0),
      totalPrincipal: personLoans.reduce((sum, l) => sum + Number(l.principal_amount), 0),
      loanCount: personLoans.length,
      byBank: Array.from(byBankMap.values()),
      byCreditCard: Array.from(byCreditCardMap.values())
    };
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
        {persons.map((person) => {
          const loanSummary = getLoanSummary(person.name);
          const hasLoans = loanSummary.loanCount > 0;
          
          return (
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
              
              {/* Loan Summary for non-self persons */}
              {!person.is_self && hasLoans && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Outstanding</span>
                    <span className="font-bold text-destructive mono">{formatMoney(loanSummary.totalOutstanding)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pending Loans</span>
                    <span className="font-semibold text-warning">{loanSummary.loanCount}</span>
                  </div>
                  
                  {/* Bank-wise breakdown */}
                  {loanSummary.byBank.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase">By Bank</p>
                      {loanSummary.byBank.map((bank) => (
                        <div key={bank.bankId} className="flex items-center gap-2 p-2 rounded-lg bg-primary/5">
                          <Banknote className="w-4 h-4 text-primary" />
                          <span className="text-sm flex-1">{bank.bankName}</span>
                          <span className="text-sm font-semibold text-destructive mono">{formatMoney(bank.outstanding)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Credit Card-wise breakdown */}
                  {loanSummary.byCreditCard.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase">By Credit Card</p>
                      {loanSummary.byCreditCard.map((card) => (
                        <div key={card.cardId} className="flex items-center gap-2 p-2 rounded-lg bg-warning/5">
                          <CreditCard className="w-4 h-4 text-warning" />
                          <span className="text-sm flex-1">{card.cardName}</span>
                          <span className="text-sm font-semibold text-destructive mono">{formatMoney(card.outstanding)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* No loans message */}
              {!person.is_self && !hasLoans && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground text-center">No pending loans</p>
                </div>
              )}
            </div>
          );
        })}
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