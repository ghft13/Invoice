import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../components/ui/Components';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Save } from 'lucide-react';

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
        bankBranch: ''
    });

    const [userId, setUserId] = useState(null);

    useEffect(() => {
        // In a real app, getting user ID from Auth context is better. 
        // For MVP, we'll try to get it from localStorage or just use a fixed ID for the single user demo
        const storedUser = JSON.parse(localStorage.getItem('user_profile'));
        if (storedUser && storedUser.id) {
            setUserId(storedUser.id);
            fetchSettings(storedUser.id);
        }
    }, []);

    const fetchSettings = async (id) => {
        try {
            const docRef = doc(db, "users", id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setUserProfile(prev => ({ ...prev, ...docSnap.data() }));
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
        }
    };

    const handleSave = async () => {
        if (!userId) {
            alert("No user logged in to save settings.");
            return;
        }
        setLoading(true);
        try {
            await updateDoc(doc(db, "users", userId), userProfile);
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
    };

    return (
        <div className="container mx-auto py-8 px-4 max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight mb-6">Business Settings</h2>

            <div className="space-y-6">
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Business Details</h3>
                    <div className="grid gap-4">
                        <Input label="Business Name" value={userProfile.businessName} onChange={(e) => handleChange('businessName', e.target.value)} />

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
                            <Input label="Phone" value={userProfile.phone} onChange={(e) => handleChange('phone', e.target.value)} />
                        </div>

                        <Input label="Address" value={userProfile.address} onChange={(e) => handleChange('address', e.target.value)} />
                        <Input label="Email" value={userProfile.email} onChange={(e) => handleChange('email', e.target.value)} />
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
                            <Input label="GSTIN" value={userProfile.gstin} onChange={(e) => handleChange('gstin', e.target.value)} placeholder="27ABCDE1234F1Z5" />
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
