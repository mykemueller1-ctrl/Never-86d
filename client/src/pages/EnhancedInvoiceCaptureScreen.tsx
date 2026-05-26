import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, AtSign, Camera, ChevronLeft, FileText, Loader2, Lock, Mail, UploadCloud } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { SafeStaff } from "../../../shared/types";

type Props = {
  staffUser: SafeStaff;
  onBack: () => void;
};

type InvoiceCategory = "meat" | "bread" | "produce" | "liquor" | "beer" | "supplies" | "misc";
type InvoiceMethod = "camera" | "email" | "both";

type VendorOption = {
  name: string;
  defaultCategory: InvoiceCategory;
  method: InvoiceMethod;
  mailbox: string | null;
  reminder: string;
};

const MANAGER_ROLES = ["owner", "key_manager", "kitchen_manager", "bar_manager"];

function isManagerOrOwner(staffUser: SafeStaff | null): boolean {
  return !!staffUser && MANAGER_ROLES.includes(staffUser.jobRole);
}

const VENDORS: VendorOption[] = [
  { name: "PFG / Performance Foodservice", defaultCategory: "supplies", method: "email", mailbox: "communitypizza2026@gmail.com; mykemueller1@gmail.com", reminder: "Expected by email in both Gmail accounts." },
  { name: "Sysco Iowa", defaultCategory: "supplies", method: "camera", mailbox: null, reminder: "No email invoice currently. Photo capture is required." },
  { name: "Humes Distributing", defaultCategory: "beer", method: "email", mailbox: "myke@n86.app", reminder: "Expected by email to myke@n86.app." },
  { name: "Fort Dodge Distributing", defaultCategory: "beer", method: "camera", mailbox: null, reminder: "Camera only — this vendor does not email invoices." },
  { name: "Ike Auen Distributing", defaultCategory: "beer", method: "camera", mailbox: null, reminder: "Cash beer vendor. Capture paper invoice by camera." },
  { name: "Hy-Vee Wine & Spirits", defaultCategory: "liquor", method: "both", mailbox: "1192winespiritsmgr@hy-vee.com", reminder: "Email back is expected, but camera backup is required." },
  { name: "Hy-Vee Grocery", defaultCategory: "misc", method: "camera", mailbox: null, reminder: "Store-run receipt photo required." },
  { name: "Fareway", defaultCategory: "misc", method: "camera", mailbox: null, reminder: "Store-run receipt photo required." },
];

function formatMoney(value: string | number | null | undefined): string {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return parsed.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(value: Date | string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(new Error("Could not read invoice image"));
    reader.readAsDataURL(file);
  });
}

function AccessDenied({ onBack }: { onBack: () => void }) {
  return (
    <div className="h-screen bg-black flex flex-col items-center justify-center px-8">
      <Lock size={32} className="text-zinc-700 mb-4" />
      <p className="text-zinc-300 text-sm font-bold">Manager Access Required</p>
      <p className="text-zinc-600 text-xs text-center mt-2">Invoice capture is manager-only.</p>
      <button onClick={onBack} className="mt-6 px-5 py-2.5 rounded-xl bg-zinc-900 text-zinc-300 text-xs font-semibold border border-zinc-800">Back</button>
    </div>
  );
}

