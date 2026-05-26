import { ChevronLeft, Mail, Phone, CalendarDays, CreditCard, Truck, Lock, Camera, AtSign, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { SafeStaff } from "../../../shared/types";

type Props = {
  staffUser: SafeStaff;
  onBack: () => void;
};

type InvoiceMethod = "email" | "camera" | "both";
type VendorType = "food" | "beer" | "liquor" | "store_run";

type VendorContact = {
  name: string;
  type: VendorType;
  contact: string;
  phone: string;
  deliveryDays: string;
  invoiceMethod: InvoiceMethod;
  paymentTerms: string;
  emails: string[];
  notes: string;
};

const MANAGER_ROLES = ["owner", "key_manager", "kitchen_manager", "bar_manager"];

function isManagerOrOwner(staffUser: SafeStaff | null): boolean {
  return !!staffUser && MANAGER_ROLES.includes(staffUser.jobRole);
}

const VENDORS: VendorContact[] = [
  {
    name: "PFG / Performance Foodservice",
    type: "food",
    contact: "Scott Selim",
    phone: "515-269-1082",
    deliveryDays: "Monday",
    invoiceMethod: "email",
    paymentTerms: "EFT 21 Day",
    emails: ["communitypizza2026@gmail.com", "mykemueller1@gmail.com"],
    notes: "Tom sends the food order by email. Invoices are expected in both Gmail accounts.",
  },
  {
    name: "Sysco Iowa",
    type: "food",
    contact: "Rebecca Heckert",
    phone: "—",
    deliveryDays: "Thursday",
    invoiceMethod: "camera",
    paymentTerms: "Rolling 1 week",
    emails: [],
    notes: "Order method still needs confirmation with Tom. No invoice email currently; capture invoice by camera.",
  },
  {
    name: "Humes Distributing",
    type: "beer",
    contact: "Bambi Brandow / Degan Klindt",
    phone: "—",
    deliveryDays: "Tuesday + Friday",
    invoiceMethod: "email",
    paymentTerms: "Charge Only",
    emails: ["myke@n86.app"],
    notes: "Bud, Busch, Michelob Ultra, seltzers, Smirnoff Ice, and Guinness. Invoice email goes to myke@n86.app.",
  },
  {
    name: "Fort Dodge Distributing",
    type: "beer",
    contact: "Driver / sales rep",
    phone: "—",
    deliveryDays: "Monday",
    invoiceMethod: "camera",
    paymentTerms: "Unknown",
    emails: [],
    notes: "Miller, Coors, Yuengling, and Blue Moon. They never email invoices; capture by camera.",
  },
  {
    name: "Ike Auen Distributing",
    type: "beer",
    contact: "Dave Olberding / Riley Neumann",
    phone: "—",
    deliveryDays: "Friday",
    invoiceMethod: "camera",
    paymentTerms: "Cash",
    emails: [],
    notes: "Corona vendor. Camera invoice backup is required because invoices are not emailed.",
  },
  {
    name: "Hy-Vee Wine & Spirits",
    type: "liquor",
    contact: "Store 1192 manager",
    phone: "515-576-2333",
    deliveryDays: "TBD after Sunday order",
    invoiceMethod: "both",
    paymentTerms: "Pay Fridays — combined weekly",
    emails: ["1192winespiritsmgr@hy-vee.com"],
    notes: "Sunday liquor orders go from communitypizza2026@gmail.com. Hy-Vee should email back, but camera backup remains required.",
  },
  {
    name: "Hy-Vee Grocery",
    type: "store_run",
    contact: "Store team",
    phone: "—",
    deliveryDays: "As-needed staff run",
    invoiceMethod: "camera",
    paymentTerms: "Cash from register",
    emails: [],
    notes: "Bread, buns, produce, pork, and miscellaneous fill-ins. Treat frequent repeats as par-level alert candidates.",
  },
  {
    name: "Fareway",
    type: "store_run",
    contact: "Store team",
    phone: "—",
    deliveryDays: "As-needed staff run",
    invoiceMethod: "camera",
    paymentTerms: "Cash from register",
    emails: [],
    notes: "Pork belly, bread, soup, and miscellaneous fill-ins. Store-run receipts should be photographed.",
  },
];

const TYPE_LABELS: Record<VendorType | "all", string> = {
  all: "All",
  food: "Food",
  beer: "Beer",
  liquor: "Liquor",
  store_run: "Store Runs",
};

const METHOD_COPY: Record<InvoiceMethod, { label: string; className: string }> = {
  email: { label: "Email", className: "bg-blue-500/10 text-blue-300 border-blue-500/20" },
  camera: { label: "Camera", className: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
  both: { label: "Email + Camera", className: "bg-green-500/10 text-green-300 border-green-500/20" },
};

function AccessDenied({ onBack }: { onBack: () => void }) {
  return (
    <div className="h-screen bg-black flex flex-col items-center justify-center px-8">
      <Lock size={32} className="text-zinc-700 mb-4" />
      <p className="text-zinc-300 text-sm font-bold">Manager Access Required</p>
      <p className="text-zinc-600 text-xs text-center mt-2">Vendor contacts and payment workflow details are manager-only.</p>
      <button onClick={onBack} className="mt-6 px-5 py-2.5 rounded-xl bg-zinc-900 text-zinc-300 text-xs font-semibold border border-zinc-800">
        Back
      </button>
    </div>
  );
}

export default function VendorDirectoryScreen({ staffUser, onBack }: Props) {
  const [activeType, setActiveType] = useState<VendorType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredVendors = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return VENDORS.filter(vendor => {
      const matchesType = activeType === "all" || vendor.type === activeType;
      const matchesSearch = !query || [vendor.name, vendor.contact, vendor.deliveryDays, vendor.paymentTerms, vendor.notes, ...vendor.emails]
        .join(" ")
        .toLowerCase()
        .includes(query);
      return matchesType && matchesSearch;
    });
  }, [activeType, searchQuery]);

  if (!isManagerOrOwner(staffUser)) return <AccessDenied onBack={onBack} />;

  return (
    <div className="h-screen bg-black flex flex-col overflow-y-auto pb-24">
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur border-b border-zinc-900 p-3 flex items-center gap-2">
        <button onClick={onBack} className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800">
          <ChevronLeft size={15} className="text-zinc-400" />
        </button>
        <div className="flex-1">
          <h2 className="text-white font-black text-sm tracking-[0.08em]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>VENDOR DIRECTORY</h2>
          <p className="text-zinc-500 text-[10px]">8 vendors · contacts · invoice rules · payment terms</p>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Search vendors, contacts, emails..."
              className="w-full bg-black border border-zinc-800 rounded-lg py-2.5 pl-9 pr-3 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <div className="grid grid-cols-5 gap-1 mt-3">
            {(Object.keys(TYPE_LABELS) as Array<VendorType | "all">).map(type => (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`rounded-lg px-2 py-2 text-[9px] font-bold border transition-all ${activeType === type ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-zinc-950 text-zinc-500 border-zinc-800"}`}
              >
                {TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-3">
            <p className="text-zinc-500 text-[9px] uppercase tracking-wide">Email invoices</p>
            <p className="text-white text-lg font-bold">{VENDORS.filter(vendor => vendor.invoiceMethod !== "camera").length}</p>
          </div>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-3">
            <p className="text-zinc-500 text-[9px] uppercase tracking-wide">Camera required</p>
            <p className="text-amber-400 text-lg font-bold">{VENDORS.filter(vendor => vendor.invoiceMethod !== "email").length}</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {filteredVendors.map(vendor => {
            const method = METHOD_COPY[vendor.invoiceMethod];
            return (
              <div key={vendor.name} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                <div className="p-3 border-b border-zinc-800/80">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-bold leading-tight">{vendor.name}</p>
                      <p className="text-zinc-500 text-[10px] mt-0.5 capitalize">{TYPE_LABELS[vendor.type]}</p>
                    </div>
                    <span className={`shrink-0 px-2 py-1 rounded-full border text-[9px] font-bold ${method.className}`}>{method.label}</span>
                  </div>
                </div>
                <div className="p-3 space-y-2.5">
                  <div className="grid grid-cols-1 gap-2 text-[11px]">
                    <div className="flex items-center gap-2 text-zinc-300"><Phone size={12} className="text-amber-400" /><span>{vendor.contact}{vendor.phone !== "—" ? ` · ${vendor.phone}` : ""}</span></div>
                    <div className="flex items-center gap-2 text-zinc-300"><Truck size={12} className="text-amber-400" /><span>{vendor.deliveryDays}</span></div>
                    <div className="flex items-center gap-2 text-zinc-300"><CreditCard size={12} className="text-amber-400" /><span>{vendor.paymentTerms}</span></div>
                    {vendor.emails.length > 0 ? (
                      <div className="flex items-start gap-2 text-zinc-300">
                        <Mail size={12} className="text-amber-400 mt-0.5" />
                        <div className="space-y-0.5">{vendor.emails.map(email => <p key={email}>{email}</p>)}</div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-zinc-500"><Camera size={12} className="text-amber-400" /><span>No email invoice path — camera capture only</span></div>
                    )}
                  </div>
                  <p className="text-zinc-500 text-[10px] leading-relaxed pt-2 border-t border-zinc-800/60">{vendor.notes}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2">
          <CalendarDays size={14} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-amber-100/80 text-[10px] leading-relaxed">
            Standard week: PFG and Fort Dodge deliver Monday, Humes Tuesday and Friday, Sysco Thursday, Ike Auen Friday, and Hy-Vee liquor order goes out Sunday night.
          </p>
        </div>
      </div>
    </div>
  );
}
