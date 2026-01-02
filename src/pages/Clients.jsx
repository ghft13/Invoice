import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card } from '../components/ui/Components';
import { Plus, Search, Edit, Trash2, Phone, Mail, MapPin, Building2, AlertCircle } from 'lucide-react';

const Clients = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, 'clients'),
            where('ownerId', '==', currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const clientsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Sort by name locally since we only query by ownerId
            clientsData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            setClients(clientsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching clients:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleDelete = async (clientId) => {
        if (!window.confirm("Are you sure you want to delete this client?")) return;

        setDeletingId(clientId);
        try {
            await deleteDoc(doc(db, 'clients', clientId));
        } catch (error) {
            console.error("Error deleting client:", error);
            alert("Failed to delete client");
        } finally {
            setDeletingId(null);
        }
    };

    const filteredClients = clients.filter(client =>
        client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.gstin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone?.includes(searchTerm)
    );

    return (
        <div className="container mx-auto p-4 md:p-6 max-w-7xl animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
                    <p className="text-muted-foreground mt-1">Manage your customers and parties.</p>
                </div>
                <Button onClick={() => navigate('/clients/add')} className="w-full md:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Client
                </Button>
            </div>

            <Card className="mb-6 p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, GSTIN, or phone..."
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
            ) : filteredClients.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/50">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">No clients found</h3>
                    <p className="text-muted-foreground mb-4">
                        {searchTerm ? "Try adjusting your search terms." : "Get started by adding your first client."}
                    </p>
                    <Button onClick={() => navigate('/clients/add')} variant="outline">
                        Add Client
                    </Button>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredClients.map(client => (
                        <Card key={client.id} className="flex flex-col group hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg truncate pr-2" title={client.name}>
                                    {client.name}
                                </h3>
                            </div>

                            <div className="space-y-2 text-sm text-muted-foreground flex-1">
                                {client.gstin && (
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs text-foreground">
                                            GSTIN: {client.gstin}
                                        </span>
                                    </div>
                                )}

                                {client.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-3.5 w-3.5" />
                                        <span>{client.phone}</span>
                                    </div>
                                )}

                                {client.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-3.5 w-3.5" />
                                        <span className="truncate">{client.email}</span>
                                    </div>
                                )}

                                {client.state && (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-3.5 w-3.5" />
                                        <span>{client.state}</span>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 mt-4 border-t flex justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/clients/edit/${client.id}`)}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => handleDelete(client.id)}
                                    disabled={deletingId === client.id}
                                >
                                    {deletingId === client.id ? (
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

export default Clients;
