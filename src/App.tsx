import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthContext";
import ProtectedRoute from "@/auth/ProtectedRoute";
import Login from "@/auth/Login";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/dashboard/Dashboard";
import TransactionList from "@/transactions/TransactionList";
import LoanList from "@/loans/LoanList";
import BankList from "@/banks/BankList";
import CreditCardList from "@/creditCards/CreditCardList";
import IPOList from "@/ipo/IPOList";
import NotificationList from "@/notifications/NotificationList";
import ExportPage from "@/exports/ExportPage";
import PersonList from "@/persons/PersonList";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="transactions" element={<TransactionList />} />
              <Route path="loans" element={<LoanList />} />
              <Route path="banks" element={<BankList />} />
              <Route path="credit-cards" element={<CreditCardList />} />
              <Route path="ipo" element={<IPOList />} />
              <Route path="notifications" element={<NotificationList />} />
              <Route path="exports" element={<ExportPage />} />
              <Route path="family" element={<PersonList />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
