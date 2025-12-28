import { useState, useEffect } from 'react';
import { Card, Button, Input } from './components/ui/Components';
import { Plus, Trash2, Download, RefreshCw, FileText, Layout, ChevronRight, Upload } from 'lucide-react';
import html2pdf from 'html2pdf.js';

const INITIAL_STATE = {
  sender: { name: '', address: '', email: '', phone: '', taxId: '', logo: null },
  client: { name: '', company: '', address: '', email: '', phone: '', taxId: '' },
  meta: { number: 'INV-001', date: new Date().toISOString().split('T')[0], dueDate: '', currency: 'INR' },
  items: [{ id: 1, description: '', quantity: 1, price: 0, tax: 0 }],
  payment: { method: 'Bank Transfer', details: '', notes: '' },
  global: { discount: 0, discountType: 'flat', notes: '', terms: '' }
};

function App() {
  const [invoice, setInvoice] = useState(() => {
    const saved = localStorage.getItem('invoice_draft');
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  const [invoiceCount, setInvoiceCount] = useState(() => {
    return parseInt(localStorage.getItem('invoice_count') || '0');
  });

  const [activeTab, setActiveTab] = useState('edit'); // 'edit' or 'preview' mobile toggle

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
      items: [...prev.items, { id: Date.now(), description: '', quantity: 1, price: 0, tax: 0 }]
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
    const taxTotal = invoice.items.reduce((acc, item) => acc + (item.quantity * item.price * (item.tax / 100)), 0);

    let discountAmount = 0;
    if (invoice.global.discountType === 'flat') {
      discountAmount = parseFloat(invoice.global.discount) || 0;
    } else {
      discountAmount = subtotal * ((parseFloat(invoice.global.discount) || 0) / 100);
    }

    const total = subtotal + taxTotal - discountAmount;

    return { subtotal, taxTotal, discountAmount, total };
  };

  const totals = calculateTotals();

  const handleDownloadPDF = () => {
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
    });

    if (invoiceCount < 5) {
      const newCount = invoiceCount + 1;
      setInvoiceCount(newCount);
      localStorage.setItem('invoice_count', newCount.toString());
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to clear this invoice?')) {
      setInvoice(INITIAL_STATE);
    }
  };

  return (
    <div className="min-h-screen bg-muted/40 font-sans text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <span>Invoicer.</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end text-sm">
              <span className="text-muted-foreground">Free Plan</span>
              <span className="font-medium text-foreground">{invoiceCount} / 5 Invoices</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="mr-2 h-4 w-4" /> New
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={invoiceCount >= 5}
              onClick={handleDownloadPDF}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-8">
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Editor Column */}
          <div className={`lg:col-span-7 space-y-6 ${activeTab === 'edit' ? 'block' : 'hidden lg:block'}`}>

            {/* Business Info */}
            <Card className="border-l-4 border-l-blue-500">
              <div className="flex items-center gap-2 mb-6 text-lg font-semibold text-gray-800">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">1</div>
                Business Details
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
                {invoice.items.map((item) => (
                  <div key={item.id} className="group relative grid grid-cols-12 gap-3 items-start p-4 rounded-lg border bg-muted/10 hover:bg-muted/30 transition-colors">
                    <div className="col-span-12 md:col-span-5">
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Description</label>
                      <input
                        className="w-full bg-transparent border-0 border-b border-input focus:border-primary focus:ring-0 p-1 text-sm font-medium placeholder:text-muted/50"
                        placeholder="Item description"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Qty</label>
                      <input
                        type="number"
                        className="w-full bg-transparent border border-input rounded p-1 text-sm text-center"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Price</label>
                      <input
                        type="number"
                        className="w-full bg-transparent border border-input rounded p-1 text-sm text-center"
                        value={item.price}
                        onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-3 md:col-span-2 text-right">
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Total</label>
                      <div className="py-1 text-sm font-bold opacity-80">
                        {(item.quantity * item.price).toFixed(2)}
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-end pt-6 md:pt-4">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="outline" className="w-full mt-4 border-dashed" onClick={addItem}>
                <Plus className="w-4 h-4 mr-2" /> Add New Item
              </Button>
            </Card>

            {/* Totals & Notes */}
            <Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-muted-foreground">Payment Details / Notes</label>
                    <textarea
                      className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Bank: HDFC&#10;Account: 123456789&#10;Ifsc: HDFC000123"
                      value={invoice.payment.details}
                      onChange={(e) => updateSection('payment', 'details', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-3 bg-muted/20 p-6 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{invoice.meta.currency} {totals.subtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <div className="flex items-center gap-2">
                      <select
                        className="h-8 rounded border border-input bg-transparent text-xs px-1"
                        value={invoice.global.discountType}
                        onChange={(e) => updateSection('global', 'discountType', e.target.value)}
                      >
                        <option value="flat">Flat</option>
                        <option value="percent">%</option>
                      </select>
                      <input
                        type="number"
                        className="h-8 w-16 rounded border border-input bg-transparent text-xs text-right px-2"
                        value={invoice.global.discount}
                        onChange={(e) => updateSection('global', 'discount', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  {totals.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount Apply</span>
                      <span>- {invoice.meta.currency} {totals.discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="border-t border-dashed my-2"></div>

                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">{invoice.meta.currency} {totals.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Preview Column */}
          <div className={`lg:col-span-5 ${activeTab === 'preview' ? 'block' : 'hidden lg:block'}`}>
            <div className="sticky top-24">
              <div className="relative group">
                <div id="invoice-preview" className="bg-white text-black shadow-2xl rounded-none md:rounded-lg overflow-hidden min-h-[800px] print:shadow-none print:rounded-none">

                  {/* Elegant Invoice Template */}
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
                      </div>
                    </div>

                    {/* Table */}
                    <table className="w-full mb-8">
                      <thead>
                        <tr className="border-b-2 border-gray-900">
                          <th className="text-left py-4 text-xs font-bold text-gray-900 uppercase tracking-wider">Item Description</th>
                          <th className="text-right py-4 text-xs font-bold text-gray-900 uppercase tracking-wider">Qty</th>
                          <th className="text-right py-4 text-xs font-bold text-gray-900 uppercase tracking-wider">Price</th>
                          <th className="text-right py-4 text-xs font-bold text-gray-900 uppercase tracking-wider">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {invoice.items.map(item => (
                          <tr key={item.id}>
                            <td className="py-4 text-sm text-gray-700 font-medium">{item.description}</td>
                            <td className="py-4 text-right text-sm text-gray-500">{item.quantity}</td>
                            <td className="py-4 text-right text-sm text-gray-500">{invoice.meta.currency} {item.price.toFixed(2)}</td>
                            <td className="py-4 text-right text-sm text-gray-900 font-bold">{invoice.meta.currency} {(item.quantity * item.price).toFixed(2)}</td>
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
                        <div className="border-t-2 border-gray-900 pt-3 flex justify-between items-end">
                          <span className="text-sm font-bold uppercase tracking-widest text-gray-900">Total</span>
                          <span className="text-3xl font-bold text-blue-600">{invoice.meta.currency} {totals.total.toFixed(2)}</span>
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
