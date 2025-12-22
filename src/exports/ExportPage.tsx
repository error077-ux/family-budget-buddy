import React from 'react';
import { Download, FileSpreadsheet, FileText, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ExportPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Export Data</h1>
        <p className="text-muted-foreground">Download your financial data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-finance p-6">
          <div className="flex items-start gap-4">
            <div className="p-4 rounded-xl bg-destructive/10"><FileText className="w-8 h-8 text-destructive" /></div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">PDF Report</h3>
              <p className="text-sm text-muted-foreground mb-4">Download a formatted PDF report with all your financial data.</p>
              <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success" />Transaction history</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success" />Loan summary</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success" />Bank statements</li>
              </ul>
              <Button className="w-full gap-2" disabled><Download className="w-4 h-4" />Coming Soon</Button>
            </div>
          </div>
        </div>

        <div className="card-finance p-6">
          <div className="flex items-start gap-4">
            <div className="p-4 rounded-xl bg-success/10"><FileSpreadsheet className="w-8 h-8 text-success" /></div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">Excel Spreadsheet</h3>
              <p className="text-sm text-muted-foreground mb-4">Export your data to Excel for custom analysis.</p>
              <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success" />All data in tabular format</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success" />Multiple sheets by category</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success" />Easy to filter & analyze</li>
              </ul>
              <Button variant="outline" className="w-full gap-2" disabled><Download className="w-4 h-4" />Coming Soon</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <h4 className="font-medium mb-1">About Exports</h4>
        <p className="text-sm text-muted-foreground">Export functionality will be available in a future update. Your data is stored securely in the database.</p>
      </div>
    </div>
  );
};

export default ExportPage;
