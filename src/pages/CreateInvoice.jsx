import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../components/ui/Components';
import { Plus, Trash2, Save, Download, Eye, EyeOff } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom'; // Added useParams
import { db } from '../firebase';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore'; // Added doc, getDoc, updateDoc
import InvoiceTemplateClassic from '../components/InvoiceTemplateClassic';
import html2pdf from 'html2pdf.js';

const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh",
    "Lakshadweep", "Puducherry"
];

const GST_RATES = [0, 5, 12, 18, 28];

const INITIAL_STATE = {
    sender: {
        name: '',
        address: '',
        state: 'Maharashtra', // Default to avoid Logic issues
        email: '',
        phone: '',
        taxId: '',
        bankName: '',
        bankAccount: '',
        bankIfsc: '',
        bankBranch: ''
    },
    client: {
        name: '',
        company: '',
        address: '',
        state: 'Maharashtra', // important for calculation
        email: '',
        taxId: ''
    },
    meta: {
        number: 'INV-001',
        date: new Date().toISOString().split('T')[0],
        dueDate: '',
        currency: 'INR'
    },
    items: [
        { id: 1, description: '', hsn: '9988', quantity: 1, unit: 'Kg', price: 0, cgst: 9, sgst: 9, igst: 18 }
    ],
    global: {
        taxType: 'CGST_SGST', // or 'IGST'
        discount: 0,
        discountType: 'flat',
        roundOff: true,
        template: 'classic',
        notes: '',
        terms: ''
    },
    amountPaid: 0,
    status: 'Unpaid'
};

