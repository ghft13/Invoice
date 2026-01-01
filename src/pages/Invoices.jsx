import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from '../components/ui/Components';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye } from 'lucide-react';

const Invoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'invoices'));
            const fetchedInvoices = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Sort by date desc (naive sort)
            fetchedInvoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setInvoices(fetchedInvoices);
        } catch (error) {
            console.error("Error fetching invoices:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (invoice) => {
        const newStatus = invoice.status === 'Paid' ? 'Unpaid' : 'Paid';
        try {
            const invoiceRef = doc(db, 'invoices', invoice.id);
            await updateDoc(invoiceRef, { status: newStatus });
            setInvoices(prev => prev.map(inv =>
                inv.id === invoice.id ? { ...inv, status: newStatus } : inv
            ));
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    if (loading) {
        return <div className="container mx-auto py-8 text-center">Loading invoices...</div>;
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
                <Button onClick={() => navigate('/create-invoice')} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Create New
                </Button>
            </div>

            <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/50 text-left">
                                <th className="p-4 font-medium text-muted-foreground">Invoice #</th>
                                <th className="p-4 font-medium text-muted-foreground">Date</th>
                                <th className="p-4 font-medium text-muted-foreground">Client</th>
                                <th className="p-4 font-medium text-muted-foreground text-right">Amount</th>
                                <th className="p-4 font-medium text-muted-foreground text-center">Status</th>
                                <th className="p-4 font-medium text-muted-foreground text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {invoices.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-muted-foreground">
                                        No invoices found. Create your first one!
                                    </td>
                                </tr>
                            ) : (
                                invoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-muted/10 transition-colors">
                                        <td className="p-4 font-medium">{inv.invoiceNumber || inv.number}</td>
                                        <td className="p-4">{inv.invoiceDate || inv.date}</td>
                                        <td className="p-4">{inv.buyer?.name || inv.clientName}</td>
                                        <td className="p-4 text-right font-medium">
                                            {inv.currency || '₹'} {(inv.summary?.grandTotal || inv.totalAmount || 0).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer ${inv.status === 'Paid'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                                    }`}
                                                onClick={() => toggleStatus(inv)}
                                                title="Click to toggle status"
                                            >
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <Button variant="ghost" size="sm" onClick={() => navigate(`/invoice/${inv.id}`)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Invoices;
