import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  History,
  Loader2,
  X,
} from 'lucide-react';
import {
  banksApi,
  type Bank,
  type BankLedgerEntry,
} from '@/api/endpoints';
import { formatMoney } from '@/utils/formatMoney';
import { formatDate } from '@/utils/formatDate';
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

const BankList: React.FC = () => {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ledgerDialogOpen, setLedgerDialogOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [ledger, setLedger] = useState<BankLedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: '',
    account_number: '',
    opening_balance: '',
  });

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      const response = await banksApi.getAll();
      setBanks(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load banks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (bank?: Bank) => {
    if (bank) {
      setSelectedBank(bank);
      setForm({
        name: bank.name,
        account_number: bank.account_number,
        opening_balance: '',
      });
    } else {
      setSelectedBank(null);
      setForm({
        name: '',
        account_number: '',
        opening_balance: '0',
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: form.name,
        account_number: form.account_number,
        ...(selectedBank ? {} : { opening_balance: parseFloat(form.opening_balance) || 0 }),
      };

      if (selectedBank) {
        await banksApi.update(selectedBank.id, payload);
        toast({ title: 'Success', description: 'Bank updated' });
      } else {
        await banksApi.create(payload);
        toast({ title: 'Success', description: 'Bank added' });
      }

      setDialogOpen(false);
      fetchBanks();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to save bank',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBank) return;
    setSaving(true);

    try {
      await banksApi.delete(selectedBank.id);
      toast({ title: 'Success', description: 'Bank deleted' });
      setDeleteDialogOpen(false);
      setSelectedBank(null);
      fetchBanks();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to delete bank',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleViewLedger = async (bank: Bank) => {
    setSelectedBank(bank);
    setLedgerLoading(true);
    setLedgerDialogOpen(true);

    try {
      const response = await banksApi.getLedger(bank.id);
      setLedger(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load ledger',
        variant: 'destructive',
      });
    } finally {
      setLedgerLoading(false);
    }
  };

  const totalBalance = banks.reduce((sum, bank) => sum + bank.balance, 0);

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
          <h1 className="text-3xl font-bold text-foreground">Banks</h1>
          <p className="text-muted-foreground">
            Manage your bank accounts and view ledger history
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Bank
        </Button>
      </div>

      {/* Total Balance */}
      <div className="card-finance p-6">
        <p className="text-sm text-muted-foreground">Combined Balance</p>
        <p className="text-3xl font-bold text-primary mono">
          {formatMoney(totalBalance)}
        </p>
      </div>

      {/* Banks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {banks.length === 0 ? (
          <div className="col-span-full card-finance p-12 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No banks added yet</p>
          </div>
        ) : (
          banks.map((bank) => (
            <div key={bank.id} className="card-finance p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleViewLedger(bank)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                    title="View Ledger"
                  >
                    <History className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleOpenDialog(bank)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedBank(bank);
                      setDeleteDialogOpen(true);
                    }}
                    className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-foreground">{bank.name}</h3>
              <p className="text-sm text-muted-foreground mono mb-3">
                {bank.account_number}
              </p>
              <p className="text-sm text-muted-foreground">Balance</p>
              <p
                className={`text-2xl font-bold mono ${
                  bank.balance >= 0 ? 'text-success' : 'text-destructive'
                }`}
              >
                {formatMoney(bank.balance)}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedBank ? 'Edit Bank' : 'Add Bank'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Bank Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., HDFC Savings"
                required
              />
            </div>
            <div>
              <Label>Account Number</Label>
              <Input
                value={form.account_number}
                onChange={(e) =>
                  setForm({ ...form, account_number: e.target.value })
                }
                placeholder="e.g., XXXX1234"
                required
              />
            </div>
            {!selectedBank && (
              <div>
                <Label>Opening Balance (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.opening_balance}
                  onChange={(e) =>
                    setForm({ ...form, opening_balance: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            )}
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
                ) : selectedBank ? (
                  'Update'
                ) : (
                  'Add Bank'
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
            <DialogTitle>Delete Bank</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete "{selectedBank?.name}"? This will also
            remove all associated ledger entries.
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

      {/* Ledger Dialog */}
      <Dialog open={ledgerDialogOpen} onOpenChange={setLedgerDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {selectedBank?.name} - Ledger History
            </DialogTitle>
          </DialogHeader>
          {ledgerLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : ledger.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No ledger entries yet
            </div>
          ) : (
            <div className="overflow-auto flex-1">
              <table className="table-finance text-sm">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th className="text-right">Debit</th>
                    <th className="text-right">Credit</th>
                    <th className="text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((entry) => (
                    <tr key={entry.id}>
                      <td className="mono">{formatDate(entry.date)}</td>
                      <td>{entry.description}</td>
                      <td className="text-right mono text-destructive">
                        {entry.debit > 0 ? formatMoney(entry.debit) : '-'}
                      </td>
                      <td className="text-right mono text-success">
                        {entry.credit > 0 ? formatMoney(entry.credit) : '-'}
                      </td>
                      <td className="text-right mono font-medium">
                        {formatMoney(entry.balance_after)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BankList;
