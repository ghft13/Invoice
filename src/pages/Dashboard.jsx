import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Components';
import { FileText, IndianRupee, Clock } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalInvoices: 0,
        totalAmount: 0,
        pendingInvoices: 0,
        pendingAmount: 0,
        paidAmount: 0,
    });
    const [loading, setLoading] = useState(true);
    const { currentUser, userProfile } = useAuth();

    useEffect(() => {
        if (!currentUser) return;

        const q = query(collection(db, 'invoices'), where('ownerId', '==', currentUser.uid));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let totalInv = 0;
            let totalAmt = 0;
            let pending = 0;
            let pendingAmt = 0;
            let paidAmt = 0;

            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                totalInv++;
                // Use summary.grandTotal if available (new structure), fallback to older fields if necessary
                const amount = Number(data.summary?.grandTotal ?? data.totalAmount ?? 0);
                totalAmt += amount;

                // Check for Unpaid status (case-insensitive checks might be safer but strict is requested as 'Unpaid')
                if (data.status === 'Unpaid') {
                    pending++;
                    pendingAmt += amount;
                } else if (data.status === 'Paid') {
                    paidAmt += amount;
                }
            });

            setStats({
                totalInvoices: totalInv,
                totalAmount: totalAmt,
                pendingInvoices: pending,
                pendingAmount: pendingAmt,
                paidAmount: paidAmt,
            });
            setLoading(false);
        }, (error) => {
            console.error("Error fetching dashboard stats:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const StatCard = ({ title, value, icon: Icon, colorClass }) => (
        <Card className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium text-muted-foreground">{title}</h3>
                <Icon className={`h-4 w-4 ${colorClass}`} />
            </div>
            <div>
                <div className="text-2xl font-bold">{loading ? '...' : value}</div>
            </div>
        </Card>
    );

    return (
        <div className="container mx-auto py-8 space-y-8 px-4">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-muted-foreground mt-2">Welcome back, {userProfile?.displayName || 'User'}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <StatCard
                    title="Total Invoices"
                    value={stats.totalInvoices}
                    icon={FileText}
                    colorClass="text-blue-500"
                />
                <StatCard
                    title="Total Billed"
                    value={`₹ ${stats.totalAmount.toLocaleString()}`}
                    icon={IndianRupee}
                    colorClass="text-purple-500"
                />
                <StatCard
                    title="Received Amount"
                    value={`₹ ${stats.paidAmount.toLocaleString()}`}
                    icon={IndianRupee}
                    colorClass="text-green-500"
                />
                <StatCard
                    title="Pending Amount"
                    value={`₹ ${stats.pendingAmount.toLocaleString()}`}
                    icon={IndianRupee}
                    colorClass="text-orange-500"
                />
                <StatCard
                    title="Pending Invoices"
                    value={stats.pendingInvoices}
                    icon={Clock}
                    colorClass="text-red-500"
                />
            </div>
        </div>
    );
};

export default Dashboard;
