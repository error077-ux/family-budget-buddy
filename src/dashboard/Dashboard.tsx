import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CreditCard,
  HandCoins,
  ArrowLeftRight,
  ChevronRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { dashboardApi, type Transaction } from '@/api/supabase-api';
import { formatMoney } from '@/utils/formatMoney';
import { formatDate } from '@/utils/formatDate';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  color: 'primary' | 'success' | 'warning' | 'destructive';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="card-finance p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<{
    total_balance: number;
    total_outstanding_loans: number;
    total_credit_outstanding: number;
    pending_ipos: number;
    recent_transactions: Transaction[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await dashboardApi.getStats();
        setStats(response);
      } catch (err: any) {
        console.error('Dashboard error:', err);
        setError('Unable to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Your financial overview at a glance
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-warning/10 text-warning">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Bank Balance"
          value={formatMoney(stats?.total_balance || 0)}
          icon={Wallet}
          color="primary"
        />
        <StatCard
          title="Outstanding Loans"
          value={formatMoney(stats?.total_outstanding_loans || 0)}
          icon={HandCoins}
          color="warning"
        />
        <StatCard
          title="Credit Card Outstanding"
          value={formatMoney(stats?.total_credit_outstanding || 0)}
          icon={CreditCard}
          color="destructive"
        />
        <StatCard
          title="Pending IPOs"
          value={String(stats?.pending_ipos || 0)}
          icon={TrendingUp}
          color="success"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/transactions"
          className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200"
        >
          <div className="p-3 rounded-lg bg-primary/10 text-primary">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">Add Transaction</p>
            <p className="text-sm text-muted-foreground">Record expense</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </Link>

        <Link
          to="/loans"
          className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200"
        >
          <div className="p-3 rounded-lg bg-warning/10 text-warning">
            <HandCoins className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">Manage Loans</p>
            <p className="text-sm text-muted-foreground">Track repayments</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </Link>

        <Link
          to="/credit-cards"
          className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200"
        >
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive">
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">Credit Cards</p>
            <p className="text-sm text-muted-foreground">View spending</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </Link>

        <Link
          to="/ipo"
          className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200"
        >
          <div className="p-3 rounded-lg bg-success/10 text-success">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">IPO Tracker</p>
            <p className="text-sm text-muted-foreground">Applications</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </Link>
      </div>

      {/* Recent Transactions */}
      <div className="card-finance">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Recent Transactions</h2>
          <Link
            to="/transactions"
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-border">
          {stats?.recent_transactions && stats.recent_transactions.length > 0 ? (
            stats.recent_transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="flex items-center gap-4 px-6 py-4">
                <div className={`p-2 rounded-lg ${tx.expense_owner === 'Me' ? 'bg-destructive/10' : 'bg-warning/10'}`}>
                  {tx.expense_owner === 'Me' ? (
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  ) : (
                    <HandCoins className="w-4 h-4 text-warning" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{tx.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {tx.expense_owner !== 'Me' && `Loan to ${tx.expense_owner} • `}
                    {formatDate(tx.date)}
                  </p>
                </div>
                <p className="font-medium text-destructive mono">
                  -{formatMoney(tx.amount)}
                </p>
              </div>
            ))
          ) : (
            <div className="px-6 py-12 text-center text-muted-foreground">
              <ArrowLeftRight className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No transactions yet</p>
              <Link
                to="/transactions"
                className="text-primary hover:underline mt-2 inline-block"
              >
                Add your first transaction
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
