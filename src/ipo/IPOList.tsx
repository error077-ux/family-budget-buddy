import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Plus,
  CheckCircle,
  RotateCcw,
  Award,
  Clock,
  Loader2,
  Search,
} from 'lucide-react';
import {
  ipoApi,
  banksApi,
  type IPO,
  type IPOStatus,
  type Bank,
} from '@/api/endpoints';
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

type DialogMode = 'apply' | 'allot' | 'refund' | null;

const statusConfig: Record<IPOStatus, { label: string; class: string; icon: React.ElementType }> = {
  APPLIED: { label: 'Applied', class: 'status-applied', icon: Clock },
  ALLOTTED: { label: 'Allotted', class: 'status-allotted', icon: Award },
  REFUNDED: { label: 'Refunded', class: 'status-refunded', icon: RotateCcw },
};

const IPOList: React.FC = () => {
  const [ipos, setIpos] = useState<IPO[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedIPO, setSelectedIPO] = useState<IPO | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | IPOStatus>('all');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [applyForm, setApplyForm] = useState({
    company_name: '',
    application_date: getTodayIST(),
    amount: '',
    shares_applied: '',
    bank_id: '',
  });

  const [allotForm, setAllotForm] = useState({
    shares_allotted: '',
    refund_amount: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ipoRes, bankRes] = await Promise.all([
        ipoApi.getAll(),
        banksApi.getAll(),
      ]);
      setIpos(ipoRes.data);
      setBanks(bankRes.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load IPO applications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openApplyDialog = () => {
    setApplyForm({
      company_name: '',
      application_date: getTodayIST(),
      amount: '',
      shares_applied: '',
      bank_id: banks[0]?.id ? String(banks[0].id) : '',
    });
    setDialogMode('apply');
  };

  const openAllotDialog = (ipo: IPO) => {
    setSelectedIPO(ipo);
    setAllotForm({
      shares_allotted: String(ipo.shares_applied),
      refund_amount: '0',
    });
    setDialogMode('allot');
  };

  const openRefundDialog = (ipo: IPO) => {
    setSelectedIPO(ipo);
    setDialogMode('refund');
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await ipoApi.apply({
        company_name: applyForm.company_name,
        application_date: applyForm.application_date,
        amount: parseFloat(applyForm.amount),
        shares_applied: parseInt(applyForm.shares_applied),
        bank_id: parseInt(applyForm.bank_id),
      });
      toast({
        title: 'Success',
        description: 'IPO application recorded. Funds placed on hold.',
      });
      setDialogMode(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to apply for IPO',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAllotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIPO) return;
    setSaving(true);

    try {
      await ipoApi.allot(selectedIPO.id, {
        shares_allotted: parseInt(allotForm.shares_allotted),
        refund_amount: parseFloat(allotForm.refund_amount) || 0,
      });
      toast({ title: 'Success', description: 'IPO allotment recorded' });
      setDialogMode(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to record allotment',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedIPO) return;
    setSaving(true);

    try {
      await ipoApi.refund(selectedIPO.id);
      toast({ title: 'Success', description: 'IPO refund processed' });
      setDialogMode(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to process refund',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredIPOs = ipos.filter((ipo) => {
    const matchesSearch = ipo.company_name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || ipo.status === filter;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: ipos.length,
    applied: ipos.filter((i) => i.status === 'APPLIED').length,
    allotted: ipos.filter((i) => i.status === 'ALLOTTED').length,
    pending_amount: ipos
      .filter((i) => i.status === 'APPLIED')
      .reduce((sum, i) => sum + i.amount, 0),
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">IPO Tracker</h1>
          <p className="text-muted-foreground">
            Track IPO applications and allotments
          </p>
        </div>
        <Button onClick={openApplyDialog} className="gap-2">
          <Plus className="w-4 h-4" />
          Apply for IPO
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-finance p-5">
          <p className="text-sm text-muted-foreground">Total Applications</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="card-finance p-5">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold text-warning">{stats.applied}</p>
        </div>
        <div className="card-finance p-5">
          <p className="text-sm text-muted-foreground">Allotted</p>
          <p className="text-2xl font-bold text-success">{stats.allotted}</p>
        </div>
        <div className="card-finance p-5">
          <p className="text-sm text-muted-foreground">Funds on Hold</p>
          <p className="text-2xl font-bold text-warning mono">
            {formatMoney(stats.pending_amount)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by company..."
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
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="APPLIED">Applied</SelectItem>
            <SelectItem value="ALLOTTED">Allotted</SelectItem>
            <SelectItem value="REFUNDED">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* IPO List */}
      <div className="space-y-4">
        {filteredIPOs.length === 0 ? (
          <div className="card-finance p-12 text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No IPO applications found</p>
          </div>
        ) : (
          filteredIPOs.map((ipo) => {
            const status = statusConfig[ipo.status];
            const StatusIcon = status.icon;
            return (
              <div
                key={ipo.id}
                className="card-finance p-5 flex flex-col lg:flex-row lg:items-center gap-4"
              >
                <div className={`p-3 rounded-xl ${status.class} border`}>
                  <StatusIcon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">
                      {ipo.company_name}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${status.class}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Applied: {formatDate(ipo.application_date)} •{' '}
                    {ipo.shares_applied} shares
                    {ipo.shares_allotted !== undefined && ipo.shares_allotted !== null && (
                      <> • Allotted: {ipo.shares_allotted} shares</>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Application Amount</p>
                  <p className="text-xl font-bold mono">{formatMoney(ipo.amount)}</p>
                </div>
                {ipo.status === 'APPLIED' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => openAllotDialog(ipo)}
                      size="sm"
                      variant="outline"
                      className="gap-1"
                    >
                      <Award className="w-4 h-4" />
                      Allot
                    </Button>
                    <Button
                      onClick={() => openRefundDialog(ipo)}
                      size="sm"
                      variant="outline"
                      className="gap-1"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Refund
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Apply Dialog */}
      <Dialog open={dialogMode === 'apply'} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply for IPO</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleApplySubmit} className="space-y-4">
            <div>
              <Label>Company Name</Label>
              <Input
                value={applyForm.company_name}
                onChange={(e) =>
                  setApplyForm({ ...applyForm, company_name: e.target.value })
                }
                placeholder="e.g., Tata Technologies"
                required
              />
            </div>
            <div>
              <Label>Application Date</Label>
              <Input
                type="date"
                value={applyForm.application_date}
                onChange={(e) =>
                  setApplyForm({ ...applyForm, application_date: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label>Application Amount (₹)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={applyForm.amount}
                onChange={(e) =>
                  setApplyForm({ ...applyForm, amount: e.target.value })
                }
                placeholder="15000"
                required
              />
            </div>
            <div>
              <Label>Shares Applied</Label>
              <Input
                type="number"
                min="1"
                value={applyForm.shares_applied}
                onChange={(e) =>
                  setApplyForm({ ...applyForm, shares_applied: e.target.value })
                }
                placeholder="1"
                required
              />
            </div>
            <div>
              <Label>Bank Account (Funds will be held)</Label>
              <Select
                value={applyForm.bank_id}
                onValueChange={(v) => setApplyForm({ ...applyForm, bank_id: v })}
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
                onClick={() => setDialogMode(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Allot Dialog */}
      <Dialog open={dialogMode === 'allot'} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Allotment - {selectedIPO?.company_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAllotSubmit} className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Shares Applied</p>
                  <p className="font-semibold">{selectedIPO?.shares_applied}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-semibold mono">
                    {formatMoney(selectedIPO?.amount)}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <Label>Shares Allotted</Label>
              <Input
                type="number"
                min="0"
                max={selectedIPO?.shares_applied}
                value={allotForm.shares_allotted}
                onChange={(e) =>
                  setAllotForm({ ...allotForm, shares_allotted: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label>Refund Amount (₹)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={selectedIPO?.amount}
                value={allotForm.refund_amount}
                onChange={(e) =>
                  setAllotForm({ ...allotForm, refund_amount: e.target.value })
                }
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Partial refund if shares allotted are less than applied
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogMode(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Record Allotment'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Refund Confirmation */}
      <Dialog open={dialogMode === 'refund'} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Refund IPO Application</DialogTitle>
          </DialogHeader>
          <div className="p-4 rounded-lg bg-muted/50 mb-4">
            <p className="font-semibold">{selectedIPO?.company_name}</p>
            <p className="text-sm text-muted-foreground">
              Amount: {formatMoney(selectedIPO?.amount)}
            </p>
          </div>
          <p className="text-muted-foreground">
            This will refund the full application amount back to the bank account.
            Are you sure?
          </p>
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogMode(null)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleRefund}
              disabled={saving}
              className="flex-1"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Process Refund'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IPOList;
