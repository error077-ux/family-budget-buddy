import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  ShoppingCart,
  Banknote,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import {
  creditCardsApi,
  banksApi,
  type CreditCard as CreditCardType,
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

  const [cardForm, setCardForm] = useState({
    name: '',
    credit_limit: '',
    due_date: '1',
  });

  const [spendForm, setSpendForm] = useState({
    date: getTodayIST(),
    description: '',
    amount: '',
    spent_for: 'Me',
  });

  const [payForm, setPayForm] = useState({
    amount: '',
    bank_id: '',
    date: getTodayIST(),
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cardRes, bankRes] = await Promise.all([
        creditCardsApi.getAll(),
        banksApi.getAll(),
      ]);
      setCards(cardRes.data);
      setBanks(bankRes.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load credit cards',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openCardDialog = (card?: CreditCardType) => {
    if (card) {
      setSelectedCard(card);
      setCardForm({
        name: card.name,
        credit_limit: String(card.credit_limit),
        due_date: String(card.due_date),
      });
    } else {
      setSelectedCard(null);
      setCardForm({ name: '', credit_limit: '', due_date: '1' });
    }
    setDialogMode('card');
  };

  const openSpendDialog = (card: CreditCardType) => {
    setSelectedCard(card);
    setSpendForm({
      date: getTodayIST(),
      description: '',
      amount: '',
      spent_for: 'Me',
    });
    setDialogMode('spend');
  };

  const openPayDialog = (card: CreditCardType) => {
    setSelectedCard(card);
    setPayForm({
      amount: String(card.outstanding),
      bank_id: banks[0]?.id ? String(banks[0].id) : '',
      date: getTodayIST(),
    });
    setDialogMode('pay');
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: cardForm.name,
        credit_limit: parseFloat(cardForm.credit_limit),
        due_date: parseInt(cardForm.due_date),
      };

      if (selectedCard) {
        await creditCardsApi.update(selectedCard.id, payload);
        toast({ title: 'Success', description: 'Credit card updated' });
      } else {
        await creditCardsApi.create(payload);
        toast({ title: 'Success', description: 'Credit card added' });
      }

      setDialogMode(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to save card',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSpendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard) return;
    setSaving(true);

    try {
      await creditCardsApi.spend(selectedCard.id, {
        date: spendForm.date,
        description: spendForm.description,
        amount: parseFloat(spendForm.amount),
        spent_for: spendForm.spent_for,
      });
      toast({
        title: 'Success',
        description:
          spendForm.spent_for !== 'Me'
            ? `Spend recorded. A loan was created for ${spendForm.spent_for}.`
            : 'Spend recorded',
      });
      setDialogMode(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to record spend',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard) return;
    setSaving(true);

    try {
      await creditCardsApi.pay(selectedCard.id, {
        amount: parseFloat(payForm.amount),
        bank_id: parseInt(payForm.bank_id),
        date: payForm.date,
      });
      toast({ title: 'Success', description: 'Payment recorded' });
      setDialogMode(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to record payment',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCard) return;
    setSaving(true);

    try {
      await creditCardsApi.delete(selectedCard.id);
      toast({ title: 'Success', description: 'Credit card deleted' });
      setDialogMode(null);
      setSelectedCard(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to delete card',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
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
          <h1 className="text-3xl font-bold text-foreground">Credit Cards</h1>
          <p className="text-muted-foreground">
            Track spending and manage payments
          </p>
        </div>
        <Button onClick={() => openCardDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Card
        </Button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.length === 0 ? (
          <div className="col-span-full card-finance p-12 text-center">
            <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No credit cards added yet</p>
          </div>
        ) : (
          cards.map((card) => {
            const utilization = (card.outstanding / card.credit_limit) * 100;
            return (
              <div key={card.id} className="card-finance overflow-hidden">
                {/* Card Header */}
                <div className="bg-gradient-to-r from-primary to-info p-5 text-primary-foreground">
                  <div className="flex items-start justify-between">
                    <CreditCard className="w-8 h-8" />
                    <div className="flex gap-1">
                      <button
                        onClick={() => openCardDialog(card)}
                        className="p-2 rounded-lg hover:bg-primary-foreground/10 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCard(card);
                          setDialogMode('delete');
                        }}
                        className="p-2 rounded-lg hover:bg-primary-foreground/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg mt-4">{card.name}</h3>
                  <p className="text-sm opacity-75">Due: {card.due_date}th of month</p>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Outstanding</p>
                      <p className="text-xl font-bold text-destructive mono">
                        {formatMoney(card.outstanding)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Available</p>
                      <p className="text-xl font-bold text-success mono">
                        {formatMoney(card.available_credit)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Credit Limit</span>
                      <span className="font-medium">{formatMoney(card.credit_limit)}</span>
                    </div>
                    <Progress
                      value={utilization}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {utilization.toFixed(1)}% utilized
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => openSpendDialog(card)}
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Spend
                    </Button>
                    <Button
                      onClick={() => openPayDialog(card)}
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                      disabled={card.outstanding <= 0}
                    >
                      <Banknote className="w-4 h-4" />
                      Pay
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Card Dialog */}
      <Dialog open={dialogMode === 'card'} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedCard ? 'Edit Credit Card' : 'Add Credit Card'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCardSubmit} className="space-y-4">
            <div>
              <Label>Card Name</Label>
              <Input
                value={cardForm.name}
                onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
                placeholder="e.g., HDFC Platinum"
                required
              />
            </div>
            <div>
              <Label>Credit Limit (₹)</Label>
              <Input
                type="number"
                step="1"
                min="1"
                value={cardForm.credit_limit}
                onChange={(e) =>
                  setCardForm({ ...cardForm, credit_limit: e.target.value })
                }
                placeholder="100000"
                required
              />
            </div>
            <div>
              <Label>Bill Due Date (Day of Month)</Label>
              <Select
                value={cardForm.due_date}
                onValueChange={(v) => setCardForm({ ...cardForm, due_date: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      {day}
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
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : selectedCard ? (
                  'Update'
                ) : (
                  'Add Card'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Spend Dialog */}
      <Dialog open={dialogMode === 'spend'} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Spend - {selectedCard?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSpendSubmit} className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available Credit</p>
                <p className="font-semibold text-success mono">
                  {formatMoney(selectedCard?.available_credit)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="font-semibold text-destructive mono">
                  {formatMoney(selectedCard?.outstanding)}
                </p>
              </div>
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={spendForm.date}
                onChange={(e) => setSpendForm({ ...spendForm, date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={spendForm.description}
                onChange={(e) =>
                  setSpendForm({ ...spendForm, description: e.target.value })
                }
                placeholder="e.g., Amazon purchase"
                required
              />
            </div>
            <div>
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={selectedCard?.available_credit}
                value={spendForm.amount}
                onChange={(e) => setSpendForm({ ...spendForm, amount: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Spent For</Label>
              <Input
                value={spendForm.spent_for}
                onChange={(e) =>
                  setSpendForm({ ...spendForm, spent_for: e.target.value })
                }
                placeholder="Me"
                required
              />
              {spendForm.spent_for && spendForm.spent_for !== 'Me' && (
                <div className="flex items-center gap-2 mt-2 p-3 rounded-lg bg-warning/10 text-warning text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>A loan will be auto-created for "{spendForm.spent_for}"</span>
                </div>
              )}
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
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record Spend'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={dialogMode === 'pay'} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pay Bill - {selectedCard?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaySubmit} className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Outstanding Amount</p>
              <p className="text-xl font-bold text-destructive mono">
                {formatMoney(selectedCard?.outstanding)}
              </p>
            </div>
            <div>
              <Label>Payment Amount (₹)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={selectedCard?.outstanding}
                value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={payForm.date}
                onChange={(e) => setPayForm({ ...payForm, date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Debit from Bank Account</Label>
              <Select
                value={payForm.bank_id}
                onValueChange={(v) => setPayForm({ ...payForm, bank_id: v })}
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
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pay Now'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={dialogMode === 'delete'} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Credit Card</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete "{selectedCard?.name}"? This action
            cannot be undone.
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

export default CreditCardList;
