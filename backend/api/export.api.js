import { supabase } from "../services/supabaseService.js";
import PDFDocument from "pdfkit";
import fs from "fs";

/* ---------------- CSV HELPERS ---------------- */
/**
 * Converts an array of objects into a CSV string.
 * Includes header row, handles null values, and escapes double quotes.
 */
function toCSV(rows) {
  if (!rows || rows.length === 0) {
    return "No data\n";
  }

  const headers = Object.keys(rows[0]);
  const lines = rows.map(r =>
    headers.map(h => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")
  );

  return [headers.join(","), ...lines].join("\n");
}

/* ---------------- EXPENSES (Transactions) ---------------- */
export async function exportExpensesCSV() {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    console.error("CSV export error:", error);
    return "Error fetching data\n";
  }

  return toCSV(data);
}

export async function exportExpensesPDF(filePath) {
  const { data } = await supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false });

  const doc = new PDFDocument({ margin: 30 });
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(16).text("Expenses Report", { align: "center" });
  doc.moveDown();

  if (!data || data.length === 0) {
    doc.fontSize(10).text("No transactions found.");
  } else {
    data.forEach(e => {
      doc.fontSize(10).text(
        `${e.date} | ₹${e.amount} | ${e.description} | ${e.expense_owner}`
      );
    });
  }

  doc.end();
}

/* ---------------- BANK LEDGER ---------------- */
export async function exportLedgerCSV(bankId) {
  const { data } = await supabase
    .from("bank_ledger")
    .select("*")
    .eq("bank_id", bankId)
    .order("date", { ascending: true });
    
  return toCSV(data);
}

export async function exportLedgerPDF(bankId, filePath) {
  const { data } = await supabase
    .from("bank_ledger")
    .select("*")
    .eq("bank_id", bankId)
    .order("date", { ascending: true });

  const doc = new PDFDocument({ margin: 30 });
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(16).text("Bank Ledger", { align: "center" });
  doc.moveDown();

  if (!data || data.length === 0) {
    doc.fontSize(10).text("No ledger entries found.");
  } else {
    data.forEach(l => {
      doc.fontSize(10).text(
        `${l.date} | -₹${l.debit || 0} | +₹${l.credit || 0} | Bal ₹${l.balance_after}`
      );
    });
  }

  doc.end();
}

/* ---------------- CREDIT CARDS ---------------- */
export async function exportCardsCSV() {
  const { data } = await supabase.from("credit_cards").select("*");
  return toCSV(data);
}

export async function exportCardsPDF(filePath) {
  const { data } = await supabase.from("credit_cards").select("*");

  const doc = new PDFDocument({ margin: 30 });
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(16).text("Credit Cards Report", { align: "center" });
  doc.moveDown();

  if (!data || data.length === 0) {
    doc.fontSize(10).text("No cards found.");
  } else {
    data.forEach(c => {
      doc.fontSize(10).text(
        `${c.name} | Limit ₹${c.credit_limit} | Outstanding ₹${c.outstanding}`
      );
    });
  }

  doc.end();
}

/* ---------------- LOANS ---------------- */
export async function exportLoansCSV() {
  const { data } = await supabase.from("loans").select("*");
  return toCSV(data);
}

export async function exportLoansPDF(filePath) {
  const { data } = await supabase.from("loans").select("*");

  const doc = new PDFDocument({ margin: 30 });
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(16).text("Loans Report", { align: "center" });
  doc.moveDown();

  if (!data || data.length === 0) {
    doc.fontSize(10).text("No loans found.");
  } else {
    data.forEach(l => {
      doc.fontSize(10).text(
        `${l.borrower_name} | ₹${l.outstanding_amount} | Paid: ${l.is_paid}`
      );
    });
  }

  doc.end();
}

/* ---------------- IPO ---------------- */
export async function exportIPOCSV() {
  const { data } = await supabase.from("ipo_applications").select("*");
  return toCSV(data);
}

export async function exportIPOPDF(filePath) {
  const { data } = await supabase.from("ipo_applications").select("*");

  const doc = new PDFDocument({ margin: 30 });
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(16).text("IPO Applications Report", { align: "center" });
  doc.moveDown();

  if (!data || data.length === 0) {
    doc.fontSize(10).text("No IPO applications found.");
  } else {
    data.forEach(i => {
      doc.fontSize(10).text(
        `${i.company_name} | ${i.status} | Shares ${i.shares_applied}`
      );
    });
  }

  doc.end();
}