import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../components/ui/Components';
import { Plus, Trash2, Save, Download, Eye, EyeOff } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, doc, getDoc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';
import InvoiceTemplateClassic from '../components/InvoiceTemplateClassic';
import html2pdf from 'html2pdf.js';
import { validateGSTIN, validateEmail, validatePhone, validateName, validateAmount, validateInvoiceNumber } from '../utils/validation';

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
        bankAccount: '',
        bankIfsc: '',
        bankBranch: '',
        signature: ''
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
    status: 'Unpaid',
    locked: false // New Locked Field
};

const CreateInvoice = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // Get ID from URL
    const { currentUser, userProfile } = useAuth(); // Get auth user
    const [loading, setLoading] = useState(false);
    const [invoice, setInvoice] = useState(INITIAL_STATE);
    const [showPreview, setShowPreview] = useState(true);
    const [clients, setClients] = useState([]);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [items, setItems] = useState([]); // Master Items List
    const [errors, setErrors] = useState({});

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
                            global: data.global || INITIAL_STATE.global,
                            locked: data.locked || false, // Load locked status
                            status: data.status || 'Unpaid'
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

    // Fetch Clients List for Dropdown
    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, 'clients'),
            where('ownerId', '==', currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const clientsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Sort clients by name
            clientsData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            setClients(clientsData);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // Fetch Items List for Dropdown
    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, 'items'),
            where('ownerId', '==', currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const itemsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Sort items by name
            itemsData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            setItems(itemsData);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // Load User Profile (Sender Details) on Mount
    useEffect(() => {
        if (!id && userProfile) {
            // Only if not editing an existing invoice
            if (userProfile.businessName) {
                setInvoice(prev => ({
                    ...prev,
                    sender: {
                        name: userProfile.businessName || userProfile.displayName || '',
                        address: userProfile.address || '',
                        state: userProfile.state || 'Maharashtra',
                        email: userProfile.email || '',
                        phone: userProfile.phone || '',
                        taxId: userProfile.gstin || '',
                        bankName: userProfile.bankName || '',
                        bankAccount: userProfile.bankAccount || '',
                        bankIfsc: userProfile.bankIfsc || '',
                        bankIfsc: userProfile.bankIfsc || '',
                        bankBranch: userProfile.bankBranch || '',
                        signature: userProfile.signature || ''
                    },
                    client: { ...prev.client, state: userProfile.state || 'Maharashtra' }
                }));
            }
        }
    }, [id, userProfile]);

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

    const handleClientSelect = (clientId) => {
        setSelectedClientId(clientId);
        if (!clientId) {
            // Let's keep current state to be safe.
            return;
        }

        const client = clients.find(c => c.id === clientId);
        if (client) {
            setInvoice(prev => ({
                ...prev,
                client: {
                    name: client.name || '',
                    company: client.name || '',
                    address: client.address || '',
                    state: client.state || 'Maharashtra',
                    email: client.email || '',
                    taxId: client.gstin || '',
                    phone: client.phone || ''
                }
            }));
        }
    };

    const handleItemSelect = (invoiceItemId, masterItemId) => {
        if (!masterItemId) return;

        const masterItem = items.find(i => i.id === masterItemId);
        if (masterItem) {
            setInvoice(prev => ({
                ...prev,
                items: prev.items.map(item => item.id === invoiceItemId ? {
                    ...item,
                    description: masterItem.name,
                    hsn: masterItem.hsn,
                    price: masterItem.price,
                    gstRate: masterItem.gstRate,
                    unit: masterItem.unit || 'nos'
                } : item)
            }));
        }
    };

    const calculateTotal = () => {
        // Basic total calculation for storing in DB summary
        const subtotal = invoice.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
        // ... complete logic is in the template, this is just for the list view
        return subtotal;
    };



    const validateInvoice = () => {
        const newErrors = {};

        // 1. Business Details (Only if typed manually, but good to check anyway)
        const senderNameErr = validateName(invoice.sender.name, "Business Name");
        if (senderNameErr) newErrors['sender.name'] = senderNameErr;

        if (invoice.sender.taxId) {
            const gstinErr = validateGSTIN(invoice.sender.taxId);
            if (gstinErr) newErrors['sender.taxId'] = gstinErr;
        } else {
            // User requested Strict GSTIN enforcement
            newErrors['sender.taxId'] = "Business GSTIN is required";
        }

        // 2. Client Details
        const clientNameErr = validateName(invoice.client.name, "Client Name");
        if (clientNameErr) newErrors['client.name'] = clientNameErr;

        // Client GSTIN is optional (B2C), but if provided must be valid
        if (invoice.client.taxId) {
            const gstinErr = validateGSTIN(invoice.client.taxId);
            if (gstinErr) newErrors['client.taxId'] = gstinErr;
        }

        // 3. Invoice Meta
        const invNumErr = validateInvoiceNumber(invoice.meta.number);
        if (invNumErr) newErrors['meta.number'] = invNumErr;

        if (!invoice.meta.date) newErrors['meta.date'] = "Invoice Date is required";

        // 4. Items
        if (invoice.items.length === 0) {
            newErrors['items'] = "At least one item is required";
        } else {
            invoice.items.forEach((item, index) => {
                if (!item.quantity || Number(item.quantity) <= 0) {
                    newErrors[`items.${index}.quantity`] = "Qty > 0";
                }
                const priceErr = validateAmount(item.price, "Price");
                if (priceErr) newErrors[`items.${index}.price`] = priceErr;

                if (!item.description) newErrors[`items.${index}.description`] = "Required";
            });
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const updateSection = (section, field, value) => {
        setInvoice(prev => ({
            ...prev,
            [section]: { ...prev[section], [field]: value }
        }));

        // Clear specific error
        const errorKey = `${section}.${field}`;
        if (errors[errorKey]) {
            setErrors(prev => {
                const newErrs = { ...prev };
                delete newErrs[errorKey];
                return newErrs;
            });
        }
    };

    const handleBlur = (section, field, value) => {
        let error = null;
        if (field === 'name') error = validateName(value, "Name");
        else if (field === 'taxId') {
            if (section === 'sender' && !value) error = "Business GSTIN is required";
            else error = validateGSTIN(value);
        }
        else if (field === 'number') error = validateInvoiceNumber(value);

        const errorKey = `${section}.${field}`;
        setErrors(prev => ({
            ...prev,
            [errorKey]: error
        }));
    };

    const handleSignatureUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 500000) { // 500KB limit
                alert("File is too large. Please upload an image under 500KB.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                updateSection('sender', 'signature', reader.result);
            };
            reader.readAsDataURL(file);
        }
    };



    const updateItem = (id, field, value) => {
        setInvoice(prev => ({
            ...prev,
            items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
        }));
    };

    const handleItemBlur = (index, field, value) => {
        let error = null;
        if (field === 'price') error = validateAmount(value, "Price");
        else if (field === 'quantity') {
            if (!value || Number(value) <= 0) error = "Qty > 0";
        }
        else if (field === 'description') {
            if (!value) error = "Required";
        }

        const errorKey = `items.${index}.${field}`;
        setErrors(prev => ({
            ...prev,
            [errorKey]: error
        }));
    };

    const saveInvoiceToDb = async (shouldNavigate = true) => {
        if (!validateInvoice()) {
            alert("Please fix validation errors before saving.");
            return false;
        }

        setLoading(true);
        try {
            // ... (rest of save logic is preserved if it was below, but it was overwritten, so I must restore it)
            // Actually, I need to restore the WHOLE save function because it was likely lost in the blast.
            // For safety, I will put the simplified version here and trust the user to test, or I paste the full version.
            // I'll paste the full version to be safe.

            if (id) {
                const updateData = {
                    status: invoice.status || 'Unpaid',
                    amountPaid: invoice.amountPaid || 0,
                    updatedAt: new Date().toISOString()
                };
                if (invoice.status === 'Paid') updateData.locked = true;
                await updateDoc(doc(db, "invoices", id), updateData);
                if (shouldNavigate) navigate('/invoices');
                return true;
            }

            // IF CREATING: Validate & Calculate Final Snapshot
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
                const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;
                return {
                    ...item,
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

            const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;
            const summary = finalItems.reduce((acc, item) => ({
                totalTaxableValue: acc.totalTaxableValue + item.taxableValue,
                totalCGST: acc.totalCGST + item.cgstAmount,
                totalSGST: acc.totalSGST + item.sgstAmount,
                totalIGST: acc.totalIGST + item.igstAmount,
                grandTotal: acc.grandTotal + item.totalItemValue
            }), { totalTaxableValue: 0, totalCGST: 0, totalSGST: 0, totalIGST: 0, grandTotal: 0 });

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
                locked: invoice.status === 'Paid',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                meta: invoice.meta,
                global: invoice.global,
                ownerId: currentUser.uid
            };

            await addDoc(collection(db, "invoices"), invoiceData);
            if (shouldNavigate) navigate('/invoices');
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
        const saved = await saveInvoiceToDb(false);
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold tracking-tight">{id ? 'Edit Invoice' : 'Create Invoice'}</h2>
                    {invoice.locked && (
                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold border border-red-200 flex items-center gap-1">
                            🔒 Locked
                        </span>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
                        {showPreview ? <><EyeOff className="mr-2 h-4 w-4" /> Hide Preview</> : <><Eye className="mr-2 h-4 w-4" /> Show Preview</>}
                    </Button>
                    <Button variant="secondary" onClick={handleDownloadPDF} disabled={loading}>
                        <Download className="mr-2 h-4 w-4" /> {loading ? 'Saving...' : 'Save & Download'}
                    </Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-green-600 hover:bg-green-700">
                        <Save className="mr-2 h-4 w-4" /> {loading ? 'Saving...' : 'Save & Close'}
                    </Button>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-6 items-start">
                <div className={`w-full ${showPreview ? 'xl:w-5/12' : 'xl:w-full'} space-y-6 transition-all duration-300`}>
                    {/* 1. Business Details */}
                    <Card className="p-5 border-l-4 border-l-blue-500">
                        <h3 className="font-semibold text-lg mb-4 text-blue-700">Business Details</h3>
                        <div className="grid gap-4">
                            <div className="space-y-1">
                                <Input label="Business Name" value={invoice.sender.name} onChange={(e) => updateSection('sender', 'name', e.target.value)} onBlur={(e) => handleBlur('sender', 'name', e.target.value)} disabled={invoice.locked} className={errors['sender.name'] ? "border-red-500" : ""} />
                                {errors['sender.name'] && <p className="text-xs text-red-500">{errors['sender.name']}</p>}
                            </div>
                            <Input label="Address" value={invoice.sender.address} onChange={(e) => updateSection('sender', 'address', e.target.value)} disabled={invoice.locked} />
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Input label="GSTIN" value={invoice.sender.taxId} onChange={(e) => updateSection('sender', 'taxId', e.target.value)} onBlur={(e) => handleBlur('sender', 'taxId', e.target.value)} disabled={invoice.locked} className={errors['sender.taxId'] ? "border-red-500" : ""} />
                                    {errors['sender.taxId'] && <p className="text-xs text-red-500">{errors['sender.taxId']}</p>}
                                </div>
                                <Input label="Phone" value={invoice.sender.phone} onChange={(e) => updateSection('sender', 'phone', e.target.value)} disabled={invoice.locked} />
                            </div>
                            {/* ... state select ... */}
                            <div className="grid grid-cols-1 gap-4">
                                <label className="text-sm font-semibold text-muted-foreground block mb-1">Business State</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={invoice.sender.state}
                                    onChange={(e) => updateSection('sender', 'state', e.target.value)}
                                    disabled={invoice.locked}
                                >
                                    {INDIAN_STATES.map(state => (
                                        <option key={state} value={state}>{state}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Bank Name" value={invoice.sender.bankName} onChange={(e) => updateSection('sender', 'bankName', e.target.value)} disabled={invoice.locked} />
                                <Input label="Account No" value={invoice.sender.bankAccount} onChange={(e) => updateSection('sender', 'bankAccount', e.target.value)} disabled={invoice.locked} />
                                <Input label="IFSC Code" value={invoice.sender.bankIfsc} onChange={(e) => updateSection('sender', 'bankIfsc', e.target.value)} disabled={invoice.locked} />
                                <Input label="Branch" value={invoice.sender.bankBranch} onChange={(e) => updateSection('sender', 'bankBranch', e.target.value)} disabled={invoice.locked} />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-muted-foreground block mb-1">Authorized Signature</label>
                                <div className="flex items-center gap-4">
                                    {!invoice.locked && (
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleSignatureUpload}
                                            className="cursor-pointer text-xs file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                                        />
                                    )}
                                    {invoice.sender.signature && (
                                        <div className="relative border p-1 rounded bg-white">
                                            <img src={invoice.sender.signature} alt="Signature Preview" className="h-10 object-contain" />
                                            {!invoice.locked && (
                                                <button
                                                    onClick={() => updateSection('sender', 'signature', '')}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 w-4 h-4 flex items-center justify-center text-[10px]"
                                                    title="Remove"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card >

                    {/* 2. Client Details */}
                    < Card className="p-5 border-l-4 border-l-purple-500" >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-lg text-purple-700">Client Details</h3>
                            {!invoice.locked && (
                                <select
                                    className="h-9 w-[200px] rounded-md border border-input bg-background px-3 text-sm"
                                    value={selectedClientId}
                                    onChange={(e) => handleClientSelect(e.target.value)}
                                >
                                    <option value="">-- Select Client --</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div className="grid gap-4">
                            <div className="space-y-1">
                                <Input label="Client Name" value={invoice.client.name} onChange={(e) => updateSection('client', 'name', e.target.value)} onBlur={(e) => handleBlur('client', 'name', e.target.value)} disabled={invoice.locked} className={errors['client.name'] ? "border-red-500" : ""} />
                                {errors['client.name'] && <p className="text-xs text-red-500">{errors['client.name']}</p>}
                            </div>
                            <Input label="Company" value={invoice.client.company} onChange={(e) => updateSection('client', 'company', e.target.value)} disabled={invoice.locked} />
                            <Input label="Details/Address" value={invoice.client.address} onChange={(e) => updateSection('client', 'address', e.target.value)} disabled={invoice.locked} />
                            <div>
                                <label className="text-sm font-semibold text-muted-foreground block mb-1">State (Place of Supply)</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={invoice.client.state}
                                    onChange={(e) => updateSection('client', 'state', e.target.value)}
                                    disabled={invoice.locked}
                                >
                                    {INDIAN_STATES.map(state => (
                                        <option key={state} value={state}>{state}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Input label="Client GSTIN" value={invoice.client.taxId} onChange={(e) => updateSection('client', 'taxId', e.target.value)} onBlur={(e) => handleBlur('client', 'taxId', e.target.value)} disabled={invoice.locked} className={errors['client.taxId'] ? "border-red-500" : ""} />
                                    {errors['client.taxId'] && <p className="text-xs text-red-500">{errors['client.taxId']}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Email" value={invoice.client.email} onChange={(e) => updateSection('client', 'email', e.target.value)} disabled={invoice.locked} />
                                    <Input label="Phone" value={invoice.client.phone} onChange={(e) => updateSection('client', 'phone', e.target.value)} disabled={invoice.locked} />
                                </div>
                            </div>
                        </div>
                    </Card >

                    {/* 3. Invoice Meta */}
                    < Card className="p-5 border-l-4 border-l-green-500" >
                        <h3 className="font-semibold text-lg mb-4 text-green-700">Invoice Info</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Invoice Number" value={invoice.meta.number} onChange={(e) => updateSection('meta', 'number', e.target.value)} disabled={invoice.locked} />
                            <Input type="date" label="Date" value={invoice.meta.date} onChange={(e) => updateSection('meta', 'date', e.target.value)} disabled={invoice.locked} />
                            <Input type="date" label="Due Date" value={invoice.meta.dueDate} onChange={(e) => updateSection('meta', 'dueDate', e.target.value)} disabled={invoice.locked} />
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
                    </Card >

                    {/* 4. Items */}
                    < Card className="p-5" >
                        <h3 className="font-semibold text-lg mb-4">Items Included</h3>
                        <div className="space-y-6">
                            {invoice.items.map((item, index) => (
                                <div key={item.id} className="relative p-4 border rounded-lg bg-gray-50/50">
                                    <div className="absolute top-2 right-2">
                                        {!invoice.locked && (
                                            <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="h-6 w-6 text-red-500">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-12 gap-3">
                                        <div className="col-span-8">

                                            {!invoice.locked && (
                                                <div className="mb-2">
                                                    <select
                                                        className="w-full h-8 text-xs border rounded bg-blue-50/50"
                                                        onChange={(e) => handleItemSelect(item.id, e.target.value)}
                                                        value=""
                                                    >
                                                        <option value="" disabled>Select from Saved Items (Optional)</option>
                                                        {items.map(i => (
                                                            <option key={i.id} value={i.id}>{i.name} - ₹{i.price}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            <div className="space-y-1">
                                                <Input label="Item Description" className={`bg-white ${errors[`items.${index}.description`] ? "border-red-500" : ""}`} value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} onBlur={(e) => handleItemBlur(index, 'description', e.target.value)} disabled={invoice.locked} />
                                                {errors[`items.${index}.description`] && <p className="text-xs text-red-500">{errors[`items.${index}.description`]}</p>}
                                            </div>
                                        </div>
                                        <div className="col-span-4">
                                            <Input label="HSN/SAC" className="bg-white" value={item.hsn} onChange={(e) => updateItem(item.id, 'hsn', e.target.value)} disabled={invoice.locked} />
                                        </div>
                                        <div className="col-span-3">
                                            <div className="space-y-1">
                                                <Input type="number" label="Qty" className={`bg-white ${errors[`items.${index}.quantity`] ? "border-red-500" : ""}`} value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} onBlur={(e) => handleItemBlur(index, 'quantity', e.target.value)} disabled={invoice.locked} />
                                                {errors[`items.${index}.quantity`] && <p className="text-xs text-red-500">{errors[`items.${index}.quantity`]}</p>}
                                            </div>
                                        </div>
                                        <div className="col-span-3">
                                            <Input label="Unit" className="bg-white" placeholder="Kg/Nos" value={item.unit} onChange={(e) => updateItem(item.id, 'unit', e.target.value)} disabled={invoice.locked} />
                                        </div>
                                        <div className="col-span-3">
                                            <div className="space-y-1">
                                                <Input type="number" label="Price" className={`bg-white ${errors[`items.${index}.price`] ? "border-red-500" : ""}`} value={item.price} onChange={(e) => updateItem(item.id, 'price', e.target.value)} onBlur={(e) => handleItemBlur(index, 'price', e.target.value)} disabled={invoice.locked} />
                                                {errors[`items.${index}.price`] && <p className="text-xs text-red-500">{errors[`items.${index}.price`]}</p>}
                                            </div>
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
                                                    disabled={invoice.locked}
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
                            {!invoice.locked && (
                                <Button variant="outline" onClick={addItem} className="w-full border-blue-200 text-blue-600 hover:bg-blue-50">
                                    <Plus className="mr-2 h-4 w-4" /> Add Another Item
                                </Button>
                            )}
                        </div>
                    </Card >
                </div >

                {/* RIGHT COLUMN: PREVIEW */}
                {
                    showPreview && (
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
                    )
                }
            </div >
        </div >
    );
};

export default CreateInvoice;
