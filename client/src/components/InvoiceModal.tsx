import React from "react";

export interface InvoiceModalProps {
  invoice: any;
  org?: {
    id?: number | string | null;
    name?: string | null;
    slug?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  invoice,
  org,
  onClose,
}) => {
  if (!invoice) return null;

  const orgName = org?.name || invoice.organization_name || "Tenant Organization";
  const orgSlug = org?.slug || invoice.organization_slug || "tenant";
  const orgId = org?.id || invoice.organization_id || "N/A";
  const invoiceNo =
    invoice.invoice_number ||
    `INV-${new Date(invoice.created_at || Date.now()).getFullYear()}-${String(
      invoice.id || 1,
    ).padStart(5, "0")}`;

  const amountVal = Number(invoice.amount || 0);
  const currencySymbol = invoice.currency === "USD" ? "$" : "₹";
  const formattedAmount = `${currencySymbol}${amountVal.toLocaleString()}`;

  const startDateStr = invoice.billing_start_date
    ? new Date(invoice.billing_start_date).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : new Date(invoice.created_at || Date.now()).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

  const endDateStr = invoice.billing_end_date
    ? new Date(invoice.billing_end_date).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "1 Year Active";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Targeted Print Stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-invoice-modal, #printable-invoice-modal * {
            visibility: visible !important;
          }
          #printable-invoice-modal {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>

      <div
        id="printable-invoice-modal"
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full border border-gray-200 dark:border-gray-700 text-slate-800 dark:text-slate-100 relative my-auto overflow-hidden animate-in fade-in zoom-in duration-200 print:shadow-none print:border-none print:rounded-none print:max-w-none"
      >
        {/* Modal Screen-only Header Bar */}
        <div className="no-print bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold">
              <i className="mgc_receipt_line text-lg"></i>
            </div>
            <div>
              <h4 className="text-sm font-bold tracking-wide">
                Tax Invoice & Payment Receipt
              </h4>
              <p className="text-[11px] text-slate-400 font-mono">
                {invoiceNo}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-invoice-print !bg-blue-600 hover:!bg-blue-700 !text-white text-xs px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
              onClick={() => window.print()}
            >
              <i className="mgc_print_line text-base !text-white text-white"></i> <span className="!text-white text-white font-bold">Print / Download PDF</span>
            </button>
            <button
              type="button"
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-lg transition"
              onClick={onClose}
              title="Close"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Invoice Document Body (Standard A4 Format) */}
        <div className="p-8 sm:p-10 space-y-6 text-xs bg-white text-slate-900 print:p-0">
          {/* Top Brand Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b-2 border-slate-900">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-black text-xl shadow-sm">
                  <i className="mgc_globe_line"></i>
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900 leading-none">
                    CRM PLATFORM
                  </h2>
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                    Cloud Platform & Services
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 pt-1 font-medium">
                Enterprise SaaS Subscription & Cloud Operations
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <div className="inline-block bg-slate-900 text-white px-3.5 py-1 rounded text-xs font-black tracking-wider uppercase">
                TAX INVOICE
              </div>
              <div className="font-mono font-bold text-sm text-slate-900">
                {invoiceNo}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Original for Recipient
              </div>
            </div>
          </div>

          {/* Provider & Client Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Issued By */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-1.5 flex items-center justify-between">
                <span>ISSUED BY (SERVICE PROVIDER)</span>
                <i className="mgc_building_1_line text-slate-400 text-xs"></i>
              </div>
              <div className="font-extrabold text-sm text-slate-900">
                CRM SaaS Platform Inc.
              </div>
              <div className="text-[11px] text-slate-600 leading-relaxed space-y-0.5">
                <div>Plot No. 42, Tech Cyber Zone, MIDC</div>
                <div>Navi Mumbai, Maharashtra - 400701, India</div>
                <div className="pt-1">
                  <strong className="text-slate-700">GSTIN:</strong> 27AABCN1234F1Z8
                </div>
                <div>
                  <strong className="text-slate-700">PAN:</strong> AABCN1234F |{" "}
                  <strong className="text-slate-700">SAC:</strong> 998313
                </div>
                <div>
                  <strong className="text-slate-700">Support:</strong>{" "}
                  billing@crmsaas.com
                </div>
              </div>
            </div>

            {/* Billed To */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-primary border-b border-primary/20 pb-1.5 flex items-center justify-between">
                <span>BILLED TO (TENANT CLIENT)</span>
                <i className="mgc_user_check_line text-primary text-xs"></i>
              </div>
              <div className="font-extrabold text-sm text-slate-900">
                {orgName}
              </div>
              <div className="text-[11px] text-slate-600 leading-relaxed space-y-0.5">
                <div>
                  <strong className="text-slate-700">Organization ID:</strong> #
                  {orgId}
                </div>
                <div>
                  <strong className="text-slate-700">Tenant Domain:</strong>{" "}
                  <span className="font-mono text-slate-800">
                    {orgSlug}.crmsaas.com
                  </span>
                </div>
                <div>
                  <strong className="text-slate-700">Account Type:</strong>{" "}
                  Enterprise CRM Workspace
                </div>
                <div>
                  <strong className="text-slate-700">Place of Supply:</strong>{" "}
                  Maharashtra (State Code 27)
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Meta Status Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-100 rounded-xl p-3.5 border border-slate-200 font-medium">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Invoice Date
              </span>
              <strong className="text-slate-900 text-xs">
                {new Date(invoice.created_at || Date.now()).toLocaleDateString(
                  "en-IN",
                  {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  },
                )}
              </strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Subscription Validity
              </span>
              <strong className="text-slate-900 text-xs">
                {endDateStr}
              </strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Payment Method
              </span>
              <strong className="text-slate-900 text-xs flex items-center gap-1">
                <i className="mgc_bank_card_line text-primary"></i>{" "}
                {invoice.payment_method || "Razorpay Online"}
              </strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Payment Status
              </span>
              <span className="inline-flex items-center gap-1 font-extrabold text-emerald-600 text-xs">
                <i className="mgc_check_circle_fill text-emerald-500"></i> PAID &
                VERIFIED
              </span>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 w-10 text-center">#</th>
                  <th className="py-3 px-4">Service Description</th>
                  <th className="py-3 px-3 text-center">SAC</th>
                  <th className="py-3 px-3 text-center">Billing Period</th>
                  <th className="py-3 px-3 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Unit Rate</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                <tr className="bg-white">
                  <td className="py-4 px-4 text-center font-bold text-slate-400">
                    1
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-bold text-slate-900 text-sm">
                      {invoice.plan_name || "Enterprise"} SaaS Subscription Plan
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 leading-normal">
                      Includes CRM modules provisioning, leads & pipeline
                      tracking, multi-user role access, automated encrypted cloud
                      backups, and SLA uptime guarantee.
                    </div>
                  </td>
                  <td className="py-4 px-3 text-center font-mono text-[11px] text-slate-600">
                    998313
                  </td>
                  <td className="py-4 px-3 text-center text-slate-600 whitespace-nowrap">
                    {startDateStr} - {endDateStr}
                  </td>
                  <td className="py-4 px-3 text-center font-bold text-slate-800">
                    1
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-slate-700">
                    {formattedAmount}
                  </td>
                  <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">
                    {formattedAmount}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment Verification & Calculations Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 items-start">
            {/* Left: Transaction Metadata & Stamp */}
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-1.5 text-[11px]">
                <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px] pb-1 border-b border-slate-200">
                  Payment Verification Details
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction ID:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {invoice.razorpay_payment_id ||
                      invoice.reference_number ||
                      `TXN_${invoice.id}`}
                  </span>
                </div>
                {invoice.razorpay_order_id && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gateway Order ID:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {invoice.razorpay_order_id}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Settlement Method:</span>
                  <span className="font-semibold text-slate-700">
                    {invoice.payment_method || "Razorpay Auto-Capture"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Processed At:</span>
                  <span className="text-slate-700 font-mono">
                    {new Date(invoice.created_at || Date.now()).toLocaleDateString(
                      "en-IN",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      },
                    )}
                  </span>
                </div>
              </div>

              {/* Digital Signature Stamp */}
              <div className="flex items-center gap-3 p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
                  <i className="mgc_shield_check_line"></i>
                </div>
                <div>
                  <div className="font-bold text-emerald-900 text-xs">
                    Digitally Signed & Verified
                  </div>
                  <div className="text-[10px] text-emerald-700">
                    Authenticated by CRM SaaS Billing Core
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Calculations & Grand Total */}
            <div className="space-y-2">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Amount (Subtotal):</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {formattedAmount}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>CGST (9%):</span>
                  <span className="font-mono text-slate-600">
                    Included in Total
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST (9%):</span>
                  <span className="font-mono text-slate-600">
                    Included in Total
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-2 font-medium">
                  <span>Total Tax Amount:</span>
                  <span className="font-mono text-slate-700">
                    ₹0.00 (Inclusive)
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-3 border-t-2 border-slate-900">
                  <span className="uppercase tracking-wider">Total Paid:</span>
                  <span className="text-primary font-mono text-lg">
                    {formattedAmount} {invoice.currency || "INR"}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 text-right italic pt-1">
                Amount is inclusive of applicable GST under SAC 998313.
              </p>
            </div>
          </div>

          {/* Terms & Footer Section */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] text-slate-500">
            <div>
              <h6 className="font-bold uppercase text-slate-600 mb-1">
                Terms & Conditions
              </h6>
              <ul className="list-disc list-inside space-y-0.5 leading-relaxed">
                <li>
                  This invoice acts as an official electronic receipt for
                  subscription provisioning.
                </li>
                <li>
                  Subscription licenses are renewed on an annual basis according
                  to the selected plan.
                </li>
                <li>
                  For questions or GST input tax credit queries, contact
                  billing@crmsaas.com.
                </li>
              </ul>
            </div>
            <div className="text-left sm:text-right flex flex-col justify-end space-y-1">
              <div className="font-bold text-slate-700">
                CRM SaaS Systems Private Limited
              </div>
              <div className="text-slate-400">
                Authorized Electronic Billing Authority
              </div>
              <div className="text-[9px] text-slate-400 italic">
                This is a computer-generated tax invoice. No physical signature is
                required.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Screen-only Bottom Actions */}
        <div className="no-print bg-slate-50 dark:bg-slate-800/80 px-8 py-4 flex justify-between items-center border-t border-gray-200 dark:border-gray-700">
          <span className="text-[11px] text-gray-500 italic">
            Press <strong>Ctrl + P</strong> or click Print to generate an A4 PDF
            receipt.
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs px-4 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold transition"
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              className="btn btn-invoice-print !bg-blue-600 hover:!bg-blue-700 !text-white text-xs px-5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer"
              style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
              onClick={() => window.print()}
            >
              <i className="mgc_print_line text-base !text-white text-white"></i> <span className="!text-white text-white font-bold">Print / Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
