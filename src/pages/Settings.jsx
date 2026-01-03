import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../components/ui/Components';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
// Import validation utilities
import { validateName, validateGSTIN, validateEmail, validatePhone, validateAmount } from '../utils/validation';

const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh",
    "Lakshadweep", "Puducherry"
];

const Settings = () => {
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [userProfile, setUserProfile] = useState({
        businessName: '',
        gstin: '',
        address: '',
        state: 'Maharashtra', // Default
        phone: '',
        email: '',
        isGstRegistered: true,
        bankName: '',
        bankAccount: '',
        bankIfsc: '',
        bankBranch: '',
        signature: ''
    });

    const { currentUser, userProfile: authProfile } = useAuth();

    useEffect(() => {
        if (authProfile) {
            setUserProfile(prev => ({ ...prev, ...authProfile }));
        }
    }, [authProfile]);

    const validateForm = () => {
        const newErrors = {};

        // Validate Business Name
        const nameErr = validateName(userProfile.businessName, "Business Name");
        if (nameErr) newErrors.businessName = nameErr;

        // Validate GSTIN if registered
        if (userProfile.isGstRegistered && userProfile.gstin) {
            const gstinErr = validateGSTIN(userProfile.gstin);
            if (gstinErr) newErrors.gstin = gstinErr;
        }

        // Validate Email
        const emailErr = validateEmail(userProfile.email);
        if (emailErr) newErrors.email = emailErr;

        // Validate Phone
        const phoneErr = validatePhone(userProfile.phone);
        if (phoneErr) newErrors.phone = phoneErr;

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const handleSave = async () => {
        if (!currentUser) {
            alert("No user logged in to save settings.");
            return;
        }

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            await updateDoc(doc(db, "users", currentUser.uid), userProfile);
            // Also update local storage for quick access
            const currentLocal = JSON.parse(localStorage.getItem('user_profile') || '{}');
            localStorage.setItem('user_profile', JSON.stringify({ ...currentLocal, ...userProfile }));
            alert("Settings saved successfully!");
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Failed to save settings.");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setUserProfile(prev => ({ ...prev, [field]: value }));
        // Clear error on type
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const handleBlur = (field, value) => {
        let error = null;
        if (field === 'businessName') error = validateName(value, "Business Name");
        else if (field === 'gstin' && userProfile.isGstRegistered) error = validateGSTIN(value);
        else if (field === 'email') error = validateEmail(value);
        else if (field === 'phone') error = validatePhone(value);

        if (error) {
            setErrors(prev => ({ ...prev, [field]: error }));
        }
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
                setUserProfile(prev => ({ ...prev, signature: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="container mx-auto py-8 px-4 max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight mb-6">Business Settings</h2>

            <div className="space-y-6">
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Business Details</h3>
                    <div className="grid gap-4">
                        <div className="space-y-1">
                            <Input label="Business Name" value={userProfile.businessName} onChange={(e) => handleChange('businessName', e.target.value)} onBlur={(e) => handleBlur('businessName', e.target.value)} className={errors.businessName ? "border-red-500" : ""} />
                            {errors.businessName && <p className="text-xs text-red-500">{errors.businessName}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-semibold text-muted-foreground block mb-1">Your Business State</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={userProfile.state}
                                    onChange={(e) => handleChange('state', e.target.value)}
                                >
                                    {INDIAN_STATES.map(state => (
                                        <option key={state} value={state}>{state}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Input label="Phone" value={userProfile.phone} onChange={(e) => handleChange('phone', e.target.value)} onBlur={(e) => handleBlur('phone', e.target.value)} className={errors.phone ? "border-red-500" : ""} />
                                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                            </div>
                        </div>

                        <Input label="Address" value={userProfile.address} onChange={(e) => handleChange('address', e.target.value)} />

                        <div className="space-y-1">
                            <Input label="Email" value={userProfile.email} onChange={(e) => handleChange('email', e.target.value)} onBlur={(e) => handleBlur('email', e.target.value)} className={errors.email ? "border-red-500" : ""} />
                            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-muted-foreground block mb-1">Authorized Signature</label>
                            <div className="flex items-center gap-4">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleSignatureUpload}
                                    className="cursor-pointer text-xs file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                                />
                                {userProfile.signature && (
                                    <div className="relative border p-1 rounded bg-white">
                                        <img src={userProfile.signature} alt="Signature Preview" className="h-10 object-contain" />
                                        <button
                                            onClick={() => handleChange('signature', '')}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 w-4 h-4 flex items-center justify-center text-[10px]"
                                            title="Remove"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">Upload a clear image of your signature (Max 500KB).</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-l-4 border-l-purple-500">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-lg font-semibold">Tax Details</h3>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={userProfile.isGstRegistered}
                                onChange={(e) => handleChange('isGstRegistered', e.target.checked)}
                                className="h-4 w-4"
                            />
                            <span className="text-sm font-medium">GST Registered?</span>
                        </div>
                    </div>

                    {userProfile.isGstRegistered && (
                        <div className="grid gap-4">
                            <div className="space-y-1">
                                <Input label="GSTIN" value={userProfile.gstin} onChange={(e) => handleChange('gstin', e.target.value)} onBlur={(e) => handleBlur('gstin', e.target.value)} placeholder="27ABCDE1234F1Z5" className={errors.gstin ? "border-red-500" : ""} />
                                {errors.gstin && <p className="text-xs text-red-500">{errors.gstin}</p>}
                            </div>
                        </div>
                    )}
                </Card>

                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Bank Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Bank Name" value={userProfile.bankName} onChange={(e) => handleChange('bankName', e.target.value)} />
                        <Input label="Account Number" value={userProfile.bankAccount} onChange={(e) => handleChange('bankAccount', e.target.value)} />
                        <Input label="IFSC Code" value={userProfile.bankIfsc} onChange={(e) => handleChange('bankIfsc', e.target.value)} />
                        <Input label="Branch" value={userProfile.bankBranch} onChange={(e) => handleChange('bankBranch', e.target.value)} />
                    </div>
                </Card>

                <Button onClick={handleSave} disabled={loading} className="w-full md:w-auto bg-primary">
                    <Save className="mr-2 h-4 w-4" /> {loading ? 'Saving...' : 'Save Settings'}
                </Button>
            </div>
        </div>
    );
};

export default Settings;
