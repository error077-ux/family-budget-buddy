import React, { useState, useEffect } from 'react';
import { HandCoins, CheckCircle, Clock, Loader2, Search } from 'lucide-react';
import { loansApi, banksApi, type Loan, type Bank } from '@/api/endpoints';
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

const LoanList: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [repayDialogOpen, setRepayDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    amount: '',
    bank_id: '',
    date: getTodayIST(),
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [loanRes, bankRes] = await Promise.all([
        loansApi.getAll(),
        banksApi.getAll(),
      ]);
      setLoans(loanRes.data);
      setBanks(bankRes.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load loans',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRepayDialog = (loan: Loan) => {
    setSelectedLoan(loan);
    setForm({
      amount: String(loan.outstanding_amount),
      bank_id: banks[0]?.id ? String(banks[0].id) : '',
      date: getTodayIST(),
    });
    setRepayDialogOpen(true);
  };

  const handleRepay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;

    const amount = parseFloat(form.amount);
    if (amount <= 0 || amount > selectedLoan.outstanding_amount) {
      toast({
        title: 'Invalid Amount',
        description: `Amount must be between ₹0.01 and ${formatMoney(selectedLoan.outstanding_amount)}`,
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      await loansApi.repay(selectedLoan.id, {
        amount,
        bank_id: parseInt(form.bank_id),
        date: form.date,
      });
      toast({ title: 'Success', description: 'Loan repayment recorded' });
      setRepayDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to record repayment',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredLoans = loans.filter((loan) => {
    const matchesSearch = loan.borrower_name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'pending' && !loan.is_paid) ||
      (filter === 'paid' && loan.is_paid);
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: loans.length,
    pending: loans.filter((l) => !l.is_paid).length,
    totalOutstanding: loans.reduce((sum, l) => sum + l.outstanding_amount, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Loans</h1>
        <p className="text-muted-foreground">
          Track loans created from expenses (auto-created when owner ≠ "Me")
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-finance p-5">
          <p className="text-sm text-muted-foreground">Total Loans</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="card-finance p-5">
          <p className="text-sm text-muted-foreground">Pending Repayments</p>
          <p className="text-2xl font-bold text-warning">{stats.pending}</p>
        </div>
        <div className="card-finance p-5">
          <p className="text-sm text-muted-foreground">Total Outstanding</p>
          <p className="text-2xl font-bold text-destructive mono">
            {formatMoney(stats.totalOutstanding)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by borrower..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Loans</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loans List */}
      <div className="space-y-4">
        {filteredLoans.length === 0 ? (
          <div className="card-finance p-12 text-center">
            <HandCoins className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No loans found</p>
          </div>
        ) : (
          filteredLoans.map((loan) => (
            <div
              key={loan.id}
              className="card-finance p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div
                className={`p-3 rounded-xl ${
                  loan.is_paid ? 'bg-success/10' : 'bg-warning/10'
                }`}
              >
                {loan.is_paid ? (
                  <CheckCircle className="w-6 h-6 text-success" />
                ) : (
                  <Clock className="w-6 h-6 text-warning" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">
                    {loan.borrower_name}
                  </h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      loan.is_paid
                        ? 'bg-success/10 text-success'
                        : 'bg-warning/10 text-warning'
                    }`}
                  >
                    {loan.is_paid ? 'Paid' : 'Pending'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Principal: {formatMoney(loan.principal_amount)} •{' '}
                  {formatDate(loan.created_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p
                  className={`text-xl font-bold mono ${
                    loan.outstanding_amount > 0 ? 'text-destructive' : 'text-success'
                  }`}
                >
                  {formatMoney(loan.outstanding_amount)}
                </p>
              </div>
              {!loan.is_paid && (
                <Button
                  onClick={() => handleOpenRepayDialog(loan)}
                  variant="outline"
                  size="sm"
                >
                  Record Repayment
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Repay Dialog */}
      <Dialog open={repayDialogOpen} onOpenChange={setRepayDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Loan Repayment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRepay} className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Borrower</p>
              <p className="font-semibold">{selectedLoan?.borrower_name}</p>
              <p className="text-sm text-muted-foreground mt-2">Outstanding</p>
              <p className="font-semibold text-destructive mono">
                {formatMoney(selectedLoan?.outstanding_amount)}
              </p>
            </div>
            <div>
              <Label>Repayment Amount (₹)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={selectedLoan?.outstanding_amount}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
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
              <Label>Credit to Bank Account</Label>
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
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRepayDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Record Repayment'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoanList;
