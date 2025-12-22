import React, { useState } from 'react';
import { Download, FileSpreadsheet, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { transactionsApi, loansApi, banksApi, creditCardsApi, ipoApi, notificationsApi } from '@/api/supabase-api';
import { formatMoney } from '@/utils/formatMoney';

const ExportPage: React.FC = () => {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();
  const [selected, setSelected] = useState({
    transactions: true,
    loans: true,
    banks: true,
    creditCards: true,
    ipos: true,
    notifications: false,
  });

  const toggleSelection = (key: keyof typeof selected) => {
    setSelected(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    const rows = data.map(item => 
      headers.map(header => {
        const value = item[header.toLowerCase().replace(/ /g, '_')] ?? item[header] ?? '-';
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    );
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const date = new Date().toISOString().split('T')[0];

      if (selected.transactions) {
        const transactions = await transactionsApi.getAll();
        const data = transactions.map(t => ({
          date: t.date,
          description: t.description,
          amount: t.amount,
          expense_owner: t.expense_owner,
          bank: t.bank_name || '-',
          has_loan: t.created_loan_id ? 'Yes' : 'No',
        }));
        exportToCSV(data, `transactions_${date}.csv`, ['Date', 'Description', 'Amount', 'Expense_Owner', 'Bank', 'Has_Loan']);
      }

      if (selected.loans) {
        const loans = await loansApi.getAll();
        const data = loans.map(l => ({
          borrower_name: l.borrower_name,
          principal_amount: l.principal_amount,
          outstanding_amount: l.outstanding_amount,
          status: l.is_paid ? 'Paid' : 'Pending',
          source: l.source_bank_name || l.source_credit_card_name || '-',
          created_at: new Date(l.created_at).toLocaleDateString('en-IN'),
        }));
        exportToCSV(data, `loans_${date}.csv`, ['Borrower_Name', 'Principal_Amount', 'Outstanding_Amount', 'Status', 'Source', 'Created_At']);
      }

      if (selected.banks) {
        const banks = await banksApi.getAll();
        const data = banks.map(b => ({
          name: b.name,
          account_number: b.account_number,
          balance: b.balance,
        }));
        exportToCSV(data, `banks_${date}.csv`, ['Name', 'Account_Number', 'Balance']);
      }

      if (selected.creditCards) {
        const cards = await creditCardsApi.getAll();
        const data = cards.map(c => ({
          name: c.name,
          credit_limit: c.credit_limit,
          outstanding: c.outstanding,
          available_credit: c.available_credit,
          due_date: c.due_date,
        }));
        exportToCSV(data, `credit_cards_${date}.csv`, ['Name', 'Credit_Limit', 'Outstanding', 'Available_Credit', 'Due_Date']);
      }

      if (selected.ipos) {
        const ipos = await ipoApi.getAll();
        const data = ipos.map(i => ({
          company_name: i.company_name,
          application_date: i.application_date,
          amount: i.amount,
          shares_applied: i.shares_applied,
          shares_allotted: i.shares_allotted || '-',
          status: i.status,
          bank: i.bank_name || '-',
        }));
        exportToCSV(data, `ipos_${date}.csv`, ['Company_Name', 'Application_Date', 'Amount', 'Shares_Applied', 'Shares_Allotted', 'Status', 'Bank']);
      }

      if (selected.notifications) {
        const notifications = await notificationsApi.getAll();
        const data = notifications.map(n => ({
          title: n.title,
          message: n.message,
          email: n.email,
          scheduled_date: n.scheduled_date,
          is_recurring: n.is_recurring ? 'Yes' : 'No',
          is_sent: n.is_sent ? 'Yes' : 'No',
        }));
        exportToCSV(data, `notifications_${date}.csv`, ['Title', 'Message', 'Email', 'Scheduled_Date', 'Is_Recurring', 'Is_Sent']);
      }

      toast({ title: 'Export Complete', description: 'Your data has been exported as CSV files' });
    } catch (error: any) {
      toast({ title: 'Export Failed', description: error.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Export Data</h1>
        <p className="text-muted-foreground">Download your financial data as CSV files</p>
      </div>

      <div className="card-finance p-6">
        <div className="flex items-start gap-4">
          <div className="p-4 rounded-xl bg-success/10"><FileSpreadsheet className="w-8 h-8 text-success" /></div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Export to CSV</h3>
            <p className="text-sm text-muted-foreground mb-4">Select the data you want to export. Each category will be saved as a separate CSV file.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <Checkbox id="transactions" checked={selected.transactions} onCheckedChange={() => toggleSelection('transactions')} />
                <Label htmlFor="transactions" className="flex-1 cursor-pointer">Transactions</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <Checkbox id="loans" checked={selected.loans} onCheckedChange={() => toggleSelection('loans')} />
                <Label htmlFor="loans" className="flex-1 cursor-pointer">Loans</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <Checkbox id="banks" checked={selected.banks} onCheckedChange={() => toggleSelection('banks')} />
                <Label htmlFor="banks" className="flex-1 cursor-pointer">Bank Accounts</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <Checkbox id="creditCards" checked={selected.creditCards} onCheckedChange={() => toggleSelection('creditCards')} />
                <Label htmlFor="creditCards" className="flex-1 cursor-pointer">Credit Cards</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <Checkbox id="ipos" checked={selected.ipos} onCheckedChange={() => toggleSelection('ipos')} />
                <Label htmlFor="ipos" className="flex-1 cursor-pointer">IPO Applications</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <Checkbox id="notifications" checked={selected.notifications} onCheckedChange={() => toggleSelection('notifications')} />
                <Label htmlFor="notifications" className="flex-1 cursor-pointer">Notifications</Label>
              </div>
            </div>

            <Button onClick={handleExportAll} disabled={exporting || selectedCount === 0} className="w-full gap-2">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exporting ? 'Exporting...' : `Export ${selectedCount} Selected`}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-success mt-0.5" />
          <div>
            <h4 className="font-medium mb-1">About CSV Export</h4>
            <p className="text-sm text-muted-foreground">Each selected category exports as a separate CSV file. You can open these files in Excel, Google Sheets, or any spreadsheet application for analysis.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportPage;