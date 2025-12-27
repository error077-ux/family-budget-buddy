import React, { useState, useEffect, useCallback } from 'react';
import { HandCoins, CheckCircle, Clock, Loader2, Download, Banknote, CreditCard } from 'lucide-react';
import { loansApi, banksApi, type Loan, type Bank } from '@/api/supabase-api';
import { formatMoney } from '@/utils/formatMoney';
import { formatDate, getTodayIST } from '@/utils/formatDate';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const LoanList: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [repayDialogOpen, setRepayDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({ amount: '', bank_id: '', date: getTodayIST() });

  const fetchData = useCallback(async () => {
    try {
      const [loanData, bankData] = await Promise.all([loansApi.getAll(), banksApi.getAll()]);
      setLoans(loanData);
      setBanks(bankData);
    } catch { toast({ title: 'Error', description: 'Failed to load loans', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Subscribe to realtime updates from Telegram bot
  useRealtimeSubscription({
    tables: ['loans', 'banks', 'bank_ledger'],
    onUpdate: fetchData,
  });

  const handleOpenRepayDialog = (loan: Loan) => {
    setSelectedLoan(loan);
    // Default to source bank if available
    const defaultBankId = loan.source_bank_id || banks[0]?.id || '';
    setForm({ amount: String(loan.outstanding_amount), bank_id: defaultBankId, date: getTodayIST() });
    setRepayDialogOpen(true);
  };

  const handleRepay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;
    setSaving(true);
    try {
      await loansApi.repay(selectedLoan.id, { amount: parseFloat(form.amount), bank_id: form.bank_id, date: form.date });
      toast({ title: 'Success', description: 'Repayment recorded' });
      setRepayDialogOpen(false);
      fetchData();
    } catch (error: any) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleExport = () => {
    const headers = ['Borrower', 'Principal', 'Outstanding', 'Status', 'Paid From', 'Created Date'];
    const rows = loans.map(loan => [
      loan.borrower_name,
      loan.principal_amount,
      loan.outstanding_amount,
      loan.is_paid ? 'Paid' : 'Pending',
      loan.source_bank_name || loan.source_credit_card_name || '-',
      new Date(loan.created_at).toLocaleDateString('en-IN'),
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `loans_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast({ title: 'Exported', description: 'Loans exported to CSV' });
  };

  const stats = { total: loans.length, pending: loans.filter((l) => !l.is_paid).length, totalOutstanding: loans.reduce((sum, l) => sum + Number(l.outstanding_amount), 0) };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-3xl font-bold text-foreground">Loans</h1><p className="text-muted-foreground">Track loans (auto-created when owner ≠ "Me")</p></div>
        <Button onClick={handleExport} variant="outline" className="gap-2"><Download className="w-4 h-4" />Export CSV</Button>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-finance p-5"><p className="text-sm text-muted-foreground">Total Loans</p><p className="text-2xl font-bold">{stats.total}</p></div>
        <div className="card-finance p-5"><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold text-warning">{stats.pending}</p></div>
        <div className="card-finance p-5"><p className="text-sm text-muted-foreground">Outstanding</p><p className="text-2xl font-bold text-destructive mono">{formatMoney(stats.totalOutstanding)}</p></div>
      </div>

      <div className="space-y-4">
        {loans.length === 0 ? <div className="card-finance p-12 text-center"><HandCoins className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" /><p className="text-muted-foreground">No loans</p></div> : loans.map((loan) => (
          <div key={loan.id} className="card-finance p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className={`p-3 rounded-xl ${loan.is_paid ? 'bg-success/10' : 'bg-warning/10'}`}>{loan.is_paid ? <CheckCircle className="w-6 h-6 text-success" /> : <Clock className="w-6 h-6 text-warning" />}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{loan.borrower_name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${loan.is_paid ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{loan.is_paid ? 'Paid' : 'Pending'}</span>
                </div>
                <p className="text-sm text-muted-foreground">Principal: {formatMoney(loan.principal_amount)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className={`text-xl font-bold mono ${loan.outstanding_amount > 0 ? 'text-destructive' : 'text-success'}`}>{formatMoney(loan.outstanding_amount)}</p>
              </div>
              {!loan.is_paid && <Button onClick={() => handleOpenRepayDialog(loan)} variant="outline" size="sm">Repay</Button>}
            </div>
            
            {/* Repayment Source Info */}
            {(loan.source_bank_name || loan.source_credit_card_name) && !loan.is_paid && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  {loan.source_bank_name ? (
                    <Banknote className="w-5 h-5 text-primary flex-shrink-0" />
                  ) : (
                    <CreditCard className="w-5 h-5 text-primary flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Return payment to: <span className="text-primary">{loan.source_bank_name || loan.source_credit_card_name}</span>
                    </p>
                    {loan.source_bank_account && (
                      <p className="text-xs text-muted-foreground">Account: {loan.source_bank_account}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Amount pending: <span className="font-semibold text-destructive">{formatMoney(loan.outstanding_amount)}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <Dialog open={repayDialogOpen} onOpenChange={setRepayDialogOpen}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Record Repayment</DialogTitle></DialogHeader>
          <form onSubmit={handleRepay} className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Borrower: <strong>{selectedLoan?.borrower_name}</strong></p>
              <p className="text-sm text-muted-foreground">Outstanding: <strong className="text-destructive">{formatMoney(selectedLoan?.outstanding_amount)}</strong></p>
              {selectedLoan?.source_bank_name && (
                <p className="text-sm text-muted-foreground mt-2">
                  Originally paid from: <strong className="text-primary">{selectedLoan.source_bank_name}</strong>
                  {selectedLoan.source_bank_account && <span className="text-xs"> ({selectedLoan.source_bank_account})</span>}
                </p>
              )}
              {selectedLoan?.source_credit_card_name && (
                <p className="text-sm text-muted-foreground mt-2">
                  Originally paid from: <strong className="text-primary">{selectedLoan.source_credit_card_name}</strong> (Credit Card)
                </p>
              )}
            </div>
            <div><Label>Amount (₹)</Label><Input type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
            <div>
              <Label>Credit to Bank</Label>
              <Select value={form.bank_id} onValueChange={(v) => setForm({ ...form, bank_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                <SelectContent>
                  {banks.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                      {selectedLoan?.source_bank_id === b.id && <span className="ml-2 text-xs text-primary">(Original)</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-4"><Button type="button" variant="outline" onClick={() => setRepayDialogOpen(false)} className="flex-1">Cancel</Button><Button type="submit" disabled={saving} className="flex-1">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoanList;