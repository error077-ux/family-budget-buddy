import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle, Loader2, Search } from 'lucide-react';
import { transactionsApi, banksApi, type Transaction, type Bank } from '@/api/endpoints';
import { formatMoney } from '@/utils/formatMoney';
import { formatDate, formatDateForApi, getTodayIST } from '@/utils/formatDate';
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
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    date: getTodayIST(),
    description: '',
    amount: '',
    expense_owner: 'Me',
    bank_id: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [txRes, bankRes] = await Promise.all([
        transactionsApi.getAll(),
        banksApi.getAll(),
      ]);
      setTransactions(txRes.data);
      setBanks(bankRes.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load transactions',
        variant: 'destructive',
      });
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
        bank_id: String(tx.bank_id),
      });
    } else {
      setSelectedTx(null);
      setForm({
        date: getTodayIST(),
        description: '',
        amount: '',
        expense_owner: 'Me',
        bank_id: banks[0]?.id ? String(banks[0].id) : '',
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
        bank_id: parseInt(form.bank_id),
      };

      if (selectedTx) {
        await transactionsApi.update(selectedTx.id, payload);
        toast({ title: 'Success', description: 'Transaction updated' });
      } else {
        const result = await transactionsApi.create(payload);
        if (result.data.created_loan_id) {
          toast({
            title: 'Transaction & Loan Created',
            description: `A loan was automatically created for ${form.expense_owner}`,
          });
        } else {
          toast({ title: 'Success', description: 'Transaction added' });
        }
      }

      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to save transaction',
        variant: 'destructive',
      });
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
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to delete transaction',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredTransactions = transactions.filter(
    (tx) =>
      tx.description.toLowerCase().includes(search.toLowerCase()) ||
      tx.expense_owner.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
          <p className="text-muted-foreground">Track your expenses and loans</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Transaction
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Transactions Table */}
      <div className="card-finance overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-finance">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Owner</th>
                <th>Bank</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="mono">{formatDate(tx.date)}</td>
                    <td>
                      <div>
                        {tx.description}
                        {tx.created_loan_id && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning">
                            Loan
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{tx.expense_owner}</td>
                    <td>{tx.bank_name || '-'}</td>
                    <td className="text-right mono text-destructive">
                      -{formatMoney(tx.amount)}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenDialog(tx)}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTx(tx);
                            setDeleteDialogOpen(true);
                          }}
                          className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedTx ? 'Edit Transaction' : 'Add Transaction'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g., Groceries"
                required
              />
            </div>
            <div>
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <Label>Expense Owner</Label>
              <Input
                value={form.expense_owner}
                onChange={(e) => setForm({ ...form, expense_owner: e.target.value })}
                placeholder="Me"
                required
              />
              {form.expense_owner && form.expense_owner !== 'Me' && (
                <div className="flex items-center gap-2 mt-2 p-3 rounded-lg bg-warning/10 text-warning text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>A loan will be created for "{form.expense_owner}"</span>
                </div>
              )}
            </div>
            <div>
              <Label>Bank Account</Label>
              <Select
                value={form.bank_id}
                onValueChange={(v) => setForm({ ...form, bank_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bank" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={String(bank.id)}>
                      {bank.name} ({formatMoney(bank.balance)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : selectedTx ? (
                  'Update'
                ) : (
                  'Add Transaction'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete "{selectedTx?.description}"? This action
            cannot be undone.
          </p>
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
              className="flex-1"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransactionList;
