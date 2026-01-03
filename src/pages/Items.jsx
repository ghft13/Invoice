import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card } from '../components/ui/Components';
import { Plus, Search, Edit, Trash2, Package, Tag, Layers } from 'lucide-react';

const Items = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, 'items'),
            where('ownerId', '==', currentUser.uid)
        );

        console.log("Fetching items for user:", currentUser.uid);
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const itemsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Sort by name
            itemsData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            setItems(itemsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching items:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleDelete = async (itemId) => {
        if (!window.confirm("Are you sure you want to delete this item?")) return;

        setDeletingId(itemId);
        try {
            await deleteDoc(doc(db, 'items', itemId));
        } catch (error) {
            console.error("Error deleting item:", error);
            alert("Failed to delete item");
        } finally {
            setDeletingId(null);
        }
    };

    const filteredItems = items.filter(item =>
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.hsn?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container mx-auto p-4 md:p-6 max-w-7xl animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Items & Services</h1>
                    <p className="text-muted-foreground mt-1">Manage your product catalog and services.</p>
                </div>
                <Button onClick={() => navigate('/items/add')} className="w-full md:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                </Button>
            </div>

            <Card className="mb-6 p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or HSN/SAC..."
                        className="pl-9 bg-background"
                        containerClassName="w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </Card>

            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="h-40 animate-pulse bg-muted" />
                    ))}
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/50">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">No items found</h3>
                    <p className="text-muted-foreground mb-4">
                        {searchTerm ? "Try adjusting your search terms." : "Get started by adding your first item or service."}
                    </p>
                    <Button onClick={() => navigate('/items/add')} variant="outline">
                        Add Item
                    </Button>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredItems.map(item => (
                        <Card key={item.id} className="flex flex-col group hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg truncate pr-2" title={item.name}>
                                    {item.name}
                                </h3>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${item.type === 'SERVICE' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                    {item.type || 'ITEM'}
                                </span>
                            </div>

                            <div className="space-y-2 text-sm text-muted-foreground flex-1">
                                {item.hsn && (
                                    <div className="flex items-center gap-2">
                                        <Layers className="h-3.5 w-3.5" />
                                        <span className="font-mono">{item.hsn}</span>
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    <Tag className="h-3.5 w-3.5" />
                                    <span>{item.gstRate}% GST</span>
                                </div>

                                <div className="text-foreground font-semibold mt-2">
                                    ₹ {item.price} <span className="text-muted-foreground font-normal text-xs">/ {item.unit || 'unit'}</span>
                                </div>
                            </div>

                            <div className="pt-4 mt-4 border-t flex justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/items/edit/${item.id}`)}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => handleDelete(item.id)}
                                    disabled={deletingId === item.id}
                                >
                                    {deletingId === item.id ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Items;
