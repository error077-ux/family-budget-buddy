import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2, CheckCircle, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { transactionsApi, loansApi, banksApi, creditCardsApi, ipoApi, notificationsApi } from '@/api/supabase-api';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const ExportPage: React.FC = () => {
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const { toast } = useToast();
  
  // Date range state
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
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

  const clearDateFilter = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  // Filter data by date range
  const filterByDateRange = <T extends { date?: string; created_at?: string; application_date?: string; scheduled_date?: string }>(
    data: T[],
    dateField: keyof T
  ): T[] => {
    if (!startDate && !endDate) return data;
    
    return data.filter(item => {
      const itemDateStr = item[dateField] as string;
      if (!itemDateStr) return true;
      
      const itemDate = new Date(itemDateStr);
      itemDate.setHours(0, 0, 0, 0);
      
      if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return itemDate >= start && itemDate <= end;
      } else if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        return itemDate >= start;
      } else if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return itemDate <= end;
      }
      return true;
    });
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

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const date = new Date().toISOString().split('T')[0];

      if (selected.transactions) {
        const transactions = await transactionsApi.getAll();
        const filtered = filterByDateRange(transactions, 'date');
        const data = filtered.map(t => ({
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
        const filtered = filterByDateRange(loans, 'created_at');
        const data = filtered.map(l => ({
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
        const filtered = filterByDateRange(ipos, 'application_date');
        const data = filtered.map(i => ({
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
        const filtered = filterByDateRange(notifications, 'scheduled_date');
        const data = filtered.map(n => ({
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

  // Helper function to draw a simple table
  const drawTable = (doc: jsPDF, startY: number, headers: string[], data: string[][], options?: { headerColor?: number[] }) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const cellPadding = 4;
    const colWidth = (pageWidth - margin * 2) / headers.length;
    const rowHeight = 10;
    let y = startY;

    // Draw header
    doc.setFillColor(options?.headerColor?.[0] || 59, options?.headerColor?.[1] || 130, options?.headerColor?.[2] || 246);
    doc.rect(margin, y, pageWidth - margin * 2, rowHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    headers.forEach((header, i) => {
      doc.text(header, margin + i * colWidth + cellPadding, y + 7);
    });
    y += rowHeight;

    // Draw data rows
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(8);
    data.forEach((row, rowIndex) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      if (rowIndex % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, pageWidth - margin * 2, rowHeight, 'F');
      }
      row.forEach((cell, i) => {
        const text = String(cell).substring(0, 20);
        doc.text(text, margin + i * colWidth + cellPadding, y + 7);
      });
      y += rowHeight;
    });

    return y + 10;
  };

  const handleExportPDF = async () => {
    setExportingPdf(true);
    try {
      const doc = new jsPDF();
      const date = new Date().toLocaleDateString('en-IN');
      let yPos = 20;

      // Title
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('Family Budget Report', 14, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${date}`, 14, yPos);
      
      // Show date range if selected
      if (startDate || endDate) {
        yPos += 6;
        const rangeText = `Date Range: ${startDate ? format(startDate, 'dd/MM/yyyy') : 'Start'} - ${endDate ? format(endDate, 'dd/MM/yyyy') : 'End'}`;
        doc.text(rangeText, 14, yPos);
      }
      yPos += 15;

      // Banks Summary
      if (selected.banks) {
        const banks = await banksApi.getAll();
        const totalBalance = banks.reduce((sum, b) => sum + b.balance, 0);
        
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text('Bank Accounts', 14, yPos);
        yPos += 8;

        const bankData = banks.map(b => [b.name, b.account_number, `Rs. ${b.balance.toLocaleString('en-IN')}`]);
        bankData.push(['Total', '', `Rs. ${totalBalance.toLocaleString('en-IN')}`]);
        yPos = drawTable(doc, yPos, ['Bank Name', 'Account No.', 'Balance'], bankData, { headerColor: [59, 130, 246] });
      }

      // Credit Cards Summary
      if (selected.creditCards) {
        const cards = await creditCardsApi.getAll();
        const totalOutstanding = cards.reduce((sum, c) => sum + Number(c.outstanding), 0);

        if (yPos > 240) { doc.addPage(); yPos = 20; }
        
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text('Credit Cards', 14, yPos);
        yPos += 8;

        const cardData = cards.map(c => [
          c.name, 
          `Rs. ${Number(c.credit_limit).toLocaleString('en-IN')}`,
          `Rs. ${Number(c.outstanding).toLocaleString('en-IN')}`
        ]);
        cardData.push(['Total Outstanding', '', `Rs. ${totalOutstanding.toLocaleString('en-IN')}`]);
        yPos = drawTable(doc, yPos, ['Card Name', 'Limit', 'Outstanding'], cardData, { headerColor: [239, 68, 68] });
      }

      // Loans Summary
      if (selected.loans) {
        const loans = await loansApi.getAll();
        const filtered = filterByDateRange(loans, 'created_at');
        const totalOutstanding = filtered.filter(l => !l.is_paid).reduce((sum, l) => sum + Number(l.outstanding_amount), 0);

        if (yPos > 240) { doc.addPage(); yPos = 20; }
        
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text('Loans', 14, yPos);
        yPos += 8;

        const loanData = filtered.map(l => [
          l.borrower_name,
          `Rs. ${Number(l.principal_amount).toLocaleString('en-IN')}`,
          `Rs. ${Number(l.outstanding_amount).toLocaleString('en-IN')}`,
          l.is_paid ? 'Paid' : 'Pending'
        ]);
        loanData.push(['Total Pending', '', `Rs. ${totalOutstanding.toLocaleString('en-IN')}`, '']);
        yPos = drawTable(doc, yPos, ['Borrower', 'Principal', 'Outstanding', 'Status'], loanData, { headerColor: [245, 158, 11] });
      }

      // Transactions
      if (selected.transactions) {
        const transactions = await transactionsApi.getAll();
        const filtered = filterByDateRange(transactions, 'date');
        const totalExpenses = filtered.reduce((sum, t) => sum + Number(t.amount), 0);

        if (yPos > 200) { doc.addPage(); yPos = 20; }
        
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text('Transactions', 14, yPos);
        yPos += 8;

        const txData = filtered.slice(0, 15).map(t => [
          new Date(t.date).toLocaleDateString('en-IN'),
          t.description.substring(0, 15),
          t.expense_owner,
          `Rs. ${Number(t.amount).toLocaleString('en-IN')}`
        ]);
        txData.push(['Total', '', '', `Rs. ${totalExpenses.toLocaleString('en-IN')}`]);
        yPos = drawTable(doc, yPos, ['Date', 'Description', 'Owner', 'Amount'], txData, { headerColor: [34, 197, 94] });
      }

      // IPOs
      if (selected.ipos) {
        const ipos = await ipoApi.getAll();
        const filtered = filterByDateRange(ipos, 'application_date');
        
        if (filtered.length > 0) {
          if (yPos > 200) { doc.addPage(); yPos = 20; }
          
          doc.setFontSize(14);
          doc.setTextColor(40, 40, 40);
          doc.text('IPO Applications', 14, yPos);
          yPos += 8;

          const ipoData = filtered.map(i => [
            i.company_name,
            new Date(i.application_date).toLocaleDateString('en-IN'),
            `Rs. ${Number(i.amount).toLocaleString('en-IN')}`,
            i.status
          ]);
          drawTable(doc, yPos, ['Company', 'Date', 'Amount', 'Status'], ipoData, { headerColor: [139, 92, 246] });
        }
      }

      // Save PDF
      const dateStr = new Date().toISOString().split('T')[0];
      doc.save(`family_budget_report_${dateStr}.pdf`);

      toast({ title: 'PDF Generated', description: 'Your financial report has been downloaded' });
    } catch (error: any) {
      toast({ title: 'Export Failed', description: error.message, variant: 'destructive' });
    } finally {
      setExportingPdf(false);
    }
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Export Data</h1>
        <p className="text-muted-foreground">Download your financial data</p>
      </div>

      {/* Date Range Filter */}
      <div className="card-finance p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold">Date Range Filter</h3>
          {(startDate || endDate) && (
            <Button variant="ghost" size="sm" onClick={clearDateFilter} className="text-muted-foreground">
              Clear Filter
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Filter transactions, loans, IPOs, and notifications by date range. Banks and credit cards show current balances.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label className="mb-2 block">Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd MMM yyyy") : "Select start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex-1">
            <Label className="mb-2 block">End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "dd MMM yyyy") : "Select end date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        {(startDate || endDate) && (
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-primary">
              Filtering: {startDate ? format(startDate, "dd MMM yyyy") : "Beginning"} → {endDate ? format(endDate, "dd MMM yyyy") : "Now"}
            </p>
          </div>
        )}
      </div>

      {/* Selection */}
      <div className="card-finance p-6">
        <h3 className="text-lg font-semibold mb-4">Select Data to Export</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-finance p-6">
          <div className="flex items-start gap-4">
            <div className="p-4 rounded-xl bg-destructive/10"><FileText className="w-8 h-8 text-destructive" /></div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">PDF Report</h3>
              <p className="text-sm text-muted-foreground mb-4">Download a formatted PDF report with summaries and tables.</p>
              <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success" />Formatted tables</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success" />Summary totals</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success" />Print-ready</li>
              </ul>
              <Button onClick={handleExportPDF} disabled={exportingPdf || selectedCount === 0} className="w-full gap-2">
                {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {exportingPdf ? 'Generating...' : 'Download PDF'}
              </Button>
            </div>
          </div>
        </div>

        <div className="card-finance p-6">
          <div className="flex items-start gap-4">
            <div className="p-4 rounded-xl bg-success/10"><FileSpreadsheet className="w-8 h-8 text-success" /></div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">CSV Spreadsheets</h3>
              <p className="text-sm text-muted-foreground mb-4">Export your data to CSV for custom analysis in Excel.</p>
              <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success" />Separate files per category</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success" />Easy to filter and analyze</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success" />Excel/Sheets compatible</li>
              </ul>
              <Button onClick={handleExportCSV} variant="outline" disabled={exporting || selectedCount === 0} className="w-full gap-2">
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {exporting ? 'Exporting...' : `Export ${selectedCount} CSV Files`}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-success mt-0.5" />
          <div>
            <h4 className="font-medium mb-1">Export Information</h4>
            <p className="text-sm text-muted-foreground">PDF exports include summaries and formatted tables. CSV exports create separate files for each category, ideal for spreadsheet analysis. Date filter applies to transactions, loans, IPOs, and notifications.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportPage;