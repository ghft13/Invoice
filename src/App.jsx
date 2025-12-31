import { useState, useEffect } from 'react';
import { Card, Button, Input } from './components/ui/Components';
import { Plus, Trash2, Download, RefreshCw, FileText, Upload, Mic } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { amountToWords } from './utils/numberToWords';
import { db } from './firebase';
import { collection, addDoc, updateDoc, doc, onSnapshot, increment } from 'firebase/firestore';

import { useVoiceInput } from './hooks/useVoiceInput';
import { parseVoiceCommand, parseItemDetails } from './utils/voiceParser';

import Subscription from './components/Subscription';

const INITIAL_STATE = {
  sender: { name: '', address: '', email: '', phone: '', taxId: '', logo: null },
  client: { name: '', company: '', address: '', email: '', phone: '', taxId: '' },
  meta: { number: 'INV-001', date: new Date().toISOString().split('T')[0], dueDate: '', currency: 'INR' },
  items: [{ id: 1, description: '', hsn: '', quantity: 1, price: 0, cgst: 0, sgst: 0, igst: 0 }],
  payment: { method: 'Bank Transfer', details: '', notes: '' },
  global: { discount: 0, discountType: 'flat', notes: '', terms: '', taxType: 'IGST', roundOff: true, template: 'modern' }
};

import Signup from './components/Signup';
import AdminPanel from './components/AdminPanel';

const incrementInvoiceNumber = (currentNumber) => {
  if (!currentNumber) return 'INV-001';

  // Extract trailing number
  const match = currentNumber.match(/(\d+)$/);
  if (match) {
    const numberStr = match[1];
    const number = parseInt(numberStr, 10);
    const newNumber = number + 1;
    // Pad with zeros to match original length
    const paddedNewNumber = newNumber.toString().padStart(numberStr.length, '0');
    return currentNumber.slice(0, -numberStr.length) + paddedNewNumber;
  }

  // Fallback if no trailing number
  return currentNumber + '-001';
};

function App() {
  const [user, setUser] = useState(() => {
    const savedForUser = localStorage.getItem('user_profile');
    return savedForUser ? JSON.parse(savedForUser) : null;
  });

  // Listen for real-time user updates (e.g. Admin Approval)
  useEffect(() => {
    if (user?.id) {
      const unsub = onSnapshot(doc(db, "users", user.id), (doc) => {
        if (doc.exists()) {
          const newData = { ...doc.data(), id: doc.id };
          // Only update if there are changes to avoid loop/re-renders
          if (JSON.stringify(newData) !== JSON.stringify(user)) {
            setUser(newData);
            localStorage.setItem('user_profile', JSON.stringify(newData));
          }
        }
      });
      return () => unsub();
    }
  }, [user?.id]);

  const [invoice, setInvoice] = useState(() => {
    const saved = localStorage.getItem('invoice_draft');
    if (saved) {
      return JSON.parse(saved);
    }
    // If no draft but we have a user, pre-fill some info
    if (user) {
      return {
        ...INITIAL_STATE,
        sender: { ...INITIAL_STATE.sender, name: user.name, phone: user.phone }
      };
    }
    return INITIAL_STATE;
  });

  // Derived state from user object, default to 0
  const invoiceCount = user?.invoiceCount || 0;

  const [activeTab, setActiveTab] = useState('edit'); // 'edit' or 'preview' mobile toggle

  const { isListening, startListening } = useVoiceInput();
  const [activeVoiceId, setActiveVoiceId] = useState(null);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    if (!isListening) {
      setActiveVoiceId(null);
    }
  }, [isListening]);

  const handleGlobalVoiceInput = () => {
    setActiveVoiceId('global');
    startListening((text) => {
      const { updates, newItems } = parseVoiceCommand(text);

      let updatedFields = [];
      let addedItemsCount = 0;

      if (Object.keys(updates).length > 0 || (newItems && newItems.length > 0)) {
        setInvoice(prev => {
          const nextInvoice = { ...prev };

          // Apply Field Updates
          Object.entries(updates).forEach(([path, value]) => {
            const parts = path.split('.');
            if (parts.length === 2) {
              const [section, field] = parts;
              if (nextInvoice[section]) {
                nextInvoice[section] = {
                  ...nextInvoice[section],
                  [field]: value
                };
                updatedFields.push(path);
              }
            }
          });

          // Apply New Items
          if (newItems && newItems.length > 0) {
            const itemsToAdd = newItems.map((item, idx) => ({
              id: Date.now() + idx, // Ensure unique ID
              description: '', hsn: '', quantity: 1, price: 0, // Safe defaults for common fields
              cgst: 0, sgst: 0, igst: 0, // Defaults for taxes
              ...item // Override with parsed values
            }));
            nextInvoice.items = [...nextInvoice.items, ...itemsToAdd];
            addedItemsCount = itemsToAdd.length;
          }

          return nextInvoice;
        });

        const feedback = [];
        if (updatedFields.length > 0) feedback.push(`Updated: ${updatedFields.map(f => f.split('.')[1]).join(', ')}`);
        if (addedItemsCount > 0) feedback.push(`Added ${addedItemsCount} new item(s)`);

        alert(feedback.join('\n'));
      } else {
        alert("No recognizable commands found. Try 'Business Name ABC' or 'Item Laptop Price 500'");
      }
    });
  };

  const handleVoiceInput = (itemId) => {
    setActiveVoiceId(itemId);
    startListening((text) => {
      // 1. Try parsing structured command (e.g. "Qty 5 Description Soap")
      const itemData = parseItemDetails(text);

      if (Object.keys(itemData).length > 0) {
        Object.entries(itemData).forEach(([field, value]) => {
          updateItem(itemId, field, value);
        });
      } else {
        // 2. Fallback: Just a number? Treat as Price (Legacy behavior)
        const numericString = text.replace(/[^0-9.]/g, '');
        const value = parseFloat(numericString);
        if (!isNaN(value)) {
          updateItem(itemId, 'price', value);
        }
      }
    });
  };

  useEffect(() => {
    localStorage.setItem('invoice_draft', JSON.stringify(invoice));
  }, [invoice]);

  const updateSection = (section, field, value) => {
    setInvoice(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSection('sender', 'logo', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const addItem = () => {
    setInvoice(prev => ({
      ...prev,
      items: [...prev.items, { id: Date.now(), description: '', hsn: '', quantity: 1, price: 0, cgst: 0, sgst: 0, igst: 0 }]
    }));
  };

  const removeItem = (id) => {
    setInvoice(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const updateItem = (id, field, value) => {
    setInvoice(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const calculateTotals = () => {
    const subtotal = invoice.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);

    // Tax calculation based on Tax Type
    let totalTaxAmount = 0;
    let cgst = 0, sgst = 0, igst = 0;

    invoice.items.forEach(item => {
      const itemAmount = item.quantity * item.price;
      if (invoice.global.taxType === 'CGST_SGST') {
        const itemCgst = itemAmount * ((item.cgst || 0) / 100);
        const itemSgst = itemAmount * ((item.sgst || 0) / 100);
        cgst += itemCgst;
        sgst += itemSgst;
        totalTaxAmount += (itemCgst + itemSgst);
      } else {
        const itemIgst = itemAmount * ((item.igst || 0) / 100);
        igst += itemIgst;
        totalTaxAmount += itemIgst;
      }
    });

    let discountAmount = 0;
    if (invoice.global.discountType === 'flat') {
      discountAmount = parseFloat(invoice.global.discount) || 0;
    } else {
      discountAmount = subtotal * ((parseFloat(invoice.global.discount) || 0) / 100);
    }

    let total = subtotal + totalTaxAmount - discountAmount;
    let roundOffAmount = 0;

    if (invoice.global.roundOff) {
      // Rounding logic: > 0.50 same as >= 0.50 (Math.round)
      // 998.60 -> 999
      // 998.40 -> 998
      const roundedTotal = Math.round(total);
      roundOffAmount = roundedTotal - total;
      total = roundedTotal;
    }



    return { subtotal, totalTaxAmount, cgst, sgst, igst, discountAmount, roundOffAmount, total };
  };

  const totals = calculateTotals();

  const handleDownloadPDF = () => {
    // Check Subscription Limit
    if (invoiceCount >= 5 && !user?.isPremium) {
      if (user?.status === 'pending_approval') {
        alert("Your subscription is waiting for Admin Approval. Please check back later.");
        return;
      }
      setShowSubscription(true);
      return;
    }

    const element = document.getElementById('invoice-preview');
    // Temporarily remove shadow and border for clean print
    const originalClass = element.className;
    element.className = 'p-8 bg-white';

    const opts = {
      margin: 0,
      filename: `Invoice_${invoice.meta.number}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };



    html2pdf().set(opts).from(element).save().then(() => {
      element.className = originalClass; // Restore styles

      // Auto-increment Invoice Number
      setInvoice(prev => ({
        ...prev,
        meta: {
          ...prev.meta,
          number: incrementInvoiceNumber(prev.meta.number)
        }
      }));
    });

    // Increment count in Firestore (for both free and premium users)
    if (user?.id) {
      const userRef = doc(db, "users", user.id);
      // Fire and forget update
      updateDoc(userRef, {
        invoiceCount: increment(1)
      }).catch(err => console.error("Error updating invoice count:", err));
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to clear this invoice?')) {
      setInvoice({
        ...INITIAL_STATE,
        // Preserve key business/user details
        sender: user ? {
          ...INITIAL_STATE.sender,
          name: user.name,
          phone: user.phone,
          // Could also preserve logo etc if desired, but sticking to basics as per plan
        } : INITIAL_STATE.sender,
        // Preserve current (or incremented) invoice number
        meta: {
          ...INITIAL_STATE.meta,
          number: invoice.meta.number
        }
      });
    }
  };

  const handleSignup = async (userData) => {
    localStorage.setItem('user_profile', JSON.stringify(userData));
    setUser(userData);

    try {
      const docRef = await addDoc(collection(db, "users"), {
        ...userData,
        isPremium: false,
        invoiceCount: 0,
        createdAt: new Date()
      });
      // Save ID to local storage for future updates (e.g. upgrading)
      const userWithId = { ...userData, id: docRef.id, isPremium: false, invoiceCount: 0 };
      setUser(userWithId);
      localStorage.setItem('user_profile', JSON.stringify(userWithId));
      console.log("User added to Firestore");
    } catch (e) {
      console.error("Error adding document: ", e);
      alert(`Firebase Error: ${e.message}`);
    }

    setInvoice(prev => ({
      ...prev,
      sender: { ...prev.sender, name: userData.name, phone: userData.phone }
    }));
  };

  const handleUpgrade = async (plan, transactionId) => {
    // 1. Update Local State
    const updatedUser = { ...user, isPremium: false, status: 'pending_approval', plan, transactionId };
    setUser(updatedUser);
    localStorage.setItem('user_profile', JSON.stringify(updatedUser));
    setShowSubscription(false);

    // 2. Update Firestore
    if (user?.id) {
      try {
        const userRef = doc(db, "users", user.id);
        await updateDoc(userRef, {
          status: 'pending_approval',
          plan: plan,
          transactionId: transactionId,
          submittedAt: new Date()
        });
        alert("Upgrade Request Submitted! Please wait for Admin Approval.");
      } catch (error) {
        console.error("Error updating premium status:", error);
        // Even if firestore fails, we let them proceed locally for now
      }
    } else {
      alert("Upgrade Request Submitted! (Local only - User ID not found)");
    }
  };

  if (!user) {
    return <Signup onSignup={handleSignup} />;
  }

  if (showSubscription) {
    return <Subscription onSubscribe={handleUpgrade} onClose={() => setShowSubscription(false)} />;
  }

  if (showAdmin) {
    return <AdminPanel onClose={() => setShowAdmin(false)} />;
  }

  return (
    <div className="min-h-screen bg-muted/40 font-sans text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex flex-wrap md:flex-nowrap h-auto min-h-[64px] items-center justify-between py-2 gap-2">
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <span>JAYRAJ.</span>
          </div>

          <div className="flex items-center gap-2 md:gap-4 ml-auto">
            <div className="hidden lg:flex flex-col items-end text-sm">
              <span className="text-muted-foreground cursor-pointer" onClick={() => setShowAdmin(true)}>
                {user?.isPremium ? 'Premium Plan' : user?.status === 'pending_approval' ? 'Verification Pending' : 'Free Plan'}
              </span>
              <span className="font-medium text-foreground">{invoiceCount} / {user?.isPremium ? '∞' : '5'} Invoices</span>
            </div>
            <button
              onClick={handleGlobalVoiceInput}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs md:text-sm font-medium transition-all border ${activeVoiceId === 'global' && isListening
                ? 'bg-red-100 text-red-600 border-red-200 animate-pulse'
                : 'bg-background hover:bg-accent text-foreground border-input'
                }`}
            >
              <Mic className={`h-3 w-3 md:h-4 md:w-4 ${activeVoiceId === 'global' && isListening ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{activeVoiceId === 'global' && isListening ? 'Listening...' : 'Voice Command'}</span>
              <span className="sm:hidden">{activeVoiceId === 'global' && isListening ? '...' : 'Voice'}</span>
            </button>
            <Button variant="outline" size="sm" onClick={handleReset} className="px-2 md:px-4">
              <RefreshCw className="md:mr-2 h-4 w-4" /> <span className="hidden md:inline">New</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownloadPDF}
              className="bg-blue-600 hover:bg-blue-700 px-2 md:px-4"
            >
              <Download className="md:mr-2 h-4 w-4" /> <span className="hidden md:inline">Download</span>
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-8 mx-auto">
        {/* Mobile Tabs */}
        <div className="lg:hidden flex items-center p-1 mb-6 bg-muted rounded-lg w-full max-w-sm mx-auto">
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'edit' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Edit Form
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'preview' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Preview
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          {/* Editor Column */}
          <div className={`lg:col-span-5 space-y-6 ${activeTab === 'edit' ? 'block' : 'hidden lg:block'} `}>

            {/* Business Info */}
            <Card className="border-l-4 border-l-blue-500 ">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">1</div>
                  Business Details
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-muted-foreground">Template:</label>
                  <select
                    className="text-sm bg-background border rounded px-2 py-1"
                    value={invoice.global.template}
                    onChange={(e) => updateSection('global', 'template', e.target.value)}
                  >
                    <option value="modern">Modern</option>
                    <option value="classic">Classic (Tax)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-medium text-muted-foreground">Company Logo</label>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors border-muted-foreground/25 hover:border-blue-500">
                    {invoice.sender.logo ? (
                      <div className="relative w-full h-full p-2 group">
                        <img src={invoice.sender.logo} className="w-full h-full object-contain" alt="Logo" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md text-white text-xs">Change</div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-muted-foreground">
                        <Upload className="w-8 h-8 mb-2 text-blue-500" />
                        <p className="text-xs">Click to upload logo</p>
                      </div>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  </label>
                </div>

                <div className="space-y-4">
                  <Input
                    label="Business Name"
                    placeholder="e.g. Acme Corp"
                    value={invoice.sender.name}
                    onChange={(e) => updateSection('sender', 'name', e.target.value)}
                  />
                  <Input
                    label="Email Address"
                    placeholder="billing@acme.com"
                    value={invoice.sender.email}
                    onChange={(e) => updateSection('sender', 'email', e.target.value)}
                  />
                </div>

                <Input
                  className="md:col-span-2"
                  label="Business Address"
                  placeholder="123 Business St, City, Country"
                  value={invoice.sender.address}
                  onChange={(e) => updateSection('sender', 'address', e.target.value)}
                />

                <Input
                  label="Phone Number"
                  placeholder="+1 (555) 000-0000"
                  value={invoice.sender.phone}
                  onChange={(e) => updateSection('sender', 'phone', e.target.value)}
                />
                <Input
                  label="Tax / GST ID"
                  placeholder="Optional"
                  value={invoice.sender.taxId}
                  onChange={(e) => updateSection('sender', 'taxId', e.target.value)}
                />
              </div>
            </Card>

            {/* Client Info */}
            <Card className="border-l-4 border-l-purple-500">
              <div className="flex items-center gap-2 mb-6 text-lg font-semibold text-gray-800">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">2</div>
                Client Details
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Client Name"
                  placeholder="John Doe"
                  value={invoice.client.name}
                  onChange={(e) => updateSection('client', 'name', e.target.value)}
                />
                <Input
                  label="Company Name"
                  placeholder="Client Co (Optional)"
                  value={invoice.client.company}
                  onChange={(e) => updateSection('client', 'company', e.target.value)}
                />
                <Input
                  className="md:col-span-2"
                  label="Client Address"
                  placeholder="456 Client Rd, City"
                  value={invoice.client.address}
                  onChange={(e) => updateSection('client', 'address', e.target.value)}
                />
                <Input
                  label="Client Email"
                  placeholder="client@email.com"
                  value={invoice.client.email}
                  onChange={(e) => updateSection('client', 'email', e.target.value)}
                />
                <Input
                  label="Client GSTIN"
                  placeholder="Optional"
                  value={invoice.client.taxId}
                  onChange={(e) => updateSection('client', 'taxId', e.target.value)}
                />
              </div>
            </Card>

            {/* Invoice Meta */}
            <Card className="border-l-4 border-l-green-500">
              <div className="flex items-center gap-2 mb-6 text-lg font-semibold text-gray-800">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">3</div>
                Invoice Details
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <Input
                  label="Number"
                  placeholder="INV-001"
                  value={invoice.meta.number}
                  onChange={(e) => updateSection('meta', 'number', e.target.value)}
                />
                <Input
                  type="date"
                  label="Date"
                  value={invoice.meta.date}
                  onChange={(e) => updateSection('meta', 'date', e.target.value)}
                />
                <Input
                  type="date"
                  label="Due Date"
                  value={invoice.meta.dueDate}
                  onChange={(e) => updateSection('meta', 'dueDate', e.target.value)}
                />
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-muted-foreground">Currency</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={invoice.meta.currency}
                    onChange={(e) => updateSection('meta', 'currency', e.target.value)}
                  >
                    <option value="INR">₹ INR</option>
                    <option value="USD">$ USD</option>
                    <option value="EUR">€ EUR</option>
                    <option value="GBP">£ GBP</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Items */}
            <Card>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Items</h2>
                <span className="text-sm text-muted-foreground">{invoice.items.length} Items</span>
              </div>

              <div className="space-y-4">
                {/* Table Header (Desktop) - 2 Row Style */}
                <div className="hidden md:block px-4 py-2 bg-muted/20 rounded-t-lg border-b text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {/* Top Row Header */}
                  <div className="mb-2 pb-2 border-b border-muted-foreground/10">Description</div>
                  {/* Bottom Row Header */}
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-2 text-center">HSN</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-3 text-center">Price</div>
                    <div className="col-span-3 text-center">Tax</div>
                    <div className="col-span-2 text-right">Total</div>
                  </div>
                </div>

                {invoice.items.map((item) => (
                  <div key={item.id} className="group relative p-4 rounded-lg border bg-muted/10 hover:bg-muted/30 transition-colors">
                    {/* Row 1: Description */}
                    <div className="mb-3">
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block md:hidden">Description</label>
                      <input
                        className="w-full bg-transparent border-0 border-b border-input focus:border-primary focus:ring-0 p-1 text-sm font-medium placeholder:text-muted/50"
                        placeholder="Item description"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      />
                    </div>

                    {/* Row 2: Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-12 gap-3 items-center">
                      <div className="col-span-1 md:col-span-2">
                        <label className="text-xs font-semibold text-muted-foreground mb-1 block md:hidden">HSN/SAC</label>
                        <input
                          className="w-full bg-transparent border border-input rounded p-1 text-sm text-center"
                          placeholder="HSN"
                          value={item.hsn}
                          onChange={(e) => updateItem(item.id, 'hsn', e.target.value)}
                        />
                      </div>

                      <div className="col-span-1 md:col-span-2">
                        <label className="text-xs font-semibold text-muted-foreground mb-1 block md:hidden">Qty</label>
                        <input
                          type="number"
                          className="w-full bg-transparent border border-input rounded p-1 text-sm text-center"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2 md:col-span-3">
                        <label className="text-xs font-semibold text-muted-foreground mb-1 block md:hidden">Price</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            className="w-full bg-transparent border border-input rounded p-1 text-sm text-center"
                            value={item.price}
                            onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                          />
                          <button
                            onClick={() => handleVoiceInput(item.id)}
                            className={`p-1.5 rounded-md transition-all ${activeVoiceId === item.id && isListening
                              ? 'bg-red-100 text-red-600 animate-pulse ring-1 ring-red-400'
                              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                              }`}
                            title="Voice Input"
                            type="button"
                          >
                            <Mic className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {
                        invoice.global.taxType === 'IGST' && (
                          <div className="col-span-1 md:col-span-3">
                            <label className="text-xs font-semibold text-muted-foreground mb-1 block md:hidden">IGST %</label>
                            <select
                              className="w-full bg-transparent border border-input rounded p-1 text-sm text-center h-[30px]"
                              value={item.igst || 0}
                              onChange={(e) => updateItem(item.id, 'igst', parseFloat(e.target.value) || 0)}
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </div>
                        )
                      }
                      {
                        invoice.global.taxType === 'CGST_SGST' && (
                          <>
                            <div className="col-span-1 md:col-span-1">
                              <label className="text-xs font-semibold text-muted-foreground mb-1 block md:hidden">CGST</label>
                              <select
                                className="w-full bg-transparent border border-input rounded p-1 text-sm text-center h-[30px]"
                                value={item.cgst || 0}
                                onChange={(e) => updateItem(item.id, 'cgst', parseFloat(e.target.value) || 0)}
                              >
                                <option value="0">0%</option>
                                <option value="2.5">2.5%</option>
                                <option value="9">9%</option>
                                <option value="14">14%</option>
                              </select>
                            </div>
                            <div className="col-span-1 md:col-span-1.5">
                              <label className="text-xs font-semibold text-muted-foreground mb-1 block md:hidden">SGST</label>
                              <select
                                className="w-full bg-transparent border border-input rounded p-1 text-sm text-center h-[30px]"
                                value={item.sgst || 0}
                                onChange={(e) => updateItem(item.id, 'sgst', parseFloat(e.target.value) || 0)}
                              >
                                <option value="0">0%</option>
                                <option value="2.5">2.5%</option>
                                <option value="9">9%</option>
                                <option value="14">14%</option>
                              </select>
                            </div>
                          </>
                        )
                      }
                      <div className="col-span-2 md:col-span-2 text-right md:text-right flex justify-between md:block items-center">
                        <label className="text-xs font-semibold text-muted-foreground mb-0 md:mb-1 block md:hidden">Total</label>
                        <div className="py-1 text-sm font-bold opacity-80">
                          {(
                            (item.quantity * item.price) * (1 + (
                              invoice.global.taxType === 'IGST'
                                ? (item.igst || 0) / 100
                                : ((item.cgst || 0) + (item.sgst || 0)) / 100
                            ))
                          ).toFixed(2)}
                        </div>
                      </div>
                      <div className="col-span-2 md:col-span-12 flex justify-end pt-2">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Remove Item
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="outline" className="w-full mt-4 border-dashed" onClick={addItem}>
                <Plus className="w-4 h-4 mr-2" /> Add New Item
              </Button>
            </Card>

            {/* Totals & Notes */}
            {/* Totals & Notes */}


          </div>

          {/* Preview Column */}
          <div className={`lg:col-span-7 ${activeTab === 'preview' ? 'block' : 'hidden lg:block'}`}>
            <div className="sticky top-24">
              <div className="relative group overflow-x-auto pb-4 w-full max-w-[100vw] mx-auto md:max-w-full">
                <div id="invoice-preview" className="bg-white text-black shadow-2xl rounded-none md:rounded-lg overflow-hidden min-h-[800px] min-w-[700px] print:shadow-none print:rounded-none">

                  {/* Modern Template */}
                  {invoice.global.template === 'modern' && (
                    <div className="p-8 md:p-12 flex flex-col h-full bg-white relative">
                      {/* Decorative line */}
                      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-purple-600"></div>

                      {/* Header */}
                      <div className="flex justify-between items-start mb-12 mt-4">
                        <div className="space-y-4">
                          {invoice.sender.logo ? (
                            <img src={invoice.sender.logo} className="h-20 object-contain max-w-[200px]" alt="Logo" />
                          ) : (
                            <div className="h-16 flex items-center text-2xl font-bold text-gray-400 tracking-tight tracking-tight uppercase">
                              {invoice.sender.name || 'Business'}
                            </div>
                          )}
                          <div className="text-sm text-gray-500 leading-relaxed">
                            <p className="font-semibold text-gray-900 text-lg">{invoice.sender.name}</p>
                            <p className="whitespace-pre-wrap">{invoice.sender.address}</p>
                            {invoice.sender.email && <p>{invoice.sender.email}</p>}
                            {invoice.sender.phone && <p>{invoice.sender.phone}</p>}
                            {invoice.sender.taxId && <p>GSTIN: {invoice.sender.taxId}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <h1 className="text-6xl font-extralight text-gray-200 tracking-tighter">INVOICE</h1>
                          <div className="mt-4 space-y-1">
                            <p className="text-sm text-gray-500">Invoice No</p>
                            <p className="text-xl font-medium text-gray-900">{invoice.meta.number}</p>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-8 text-left">
                            <div>
                              <p className="text-xs text-gray-400 uppercase tracking-widest">Date</p>
                              <p className="font-medium text-gray-700">{invoice.meta.date}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 uppercase tracking-widest">Due Date</p>
                              <p className="font-medium text-gray-700">{invoice.meta.dueDate || '-'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bill To */}
                      <div className="flex justify-between gap-10 mb-12 p-6 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Bill To</p>
                          <h3 className="text-xl font-bold text-gray-900 mb-1">{invoice.client.name || 'Client Name'}</h3>
                          <p className="text-gray-600 text-sm mb-1">{invoice.client.company}</p>
                          <p className="text-gray-500 text-sm whitespace-pre-line">{invoice.client.address}</p>
                          {invoice.client.taxId && <p className="text-gray-500 text-sm mt-1">GSTIN: {invoice.client.taxId}</p>}
                        </div>
                      </div>

                      {/* Table */}
                      <table className="w-full mb-8">
                        <thead>
                          <tr className="border-b-2 border-gray-900">
                            <th className="text-left py-4 text-xs font-bold text-gray-900 uppercase tracking-wider">Item</th>
                            <th className="text-center py-4 text-xs font-bold text-gray-900 uppercase tracking-wider">HSN</th>
                            <th className="text-right py-4 text-xs font-bold text-gray-900 uppercase tracking-wider">Qty</th>
                            <th className="text-right py-4 text-xs font-bold text-gray-900 uppercase tracking-wider">Price</th>
                            {invoice.global.taxType === 'IGST' && <th className="text-right py-4 text-xs font-bold text-gray-900 uppercase tracking-wider">IGST</th>}
                            {invoice.global.taxType === 'CGST_SGST' && (
                              <>
                                <th className="text-right py-4 text-xs font-bold text-gray-900 uppercase tracking-wider">CGST</th>
                                <th className="text-right py-4 text-xs font-bold text-gray-900 uppercase tracking-wider">SGST</th>
                              </>
                            )}
                            <th className="text-right py-4 text-xs font-bold text-gray-900 uppercase tracking-wider">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {invoice.items.map(item => (
                            <tr key={item.id}>
                              <td className="py-4 text-sm text-gray-700 font-medium">{item.description}</td>
                              <td className="py-4 text-center text-sm text-gray-500">{item.hsn || '-'}</td>
                              <td className="py-4 text-right text-sm text-gray-500">{item.quantity}</td>
                              <td className="py-4 text-right text-sm text-gray-500">{invoice.meta.currency} {item.price.toFixed(2)}</td>
                              {invoice.global.taxType === 'IGST' && (
                                <td className="py-4 text-right text-sm text-gray-500">{item.igst || 0}%</td>
                              )}
                              {invoice.global.taxType === 'CGST_SGST' && (
                                <>
                                  <td className="py-4 text-right text-sm text-gray-500">{item.cgst || 0}%</td>
                                  <td className="py-4 text-right text-sm text-gray-500">{item.sgst || 0}%</td>
                                </>
                              )}
                              <td className="py-4 text-right text-sm text-gray-900 font-bold">{invoice.meta.currency} {
                                (
                                  (item.quantity * item.price) * (1 + (
                                    invoice.global.taxType === 'IGST'
                                      ? (item.igst || 0) / 100
                                      : ((item.cgst || 0) + (item.sgst || 0)) / 100
                                  ))
                                ).toFixed(2)
                              }</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Totals */}
                      <div className="flex justify-end mb-12">
                        <div className="w-1/2 space-y-3">
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>Subtotal</span>
                            <span className="font-medium">{invoice.meta.currency} {totals.subtotal.toFixed(2)}</span>
                          </div>
                          {totals.discountAmount > 0 && (
                            <div className="flex justify-between text-sm text-emerald-600">
                              <span>Discount</span>
                              <span>-{invoice.meta.currency} {totals.discountAmount.toFixed(2)}</span>
                            </div>
                          )}

                          {totals.igst > 0 && (
                            <div className="flex justify-between text-sm text-gray-600">
                              <span>IGST</span>
                              <span className="font-medium">{invoice.meta.currency} {totals.igst.toFixed(2)}</span>
                            </div>
                          )}
                          {totals.cgst > 0 && (
                            <div className="flex justify-between text-sm text-gray-600">
                              <span>CGST</span>
                              <span className="font-medium">{invoice.meta.currency} {totals.cgst.toFixed(2)}</span>
                            </div>
                          )}
                          {totals.sgst > 0 && (
                            <div className="flex justify-between text-sm text-gray-600">
                              <span>SGST</span>
                              <span className="font-medium">{invoice.meta.currency} {totals.sgst.toFixed(2)}</span>
                            </div>
                          )}

                          {invoice.global.roundOff && totals.roundOffAmount !== 0 && (
                            <div className="flex justify-between text-sm text-gray-500 italic">
                              <span>Round Off</span>
                              <span>{totals.roundOffAmount > 0 ? '+' : ''}{invoice.meta.currency} {totals.roundOffAmount.toFixed(2)}</span>
                            </div>
                          )}

                          <div className="border-t-2 border-gray-900 pt-3 flex justify-between items-end">
                            <span className="text-sm font-bold uppercase tracking-widest text-gray-900">Total</span>
                            <span className="text-3xl font-bold text-blue-600">{invoice.meta.currency} {totals.total.toFixed(2)}</span>
                          </div>
                          <div className="text-right text-xs text-gray-500 mt-1">
                            (Inclusive of all taxes)
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="mt-auto pt-8 border-t border-gray-100">
                        <div className="grid grid-cols-2 gap-8">
                          <div>
                            {invoice.payment.details && (
                              <>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Payment Details</p>
                                <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.payment.details}</p>
                              </>
                            )}
                          </div>
                          <div className="text-right flex flex-col justify-end">
                            <p className="text-sm font-medium text-gray-900">Thank you for your business</p>
                            <p className="text-xs text-gray-400 mt-1">Authorized Signatory</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Classic (Tax) Template */}
                  {invoice.global.template === 'classic' && (
                    <div className="p-8 bg-white h-full text-xs font-serif min-h-[1000px]">
                      <div className="border-2 border-black h-full flex flex-col">
                        {/* Header */}
                        <div className="border-b-2 border-black flex justify-between items-center bg-gray-100 p-2">
                          <div className="w-1/3 text-[10px]">
                            <p>Original For Recipient</p>
                            <p>Duplicate For Supplier</p>
                          </div>
                          <div className="w-1/3 text-center">
                            <h1 className="text-xl font-bold uppercase tracking-wider">TAX INVOICE</h1>
                          </div>
                          <div className="w-1/3 text-right text-[10px]">
                          </div>
                        </div>

                        {/* Top Section: Sender & Invoice Details */}
                        <div className="flex border-b border-black">
                          {/* Left: Sender */}
                          <div className="w-1/2 p-2 border-r border-black">
                            {invoice.sender.logo && <img src={invoice.sender.logo} className="h-12 object-contain mb-2" alt="Logo" />}
                            <h2 className="font-bold text-base uppercase">{invoice.sender.name}</h2>
                            <p className="whitespace-pre-wrap leading-tight mt-1">{invoice.sender.address}</p>
                            <div className="mt-2 space-y-0.5">
                              <p><strong>GSTIN:</strong> {invoice.sender.taxId}</p>
                              <p><strong>Mobile:</strong> {invoice.sender.phone}</p>
                              <p><strong>Email:</strong> {invoice.sender.email}</p>
                            </div>
                          </div>
                          {/* Right: Invoice Meta */}
                          <div className="w-1/2 flex flex-col">
                            <div className="flex-1 flex border-b border-black">
                              <div className="w-1/2 p-2 border-r border-black">
                                <p className="font-bold">Invoice No:</p>
                                <p>{invoice.meta.number}</p>
                              </div>
                              <div className="w-1/2 p-2">
                                <p className="font-bold">Date:</p>
                                <p>{invoice.meta.date}</p>
                              </div>
                            </div>
                            <div className="flex-1 flex">
                              <div className="w-1/2 p-2 border-r border-black">
                                <p className="font-bold">Place of Supply:</p>
                                <p>{invoice.client.address ? invoice.client.address.split(',').pop() : ''}</p>
                              </div>
                              <div className="w-1/2 p-2">
                                <p className="font-bold">Due Date:</p>
                                <p>{invoice.meta.dueDate}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bill To */}
                        <div className="flex border-b-2 border-black">
                          <div className="w-full p-2">
                            <p className="font-bold underline mb-1">Billed to:</p>
                            <h3 className="font-bold uppercase">{invoice.client.name}</h3>
                            <p>{invoice.client.company}</p>
                            <p>{invoice.client.address}</p>
                            {invoice.client.taxId && <p className="mt-1"><strong>GSTIN:</strong> {invoice.client.taxId}</p>}
                          </div>
                        </div>

                        {/* Items Table */}
                        <div className="flex-1">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b border-black bg-gray-50">
                                <th className="border-r border-black p-1 text-center w-10">Sr.</th>
                                <th className="border-r border-black p-1 text-left">Description of Goods</th>
                                <th className="border-r border-black p-1 text-center w-20">HSN/SAC</th>
                                <th className="border-r border-black p-1 text-center w-16">Qty</th>
                                <th className="border-r border-black p-1 text-right w-20">Rate</th>
                                <th className="border-r border-black p-1 text-center w-12">Per</th>
                                <th className="p-1 text-right w-24">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {invoice.items.map((item, index) => (
                                <tr key={item.id} className="border-b border-gray-300 last:border-b-0">
                                  <td className="border-r border-black p-1 text-center align-top">{index + 1}</td>
                                  <td className="border-r border-black p-1 text-left align-top font-bold">{item.description}</td>
                                  <td className="border-r border-black p-1 text-center align-top">{item.hsn}</td>
                                  <td className="border-r border-black p-1 text-center align-top">{item.quantity}</td>
                                  <td className="border-r border-black p-1 text-right align-top">{item.price.toFixed(2)}</td>
                                  <td className="border-r border-black p-1 text-center align-top">Nos</td>
                                  <td className="p-1 text-right align-top font-bold">{(item.quantity * item.price).toFixed(2)}</td>
                                </tr>
                              ))}
                              {/* Spacer Rows to fill height if needed */}
                              {Array.from({ length: Math.max(0, 5 - invoice.items.length) }).map((_, i) => (
                                <tr key={`spacer-${i}`}>
                                  <td className="border-r border-black p-1 text-center">&nbsp;</td>
                                  <td className="border-r border-black p-1">&nbsp;</td>
                                  <td className="border-r border-black p-1 border-r border-black">&nbsp;</td>
                                  <td className="border-r border-black p-1 border-r border-black">&nbsp;</td>
                                  <td className="border-r border-black p-1 border-r border-black">&nbsp;</td>
                                  <td className="border-r border-black p-1 border-r border-black">&nbsp;</td>
                                  <td className="p-1">&nbsp;</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Total Amount Row */}
                        <div className="border-t border-black flex">
                          <div className="flex-1 p-1 text-right font-bold border-r border-black pr-2">Total</div>
                          <div className="w-24 p-1 text-right font-bold pl-2">{totals.subtotal.toFixed(2)}</div>
                        </div>

                        {/* Tax Breakdown & Footer */}
                        <div className="border-t border-black grid grid-cols-2">
                          {/* Left Side: Amount in Words & Bank Details */}
                          <div className="border-r border-black p-2 flex flex-col justify-between">
                            <div>
                              <p className="font-bold underline">Amount In Words:</p>
                              <p className="italic capitalize mt-1 mb-4">{amountToWords(totals.total)}</p>
                            </div>

                            <div className="mt-4 text-[10px]">
                              <p className="font-bold underline">Bank Details</p>
                              <p className="whitespace-pre-wrap">{invoice.payment.details}</p>
                              <p className="mt-2 text-[9px]">Terms & Conditions: E.&O.E.</p>
                            </div>
                          </div>

                          {/* Right Side: Tax Calculations & Final Total */}
                          <div>
                            <div className="flex justify-between border-b border-black p-1 px-2">
                              <span>Sub Total</span>
                              <span>{totals.subtotal.toFixed(2)}</span>
                            </div>
                            {totals.discountAmount > 0 && (
                              <div className="flex justify-between border-b border-black p-1 px-2">
                                <span>Discount</span>
                                <span>-{totals.discountAmount.toFixed(2)}</span>
                              </div>
                            )}
                            {invoice.global.taxType === 'CGST_SGST' ? (
                              <>
                                <div className="flex justify-between border-b border-black p-1 px-2">
                                  <span>CGST</span>
                                  <span>{totals.cgst.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between border-b border-black p-1 px-2">
                                  <span>SGST</span>
                                  <span>{totals.sgst.toFixed(2)}</span>
                                </div>
                              </>
                            ) : (
                              <div className="flex justify-between border-b border-black p-1 px-2">
                                <span>IGST</span>
                                <span>{totals.igst.toFixed(2)}</span>
                              </div>
                            )}

                            {invoice.global.roundOff && (
                              <div className="flex justify-between border-b border-black p-1 px-2">
                                <span>Round Off</span>
                                <span>{totals.roundOffAmount.toFixed(2)}</span>
                              </div>
                            )}

                            <div className="flex justify-between p-2 font-bold text-lg bg-gray-100">
                              <span>Grand Total</span>
                              <span>{invoice.meta.currency} {totals.total.toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col items-center justify-end h-24 p-2 text-center">
                              {/* Sign Area */}
                              <p className="font-bold text-[10px] mb-8">For {invoice.sender.name}</p>
                              <p className="text-[9px]">Authorised Signatory</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>


        </div >
        <Card className='  w-[100%] mt-10'>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-0">

            {/* LEFT SIDE */}
            <div className="space-y-6 p-0 ">

              {/* Tax Type & Discount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Tax Type */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Tax Type
                  </label>
                  <select
                    className="w-full h-[42px] rounded border border-input bg-transparent px-3 text-sm"
                    value={invoice.global.taxType}
                    onChange={(e) =>
                      updateSection('global', 'taxType', e.target.value)
                    }
                  >
                    <option value="IGST">IGST (Inter-state)</option>
                    <option value="CGST_SGST">CGST + SGST (Intra-state)</option>
                  </select>
                </div>

                {/* Discount */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Discount
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      className="h-[42px] rounded border border-input bg-transparent px-2 text-sm"
                      value={invoice.global.discountType}
                      onChange={(e) =>
                        updateSection('global', 'discountType', e.target.value)
                      }
                    >
                      <option value="flat">Flat</option>
                      <option value="percent">%</option>
                    </select>

                    <input
                      type="number"
                      className="col-span-2 h-[42px] rounded border border-input bg-transparent px-3 text-sm"
                      value={invoice.global.discount}
                      onChange={(e) =>
                        updateSection(
                          'global',
                          'discount',
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Round Off */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={invoice.global.roundOff}
                  onChange={(e) =>
                    updateSection('global', 'roundOff', e.target.checked)
                  }
                />
                <label className="text-sm font-semibold text-muted-foreground">
                  Enable Round Off
                </label>
              </div>

              {/* Payment Details / Notes */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-muted-foreground">
                  Payment Details / Notes
                </label>
                <textarea
                  className="w-full min-h-[120px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder={`Bank: HDFC
Account: 123456789
IFSC: HDFC000123`}
                  value={invoice.payment.details}
                  onChange={(e) =>
                    updateSection('payment', 'details', e.target.value)
                  }
                />
              </div>
            </div>

            {/* RIGHT SIDE - SUMMARY */}
            <div className="space-y-3 bg-muted/20 p-6 rounded-lg">

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>
                  {invoice.meta.currency} {totals.subtotal.toFixed(2)}
                </span>
              </div>

              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount Applied</span>
                  <span>
                    - {invoice.meta.currency}{" "}
                    {totals.discountAmount.toFixed(2)}
                  </span>
                </div>
              )}

              {totals.igst > 0 && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>IGST</span>
                  <span>
                    {invoice.meta.currency} {totals.igst.toFixed(2)}
                  </span>
                </div>
              )}

              {totals.cgst > 0 && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>CGST</span>
                  <span>
                    {invoice.meta.currency} {totals.cgst.toFixed(2)}
                  </span>
                </div>
              )}

              {totals.sgst > 0 && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>SGST</span>
                  <span>
                    {invoice.meta.currency} {totals.sgst.toFixed(2)}
                  </span>
                </div>
              )}

              {invoice.global.roundOff && totals.roundOffAmount !== 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Round Off</span>
                  <span>
                    {totals.roundOffAmount > 0 ? "+" : ""}
                    {invoice.meta.currency}{" "}
                    {totals.roundOffAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="border-t border-dashed my-2" />

              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">
                  {invoice.meta.currency} {totals.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div >
    </div >
  );
}

export default App;
