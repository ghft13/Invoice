import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card } from './ui/Components';
import { validateGSTIN, validateEmail, validatePhone, validateName } from '../utils/validation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh",
    "Lakshadweep", "Puducherry"
];

const ClientForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!!id);

    const [formData, setFormData] = useState({
        name: '',
        gstin: '',
        email: '',
        phone: '',
        address: '',
        state: '',
        stateCode: ''
    });

    useEffect(() => {
        if (id && currentUser) {
            const fetchClient = async () => {
                try {
                    const docRef = doc(db, 'clients', id);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        if (data.ownerId !== currentUser.uid) {
                            alert("Unauthorized access");
                            navigate('/clients');
                            return;
                        }
                        setFormData({
                            name: data.name || '',
                            gstin: data.gstin || '',
                            email: data.email || '',
                            phone: data.phone || '',
                            address: data.address || '',
                            state: data.state || '',
                            stateCode: data.stateCode || ''
                        });
                    } else {
                        alert("Client not found");
                        navigate('/clients');
                    }
                } catch (error) {
                    console.error("Error fetching client:", error);
                    alert("Error fetching client details");
                } finally {
                    setFetching(false);
                }
            };
            fetchClient();
        }
    }, [id, currentUser, navigate]);

    const [errors, setErrors] = useState({});

    // ... (rest of imports)

    // ... (inside component)

    const validateForm = () => {
        const newErrors = {};

        const nameErr = validateName(formData.name, "Client Name");
        if (nameErr) newErrors.name = nameErr;

        if (formData.gstin) {
            const gstinErr = validateGSTIN(formData.gstin);
            if (gstinErr) newErrors.gstin = gstinErr;
        }

        const emailErr = validateEmail(formData.email);
        if (emailErr) newErrors.email = emailErr;

        const phoneErr = validatePhone(formData.phone);
        if (phoneErr) newErrors.phone = phoneErr;

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        // ... (rest of submit logic)
    };

    return (
        // ...
        <div className="container mx-auto p-4 max-w-2xl">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-3xl font-bold">{id ? 'Edit Client' : 'Add New Client'}</h1>
            </div>
            <Card>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <Input
                                label="Client / Business Name *"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g. Acme Corp"
                                className={errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
                            />
                            {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name}</p>}
                        </div>
                        <div className="space-y-1">
                            <Input
                                label="GSTIN"
                                name="gstin"
                                value={formData.gstin}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder="GST Number (Optional)"
                                className={errors.gstin ? "border-red-500 focus-visible:ring-red-500" : ""}
                            />
                            {errors.gstin && <p className="text-xs text-red-500 font-medium">{errors.gstin}</p>}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <Input
                                label="Email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="client@example.com"
                                className={errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
                            />
                            {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email}</p>}
                        </div>
                        <div className="space-y-1">
                            <Input
                                label="Phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="Contact Number"
                                className={errors.phone ? "border-red-500 focus-visible:ring-red-500" : ""}
                            />
                            {errors.phone && <p className="text-xs text-red-500 font-medium">{errors.phone}</p>}
                        </div>
                    </div>

                    {/* ... (rest of form) */}

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-muted-foreground">Address</label>
                        <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            placeholder="Full Billing Address"
                        />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-muted-foreground">State</label>
                            <select
                                name="state"
                                value={formData.state}
                                onChange={handleChange}
                                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="">Select State</option>
                                {INDIAN_STATES.map(st => (
                                    <option key={st} value={st}>{st}</option>
                                ))}
                            </select>
                        </div>
                        {/* We could add State Code manual entry if needed, or auto-derive it */}
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => navigate('/clients')}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {id ? 'Update Client' : 'Save Client'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div >
    );
};

export default ClientForm;
