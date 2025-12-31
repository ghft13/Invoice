import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from './ui/Components';
import { Lock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

const AdminPanel = ({ onClose }) => {
    const [pin, setPin] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');

    const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET;

    const handleLogin = (e) => {
        e.preventDefault();
        console.log("Input PIN:", pin);
        console.log("Expected Secret:", ADMIN_SECRET);

        if (pin.trim() === ADMIN_SECRET?.trim()) {
            setIsAuthenticated(true);
            fetchPendingUsers();
        } else {
            setMsg('Incorrect PIN');
        }
    };

    const fetchPendingUsers = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "users"), where("status", "==", "pending_approval"));
            const querySnapshot = await getDocs(q);
            const users = [];
            querySnapshot.forEach((doc) => {
                users.push({ id: doc.id, ...doc.data() });
            });
            setPendingUsers(users);
        } catch (error) {
            console.error("Error fetching users:", error);
            setMsg("Error fetching data");
        }
        setLoading(false);
    };

    const handleAction = async (userId, action) => {
        try {
            const userRef = doc(db, "users", userId);
            const updates = action === 'approve'
                ? { isPremium: true, status: 'active', approvedAt: new Date() }
                : { status: 'rejected', rejectedAt: new Date() };

            await updateDoc(userRef, updates);

            // Remove from local list
            setPendingUsers(prev => prev.filter(u => u.id !== userId));
            setMsg(action === 'approve' ? 'User Approved' : 'User Rejected');
        } catch (error) {
            console.error("Error updating user:", error);
            setMsg("Error updating user");
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <Card className="w-full max-w-sm bg-white p-6">
                    <div className="flex flex-col items-center mb-6">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-2">
                            <Lock size={24} />
                        </div>
                        <h2 className="text-xl font-bold">Admin Access</h2>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <Input
                            type="password"
                            placeholder="Enter PIN"
                            value={pin}
                            onChange={(e) => {
                                setPin(e.target.value);
                                setMsg('');
                            }}
                            autoFocus
                        />
                        {msg && <p className="text-red-500 text-sm text-center">{msg}</p>}
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" className="w-full" onClick={onClose}>Cancel</Button>
                            <Button type="submit" className="w-full bg-slate-900 text-white">Unlock</Button>
                        </div>
                    </form>
                </Card>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <Card className="w-full max-w-4xl bg-white h-[80vh] flex flex-col overflow-hidden">
                <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Lock size={20} /> Admin Dashboard
                    </h2>
                    <Button size="sm" variant="ghost" className="text-white hover:bg-slate-800" onClick={onClose}>
                        Close
                    </Button>
                </div>

                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-semibold text-slate-700">Pending Approvals ({pendingUsers.length})</h3>
                    <Button size="sm" variant="outline" onClick={fetchPendingUsers} disabled={loading}>
                        <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {pendingUsers.length === 0 ? (
                        <div className="text-center text-gray-500 py-20">
                            No pending approvals found.
                        </div>
                    ) : (
                        pendingUsers.map(user => (
                            <div key={user.id} className="border rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 transition-colors">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-lg">{user.name}</span>
                                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium uppercase">{user.plan || 'Premium'}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-1">📱 {user.phone}</p>
                                    <p className="text-sm text-gray-800 font-mono bg-yellow-100 px-2 py-1 rounded inline-block">
                                        UTR: {user.transactionId}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">Requested: {user.createdAt?.seconds ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}</p>
                                </div>

                                <div className="flex gap-2 w-full md:w-auto">
                                    <Button
                                        className="flex-1 md:flex-none justify-center bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => handleAction(user.id, 'approve')}
                                    >
                                        <CheckCircle size={16} className="mr-2" /> Approve
                                    </Button>
                                    <Button
                                        className="flex-1 md:flex-none justify-center bg-red-100 text-red-700 hover:bg-red-200"
                                        onClick={() => handleAction(user.id, 'reject')}
                                    >
                                        <XCircle size={16} className="mr-2" /> Reject
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Card>
        </div>
    );
};

export default AdminPanel;
