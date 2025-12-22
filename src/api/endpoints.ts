import axiosInstance from './axios';

// ============ AUTH ============
export const authApi = {
  login: (pin: string) => 
    axiosInstance.post('/auth/login', { pin }),
  
  verifyToken: () => 
    axiosInstance.get('/auth/verify'),
};

// ============ TRANSACTIONS ============
export interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  expense_owner: string;
  bank_id: number;
  bank_name?: string;
  created_loan_id?: number;
  created_at: string;
}

export interface CreateTransactionPayload {
  date: string;
  description: string;
  amount: number;
  expense_owner: string;
  bank_id: number;
}

export const transactionsApi = {
  getAll: () => 
    axiosInstance.get<Transaction[]>('/transactions'),
  
  getById: (id: number) => 
    axiosInstance.get<Transaction>(`/transactions/${id}`),
  
  create: (data: CreateTransactionPayload) => 
    axiosInstance.post<Transaction>('/transactions', data),
  
  update: (id: number, data: Partial<CreateTransactionPayload>) => 
    axiosInstance.put<Transaction>(`/transactions/${id}`, data),
  
  delete: (id: number) => 
    axiosInstance.delete(`/transactions/${id}`),
};

// ============ LOANS ============
export interface Loan {
  id: number;
  borrower_name: string;
  principal_amount: number;
  outstanding_amount: number;
  is_paid: boolean;
  source_type: 'expense' | 'credit_card';
  source_id: number;
  created_at: string;
}

export interface LoanRepaymentPayload {
  amount: number;
  bank_id: number;
  date: string;
}

export const loansApi = {
  getAll: () => 
    axiosInstance.get<Loan[]>('/loans'),
  
  getById: (id: number) => 
    axiosInstance.get<Loan>(`/loans/${id}`),
  
  repay: (id: number, data: LoanRepaymentPayload) => 
    axiosInstance.post<Loan>(`/loans/${id}/repay`, data),
};

// ============ BANKS ============
export interface Bank {
  id: number;
  name: string;
  account_number: string;
  balance: number;
  created_at: string;
}

export interface BankLedgerEntry {
  id: number;
  bank_id: number;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance_after: number;
  reference_type: string;
  reference_id: number;
  created_at: string;
}

export interface CreateBankPayload {
  name: string;
  account_number: string;
  opening_balance?: number;
}

export const banksApi = {
  getAll: () => 
    axiosInstance.get<Bank[]>('/banks'),
  
  getById: (id: number) => 
    axiosInstance.get<Bank>(`/banks/${id}`),
  
  create: (data: CreateBankPayload) => 
    axiosInstance.post<Bank>('/banks', data),
  
  update: (id: number, data: Partial<CreateBankPayload>) => 
    axiosInstance.put<Bank>(`/banks/${id}`, data),
  
  delete: (id: number) => 
    axiosInstance.delete(`/banks/${id}`),
  
  getLedger: (id: number) => 
    axiosInstance.get<BankLedgerEntry[]>(`/banks/${id}/ledger`),
};

// ============ CREDIT CARDS ============
export interface CreditCard {
  id: number;
  name: string;
  credit_limit: number;
  outstanding: number;
  available_credit: number;
  due_date: number;
  created_at: string;
}

export interface CreditCardSpendPayload {
  date: string;
  description: string;
  amount: number;
  spent_for: string;
}

export interface CreditCardPaymentPayload {
  amount: number;
  bank_id: number;
  date: string;
}

export interface CreateCreditCardPayload {
  name: string;
  credit_limit: number;
  due_date: number;
}

export const creditCardsApi = {
  getAll: () => 
    axiosInstance.get<CreditCard[]>('/credit-cards'),
  
  getById: (id: number) => 
    axiosInstance.get<CreditCard>(`/credit-cards/${id}`),
  
  create: (data: CreateCreditCardPayload) => 
    axiosInstance.post<CreditCard>('/credit-cards', data),
  
  update: (id: number, data: Partial<CreateCreditCardPayload>) => 
    axiosInstance.put<CreditCard>(`/credit-cards/${id}`, data),
  
  delete: (id: number) => 
    axiosInstance.delete(`/credit-cards/${id}`),
  
  spend: (id: number, data: CreditCardSpendPayload) => 
    axiosInstance.post(`/credit-cards/${id}/spend`, data),
  
  pay: (id: number, data: CreditCardPaymentPayload) => 
    axiosInstance.post(`/credit-cards/${id}/pay`, data),
};

// ============ IPO ============
export type IPOStatus = 'APPLIED' | 'ALLOTTED' | 'REFUNDED';

export interface IPO {
  id: number;
  company_name: string;
  application_date: string;
  amount: number;
  shares_applied: number;
  shares_allotted?: number;
  status: IPOStatus;
  bank_id: number;
  bank_name?: string;
  created_at: string;
}

export interface CreateIPOPayload {
  company_name: string;
  application_date: string;
  amount: number;
  shares_applied: number;
  bank_id: number;
}

export interface AllotIPOPayload {
  shares_allotted: number;
  refund_amount?: number;
}

export const ipoApi = {
  getAll: () => 
    axiosInstance.get<IPO[]>('/ipo'),
  
  getById: (id: number) => 
    axiosInstance.get<IPO>(`/ipo/${id}`),
  
  apply: (data: CreateIPOPayload) => 
    axiosInstance.post<IPO>('/ipo', data),
  
  allot: (id: number, data: AllotIPOPayload) => 
    axiosInstance.post<IPO>(`/ipo/${id}/allot`, data),
  
  refund: (id: number) => 
    axiosInstance.post<IPO>(`/ipo/${id}/refund`),
};

// ============ NOTIFICATIONS ============
export interface Notification {
  id: number;
  title: string;
  message: string;
  email: string;
  scheduled_date: string;
  is_recurring: boolean;
  recurrence_day?: number;
  is_sent: boolean;
  created_at: string;
}

export interface CreateNotificationPayload {
  title: string;
  message: string;
  email: string;
  scheduled_date: string;
  is_recurring: boolean;
  recurrence_day?: number;
}

export const notificationsApi = {
  getAll: () => 
    axiosInstance.get<Notification[]>('/notifications'),
  
  getById: (id: number) => 
    axiosInstance.get<Notification>(`/notifications/${id}`),
  
  create: (data: CreateNotificationPayload) => 
    axiosInstance.post<Notification>('/notifications', data),
  
  update: (id: number, data: Partial<CreateNotificationPayload>) => 
    axiosInstance.put<Notification>(`/notifications/${id}`, data),
  
  delete: (id: number) => 
    axiosInstance.delete(`/notifications/${id}`),
};

// ============ EXPORTS ============
export type ExportType = 'pdf' | 'excel';

export const exportsApi = {
  export: async (type: ExportType) => {
    const response = await axiosInstance.get(`/exports/${type}`, {
      responseType: 'blob',
    });
    return response;
  },
};

// ============ DASHBOARD ============
export interface DashboardStats {
  total_balance: number;
  total_outstanding_loans: number;
  total_credit_outstanding: number;
  pending_ipos: number;
  recent_transactions: Transaction[];
}

export const dashboardApi = {
  getStats: () => 
    axiosInstance.get<DashboardStats>('/dashboard'),
};
