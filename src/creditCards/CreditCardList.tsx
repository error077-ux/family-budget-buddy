import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Pencil, Trash2, ShoppingCart, Banknote, Loader2, AlertTriangle } from 'lucide-react';
import { creditCardsApi, banksApi, type CreditCard as CreditCardType, type Bank } from '@/api/supabase-api';
import { formatMoney } from '@/utils/formatMoney';
import { getTodayIST } from '@/utils/formatDate';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

type DialogMode = 'card' | 'spend' | 'pay' | 'delete';

const CreditCardList: React.FC = () => {
  const [cards, setCards] = useState<CreditCardType[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const [selectedCard, setSelectedCard] = useState<CreditCardType | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [cardForm, setCardForm] = useState({ name: '', credit_limit: '', due_date: '1' });
  const [spendForm, setSpendForm] = useState({ date: getTodayIST(), description: '', amount: '', spent_for: 'Me' });
  const [payForm, setPayForm] = useState({ amount: '', bank_id: '', date: getTodayIST() });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try { const [c, b] = await Promise.all([creditCardsApi.getAll(), banksApi.getAll()]); setCards(c); setBanks(b); }
    catch { toast({ title: 'Error', description: 'Failed to load', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const openCardDialog = (card?: CreditCardType) => {
    if (card) { setSelectedCard(card); setCardForm({ name: card.name, credit_limit: String(card.credit_limit), due_date: String(card.due_date) }); }
    else { setSelectedCard(null); setCardForm({ name: '', credit_limit: '', due_date: '1' }); }
    setDialogMode('card');
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { name: cardForm.name, credit_limit: parseFloat(cardForm.credit_limit), due_date: parseInt(cardForm.due_date) };
      if (selectedCard) await creditCardsApi.update(selectedCard.id, payload); else await creditCardsApi.create(payload);
      toast({ title: 'Success' }); setDialogMode(null); fetchData();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleSpendSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedCard) return; setSaving(true);
    try {
      await creditCardsApi.spend(selectedCard.id, { date: spendForm.date, description: spendForm.description, amount: parseFloat(spendForm.amount), spent_for: spendForm.spent_for });
      toast({ title: 'Success', description: spendForm.spent_for !== 'Me' ? `Loan created for ${spendForm.spent_for}` : 'Spend recorded' }); setDialogMode(null); fetchData();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedCard) return; setSaving(true);
    try {
      await creditCardsApi.pay(selectedCard.id, { amount: parseFloat(payForm.amount), bank_id: payForm.bank_id, date: payForm.date });
      toast({ title: 'Success', description: 'Payment recorded' }); setDialogMode(null); fetchData();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedCard) return; setSaving(true);
    try { await creditCardsApi.delete(selectedCard.id); toast({ title: 'Deleted' }); setDialogMode(null); fetchData(); }
    catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-3xl font-bold">Credit Cards</h1><p className="text-muted-foreground">Track spending and payments</p></div>
        <Button onClick={() => openCardDialog()} className="gap-2"><Plus className="w-4 h-4" />Add Card</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.length === 0 ? <div className="col-span-full card-finance p-12 text-center"><CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" /><p className="text-muted-foreground">No cards</p></div> : cards.map((card) => {
          const utilization = (Number(card.outstanding) / Number(card.credit_limit)) * 100;
          return (
            <div key={card.id} className="card-finance overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-info p-5 text-primary-foreground">
                <div className="flex items-start justify-between"><CreditCard className="w-8 h-8" /><div className="flex gap-1"><button onClick={() => openCardDialog(card)} className="p-2 rounded-lg hover:bg-primary-foreground/10"><Pencil className="w-4 h-4" /></button><button onClick={() => { setSelectedCard(card); setDialogMode('delete'); }} className="p-2 rounded-lg hover:bg-primary-foreground/10"><Trash2 className="w-4 h-4" /></button></div></div>
                <h3 className="font-semibold text-lg mt-4">{card.name}</h3><p className="text-sm opacity-75">Due: {card.due_date}th</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4"><div><p className="text-sm text-muted-foreground">Outstanding</p><p className="text-xl font-bold text-destructive mono">{formatMoney(card.outstanding)}</p></div><div><p className="text-sm text-muted-foreground">Available</p><p className="text-xl font-bold text-success mono">{formatMoney(card.available_credit)}</p></div></div>
                <div><div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Limit</span><span className="font-medium">{formatMoney(card.credit_limit)}</span></div><Progress value={utilization} className="h-2" /><p className="text-xs text-muted-foreground mt-1">{utilization.toFixed(1)}% used</p></div>
                <div className="flex gap-2"><Button onClick={() => { setSelectedCard(card); setSpendForm({ date: getTodayIST(), description: '', amount: '', spent_for: 'Me' }); setDialogMode('spend'); }} variant="outline" size="sm" className="flex-1 gap-2"><ShoppingCart className="w-4 h-4" />Spend</Button><Button onClick={() => { setSelectedCard(card); setPayForm({ amount: String(card.outstanding), bank_id: banks[0]?.id || '', date: getTodayIST() }); setDialogMode('pay'); }} variant="outline" size="sm" className="flex-1 gap-2" disabled={Number(card.outstanding) <= 0}><Banknote className="w-4 h-4" />Pay</Button></div>
              </div>
            </div>
          );
        })}
      </div>
      <Dialog open={dialogMode === 'card'} onOpenChange={() => setDialogMode(null)}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{selectedCard ? 'Edit' : 'Add'} Card</DialogTitle></DialogHeader><form onSubmit={handleCardSubmit} className="space-y-4"><div><Label>Name</Label><Input value={cardForm.name} onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })} required /></div><div><Label>Credit Limit (₹)</Label><Input type="number" min="1" value={cardForm.credit_limit} onChange={(e) => setCardForm({ ...cardForm, credit_limit: e.target.value })} required /></div><div><Label>Due Date</Label><Select value={cardForm.due_date} onValueChange={(v) => setCardForm({ ...cardForm, due_date: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Array.from({length:28},(_,i)=>i+1).map(d=><SelectItem key={d} value={String(d)}>{d}</SelectItem>)}</SelectContent></Select></div><div className="flex gap-3 pt-4"><Button type="button" variant="outline" onClick={() => setDialogMode(null)} className="flex-1">Cancel</Button><Button type="submit" disabled={saving} className="flex-1">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</Button></div></form></DialogContent></Dialog>
      <Dialog open={dialogMode === 'spend'} onOpenChange={() => setDialogMode(null)}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Spend - {selectedCard?.name}</DialogTitle></DialogHeader><form onSubmit={handleSpendSubmit} className="space-y-4"><div><Label>Date</Label><Input type="date" value={spendForm.date} onChange={(e) => setSpendForm({ ...spendForm, date: e.target.value })} required /></div><div><Label>Description</Label><Input value={spendForm.description} onChange={(e) => setSpendForm({ ...spendForm, description: e.target.value })} required /></div><div><Label>Amount (₹)</Label><Input type="number" step="0.01" min="0.01" value={spendForm.amount} onChange={(e) => setSpendForm({ ...spendForm, amount: e.target.value })} required /></div><div><Label>Spent For</Label><Input value={spendForm.spent_for} onChange={(e) => setSpendForm({ ...spendForm, spent_for: e.target.value })} required />{spendForm.spent_for !== 'Me' && <div className="flex items-center gap-2 mt-2 p-3 rounded-lg bg-warning/10 text-warning text-sm"><AlertTriangle className="w-4 h-4" /><span>Loan will be created for "{spendForm.spent_for}"</span></div>}</div><div className="flex gap-3 pt-4"><Button type="button" variant="outline" onClick={() => setDialogMode(null)} className="flex-1">Cancel</Button><Button type="submit" disabled={saving} className="flex-1">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record'}</Button></div></form></DialogContent></Dialog>
      <Dialog open={dialogMode === 'pay'} onOpenChange={() => setDialogMode(null)}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Pay - {selectedCard?.name}</DialogTitle></DialogHeader><form onSubmit={handlePaySubmit} className="space-y-4"><div className="p-4 rounded-lg bg-muted/50"><p className="text-sm text-muted-foreground">Outstanding</p><p className="text-xl font-bold text-destructive mono">{formatMoney(selectedCard?.outstanding)}</p></div><div><Label>Amount (₹)</Label><Input type="number" step="0.01" min="0.01" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required /></div><div><Label>Date</Label><Input type="date" value={payForm.date} onChange={(e) => setPayForm({ ...payForm, date: e.target.value })} required /></div><div><Label>From Bank</Label><Select value={payForm.bank_id} onValueChange={(v) => setPayForm({ ...payForm, bank_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{banks.map(b => <SelectItem key={b.id} value={b.id}>{b.name} ({formatMoney(b.balance)})</SelectItem>)}</SelectContent></Select></div><div className="flex gap-3 pt-4"><Button type="button" variant="outline" onClick={() => setDialogMode(null)} className="flex-1">Cancel</Button><Button type="submit" disabled={saving} className="flex-1">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pay'}</Button></div></form></DialogContent></Dialog>
      <Dialog open={dialogMode === 'delete'} onOpenChange={() => setDialogMode(null)}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Delete Card</DialogTitle></DialogHeader><p className="text-muted-foreground">Delete "{selectedCard?.name}"?</p><div className="flex gap-3 pt-4"><Button variant="outline" onClick={() => setDialogMode(null)} className="flex-1">Cancel</Button><Button variant="destructive" onClick={handleDelete} disabled={saving} className="flex-1">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}</Button></div></DialogContent></Dialog>
    </div>
  );
};

export default CreditCardList;
