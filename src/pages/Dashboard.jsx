import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Components';
import { FileText, IndianRupee, Clock } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalInvoices: 0,
        totalAmount: 0,
        pendingInvoices: 0,
    });
    const [loading, setLoading] = useState(true);
    const { currentUser } = useAuth();

    useEffect(() => {
        if (!currentUser) return;

        const fetchStats = async () => {
            try {
                const q = query(collection(db, 'invoices'), where('ownerId', '==', currentUser.uid));
                const querySnapshot = await getDocs(q);
                let totalInv = 0;
                let totalAmt = 0;
                let pending = 0;

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    totalInv++;
                    totalAmt += data.summary?.grandTotal || data.totalAmount || 0;
                    if (data.status === 'Unpaid') {
                        pending++;
                    }
                });

                setStats({
                    totalInvoices: totalInv,
                    totalAmount: totalAmt,
                    pendingInvoices: pending,
                });
            } catch (error) {
                console.error("Error fetching dashboard stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

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
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>

            <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                    title="Total Invoices"
                    value={stats.totalInvoices}
                    icon={FileText}
                    colorClass="text-blue-500"
                />
                <StatCard
                    title="Total Amount Billed"
                    value={`₹ ${stats.totalAmount.toLocaleString()}`}
                    icon={IndianRupee}
                    colorClass="text-green-500"
                />
                <StatCard
                    title="Pending Invoices"
                    value={stats.pendingInvoices}
                    icon={Clock}
                    colorClass="text-orange-500"
                />
            </div>
        </div>
    );
};

export default Dashboard;
