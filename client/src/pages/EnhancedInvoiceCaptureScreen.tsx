import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, AtSign, Camera, Check, ChevronLeft, FileText, Loader2, Lock, Mail, Pencil, Trash2, UploadCloud, X } from "lucide-react";
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

type EditInvoiceForm = {
  vendorName: string;
  category: InvoiceCategory;
  invoiceNumber: string;
  totalAmount: string;
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

const CATEGORY_OPTIONS: Array<{ value: InvoiceCategory; label: string }> = [
  { value: "meat", label: "Meat" },
  { value: "bread", label: "Bread" },
  { value: "produce", label: "Produce" },
  { value: "liquor", label: "Liquor" },
  { value: "beer", label: "Beer" },
  { value: "supplies", label: "Supplies" },
  { value: "misc", label: "Misc" },
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
    <div className="h-screen bg-slate-50 flex flex-col items-center justify-center px-8">
      <Lock size={32} className="text-zinc-700 mb-4" />
      <p className="text-slate-600 text-sm font-bold">Manager Access Required</p>
      <p className="text-zinc-600 text-xs text-center mt-2">Invoice capture is manager-only.</p>
      <button onClick={onBack} className="mt-6 px-5 py-2.5 rounded-xl bg-white text-slate-600 text-xs font-semibold border border-slate-200">Back</button>
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
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditInvoiceForm>({
    vendorName: VENDORS[0].name,
    category: VENDORS[0].defaultCategory,
    invoiceNumber: "",
    totalAmount: "",
  });

  const invoicesQuery = trpc.invoices.list.useQuery(undefined, { enabled: isManagerOrOwner(staffUser), staleTime: 20_000 });
  const createInvoice = trpc.invoices.create.useMutation();
  const updateInvoice = trpc.invoices.update.useMutation();
  const deleteInvoice = trpc.invoices.delete.useMutation();
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

  const onEditVendorChange = (nextVendorName: string) => {
    const nextVendor = VENDORS.find(vendor => vendor.name === nextVendorName) ?? VENDORS[0];
    setEditForm(prev => ({ ...prev, vendorName: nextVendor.name, category: nextVendor.defaultCategory }));
  };

  const startEditingInvoice = (invoice: (typeof recentInvoices)[number]) => {
    setEditingInvoiceId(invoice.id);
    setEditForm({
      vendorName: invoice.vendorName,
      category: invoice.category as InvoiceCategory,
      invoiceNumber: invoice.invoiceNumber ?? "",
      totalAmount: String(invoice.totalAmount ?? ""),
    });
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

  const handleSaveEdit = async () => {
    if (!editingInvoiceId) return;
    const amount = Number(editForm.totalAmount);
    if (!editForm.vendorName || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Vendor and invoice total are required");
      return;
    }

    try {
      await updateInvoice.mutateAsync({
        id: editingInvoiceId,
        vendorName: editForm.vendorName,
        category: editForm.category,
        invoiceNumber: editForm.invoiceNumber.trim() || null,
        totalAmount: amount.toFixed(2),
        needsReview: true,
      });
      setEditingInvoiceId(null);
      await utils.invoices.list.invalidate();
      toast.success("Invoice updated");
    } catch {
      toast.error("Invoice could not be updated");
    }
  };

  const handleDeleteEdit = async () => {
    if (!editingInvoiceId) return;
    const confirmed = window.confirm("Delete this invoice? This removes duplicate or wrong invoice records entirely.");
    if (!confirmed) return;

    try {
      await deleteInvoice.mutateAsync({ id: editingInvoiceId });
      setEditingInvoiceId(null);
      await utils.invoices.list.invalidate();
      toast.success("Invoice deleted");
    } catch {
      toast.error("Invoice could not be deleted");
    }
  };

  const editIsPending = updateInvoice.isPending || deleteInvoice.isPending;

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-y-auto pb-24">
      <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur border-b border-zinc-900 p-3 flex items-center gap-2">
        <button onClick={onBack} className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-200">
          <ChevronLeft size={15} className="text-slate-500" />
        </button>
        <div className="flex-1">
          <h2 className="text-slate-900 font-black text-sm tracking-[0.08em]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>INVOICE CAPTURE</h2>
          <p className="text-slate-500 text-[10px]">Email + camera intake · vendor COGS pipeline</p>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-xl border border-slate-200 p-3">
            <p className="text-slate-500 text-[9px] uppercase tracking-wide">Recent invoices</p>
            <p className="text-slate-900 text-lg font-bold">{recentInvoices.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3">
            <p className="text-slate-500 text-[9px] uppercase tracking-wide">Visible spend</p>
            <p className="text-amber-400 text-sm font-bold mt-1">{formatMoney(recentTotal)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-3">
          <p className="text-slate-900 text-xs font-bold flex items-center gap-2"><FileText size={14} className="text-amber-400" /> Log Invoice</p>
          <select value={vendorName} onChange={event => onVendorChange(event.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 text-xs focus:outline-none focus:border-amber-500/50">
            {VENDORS.map(vendor => <option key={vendor.name} value={vendor.name}>{vendor.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input value={invoiceNumber} onChange={event => setInvoiceNumber(event.target.value)} placeholder="Invoice #" className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-amber-500/50" />
            <input value={date} onChange={event => setDate(event.target.value)} type="date" className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 text-xs focus:outline-none focus:border-amber-500/50" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={totalAmount} onChange={event => setTotalAmount(event.target.value)} placeholder="Invoice total" inputMode="decimal" className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-amber-500/50" />
            <select value={category} onChange={event => setCategory(event.target.value as InvoiceCategory)} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 text-xs focus:outline-none focus:border-amber-500/50">
              {CATEGORY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {(["camera", "email", "both"] as InvoiceMethod[]).map(methodOption => (
              <button key={methodOption} onClick={() => setMethod(methodOption)} className={`rounded-lg px-2 py-2 text-[9px] font-bold border capitalize flex items-center justify-center gap-1 ${method === methodOption ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                {methodOption === "camera" ? <Camera size={10} /> : methodOption === "email" ? <AtSign size={10} /> : <Mail size={10} />}
                {methodOption}
              </button>
            ))}
          </div>

          <label className="block rounded-xl border border-dashed border-zinc-700 bg-slate-50 p-4 text-center">
            <UploadCloud size={18} className="text-amber-400 mx-auto mb-2" />
            <span className="text-slate-600 text-xs font-semibold">{photoFile ? photoFile.name : "Upload invoice photo"}</span>
            <span className="text-zinc-600 text-[10px] block mt-1">Required for camera and backup workflows</span>
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={event => setPhotoFile(event.target.files?.[0] ?? null)} />
          </label>

          <textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Optional line items or manager notes..." className="w-full min-h-[76px] bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-amber-500/50" />

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex gap-2">
            <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-amber-100/80 text-[10px] leading-relaxed">{selectedVendor.reminder}</p>
          </div>

          <button onClick={handleSubmit} disabled={createInvoice.isPending || uploadReceipt.isPending} className="w-full rounded-xl bg-amber-500 text-black py-3 text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50">
            {(createInvoice.isPending || uploadReceipt.isPending) && <Loader2 size={14} className="animate-spin" />}
            Log Invoice
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-3 border-b border-slate-200"><p className="text-slate-900 text-xs font-bold">Recent Invoice Log</p></div>
          <div className="divide-y divide-zinc-800/60">
            {recentInvoices.map(invoice => {
              const isEditing = editingInvoiceId === invoice.id;
              return (
                <div key={invoice.id} className="p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-slate-900 text-xs font-semibold truncate">{invoice.vendorName}</p>
                      <p className="text-slate-500 text-[9px]">{formatDate(invoice.date)} · {invoice.category} · #{invoice.invoiceNumber || "pending"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-amber-400 text-xs font-bold">{formatMoney(invoice.totalAmount)}</p>
                        {invoice.receiptPhotoUrl && <p className="text-green-400 text-[8px]">photo</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => isEditing ? setEditingInvoiceId(null) : startEditingInvoice(invoice)}
                        className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 flex items-center justify-center"
                        aria-label={isEditing ? "Close invoice editor" : "Edit invoice"}
                      >
                        {isEditing ? <X size={13} /> : <Pencil size={13} />}
                      </button>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
                      <select value={editForm.vendorName} onChange={event => onEditVendorChange(event.target.value)} className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 text-xs focus:outline-none focus:border-amber-500/50">
                        {VENDORS.map(vendor => <option key={vendor.name} value={vendor.name}>{vendor.name}</option>)}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <select value={editForm.category} onChange={event => setEditForm(prev => ({ ...prev, category: event.target.value as InvoiceCategory }))} className="bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 text-xs focus:outline-none focus:border-amber-500/50">
                          {CATEGORY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                        <input value={editForm.invoiceNumber} onChange={event => setEditForm(prev => ({ ...prev, invoiceNumber: event.target.value }))} placeholder="Invoice #" className="bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-amber-500/50" />
                      </div>
                      <input value={editForm.totalAmount} onChange={event => setEditForm(prev => ({ ...prev, totalAmount: event.target.value }))} placeholder="Invoice total" inputMode="decimal" className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-amber-500/50" />
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <button type="button" onClick={handleSaveEdit} disabled={editIsPending} className="col-span-2 rounded-lg bg-amber-500 text-black py-2.5 text-[10px] font-black flex items-center justify-center gap-1 disabled:opacity-50">
                          {updateInvoice.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          Save Changes
                        </button>
                        <button type="button" onClick={handleDeleteEdit} disabled={editIsPending} className="rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 py-2.5 text-[10px] font-black flex items-center justify-center gap-1 disabled:opacity-50">
                          {deleteInvoice.isPending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {recentInvoices.length === 0 && <p className="text-zinc-600 text-xs text-center py-8">No invoices logged yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
