import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card } from './ui/Components';
import { validateName, validateAmount } from '../utils/validation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

const GST_RATES = [0, 5, 12, 18, 28];

const ItemForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!!id);

    const [formData, setFormData] = useState({
        name: '',
        type: 'ITEM', // ITEM or SERVICE
        hsn: '',
        gstRate: 18,
        price: '',
        unit: 'pcs'
    });

    useEffect(() => {
        if (id && currentUser) {
            const fetchItem = async () => {
                try {
                    const docRef = doc(db, 'items', id);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        if (data.ownerId !== currentUser.uid) {
                            alert("Unauthorized access");
                            navigate('/items');
                            return;
                        }
                        setFormData({
                            name: data.name || '',
                            type: data.type || 'ITEM',
                            hsn: data.hsn || '',
                            gstRate: data.gstRate ?? 18,
                            price: data.price || '',
                            unit: data.unit || ''
                        });
                    } else {
                        alert("Item not found");
                        navigate('/items');
                    }
                } catch (error) {
                    console.error("Error fetching item:", error);
                    alert("Error fetching item details");
                } finally {
                    setFetching(false);
                }
            };
            fetchItem();
        }
    }, [id, currentUser, navigate]);

    const [errors, setErrors] = useState({});



    const validateForm = () => {
        const newErrors = {};

        const nameErr = validateName(formData.name, "Item Name");
        if (nameErr) newErrors.name = nameErr;

        const priceErr = validateAmount(formData.price, "Price");
        if (priceErr) newErrors.price = priceErr;

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        let error = null;

        if (name === 'name') error = validateName(value, "Item Name");
        else if (name === 'price') error = validateAmount(value, "Price");

        if (error) {
            setErrors(prev => ({ ...prev, [name]: error }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            const itemData = {
                ...formData,
                price: parseFloat(formData.price) || 0,
                gstRate: parseFloat(formData.gstRate) || 0,
                updatedAt: serverTimestamp(),
                ownerId: currentUser.uid
            };

            if (id) {
                await updateDoc(doc(db, 'items', id), itemData);
                alert("Item updated successfully");
            } else {
                itemData.createdAt = serverTimestamp();
                await addDoc(collection(db, 'items'), itemData);
                alert("Item added successfully");
            }
            navigate('/items');
        } catch (error) {
            console.error("Error saving item:", error);
            alert("Failed to save item: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => navigate('/items')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-3xl font-bold">{id ? 'Edit Item' : 'Add New Item'}</h1>
            </div>

            <Card>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-muted-foreground">Type</label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="ITEM">Product / Item</option>
                                <option value="SERVICE">Service</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Input
                                label="Item / Service Name *"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder="e.g. Website Design or Widget A"
                                required
                                className={errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
                            />
                            {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name}</p>}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <Input
                            label={formData.type === 'SERVICE' ? 'SAC Code' : 'HSN Code'}
                            name="hsn"
                            value={formData.hsn}
                            onChange={handleChange}
                            placeholder="e.g. 9983"
                        />
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-muted-foreground">GST Rate (%)</label>
                            <select
                                name="gstRate"
                                value={formData.gstRate}
                                onChange={handleChange}
                                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {GST_RATES.map(rate => (
                                    <option key={rate} value={rate}>{rate}%</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <Input
                                label="Default Price (₹)"
                                name="price"
                                type="number"
                                value={formData.price}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder="0.00"
                                className={errors.price ? "border-red-500 focus-visible:ring-red-500" : ""}
                            />
                            {errors.price && <p className="text-xs text-red-500 font-medium">{errors.price}</p>}
                        </div>
                        <Input
                            label="Unit"
                            name="unit"
                            value={formData.unit}
                            onChange={handleChange}
                            placeholder="e.g. pcs, kg, hours"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => navigate('/items')}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {id ? 'Update Item' : 'Save Item'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );

};

export default ItemForm;
