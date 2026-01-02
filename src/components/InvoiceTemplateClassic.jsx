import React from 'react';
import { amountToWords } from '../utils/numberToWords';

const InvoiceTemplateClassic = ({ invoice }) => {
    const { sender, client, meta, items, global } = invoice;

    // Constants to match the image style
    const BORDER_CLASS = "border-black border-[1px]";
    const BORDER_R_CLASS = "border-r border-black border-r-[1px]";
    const BORDER_B_CLASS = "border-b border-black border-b-[1px]";
    const PADDING_CLASS = "px-2 py-1";
    const HEADER_CLASS = `font-bold text-[9px] ${BORDER_R_CLASS} ${PADDING_CLASS} text-center`;
    const CELL_CLASS = `text-[9px] ${BORDER_R_CLASS} ${PADDING_CLASS} break-words`;
    const CELL_RIGHT_CLASS = `text-[9px] ${BORDER_R_CLASS} ${PADDING_CLASS} text-right break-words`;

    // Calculate Subtotals and Taxes
    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);

    let totalTaxAmount = 0;
    let taxDetails = {}; // Map of HSN -> { taxable, cgst, sgst, igst, rate }

    items.forEach(item => {
        const amount = item.quantity * item.price;
        const hsn = item.hsn || 'General';

        if (!taxDetails[hsn]) {
            taxDetails[hsn] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, rate: 0 };
        }

        taxDetails[hsn].taxable += amount;

        if (global.taxType === 'CGST_SGST') {
            const cgstAmt = amount * ((item.cgst || 0) / 100);
            const sgstAmt = amount * ((item.sgst || 0) / 100);
            taxDetails[hsn].cgst += cgstAmt;
            taxDetails[hsn].sgst += sgstAmt;
            taxDetails[hsn].rate = (item.cgst || 0) + (item.sgst || 0); // Combined rate
            totalTaxAmount += (cgstAmt + sgstAmt);
        } else {
            const igstAmt = amount * ((item.igst || 0) / 100);
            taxDetails[hsn].igst += igstAmt;
            taxDetails[hsn].rate = item.igst || 0;
            totalTaxAmount += igstAmt;
        }
    });

    const discountAmount = global.discountType === 'flat'
        ? parseFloat(global.discount) || 0
        : subtotal * ((parseFloat(global.discount) || 0) / 100);

    let total = subtotal + totalTaxAmount - discountAmount;
    let roundOff = 0;
    if (global.roundOff) {
        roundOff = Math.round(total) - total;
        total = Math.round(total);
    }

    // Helper to format currency
    const formatCurrency = (val) => {
        return val ? val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
    };

    return (
        <div className={`bg-white text-black font-sans box-border text-[11px] leading-tight select-none w-full h-full p-8`}>
            {/* Main Container Container with outer border */}
            <div className={`flex flex-col ${BORDER_CLASS}`}>

                {/* Header */}
                <div className={`flex justify-between items-center ${BORDER_B_CLASS} px-2 py-1`}>
                    <div className="w-1/3"></div>
                    <div className="font-bold underline text-center text-sm w-1/3">Tax Invoice</div>
                    <div className="w-1/3 text-right text-[10px]">ORIGINAL FOR RECIPIENT</div>
                </div>

                {/* Top Section: Seller & Invoice Info */}
                <div className={`flex ${BORDER_B_CLASS}`}>
                    {/* Left: Seller Details */}
                    <div className={`w-1/2 ${BORDER_R_CLASS} p-2 flex flex-col gap-1`}>
                        <div className="font-bold text-base uppercase">{sender.name || "Seller Name"}</div>
                        <div className="whitespace-pre-wrap">{sender.address || "Address"}</div>
                        <div>Phone no.: {sender.phone}</div>
                        <div>Email: {sender.email}</div>
                        <div>GSTIN: <span className="font-semibold">{sender.taxId}</span></div>
                        <div>State: {sender.state}</div>
                    </div>

                    {/* Right: Invoice Details */}
                    <div className="w-1/2 flex flex-col">
                        {/* Row 1 */}
                        <div className={`flex ${BORDER_B_CLASS}`}>
                            <div className={`w-1/2 ${BORDER_R_CLASS} p-1`}>
                                <div className="font-semibold">Invoice No.</div>
                                <div>{meta.number}</div>
                            </div>
                            <div className="w-1/2 p-1">
                                <div className="font-semibold">Date</div>
                                <div>{meta.date}</div>
                            </div>
                        </div>
                        {/* Row 2 */}
                        <div className="flex flex-grow">
                            <div className={`w-1/2 ${BORDER_R_CLASS} p-1`}>
                                <div className="font-semibold">Due Date:</div>
                                <div>{meta.dueDate}</div>
                            </div>
                            <div className="w-1/2 p-1">
                                <div className="font-semibold">Place of supply</div>
                                <div>{client.state}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Buyer & Ship To */}
                <div className={`flex ${BORDER_B_CLASS}`}>
                    {/* Bill To */}
                    <div className={`w-1/2 ${BORDER_R_CLASS} p-2`}>
                        <div className="text-[10px] uppercase font-bold text-gray-600 mb-1">Bill To</div>
                        <div className="font-bold uppercase">{client.name}</div>
                        <div className="uppercase">{client.company}</div>
                        <div className="whitespace-pre-wrap">{client.address}</div>
                        <div>GSTIN : {client.taxId}</div>
                        <div>State: {client.state}</div>
                    </div>
                    {/* Ship To - duplicating Bill To if Ship To not available for now */}
                    <div className="w-1/2 p-2">
                        <div className="text-[10px] uppercase font-bold text-gray-600 mb-1">Ship To</div>
                        <div className="uppercase">{client.company || client.name}</div>
                        <div className="whitespace-pre-wrap">{client.address}</div>
                        <div>India</div>
                    </div>
                </div>

                {/* Items Table Header */}
                <div className={`grid grid-cols-12 ${BORDER_B_CLASS} bg-gray-50`}>
                    <div className={`col-span-1 ${HEADER_CLASS}`}>#</div>
                    <div className={`col-span-3 ${HEADER_CLASS} text-left`}>Item name</div>
                    <div className={`col-span-1 ${HEADER_CLASS}`}>HSN/ SAC</div>
                    <div className={`col-span-1 ${HEADER_CLASS}`}>Quantity</div>
                    <div className={`col-span-1 ${HEADER_CLASS}`}>Unit</div>
                    <div className={`col-span-2 ${HEADER_CLASS}`}>Price/ Unit</div>
                    <div className={`col-span-1 ${HEADER_CLASS}`}>GST</div>
                    <div className={`col-span-2 ${HEADER_CLASS} border-r-0 text-right`}>Amount</div>
                </div>

                {/* Items Rows */}
                <div className="flex-grow min-h-[200px]">
                    {items.map((item, index) => {
                        const itemRate = global.taxType === 'IGST' ? (item.igst || 0) : ((item.cgst || 0) + (item.sgst || 0));
                        const itemTaxAmt = (item.quantity * item.price) * (itemRate / 100);

                        return (
                            <div key={item.id} className={`grid grid-cols-12 ${BORDER_B_CLASS} last:border-b-0`}>
                                <div className={`col-span-1 ${CELL_CLASS} text-center`}>{index + 1}</div>
                                <div className={`col-span-3 ${CELL_CLASS} uppercase`}>
                                    <span className="font-bold block">{item.description}</span>
                                    {/* Optional additional info could go here */}
                                </div>
                                <div className={`col-span-1 ${CELL_CLASS} text-center`}>{item.hsn || '9988'}</div>
                                <div className={`col-span-1 ${CELL_CLASS} text-center`}>{item.quantity}</div>
                                <div className={`col-span-1 ${CELL_CLASS} text-center`}>{item.unit || 'Nos'}</div>
                                <div className={`col-span-2 ${CELL_CLASS} text-right`}>₹ {formatCurrency(item.price)}</div>
                                <div className={`col-span-1 ${CELL_CLASS} text-right text-[9px]`}>
                                    {itemTaxAmt > 0 ? (
                                        <>
                                            <div>{formatCurrency(itemTaxAmt)}</div>
                                            <div className="text-[8px]">({itemRate}%)</div>
                                        </>
                                    ) : '-'}
                                </div>
                                <div className={`col-span-2 ${CELL_RIGHT_CLASS} border-r-0 font-bold`}>
                                    {formatCurrency((item.quantity * item.price) + itemTaxAmt)}
                                </div>
                            </div>
                        );
                    })}
                    {/* Empty rows filler if needed, but not strictly required by React */}
                </div>

                {/* Total Row */}
                <div className={`grid grid-cols-12 ${BORDER_B_CLASS} border-t-black`}>
                    <div className={`col-span-5 ${CELL_CLASS} text-right font-bold`}>Total</div>
                    <div className={`col-span-1 ${CELL_CLASS} text-center font-bold`}>{items.reduce((sum, i) => sum + i.quantity, 0)}</div>
                    <div className={`col-span-4 ${CELL_CLASS}`}></div>
                    <div className={`col-span-2 ${CELL_RIGHT_CLASS} border-r-0 font-bold`}>{formatCurrency(subtotal)}</div>
                </div>

                {/* Amount In Words & Finals */}
                <div className={`flex ${BORDER_B_CLASS}`}>
                    <div className={`w-2/3 ${BORDER_R_CLASS} p-2 flex flex-col justify-start`}>
                        <div className="font-semibold text-[10px] mb-1">Invoice Amount in Words</div>
                        <div className="font-bold flex-grow capitalize">
                            {amountToWords(total, meta.currency === 'USD' ? 'Dollars' : 'Rupees')}
                        </div>
                    </div>
                    <div className="w-1/3">
                        <div className={`flex justify-between ${BORDER_B_CLASS} px-2 py-1`}>
                            <span>Sub Total</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        <div className={`flex justify-between ${BORDER_B_CLASS} px-2 py-1`}>
                            <span>Tax Amount</span>
                            <span>{formatCurrency(totalTaxAmount)}</span>
                        </div>
                        {/* Discount handling */}
                        {discountAmount > 0 && (
                            <div className={`flex justify-between ${BORDER_B_CLASS} px-2 py-1`}>
                                <span>Discount</span>
                                <span>-{formatCurrency(discountAmount)}</span>
                            </div>
                        )}
                        {roundOff !== 0 && (
                            <div className={`flex justify-between ${BORDER_B_CLASS} px-2 py-1`}>
                                <span>Round Off</span>
                                <span>{roundOff > 0 ? '+' : ''}{formatCurrency(roundOff)}</span>
                            </div>
                        )}

                        <div className={`flex justify-between px-2 py-1 font-bold bg-gray-100`}>
                            <span>Total</span>
                            <span>₹ {formatCurrency(total)}</span>
                        </div>
                        <div className={`flex justify-between border-t border-black px-2 py-1`}>
                            <span>Received</span>
                            <span>{formatCurrency(invoice.amountPaid || 0)}</span>
                        </div>
                        <div className={`flex justify-between border-t border-black px-2 py-1`}>
                            <span>Balance</span>
                            <span>{formatCurrency(total - (invoice.amountPaid || 0))}</span>
                        </div>
                    </div>
                </div>

                {/* Visual Stamp for Paid/Partial Status */}
                {invoice.status === 'Paid' && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-4 border-green-600 text-green-600 rounded-lg px-8 py-2 text-6xl font-black opacity-30 rotate-[-15deg] pointer-events-none uppercase tracking-widest z-10 w-fit whitespace-nowrap">
                        PAID
                    </div>
                )}
                {invoice.status === 'Partial' && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-4 border-orange-500 text-orange-500 rounded-lg px-8 py-2 text-6xl font-black opacity-30 rotate-[-15deg] pointer-events-none uppercase tracking-widest z-10 w-fit whitespace-nowrap">
                        PARTIAL
                    </div>
                )}

                {/* Tax Details Table */}
                <div className={`${BORDER_B_CLASS}`}>
                    <div className={`grid grid-cols-12 bg-gray-50 border-b border-black text-center font-bold`}>
                        <div className={`col-span-2 ${BORDER_R_CLASS} py-1`}>HSN/ SAC</div>
                        <div className={`col-span-2 ${BORDER_R_CLASS} py-1`}>Taxable amount</div>
                        {global.taxType === 'CGST_SGST' ? (
                            <>
                                <div className={`col-span-2 ${BORDER_R_CLASS} py-1`}>CGST</div>
                                <div className={`col-span-2 ${BORDER_R_CLASS} py-1`}>SGST</div>
                            </>
                        ) : (
                            <div className={`col-span-4 ${BORDER_R_CLASS} py-1`}>IGST</div>
                        )}
                        <div className={`col-span-2 ${BORDER_R_CLASS} py-1 hidden`}></div> {/* Placeholder for sizing if needed */}
                        <div className={`col-span-4 py-1`}>Total Tax Amount</div>
                    </div>

                    {Object.entries(taxDetails).map(([hsn, tax]) => (
                        <div key={hsn} className={`grid grid-cols-12 border-b border-gray-300 last:border-b-0 text-right`}>
                            <div className={`col-span-2 ${BORDER_R_CLASS} py-1 text-center`}>{hsn}</div>
                            <div className={`col-span-2 ${BORDER_R_CLASS} py-1 px-2 font-bold`}>{formatCurrency(tax.taxable)}</div>

                            {global.taxType === 'CGST_SGST' ? (
                                <>
                                    <div className={`col-span-2 ${BORDER_R_CLASS} py-1 flex justify-between px-1`}>
                                        <span className="text-gray-500 text-[9px]">{tax.rate / 2}%</span>
                                        <span>{formatCurrency(tax.cgst)}</span>
                                    </div>
                                    <div className={`col-span-2 ${BORDER_R_CLASS} py-1 flex justify-between px-1`}>
                                        <span className="text-gray-500 text-[9px]">{tax.rate / 2}%</span>
                                        <span>{formatCurrency(tax.sgst)}</span>
                                    </div>
                                </>
                            ) : (
                                <div className={`col-span-4 ${BORDER_R_CLASS} py-1 flex justify-between px-1`}>
                                    <span className="text-gray-500 text-[9px]">{tax.rate}%</span>
                                    <span>{formatCurrency(tax.igst)}</span>
                                </div>
                            )}

                            <div className={`col-span-4 py-1 px-2 font-bold`}>
                                {formatCurrency(global.taxType === 'CGST_SGST' ? tax.cgst + tax.sgst : tax.igst)}
                            </div>
                        </div>
                    ))}

                    {/* Tax Total Row */}
                    <div className={`grid grid-cols-12 font-bold border-t border-black bg-gray-50`}>
                        <div className={`col-span-2 ${BORDER_R_CLASS} py-1 text-right px-2`}>Total</div>
                        <div className={`col-span-2 ${BORDER_R_CLASS} py-1 text-right px-2`}>
                            {formatCurrency(Object.values(taxDetails).reduce((a, b) => a + b.taxable, 0))}
                        </div>
                        {global.taxType === 'CGST_SGST' ? (
                            <>
                                <div className={`col-span-2 ${BORDER_R_CLASS} py-1 text-right px-2`}>
                                    {formatCurrency(Object.values(taxDetails).reduce((a, b) => a + b.cgst, 0))}
                                </div>
                                <div className={`col-span-2 ${BORDER_R_CLASS} py-1 text-right px-2`}>
                                    {formatCurrency(Object.values(taxDetails).reduce((a, b) => a + b.sgst, 0))}
                                </div>
                            </>
                        ) : (
                            <div className={`col-span-4 ${BORDER_R_CLASS} py-1 text-right px-2`}>
                                {formatCurrency(Object.values(taxDetails).reduce((a, b) => a + b.igst, 0))}
                            </div>
                        )}
                        <div className={`col-span-4 py-1 text-right px-2`}>
                            {formatCurrency(totalTaxAmount)}
                        </div>
                    </div>
                </div>

                {/* Footer: Bank, Terms, Signatory */}
                <div className="flex h-40">
                    {/* Bank Details */}
                    <div className={`w-1/3 ${BORDER_R_CLASS} p-2`}>
                        <div className="font-bold underline mb-2">Bank Details</div>
                        <div className="flex gap-2">
                            <span className="font-semibold">Bank:</span>
                            <span>{sender.bankName}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold">A/c No.:</span>
                            <span>{sender.bankAccount}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold">IFSC:</span>
                            <span>{sender.bankIfsc}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold">Branch:</span>
                            <span>{sender.bankBranch}</span>
                        </div>
                        {/* Placeholder for dynamic bank details if added to schema later */}
                    </div>

                    {/* Terms */}
                    <div className={`w-1/3 ${BORDER_R_CLASS} p-2`}>
                        <div className="font-bold underline mb-2">Terms and conditions</div>
                        <ul className="list-decimal pl-4 text-[9px] space-y-1">
                            <li>Goods once sold will not be taken back.</li>
                            <li>Interest @ 18% p.a. will be charged if payment is not made within due date.</li>
                            <li>Subject to Mumbai Jurisdiction only.</li>
                        </ul>
                    </div>

                    {/* Signatory */}
                    <div className="w-1/3 p-2 flex flex-col justify-between items-center text-center">
                        <div className="w-full text-right mb-4">
                            For <span className="font-bold uppercase">{sender.name}</span>
                        </div>

                        <div className="h-16 flex items-center justify-center">
                            {sender.signature && <img src={sender.signature} alt="Sign" className="h-full object-contain" />}
                        </div>

                        <div className="font-semibold">Authorized Signatory</div>
                    </div>
                </div>

            </div>
            <div className="text-center mt-2 text-[10px] text-gray-500">This is a Computer Generated Invoice</div>
        </div>
    );
};

export default InvoiceTemplateClassic;
