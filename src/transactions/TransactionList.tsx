import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle, Loader2, Search, UserPlus } from 'lucide-react';
import { transactionsApi, banksApi, creditCardsApi, personsApi, type Transaction, type Bank, type CreditCard, type Person } from '@/api/supabase-api';
import { formatMoney } from '@/utils/formatMoney';
import { formatDate, getTodayIST } from '@/utils/formatDate';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TransactionList: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addPersonDialogOpen, setAddPersonDialogOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const { toast } = useToast();

  const [form, setForm] = useState({
    date: getTodayIST(),
    description: '',
    amount: '',
    expense_owner: 'Me',
    source_type: 'bank' as 'bank' | 'credit_card',
    bank_id: '',
    credit_card_id: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [txData, bankData, cardData, personData] = await Promise.all([
        transactionsApi.getAll(),
        banksApi.getAll(),
        creditCardsApi.getAll(),
        personsApi.getAll(),
      ]);
      setTransactions(txData);
      setBanks(bankData);
      setCreditCards(cardData);
      setPersons(personData);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load transactions', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (tx?: Transaction) => {
    if (tx) {
      setSelectedTx(tx);
      setForm({
        date: tx.date.split('T')[0],
        description: tx.description,
        amount: String(tx.amount),
        expense_owner: tx.expense_owner,
        source_type: 'bank',
        bank_id: tx.bank_id,
        credit_card_id: '',
      });
    } else {
      setSelectedTx(null);
      setForm({
        date: getTodayIST(),
        description: '',
        amount: '',
        expense_owner: 'Me',
        source_type: 'bank',
        bank_id: banks[0]?.id || '',
        credit_card_id: creditCards[0]?.id || '',
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        date: form.date,
        description: form.description,
        amount: parseFloat(form.amount),
        expense_owner: form.expense_owner,
        bank_id: form.source_type === 'bank' ? form.bank_id : undefined,
        credit_card_id: form.source_type === 'credit_card' ? form.credit_card_id : undefined,
      };

      if (selectedTx) {
        await transactionsApi.update(selectedTx.id, {
          date: payload.date,
          description: payload.description,
          amount: payload.amount,
          expense_owner: payload.expense_owner,
          bank_id: payload.bank_id || selectedTx.bank_id,
        });
        toast({ title: 'Success', description: 'Transaction updated' });
      } else {
        const result = await transactionsApi.create(payload);
        if (result.created_loan_id) {
          const sourceInfo = form.source_type === 'bank' 
            ? banks.find(b => b.id === form.bank_id)?.name 
            : creditCards.find(c => c.id === form.credit_card_id)?.name;
          toast({ 
            title: 'Transaction & Loan Created', 
            description: `A loan was created for ${form.expense_owner}. Paid via ${sourceInfo}` 
          });
        } else {
          toast({ title: 'Success', description: 'Transaction added' });
        }
      }

      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to save transaction', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTx) return;
    setSaving(true);

    try {
      await transactionsApi.delete(selectedTx.id);
      toast({ title: 'Success', description: 'Transaction deleted' });
      setDeleteDialogOpen(false);
      setSelectedTx(null);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddPerson = async () => {
    if (!newPersonName.trim()) return;
    setSaving(true);
    
    try {
      const person = await personsApi.create(newPersonName.trim());
      setPersons(prev => [...prev, person]);
      setForm(prev => ({ ...prev, expense_owner: person.name }));
      setNewPersonName('');
      setAddPersonDialogOpen(false);
      toast({ title: 'Success', description: `Added ${person.name} to family members` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to add person', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const filteredTransactions = transactions.filter(
    (tx) => tx.description.toLowerCase().includes(search.toLowerCase()) || tx.expense_owner.toLowerCase().includes(search.toLowerCase())
  );

  const selectedPerson = persons.find(p => p.name === form.expense_owner);
  const showLoanWarning = form.expense_owner && form.expense_owner !== 'Me' && !selectedPerson?.is_self;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
          <p className="text-muted-foreground">Track your expenses and loans</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2"><Plus className="w-4 h-4" />Add Transaction</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="card-finance overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-finance">
            <thead><tr><th>Date</th><th>Description</th><th>Owner</th><th>Bank</th><th className="text-right">Amount</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No transactions found</td></tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="mono">{formatDate(tx.date)}</td>
                    <td>{tx.description}{tx.created_loan_id && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning">Loan</span>}</td>
                    <td>{tx.expense_owner}</td>
                    <td>{tx.bank_name || '-'}</td>
                    <td className="text-right mono text-destructive">-{formatMoney(tx.amount)}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenDialog(tx)} className="p-2 rounded-lg hover:bg-muted"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                        <button onClick={() => { setSelectedTx(tx); setDeleteDialogOpen(true); }} className="p-2 rounded-lg hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{selectedTx ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g., Groceries" required /></div>
            <div><Label>Amount (₹)</Label><Input type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
            
            {/* Expense Owner - Dropdown with Add New option */}
            <div>
              <Label>Expense Owner</Label>
              <div className="flex gap-2">
                <Select value={form.expense_owner} onValueChange={(v) => setForm({ ...form, expense_owner: v })}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select person" /></SelectTrigger>
                  <SelectContent>
                    {persons.map((person) => (
                      <SelectItem key={person.id} value={person.name}>
                        {person.name} {person.is_self && <span className="text-muted-foreground">(Self)</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setAddPersonDialogOpen(true)}>
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
              {showLoanWarning && (
                <div className="flex items-center gap-2 mt-2 p-3 rounded-lg bg-warning/10 text-warning text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" /><span>A loan will be created for "{form.expense_owner}"</span>
                </div>
              )}
            </div>
            
            {!selectedTx && (
              <div>
                <Label>Payment Source</Label>
                <Select value={form.source_type} onValueChange={(v: 'bank' | 'credit_card') => setForm({ ...form, source_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank Account</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {form.source_type === 'bank' ? (
              <div>
                <Label>Bank Account</Label>
                <Select value={form.bank_id} onValueChange={(v) => setForm({ ...form, bank_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                  <SelectContent>{banks.map((bank) => <SelectItem key={bank.id} value={bank.id}>{bank.name} ({formatMoney(bank.balance)})</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ) : !selectedTx && (
              <div>
                <Label>Credit Card</Label>
                <Select value={form.credit_card_id} onValueChange={(v) => setForm({ ...form, credit_card_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select credit card" /></SelectTrigger>
                  <SelectContent>{creditCards.map((card) => <SelectItem key={card.id} value={card.id}>{card.name} (Available: {formatMoney(card.available_credit)})</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : selectedTx ? 'Update' : 'Add Transaction'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Person Dialog */}
      <Dialog open={addPersonDialogOpen} onOpenChange={setAddPersonDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Family Member</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input 
                value={newPersonName} 
                onChange={(e) => setNewPersonName(e.target.value)} 
                placeholder="e.g., Mathuram, Dad, Mom" 
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => { setAddPersonDialogOpen(false); setNewPersonName(''); }} className="flex-1">Cancel</Button>
              <Button onClick={handleAddPerson} disabled={saving || !newPersonName.trim()} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Person'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Delete Transaction</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">Are you sure you want to delete "{selectedTx?.description}"?</p>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)} className="flex-1">Cancel</Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving} className="flex-1">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransactionList;