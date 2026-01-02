import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from '../components/ui/Components';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Lock, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Invoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    useEffect(() => {
        if (!currentUser) return;

        const q = query(collection(db, 'invoices'), where('ownerId', '==', currentUser.uid));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedInvoices = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Sort by date desc
            fetchedInvoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setInvoices(fetchedInvoices);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching invoices:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const toggleStatus = async (invoice) => {
        const newStatus = invoice.status === 'Paid' ? 'Unpaid' : 'Paid';
        const willLock = newStatus === 'Paid';

        try {
            const invoiceRef = doc(db, 'invoices', invoice.id);
            const updateData = { status: newStatus };
            // If becoming paid, we lock it
            if (willLock) updateData.locked = true;

            await updateDoc(invoiceRef, updateData);

            setInvoices(prev => prev.map(inv =>
                inv.id === invoice.id ? { ...inv, status: newStatus, locked: inv.locked || willLock } : inv
            ));
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status. Invoice might be locked.");
        }
    };

    const deleteInvoice = async (invoice) => {
        if (invoice.locked) {
            alert("This invoice is LOCKED and cannot be deleted.");
            return;
        }
        if (!window.confirm(`Are you sure you want to delete Invoice ${invoice.invoiceNumber || invoice.number}?`)) return;

        try {
            await deleteDoc(doc(db, "invoices", invoice.id));
            setInvoices(prev => prev.filter(i => i.id !== invoice.id));
        } catch (error) {
            console.error("Error deleting invoice:", error);
            alert("Failed to delete invoice");
        }
    };

    if (loading) {
        return <div className="container mx-auto py-8 text-center text-muted-foreground animate-pulse">Loading invoices...</div>;
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
                                        <td className="p-4 font-medium flex items-center gap-2">
                                            {inv.invoiceNumber || inv.number}
                                            {inv.locked && <Lock className="h-3 w-3 text-red-500" title="Locked" />}
                                        </td>
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
                                                title={inv.locked ? "Invoice is Locked (Paid)" : "Click to toggle status"}
                                            >
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center flex items-center justify-center gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => navigate(`/invoice/${inv.id}`)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>

                                            {/* Show disabled trash icon if locked, or no icon? User asked to Disable */}
                                            {inv.locked ? (
                                                <Button variant="ghost" size="sm" disabled className="opacity-30 cursor-not-allowed">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            ) : (
                                                <Button variant="ghost" size="sm" onClick={() => deleteInvoice(inv)} className="text-red-500 hover:bg-red-50">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
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
