import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from './ui/Components';
import { CheckCircle, Star, ArrowLeft, Smartphone, Monitor } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

// YOUR UPI DETAILS HERE
const UPI_VPA = "7767827126@ibl"; // REPLACE THIS (User provided)
const PAYEE_NAME = "Jayraj Invoice App"; // REPLACE THIS

const Subscription = ({ onSubscribe, onClose }) => {
    const [step, setStep] = useState('selection'); // 'selection' | 'payment'
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [isMobile, setIsMobile] = useState(false);
    const [loading, setLoading] = useState(false);
    const [transactionId, setTransactionId] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    }, []);

    const handleSelectPlan = (plan) => {
        setSelectedPlan(plan);
        setStep('payment');
    };

    const handleSubmitForApproval = () => {
        if (!transactionId || transactionId.length !== 12 || !/^\d+$/.test(transactionId)) {
            setError("Please enter a valid 12-digit UPI Transaction ID / UTR");
            return;
        }

        setLoading(true);
        setTimeout(() => {
            onSubscribe(selectedPlan, transactionId);
            setLoading(false);
        }, 1000);
    };

    const getPlanDetails = () => {
        if (selectedPlan === 'monthly') return { price: 100, label: 'Monthly Plan' };
        if (selectedPlan === 'yearly') return { price: 1000, label: 'Yearly Plan' };
        return { price: 0, label: '' };
    };

    const { price, label } = getPlanDetails();
    // UPI URL Format: upi://pay?pa=address&pn=name&am=amount&cu=INR
    const upiUrl = `upi://pay?pa=${UPI_VPA}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${price}&cu=INR&tn=${encodeURIComponent(label)}`;

    const renderSelection = () => (
        <div className="p-8">
            <h2 className="text-xl font-bold text-center text-gray-800 mb-8">
                Upgrade to Premium
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Monthly Plan */}
                <div className="border rounded-xl p-6 hover:border-primary transition-all relative ring-1 ring-gray-100 flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">Monthly</h3>
                    <div className="text-3xl font-bold text-gray-900 mb-4">₹100<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                    <ul className="space-y-3 mb-6 flex-1">
                        <li className="flex items-center gap-2 text-sm text-gray-600"><CheckCircle className="w-4 h-4 text-green-500" /> Unlimited Invoices</li>
                        <li className="flex items-center gap-2 text-sm text-gray-600"><CheckCircle className="w-4 h-4 text-green-500" /> Remove Branding</li>
                    </ul>
                    <Button onClick={() => handleSelectPlan('monthly')} className="w-full bg-slate-900 hover:bg-slate-800 text-white">
                        Select Monthly
                    </Button>
                </div>

                {/* Yearly Plan */}
                <div className="border rounded-xl p-6 bg-blue-50/50 border-blue-200 transition-all relative flex flex-col">
                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                        BEST VALUE
                    </div>
                    <h3 className="text-lg font-semibold text-blue-700 mb-2 flex items-center gap-2"><Star className="w-4 h-4 fill-blue-700" /> Yearly</h3>
                    <div className="text-3xl font-bold text-gray-900 mb-4">₹1000<span className="text-sm font-normal text-muted-foreground">/yr</span></div>
                    <ul className="space-y-3 mb-6 flex-1">
                        <li className="flex items-center gap-2 text-sm text-gray-600"><CheckCircle className="w-4 h-4 text-green-500" /> All Monthly Perks</li>
                        <li className="flex items-center gap-2 text-sm text-gray-600"><CheckCircle className="w-4 h-4 text-green-500" /> Priority Features</li>
                    </ul>
                    <Button variant="primary" onClick={() => handleSelectPlan('yearly')} className="w-full bg-blue-600 hover:bg-blue-700 shadow-blue-200">
                        Select Yearly
                    </Button>
                </div>
            </div>
        </div>
    );

    const renderPayment = () => (
        <div className="p-8 flex flex-col items-center max-h-[80vh] overflow-y-auto">
            <button onClick={() => setStep('selection')} className="self-start text-sm text-muted-foreground flex items-center gap-1 mb-4 hover:text-foreground">
                <ArrowLeft className="w-4 h-4" /> Back to Plans
            </button>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pay ₹{price}</h2>
            <p className="text-muted-foreground mb-6">Scan QR or Pay via UPI</p>

            <div className="bg-white p-4 rounded-xl border shadow-sm mb-6 w-full max-w-sm">
                {isMobile ? (
                    <div className="text-center py-4 px-4">
                        <Smartphone className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                        <p className="max-w-[200px] mx-auto text-sm text-gray-600 mb-4">Click below to open your UPI App (GPay, PhonePe, Paytm)</p>
                        <a href={upiUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center h-10 px-8 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors w-full">
                            Pay ₹{price} via UPI
                        </a>
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <QRCodeCanvas value={upiUrl} size={180} level="H" includeMargin={true} />
                        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                            <Monitor className="w-4 h-4" />
                            <span>Scan with any UPI App</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="w-full max-w-sm border-t pt-6 space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 border border-blue-100">
                    <strong>Step 2: Verification</strong>
                    <p>After paying, enter the 12-digit UTR No. form your UPI app below.</p>
                </div>

                <Input
                    label="UPI Reference ID (UTR)"
                    placeholder="e.g. 123456789012"
                    value={transactionId}
                    onChange={(e) => {
                        setTransactionId(e.target.value.replace(/\D/g, '').slice(0, 12));
                        setError('');
                    }}
                    maxLength={12}
                />
                {error && <p className="text-red-500 text-xs">{error}</p>}

                <Button
                    onClick={handleSubmitForApproval}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                    {loading ? 'Submitting...' : 'Submit for Verification'}
                </Button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <Card className="w-full max-w-2xl bg-white shadow-2xl overflow-hidden relative border-0 my-8 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-slate-900 p-6 text-center text-white shrink-0">
                    <h1 className="text-2xl font-bold">Premium Subscription</h1>
                    {step === 'selection' && <p className="text-slate-300 text-sm">Unlock unlimited potential</p>}
                </div>

                <div className="overflow-y-auto">
                    {step === 'selection' ? renderSelection() : renderPayment()}
                </div>
            </Card>
        </div>
    );
};

export default Subscription;
