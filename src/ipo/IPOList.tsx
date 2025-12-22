import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Plus, RotateCcw, Award, Clock, Loader2, Search, CalendarCheck, IndianRupee } from 'lucide-react';
import { ipoApi, banksApi, type IPO, type IPOStatus, type Bank } from '@/api/supabase-api';
import { formatMoney } from '@/utils/formatMoney';
import { formatDate, getTodayIST } from '@/utils/formatDate';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type DialogMode = 'apply' | 'allot' | 'refund' | 'update_status' | 'listing_price' | null;

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
    allotment_date: '',
    amount: '',
    shares_applied: '',
    issue_price: '',
    bank_id: '',
  });

  const [allotForm, setAllotForm] = useState({
    shares_allotted: '',
    refund_amount: '',
  });

  const [listingPrice, setListingPrice] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [i, b] = await Promise.all([ipoApi.getAll(), banksApi.getAll()]);
      setIpos(i);
      setBanks(b);
    } catch {
      toast({ title: 'Error', description: 'Failed to load', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await ipoApi.apply({
        company_name: applyForm.company_name,
        application_date: applyForm.application_date,
        allotment_date: applyForm.allotment_date,
        amount: parseFloat(applyForm.amount),
        shares_applied: parseInt(applyForm.shares_applied),
        issue_price: parseFloat(applyForm.issue_price),
        bank_id: applyForm.bank_id,
      });
      toast({ title: 'Success', description: 'IPO applied. Funds on hold.' });
      setDialogMode(null);
      fetchData();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
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
      toast({ title: 'Success', description: 'Shares allotted successfully!' });
      setDialogMode(null);
      fetchData();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedIPO) return;
    setSaving(true);
    try {
      await ipoApi.refund(selectedIPO.id);
      toast({ title: 'Success', description: 'Full refund processed' });
      setDialogMode(null);
      fetchData();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleListingPriceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIPO) return;
    setSaving(true);
    try {
      await ipoApi.updateListingPrice(selectedIPO.id, parseFloat(listingPrice));
      toast({ title: 'Success', description: 'Listing price updated!' });
      setDialogMode(null);
      fetchData();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openUpdateStatusDialog = (ipo: IPO) => {
    setSelectedIPO(ipo);
    setAllotForm({
      shares_allotted: String(ipo.shares_applied),
      refund_amount: '0',
    });
    setDialogMode('update_status');
  };

  const handleStatusUpdate = async (isAllotted: boolean) => {
    if (!selectedIPO) return;
    setSaving(true);
    try {
      if (isAllotted) {
        setDialogMode('allot');
      } else {
        await ipoApi.refund(selectedIPO.id);
        toast({ title: 'IPO Not Allotted', description: 'Full refund processed to your bank' });
        setDialogMode(null);
        fetchData();
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const calculatePL = (ipo: IPO) => {
    if (ipo.status !== 'ALLOTTED' || !ipo.shares_allotted || !ipo.issue_price || !ipo.listing_price) {
      return null;
    }
    const investedAmount = ipo.shares_allotted * ipo.issue_price;
    const currentValue = ipo.shares_allotted * ipo.listing_price;
    const pl = currentValue - investedAmount;
    const plPercent = (pl / investedAmount) * 100;
    return { pl, plPercent, investedAmount, currentValue };
  };

  const getPendingAllotmentIPOs = () => {
    const today = getTodayIST();
    return ipos.filter(
      (ipo) => ipo.status === 'APPLIED' && ipo.allotment_date && ipo.allotment_date <= today
    );
  };

  const pendingAllotments = getPendingAllotmentIPOs();

  const filteredIPOs = ipos.filter(
    (i) => i.company_name.toLowerCase().includes(search.toLowerCase()) && (filter === 'all' || i.status === filter)
  );

  // Calculate total P&L
  const totalPL = ipos.reduce((acc, ipo) => {
    const plData = calculatePL(ipo);
    return acc + (plData?.pl || 0);
  }, 0);

  const stats = {
    total: ipos.length,
    applied: ipos.filter((i) => i.status === 'APPLIED').length,
    allotted: ipos.filter((i) => i.status === 'ALLOTTED').length,
    pending_amount: ipos.filter((i) => i.status === 'APPLIED').reduce((s, i) => s + Number(i.amount), 0),
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
          <h1 className="text-3xl font-bold">IPO Tracker</h1>
          <p className="text-muted-foreground">Track applications & profits</p>
        </div>
        <Button
          onClick={() => {
            setApplyForm({
              company_name: '',
              application_date: getTodayIST(),
              allotment_date: '',
              amount: '',
              shares_applied: '',
              issue_price: '',
              bank_id: banks[0]?.id || '',
            });
            setDialogMode('apply');
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Apply
        </Button>
      </div>

      {/* Pending Allotment Alert */}
      {pendingAllotments.length > 0 && (
        <div className="p-4 rounded-lg border border-warning bg-warning/10">
          <div className="flex items-center gap-2 mb-2">
            <CalendarCheck className="w-5 h-5 text-warning" />
            <h3 className="font-semibold text-warning">Allotment Update Required</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            The following IPOs have reached their allotment date:
          </p>
          <div className="space-y-2">
            {pendingAllotments.map((ipo) => (
              <div key={ipo.id} className="flex items-center justify-between p-3 rounded-lg bg-background">
                <div>
                  <p className="font-medium">{ipo.company_name}</p>
                  <p className="text-sm text-muted-foreground">Allotment: {formatDate(ipo.allotment_date!)}</p>
                </div>
                <Button size="sm" onClick={() => openUpdateStatusDialog(ipo)}>Update Status</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card-finance p-5">
          <p className="text-sm text-muted-foreground">Total</p>
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
          <p className="text-sm text-muted-foreground">On Hold</p>
          <p className="text-2xl font-bold text-warning mono">{formatMoney(stats.pending_amount)}</p>
        </div>
        <div className="card-finance p-5">
          <p className="text-sm text-muted-foreground">Total P&L</p>
          <p className={`text-2xl font-bold mono ${totalPL >= 0 ? 'text-success' : 'text-destructive'}`}>
            {totalPL >= 0 ? '+' : ''}{formatMoney(totalPL)}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="APPLIED">Applied</SelectItem>
            <SelectItem value="ALLOTTED">Allotted</SelectItem>
            <SelectItem value="REFUNDED">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filteredIPOs.length === 0 ? (
          <div className="card-finance p-12 text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No IPOs</p>
          </div>
        ) : (
          filteredIPOs.map((ipo) => {
            const status = statusConfig[ipo.status];
            const StatusIcon = status.icon;
            const isAllotmentDue = ipo.status === 'APPLIED' && ipo.allotment_date && ipo.allotment_date <= getTodayIST();
            const plData = calculatePL(ipo);

            return (
              <div key={ipo.id} className={`card-finance p-5 ${isAllotmentDue ? 'ring-2 ring-warning' : ''}`}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className={`p-3 rounded-xl ${status.class} border`}>
                    <StatusIcon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{ipo.company_name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${status.class}`}>{status.label}</span>
                      {isAllotmentDue && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-warning text-warning-foreground">Allotment Due</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Applied: {formatDate(ipo.application_date)} • {ipo.shares_applied} shares
                      {ipo.issue_price && <> @ ₹{ipo.issue_price}</>}
                      {ipo.allotment_date && <> • Allotment: {formatDate(ipo.allotment_date)}</>}
                      {ipo.shares_allotted != null && <> • Got: {ipo.shares_allotted}</>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="text-xl font-bold mono">{formatMoney(ipo.amount)}</p>
                  </div>

                  {/* P&L Display for Allotted IPOs */}
                  {ipo.status === 'ALLOTTED' && (
                    <div className="text-right min-w-[120px]">
                      {plData ? (
                        <>
                          <p className="text-sm text-muted-foreground">P&L</p>
                          <p className={`text-xl font-bold mono flex items-center justify-end gap-1 ${plData.pl >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {plData.pl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            {plData.pl >= 0 ? '+' : ''}{formatMoney(plData.pl)}
                          </p>
                          <p className={`text-xs ${plData.pl >= 0 ? 'text-success' : 'text-destructive'}`}>
                            ({plData.plPercent >= 0 ? '+' : ''}{plData.plPercent.toFixed(2)}%)
                          </p>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedIPO(ipo);
                            setListingPrice(ipo.listing_price?.toString() || '');
                            setDialogMode('listing_price');
                          }}
                          className="gap-1"
                        >
                          <IndianRupee className="w-4 h-4" />
                          Add Listing Price
                        </Button>
                      )}
                    </div>
                  )}

                  {ipo.status === 'APPLIED' && (
                    <div className="flex gap-2">
                      {isAllotmentDue ? (
                        <Button onClick={() => openUpdateStatusDialog(ipo)} size="sm" className="gap-1">
                          <CalendarCheck className="w-4 h-4" />Update Status
                        </Button>
                      ) : (
                        <>
                          <Button onClick={() => { setSelectedIPO(ipo); setAllotForm({ shares_allotted: String(ipo.shares_applied), refund_amount: '0' }); setDialogMode('allot'); }} size="sm" variant="outline" className="gap-1">
                            <Award className="w-4 h-4" />Allot
                          </Button>
                          <Button onClick={() => { setSelectedIPO(ipo); setDialogMode('refund'); }} size="sm" variant="outline" className="gap-1">
                            <RotateCcw className="w-4 h-4" />Refund
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Listing Price Update for Allotted IPOs with existing price */}
                {ipo.status === 'ALLOTTED' && ipo.listing_price && (
                  <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Issue: ₹{ipo.issue_price} → Listing: ₹{ipo.listing_price}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedIPO(ipo);
                        setListingPrice(ipo.listing_price?.toString() || '');
                        setDialogMode('listing_price');
                      }}
                    >
                      Update Price
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
            <DialogDescription>Enter IPO details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleApplySubmit} className="space-y-4">
            <div>
              <Label>Company Name</Label>
              <Input value={applyForm.company_name} onChange={(e) => setApplyForm({ ...applyForm, company_name: e.target.value })} placeholder="e.g., Tata Technologies" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Application Date</Label>
                <Input type="date" value={applyForm.application_date} onChange={(e) => setApplyForm({ ...applyForm, application_date: e.target.value })} required />
              </div>
              <div>
                <Label>Allotment Date</Label>
                <Input type="date" value={applyForm.allotment_date} onChange={(e) => setApplyForm({ ...applyForm, allotment_date: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Issue Price (₹)</Label>
                <Input type="number" step="0.01" min="0.01" value={applyForm.issue_price} onChange={(e) => setApplyForm({ ...applyForm, issue_price: e.target.value })} required />
              </div>
              <div>
                <Label>Shares Applied</Label>
                <Input type="number" min="1" value={applyForm.shares_applied} onChange={(e) => setApplyForm({ ...applyForm, shares_applied: e.target.value })} required />
              </div>
            </div>
            <div>
              <Label>Total Amount (₹)</Label>
              <Input type="number" step="0.01" min="0.01" value={applyForm.amount} onChange={(e) => setApplyForm({ ...applyForm, amount: e.target.value })} required />
            </div>
            <div>
              <Label>Bank</Label>
              <Select value={applyForm.bank_id} onValueChange={(v) => setApplyForm({ ...applyForm, bank_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                <SelectContent>{banks.map((b) => <SelectItem key={b.id} value={b.id}>{b.name} ({formatMoney(b.balance)})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogMode(null)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={dialogMode === 'update_status'} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update IPO Status</DialogTitle>
            <DialogDescription>{selectedIPO?.company_name} - Allotment was {selectedIPO?.allotment_date && formatDate(selectedIPO.allotment_date)}</DialogDescription>
          </DialogHeader>
          <div className="p-4 rounded-lg bg-muted/50 flex justify-between mb-4">
            <div><p className="text-sm text-muted-foreground">Applied</p><p className="font-semibold">{selectedIPO?.shares_applied} shares</p></div>
            <div className="text-right"><p className="text-sm text-muted-foreground">Amount</p><p className="font-semibold mono">{formatMoney(selectedIPO?.amount)}</p></div>
          </div>
          <p className="text-center text-muted-foreground mb-4">Were you allotted shares?</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => handleStatusUpdate(false)} disabled={saving} className="flex-1 gap-2"><RotateCcw className="w-4 h-4" />No, Refund</Button>
            <Button onClick={() => handleStatusUpdate(true)} disabled={saving} className="flex-1 gap-2"><Award className="w-4 h-4" />Yes, Allotted</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Allot Dialog */}
      <Dialog open={dialogMode === 'allot'} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Allot - {selectedIPO?.company_name}</DialogTitle>
            <DialogDescription>Enter shares allotted</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAllotSubmit} className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 flex justify-between">
              <div><p className="text-sm text-muted-foreground">Applied</p><p className="font-semibold">{selectedIPO?.shares_applied} shares</p></div>
              <div className="text-right"><p className="text-sm text-muted-foreground">Amount</p><p className="font-semibold mono">{formatMoney(selectedIPO?.amount)}</p></div>
            </div>
            <div><Label>Shares Allotted</Label><Input type="number" min="0" value={allotForm.shares_allotted} onChange={(e) => setAllotForm({ ...allotForm, shares_allotted: e.target.value })} required /></div>
            <div><Label>Refund Amount (₹)</Label><Input type="number" step="0.01" min="0" value={allotForm.refund_amount} onChange={(e) => setAllotForm({ ...allotForm, refund_amount: e.target.value })} /><p className="text-xs text-muted-foreground mt-1">Enter refund if partial allotment</p></div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogMode(null)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Listing Price Dialog */}
      <Dialog open={dialogMode === 'listing_price'} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Listing Price</DialogTitle>
            <DialogDescription>{selectedIPO?.company_name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleListingPriceSubmit} className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 flex justify-between">
              <div><p className="text-sm text-muted-foreground">Issue Price</p><p className="font-semibold">₹{selectedIPO?.issue_price}</p></div>
              <div className="text-right"><p className="text-sm text-muted-foreground">Shares Allotted</p><p className="font-semibold">{selectedIPO?.shares_allotted}</p></div>
            </div>
            <div>
              <Label>Listing Price (₹)</Label>
              <Input type="number" step="0.01" min="0.01" value={listingPrice} onChange={(e) => setListingPrice(e.target.value)} placeholder="Enter current market price" required />
            </div>
            {listingPrice && selectedIPO?.issue_price && selectedIPO?.shares_allotted && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Estimated P&L</p>
                {(() => {
                  const invested = selectedIPO.shares_allotted * selectedIPO.issue_price;
                  const current = selectedIPO.shares_allotted * parseFloat(listingPrice);
                  const pl = current - invested;
                  const plPercent = (pl / invested) * 100;
                  return (
                    <p className={`text-lg font-bold ${pl >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {pl >= 0 ? '+' : ''}{formatMoney(pl)} ({plPercent >= 0 ? '+' : ''}{plPercent.toFixed(2)}%)
                    </p>
                  );
                })()}
              </div>
            )}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogMode(null)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={dialogMode === 'refund'} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Refund IPO</DialogTitle>
            <DialogDescription>Process full refund</DialogDescription>
          </DialogHeader>
          <div className="p-4 rounded-lg bg-muted/50 mb-4"><p className="font-semibold">{selectedIPO?.company_name}</p><p className="text-sm text-muted-foreground">Amount: {formatMoney(selectedIPO?.amount)}</p></div>
          <p className="text-muted-foreground">This will refund the full amount to your bank.</p>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setDialogMode(null)} className="flex-1">Cancel</Button>
            <Button onClick={handleRefund} disabled={saving} className="flex-1">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refund'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IPOList;
