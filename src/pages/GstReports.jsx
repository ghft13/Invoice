import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Components';
import { db } from '../firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { BarChart, FileText } from 'lucide-react';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
    }).format(amount);
};

const GstReports = () => {
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [allInvoices, setAllInvoices] = useState([]);
    const [filteredInvoices, setFilteredInvoices] = useState([]);
    const [reportData, setReportData] = useState({
        totalInvoices: 0,
        totalTaxable: 0,
        totalCGST: 0,
        totalSGST: 0,
        totalIGST: 0,
        totalGST: 0,
        grandTotal: 0
    });

    // 1. Fetch All Invoices Once
    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                const q = query(collection(db, "invoices"));
                const querySnapshot = await getDocs(q);

                const fetched = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    let invSummary = data.summary || {
                        totalTaxableValue: 0,
                        totalCGST: 0,
                        totalSGST: 0,
                        totalIGST: 0,
                        totalGST: 0,
                        grandTotal: data.totalAmount || 0
                    };
                    fetched.push({ id: doc.id, ...data, summary: invSummary });
                });

                // Sort descending
                fetched.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
                setAllInvoices(fetched);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchInvoices();
    }, []);

    // 2. Filter & Calculate Totals Effect
    useEffect(() => {
        if (!allInvoices.length && !loading) return;

        let filtered = allInvoices;

        // Date Logic (Normalize to YYYY-MM-DD for comparison)
        if (dateRange.start) {
            filtered = filtered.filter(inv => (inv.invoiceDate || inv.date) >= dateRange.start);
        }
        if (dateRange.end) {
            filtered = filtered.filter(inv => (inv.invoiceDate || inv.date) <= dateRange.end);
        }

        const totals = filtered.reduce((acc, inv) => ({
            totalInvoices: acc.totalInvoices + 1,
            totalTaxable: acc.totalTaxable + (inv.summary.totalTaxableValue || 0),
            totalCGST: acc.totalCGST + (inv.summary.totalCGST || 0),
            totalSGST: acc.totalSGST + (inv.summary.totalSGST || 0),
            totalIGST: acc.totalIGST + (inv.summary.totalIGST || 0),
            totalGST: acc.totalGST + (inv.summary.totalGST || 0),
            grandTotal: acc.grandTotal + (inv.summary.grandTotal || 0)
        }), {
            totalInvoices: 0, totalTaxable: 0, totalCGST: 0, totalSGST: 0, totalIGST: 0, totalGST: 0, grandTotal: 0
        });

        setFilteredInvoices(filtered);
        setReportData(totals);
    }, [allInvoices, dateRange, loading]);

    const ReportCard = ({ title, value, colorClass, icon: Icon, isCurrency = true }) => (
        <Card className={`p-6 border-l-4 ${colorClass}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
                    <h3 className="text-2xl font-bold">{isCurrency ? formatCurrency(value) : value}</h3>
                </div>
                {Icon && <Icon className="h-8 w-8 text-gray-400 opacity-50" />}
            </div>
        </Card>
    );

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-600 text-white">
                        <BarChart className="h-6 w-6" />
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight">GST Reports & Analytics</h2>
                </div>

                {/* Date Filter Inputs */}
                <div className="flex gap-2 items-center bg-white p-2 rounded-lg border shadow-sm">
                    <input
                        type="date"
                        className="border rounded p-1 text-sm"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        title="Start Date"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                        type="date"
                        className="border rounded p-1 text-sm"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        title="End Date"
                    />
                    {(dateRange.start || dateRange.end) && (
                        <button
                            onClick={() => setDateRange({ start: '', end: '' })}
                            className="text-xs text-red-500 font-medium hover:underline ml-2"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10">Loading Data...</div>
            ) : (
                <div className="space-y-8">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <ReportCard title="Total Taxable Value" value={reportData.totalTaxable} colorClass="border-l-blue-500" />
                        <ReportCard title="Total GST Collected" value={reportData.totalGST} colorClass="border-l-indigo-600" />
                        <ReportCard title="Total Invoices Amount" value={reportData.grandTotal} colorClass="border-l-green-600" />
                        <ReportCard title="Total Invoices Count" value={reportData.totalInvoices} colorClass="border-l-gray-500" icon={FileText} isCurrency={false} />
                    </div>

                    {/* Tax Breakup */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <ReportCard title="CGST (Central Tax)" value={reportData.totalCGST} colorClass="border-l-orange-500" />
                        <ReportCard title="SGST (State Tax)" value={reportData.totalSGST} colorClass="border-l-orange-500" />
                        <ReportCard title="IGST (Inter-State Tax)" value={reportData.totalIGST} colorClass="border-l-purple-500" />
                    </div>

                    {/* Recent Invoices Table (Compact) */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4">
                            Transactions ({dateRange.start || dateRange.end ? 'Filtered' : 'All Time'})
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="py-3 px-2">Date</th>
                                        <th className="py-3 px-2">Invoice #</th>
                                        <th className="py-3 px-2">Party</th>
                                        <th className="py-3 px-2 text-right">Taxable</th>
                                        <th className="py-3 px-2 text-right">GST</th>
                                        <th className="py-3 px-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInvoices.length === 0 ? (
                                        <tr><td colSpan="6" className="p-4 text-center text-muted-foreground">No invoices found for this period.</td></tr>
                                    ) : (
                                        filteredInvoices.slice(0, 50).map(inv => ( // Increased limit for reports
                                            <tr key={inv.id} className="border-b hover:bg-gray-50">
                                                <td className="py-3 px-2">{inv.invoiceDate || inv.date}</td>
                                                <td className="py-3 px-2 font-medium">{inv.invoiceNumber}</td>
                                                <td className="py-3 px-2">{inv.buyer?.name || inv.clientName}</td>
                                                <td className="py-3 px-2 text-right">{formatCurrency(inv.summary?.totalTaxableValue || 0)}</td>
                                                <td className="py-3 px-2 text-right">{formatCurrency(inv.summary?.totalGST || 0)}</td>
                                                <td className="py-3 px-2 text-right font-bold">{formatCurrency(inv.summary?.grandTotal || inv.totalAmount || 0)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default GstReports;
