import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2, CheckCircle } from 'lucide-react';
import { exportsApi, type ExportType } from '@/api/endpoints';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

const ExportPage: React.FC = () => {
  const [exporting, setExporting] = useState<ExportType | null>(null);
  const { toast } = useToast();

  const handleExport = async (type: ExportType) => {
    setExporting(type);

    try {
      const response = await exportsApi.export(type);
      
      // Create blob and download
      const blob = new Blob([response.data], {
        type: type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `budget-report.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export Complete',
        description: `Your ${type.toUpperCase()} file has been downloaded.`,
      });
    } catch (error: any) {
      toast({
        title: 'Export Failed',
        description: error.response?.data?.detail || `Failed to export ${type.toUpperCase()}`,
        variant: 'destructive',
      });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Export Data</h1>
        <p className="text-muted-foreground">
          Download your financial data in PDF or Excel format
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PDF Export */}
        <div className="card-finance p-6">
          <div className="flex items-start gap-4">
            <div className="p-4 rounded-xl bg-destructive/10">
              <FileText className="w-8 h-8 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">PDF Report</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Download a formatted PDF report with all your financial data including
                transactions, loans, bank statements, and more.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Transaction history
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Loan summary
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Bank account statements
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Credit card overview
                </li>
              </ul>
              <Button
                onClick={() => handleExport('pdf')}
                disabled={exporting !== null}
                className="w-full gap-2"
              >
                {exporting === 'pdf' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Excel Export */}
        <div className="card-finance p-6">
          <div className="flex items-start gap-4">
            <div className="p-4 rounded-xl bg-success/10">
              <FileSpreadsheet className="w-8 h-8 text-success" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">Excel Spreadsheet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Export your data to Excel for custom analysis, charts, and further
                processing in spreadsheet applications.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  All data in tabular format
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Multiple sheets by category
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Compatible with Excel & Sheets
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Easy to filter & analyze
                </li>
              </ul>
              <Button
                onClick={() => handleExport('excel')}
                disabled={exporting !== null}
                variant="outline"
                className="w-full gap-2"
              >
                {exporting === 'excel' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download Excel
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <h4 className="font-medium text-foreground mb-1">About Exports</h4>
        <p className="text-sm text-muted-foreground">
          Exports include all your financial data up to the current date. Reports are
          generated in IST (Indian Standard Time) timezone. Large datasets may take a
          few moments to generate.
        </p>
      </div>
    </div>
  );
};

export default ExportPage;