export default function EnhancedInvoiceCaptureScreen({ staffUser, onBack }: Props) {
  const [vendorName, setVendorName] = useState(VENDORS[0].name);
  const selectedVendor = VENDORS.find(vendor => vendor.name === vendorName) ?? VENDORS[0];
  const [category, setCategory] = useState<InvoiceCategory>(selectedVendor.defaultCategory);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [totalAmount, setTotalAmount] = useState("");
  const [method, setMethod] = useState<InvoiceMethod>(selectedVendor.method);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");

  const invoicesQuery = trpc.invoices.list.useQuery(undefined, { enabled: isManagerOrOwner(staffUser), staleTime: 20_000 });
  const createInvoice = trpc.invoices.create.useMutation();
  const uploadReceipt = trpc.upload.receiptPhoto.useMutation();
  const utils = trpc.useUtils();

  const recentInvoices = useMemo(() => (invoicesQuery.data ?? []).slice(0, 20), [invoicesQuery.data]);
  const recentTotal = useMemo(() => recentInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0), [recentInvoices]);

  if (!isManagerOrOwner(staffUser)) return <AccessDenied onBack={onBack} />;

  const onVendorChange = (nextVendorName: string) => {
    const nextVendor = VENDORS.find(vendor => vendor.name === nextVendorName) ?? VENDORS[0];
    setVendorName(nextVendor.name);
    setCategory(nextVendor.defaultCategory);
    setMethod(nextVendor.method);
  };

  const handleSubmit = async () => {
    const amount = Number(totalAmount);
    if (!vendorName || !date || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Vendor, date, and invoice total are required");
      return;
    }
    if ((method === "camera" || method === "both") && !photoFile) {
      toast.error("Camera invoice workflow requires a photo upload");
      return;
    }

    try {
      let receiptPhotoUrl: string | undefined;
      if (photoFile) {
        const base64 = await fileToBase64(photoFile);
        const uploaded = await uploadReceipt.mutateAsync({
          base64,
          filename: photoFile.name,
          mimeType: photoFile.type || "image/jpeg",
          context: "invoice",
        });
        receiptPhotoUrl = uploaded.url;
      }

      await createInvoice.mutateAsync({
        vendorName,
        invoiceNumber: invoiceNumber.trim() || undefined,
        date: new Date(`${date}T12:00:00`),
        totalAmount: amount.toFixed(2),
        category,
        receiptPhotoUrl,
        orderedById: staffUser.id,
        sourceProvider: method === "camera" ? "manual" : method === "email" ? "gmail" : "unknown",
        sourceMailbox: selectedVendor.mailbox ?? undefined,
        needsReview: true,
        rawText: notes.trim() || `Captured through enhanced invoice workflow using ${method} method.`,
        items: notes.trim() ? [{ product: "Manager notes", unitPrice: "0", unit: "note", quantity: 0, note: notes.trim() }] : undefined,
      });

      setInvoiceNumber("");
      setTotalAmount("");
      setPhotoFile(null);
      setNotes("");
      await utils.invoices.list.invalidate();
      toast.success("Invoice logged for review");
    } catch {
      toast.error("Invoice could not be logged");
    }
  };

  return (
    <div className="h-screen bg-black flex flex-col overflow-y-auto pb-24">
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur border-b border-zinc-900 p-3 flex items-center gap-2">
        <button onClick={onBack} className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800">
          <ChevronLeft size={15} className="text-zinc-400" />
        </button>
        <div className="flex-1">
          <h2 className="text-white font-black text-sm tracking-[0.08em]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>INVOICE CAPTURE</h2>
          <p className="text-zinc-500 text-[10px]">Email + camera intake · vendor COGS pipeline</p>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-3">
            <p className="text-zinc-500 text-[9px] uppercase tracking-wide">Recent invoices</p>
            <p className="text-white text-lg font-bold">{recentInvoices.length}</p>
          </div>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-3">
            <p className="text-zinc-500 text-[9px] uppercase tracking-wide">Visible spend</p>
            <p className="text-amber-400 text-sm font-bold mt-1">{formatMoney(recentTotal)}</p>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-3 space-y-3">
          <p className="text-white text-xs font-bold flex items-center gap-2"><FileText size={14} className="text-amber-400" /> Log Invoice</p>
          <select value={vendorName} onChange={event => onVendorChange(event.target.value)} className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white text-xs focus:outline-none focus:border-amber-500/50">
            {VENDORS.map(vendor => <option key={vendor.name} value={vendor.name}>{vendor.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input value={invoiceNumber} onChange={event => setInvoiceNumber(event.target.value)} placeholder="Invoice #" className="bg-black border border-zinc-800 rounded-lg p-3 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50" />
            <input value={date} onChange={event => setDate(event.target.value)} type="date" className="bg-black border border-zinc-800 rounded-lg p-3 text-white text-xs focus:outline-none focus:border-amber-500/50" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={totalAmount} onChange={event => setTotalAmount(event.target.value)} placeholder="Invoice total" inputMode="decimal" className="bg-black border border-zinc-800 rounded-lg p-3 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50" />
            <select value={category} onChange={event => setCategory(event.target.value as InvoiceCategory)} className="bg-black border border-zinc-800 rounded-lg p-3 text-white text-xs focus:outline-none focus:border-amber-500/50">
              <option value="meat">Meat</option>
              <option value="bread">Bread</option>
              <option value="produce">Produce</option>
              <option value="liquor">Liquor</option>
              <option value="beer">Beer</option>
              <option value="supplies">Supplies</option>
              <option value="misc">Misc</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {(["camera", "email", "both"] as InvoiceMethod[]).map(methodOption => (
              <button key={methodOption} onClick={() => setMethod(methodOption)} className={`rounded-lg px-2 py-2 text-[9px] font-bold border capitalize flex items-center justify-center gap-1 ${method === methodOption ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-black text-zinc-500 border-zinc-800"}`}>
                {methodOption === "camera" ? <Camera size={10} /> : methodOption === "email" ? <AtSign size={10} /> : <Mail size={10} />}
                {methodOption}
              </button>
            ))}
          </div>

          <label className="block rounded-xl border border-dashed border-zinc-700 bg-black p-4 text-center">
            <UploadCloud size={18} className="text-amber-400 mx-auto mb-2" />
            <span className="text-zinc-300 text-xs font-semibold">{photoFile ? photoFile.name : "Upload invoice photo"}</span>
            <span className="text-zinc-600 text-[10px] block mt-1">Required for camera and backup workflows</span>
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={event => setPhotoFile(event.target.files?.[0] ?? null)} />
          </label>

          <textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Optional line items or manager notes..." className="w-full min-h-[76px] bg-black border border-zinc-800 rounded-lg p-3 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50" />

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex gap-2">
            <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-amber-100/80 text-[10px] leading-relaxed">{selectedVendor.reminder}</p>
          </div>

          <button onClick={handleSubmit} disabled={createInvoice.isPending || uploadReceipt.isPending} className="w-full rounded-xl bg-amber-500 text-black py-3 text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50">
            {(createInvoice.isPending || uploadReceipt.isPending) && <Loader2 size={14} className="animate-spin" />}
            Log Invoice
          </button>
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="p-3 border-b border-zinc-800"><p className="text-white text-xs font-bold">Recent Invoice Log</p></div>
          <div className="divide-y divide-zinc-800/60">
            {recentInvoices.map(invoice => (
              <div key={invoice.id} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{invoice.vendorName}</p>
                  <p className="text-zinc-500 text-[9px]">{formatDate(invoice.date)} · {invoice.category} · #{invoice.invoiceNumber || "pending"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-amber-400 text-xs font-bold">{formatMoney(invoice.totalAmount)}</p>
                  {invoice.receiptPhotoUrl && <p className="text-green-400 text-[8px]">photo</p>}
                </div>
              </div>
            ))}
            {recentInvoices.length === 0 && <p className="text-zinc-600 text-xs text-center py-8">No invoices logged yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