const CreateInvoice = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // Get ID from URL
    const [loading, setLoading] = useState(false);
    const [invoice, setInvoice] = useState(INITIAL_STATE);
    const [showPreview, setShowPreview] = useState(true);

    // Fetch Invoice Handler
    useEffect(() => {
        if (id) {
            const fetchInvoice = async () => {
                try {
                    const docRef = doc(db, "invoices", id);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        // Map Firestore 'seller/buyer' schema back to UI 'sender/client' state
                        setInvoice({
                            ...INITIAL_STATE,
                            ...data,
                            sender: data.seller || data.sender || INITIAL_STATE.sender,
                            client: data.buyer || data.client || INITIAL_STATE.client,
                            // Ensure items and other fields are preserved
                            items: data.items || INITIAL_STATE.items,
                            meta: data.meta || INITIAL_STATE.meta,
                            global: data.global || INITIAL_STATE.global
                        });
                    } else {
                        console.log("No such document!");
                    }
                } catch (error) {
                    console.error("Error fetching invoice:", error);
                }
            };
            fetchInvoice();
        }
    }, [id]);

    // Load User Profile (Sender Details) on Mount
    useEffect(() => {
        if (!id) { // Only if not editing an existing invoice (or we could overwrite if user wants always latest setting)
            const userProfile = JSON.parse(localStorage.getItem('user_profile'));
            if (userProfile && userProfile.businessName) {
                setInvoice(prev => ({
                    ...prev,
                    sender: {
                        name: userProfile.businessName,
                        address: userProfile.address,
                        state: userProfile.state || 'Maharashtra',
                        email: userProfile.email,
                        phone: userProfile.phone,
                        taxId: userProfile.gstin,
                        bankName: userProfile.bankName,
                        bankAccount: userProfile.bankAccount,
                        bankIfsc: userProfile.bankIfsc,
                        bankBranch: userProfile.bankBranch
                    },
                    client: { ...prev.client, state: userProfile.state || 'Maharashtra' } // Default client to same state for convenience
                }));
            }
        }
    }, [id]);

    // Auto-Calculate Taxes whenever key fields change
    useEffect(() => {
        // Only run if we have valid items
        if (!invoice.items || invoice.items.length === 0) return;

        // Logic: Compare Sender State vs Client State
        // Standardize strings for comparison (lowercase, trim)
        const senderState = (invoice.sender.state || '').toLowerCase().trim();
        const clientState = (invoice.client.state || '').toLowerCase().trim();

        // If states are missing (e.g. during initial load), default to Intra-state to avoid scary changes
        // But if user explicitly sets them, logic will hold.
        const isIntraState = !clientState || !senderState || senderState === clientState;

        setInvoice(prev => {
            // Check if anything actually changed to avoid infinite loop
            const newTaxType = isIntraState ? 'CGST_SGST' : 'IGST';

            // Recalculate items
            const newItems = prev.items.map(item => {
                const rate = item.gstRate || 0;
                let cgst = 0, sgst = 0, igst = 0;

                if (isIntraState) {
                    cgst = rate / 2;
                    sgst = rate / 2;
                } else {
                    igst = rate;
                }

                // Only return new object if values changed
                if (item.cgst === cgst && item.sgst === sgst && item.igst === igst) {
                    return item;
                }
                return { ...item, cgst, sgst, igst };
            });

            // If nothing changed, return prev to prevent re-render loop
            const itemsChanged = JSON.stringify(newItems) !== JSON.stringify(prev.items);
            const typeChanged = prev.global.taxType !== newTaxType;

            if (!itemsChanged && !typeChanged) return prev;

            return {
                ...prev,
                global: { ...prev.global, taxType: newTaxType },
                items: newItems
            };
        });
    }, [
        invoice.sender.state,
        invoice.client.state,
        // We only care if relevant item fields change (rate, price, quantity) to recalculate tax AMOUTNS, 
        // but here we are setting RATES. Amount calc is display-only in the JSX.
        // So we only need to re-run this if gstRate changes.
        // JSON.stringify is a safe way to track deep structural changes in this specific case.
        JSON.stringify(invoice.items.map(i => i.gstRate))
    ]);

    const updateSection = (section, field, value) => {
        setInvoice(prev => ({
            ...prev,
            [section]: { ...prev[section], [field]: value }
        }));
    };

    const updateItem = (id, field, value) => {
        setInvoice(prev => ({
            ...prev,
            items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
        }));
    };

    const addItem = () => {
        setInvoice(prev => ({
            ...prev,
            items: [...prev.items, {
                id: Date.now(),
                description: '',
                hsn: '',
                quantity: 1,
                unit: 'nos',
                price: 0,
                gstRate: 18, // Default
                cgst: 0,
                sgst: 0,
                igst: 0
            }]
        }));
    };

    const removeItem = (id) => {
        if (invoice.items.length === 1) return;
        setInvoice(prev => ({
            ...prev,
            items: prev.items.filter(item => item.id !== id)
        }));
    };

    const calculateTotal = () => {
        // Basic total calculation for storing in DB summary
        const subtotal = invoice.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
        // ... complete logic is in the template, this is just for the list view
        return subtotal;
    };

    const saveInvoiceToDb = async (shouldNavigate = true) => {
        if (!invoice.client.name) {
            alert("Please enter client name");
            return false;
        }

        setLoading(true);
        try {
            // IF EDITING: Only allow updating Status & Payment
            if (id) {
                const updateData = {
                    status: invoice.status || 'Unpaid',
                    amountPaid: invoice.amountPaid || 0,
                    updatedAt: new Date().toISOString()
                };
                await updateDoc(doc(db, "invoices", id), updateData);

                if (shouldNavigate) navigate('/invoices');
                return true;
            }

            // IF CREATING: Validate & Calculate Final Snapshot

            // 1. Calculate Item Taxes & Totals
            const finalItems = invoice.items.map(item => {
                const quantity = Number(item.quantity) || 0;
                const price = Number(item.price) || 0;
                const taxableValue = quantity * price;
                const rate = Number(item.gstRate) || 0;

                let cgstRate = 0, sgstRate = 0, igstRate = 0;
                let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;

                if (invoice.global.taxType === 'IGST') {
                    igstRate = rate;
                    igstAmount = taxableValue * (rate / 100);
                } else {
                    cgstRate = rate / 2;
                    sgstRate = rate / 2;
                    cgstAmount = taxableValue * (cgstRate / 100);
                    sgstAmount = taxableValue * (sgstRate / 100);
                }

                // Fix precision to 2 decimals to avoid floating point weirdness
                const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

                return {
                    ...item, // Keep basics (desc, hsn)
                    itemName: item.description,
                    quantity,
                    price,
                    taxableValue: round(taxableValue),
                    gstRate: rate,
                    cgstRate, sgstRate, igstRate,
                    cgstAmount: round(cgstAmount),
                    sgstAmount: round(sgstAmount),
                    igstAmount: round(igstAmount),
                    totalItemValue: round(taxableValue + cgstAmount + sgstAmount + igstAmount)
                };
            });

            // 2. Calculate Summary
            const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

            const summary = finalItems.reduce((acc, item) => ({
                totalTaxableValue: acc.totalTaxableValue + item.taxableValue,
                totalCGST: acc.totalCGST + item.cgstAmount,
                totalSGST: acc.totalSGST + item.sgstAmount,
                totalIGST: acc.totalIGST + item.igstAmount,
                grandTotal: acc.grandTotal + item.totalItemValue
            }), { totalTaxableValue: 0, totalCGST: 0, totalSGST: 0, totalIGST: 0, grandTotal: 0 });

            // Final Rounding of Summary
            summary.totalTaxableValue = round(summary.totalTaxableValue);
            summary.totalCGST = round(summary.totalCGST);
            summary.totalSGST = round(summary.totalSGST);
            summary.totalIGST = round(summary.totalIGST);
            summary.totalGST = round(summary.totalCGST + summary.totalSGST + summary.totalIGST);
            summary.grandTotal = round(summary.grandTotal);

            const invoiceData = {
                invoiceNumber: invoice.meta.number,
                invoiceDate: invoice.meta.date,

                seller: invoice.sender,
                buyer: invoice.client,
                placeOfSupply: invoice.client.state,
                gstType: invoice.global.taxType,

                items: finalItems,
                summary: summary,

                status: invoice.status || 'Unpaid',
                paymentDate: null,
                amountPaid: invoice.amountPaid || 0,

                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),

                // Keep original structure too for UI compatibility if needed, but summary is key
                meta: invoice.meta,
                global: invoice.global
            };

            await addDoc(collection(db, "invoices"), invoiceData);

            if (shouldNavigate) {
                navigate('/invoices');
            }
            return true;
        } catch (error) {
            console.error("Error saving invoice:", error);
            alert("Failed to save invoice.");
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleSave = () => saveInvoiceToDb(true);

    const handleDownloadPDF = async () => {
        // Auto-save before download
        const saved = await saveInvoiceToDb(false); // don't navigate away
        if (!saved) return;

        const element = document.getElementById('invoice-preview-container');
        const opts = {
            margin: 0,
            filename: `Invoice_${invoice.meta.number}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opts).from(element).save();
    };

    return (
        <div className="container mx-auto py-6 px-4">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h2 className="text-3xl font-bold tracking-tight">{id ? 'Edit Invoice' : 'Create Invoice'}</h2>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
                        {showPreview ? <><EyeOff className="mr-2 h-4 w-4" /> Hide Preview</> : <><Eye className="mr-2 h-4 w-4" /> Show Preview</>}
                    </Button>
                    {/* Always show Download, even if Editing (e.g. to download new Receipt with Paid status) */}
                    <Button variant="secondary" onClick={handleDownloadPDF} disabled={loading}>
                        <Download className="mr-2 h-4 w-4" /> {loading ? 'Saving...' : 'Save & Download'}
                    </Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-green-600 hover:bg-green-700">
                        <Save className="mr-2 h-4 w-4" /> {loading ? 'Saving...' : 'Save & Close'}
                    </Button>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-6 items-start">

                {/* LEFT COLUMN: EDITOR */}
                <div className={`w-full ${showPreview ? 'xl:w-5/12' : 'xl:w-full'} space-y-6 transition-all duration-300`}>

                    {/* 1. Business Details */}
                    <Card className="p-5 border-l-4 border-l-blue-500">
                        <h3 className="font-semibold text-lg mb-4 text-blue-700">Business Details</h3>
                        <div className="grid gap-4">
                            <Input label="Business Name" value={invoice.sender.name} onChange={(e) => updateSection('sender', 'name', e.target.value)} disabled={!!id} />
                            <Input label="Address" value={invoice.sender.address} onChange={(e) => updateSection('sender', 'address', e.target.value)} disabled={!!id} />
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="GSTIN" value={invoice.sender.taxId} onChange={(e) => updateSection('sender', 'taxId', e.target.value)} disabled={!!id} />
                                <Input label="Phone" value={invoice.sender.phone} onChange={(e) => updateSection('sender', 'phone', e.target.value)} disabled={!!id} />
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <label className="text-sm font-semibold text-muted-foreground block mb-1">Business State</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={invoice.sender.state}
                                    onChange={(e) => updateSection('sender', 'state', e.target.value)}
                                    disabled={!!id}
                                >
                                    {INDIAN_STATES.map(state => (
                                        <option key={state} value={state}>{state}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Bank Name" value={invoice.sender.bankName} onChange={(e) => updateSection('sender', 'bankName', e.target.value)} disabled={!!id} />
                                <Input label="Account No" value={invoice.sender.bankAccount} onChange={(e) => updateSection('sender', 'bankAccount', e.target.value)} disabled={!!id} />
                                <Input label="IFSC Code" value={invoice.sender.bankIfsc} onChange={(e) => updateSection('sender', 'bankIfsc', e.target.value)} disabled={!!id} />
                                <Input label="Branch" value={invoice.sender.bankBranch} onChange={(e) => updateSection('sender', 'bankBranch', e.target.value)} disabled={!!id} />
                            </div>
                        </div>
                    </Card>

                    {/* 2. Client Details */}
                    <Card className="p-5 border-l-4 border-l-purple-500">
                        <h3 className="font-semibold text-lg mb-4 text-purple-700">Client Details</h3>
                        <div className="grid gap-4">
                            <Input label="Client Name" value={invoice.client.name} onChange={(e) => updateSection('client', 'name', e.target.value)} disabled={!!id} />
                            <Input label="Company" value={invoice.client.company} onChange={(e) => updateSection('client', 'company', e.target.value)} disabled={!!id} />
                            <Input label="Details/Address" value={invoice.client.address} onChange={(e) => updateSection('client', 'address', e.target.value)} disabled={!!id} />
                            <div>
                                <label className="text-sm font-semibold text-muted-foreground block mb-1">State (Place of Supply)</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={invoice.client.state}
                                    onChange={(e) => updateSection('client', 'state', e.target.value)}
                                    disabled={!!id}
                                >
                                    {INDIAN_STATES.map(state => (
                                        <option key={state} value={state}>{state}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Client GSTIN" value={invoice.client.taxId} onChange={(e) => updateSection('client', 'taxId', e.target.value)} />
                                <Input label="Email" value={invoice.client.email} onChange={(e) => updateSection('client', 'email', e.target.value)} />
                            </div>
                        </div>
                    </Card>

                    {/* 3. Invoice Meta */}
                    <Card className="p-5 border-l-4 border-l-green-500">
                        <h3 className="font-semibold text-lg mb-4 text-green-700">Invoice Info</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Invoice Number" value={invoice.meta.number} onChange={(e) => updateSection('meta', 'number', e.target.value)} disabled={!!id} />
                            <Input type="date" label="Date" value={invoice.meta.date} onChange={(e) => updateSection('meta', 'date', e.target.value)} disabled={!!id} />
                            <Input type="date" label="Due Date" value={invoice.meta.dueDate} onChange={(e) => updateSection('meta', 'dueDate', e.target.value)} disabled={!!id} />
                            <div>
                                <label className="text-sm font-semibold text-muted-foreground">Tax Type <span className="text-xs font-normal text-blue-600">(Auto-detected)</span></label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-gray-100 px-3 py-2 text-sm opacity-80 cursor-not-allowed"
                                    value={invoice.global.taxType}
                                    onChange={(e) => updateSection('global', 'taxType', e.target.value)}
                                    disabled={true}
                                >
                                    <option value="CGST_SGST">CGST + SGST (Intra-state)</option>
                                    <option value="IGST">IGST (Inter-state)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-muted-foreground">Payment Status</label>
                                <select
                                    className={`flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm font-medium ${invoice.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-background'}`}
                                    value={invoice.status || 'Unpaid'}
                                    onChange={(e) => setInvoice(prev => ({ ...prev, status: e.target.value }))}
                                >
                                    <option value="Unpaid">Unpaid / Pending</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Partial">Partial Payment</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-muted-foreground">Amount Received</label>
                                <Input
                                    type="number"
                                    value={invoice.amountPaid || 0}
                                    onChange={(e) => setInvoice(prev => ({ ...prev, amountPaid: Number(e.target.value) }))}
                                    className="bg-background"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* 4. Items */}
                    <Card className="p-5">
                        <h3 className="font-semibold text-lg mb-4">Items Included</h3>
                        <div className="space-y-6">
                            {invoice.items.map((item, index) => (
                                <div key={item.id} className="relative p-4 border rounded-lg bg-gray-50/50">
                                    <div className="absolute top-2 right-2">
                                        {!id && (
                                            <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="h-6 w-6 text-red-500">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-12 gap-3">
                                        <div className="col-span-8">
                                            <Input label="Item Description" className="bg-white" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} disabled={!!id} />
                                        </div>
                                        <div className="col-span-4">
                                            <Input label="HSN/SAC" className="bg-white" value={item.hsn} onChange={(e) => updateItem(item.id, 'hsn', e.target.value)} disabled={!!id} />
                                        </div>
                                        <div className="col-span-3">
                                            <Input type="number" label="Qty" className="bg-white" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} disabled={!!id} />
                                        </div>
                                        <div className="col-span-3">
                                            <Input label="Unit" className="bg-white" placeholder="Kg/Nos" value={item.unit} onChange={(e) => updateItem(item.id, 'unit', e.target.value)} disabled={!!id} />
                                        </div>
                                        <div className="col-span-3">
                                            <Input type="number" label="Price" className="bg-white" value={item.price} onChange={(e) => updateItem(item.id, 'price', e.target.value)} disabled={!!id} />
                                        </div>
                                        <div className="col-span-3 text-right pt-8 font-bold">
                                            ₹ {(item.quantity * item.price).toFixed(2)}
                                        </div>

                                        {/* Tax Rates */}
                                        <div className="col-span-12 grid grid-cols-4 gap-3 pt-2 border-t mt-2 items-end">
                                            <div className="col-span-1">
                                                <label className="text-xs font-medium text-gray-500 block mb-1">GST Rate</label>
                                                <select
                                                    className="w-full text-xs border rounded p-1 h-8 bg-gray-100"
                                                    value={item.gstRate}
                                                    onChange={(e) => updateItem(item.id, 'gstRate', Number(e.target.value))}
                                                    disabled={!!id}
                                                >
                                                    {GST_RATES.map(rate => (
                                                        <option key={rate} value={rate}>{rate}%</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Read Only Tax Display */}
                                            {invoice.global.taxType === 'IGST' ? (
                                                <div className="col-span-1">
                                                    <label className="text-xs font-medium text-gray-500">IGST ({item.igst}%)</label>
                                                    <div className="text-xs p-1 text-gray-700 font-mono">
                                                        ₹ {((item.price * item.quantity) * (item.igst / 100)).toFixed(2)}
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="col-span-1">
                                                        <label className="text-xs font-medium text-gray-500">CGST ({item.cgst}%)</label>
                                                        <div className="text-xs p-1 text-gray-700 font-mono">
                                                            ₹ {((item.price * item.quantity) * (item.cgst / 100)).toFixed(2)}
                                                        </div>
                                                    </div>
                                                    <div className="col-span-1">
                                                        <label className="text-xs font-medium text-gray-500">SGST ({item.sgst}%)</label>
                                                        <div className="text-xs p-1 text-gray-700 font-mono">
                                                            ₹ {((item.price * item.quantity) * (item.sgst / 100)).toFixed(2)}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {!id && (
                                <Button variant="outline" onClick={addItem} className="w-full border-blue-200 text-blue-600 hover:bg-blue-50">
                                    <Plus className="mr-2 h-4 w-4" /> Add Another Item
                                </Button>
                            )}
                        </div>
                    </Card>
                </div>

                {/* RIGHT COLUMN: PREVIEW */}
                {showPreview && (
                    <div className="hidden xl:block xl:w-7/12 sticky top-24">
                        <div className="bg-gray-800 rounded-t-lg p-2 text-white text-xs font-medium text-center">
                            Live Preview (A4)
                        </div>
                        <div className="border shadow-2xl bg-white overflow-hidden max-h-[calc(100vh-150px)] overflow-y-auto">
                            <div id="invoice-preview-container" className="w-full min-h-[1000px]">
                                <InvoiceTemplateClassic invoice={invoice} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreateInvoice;
