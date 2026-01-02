import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, FileText, Settings, BarChart, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    const isActive = (path) => location.pathname === path;

    const linkClass = (path) =>
        `flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${isActive(path)
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`;

    return (
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <div className="flex items-center gap-2 font-bold text-xl text-primary">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <FileText className="h-5 w-5" />
                    </div>
                    <span>InvoiceHub</span>
                </div>

                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className={linkClass('/dashboard')}>
                        <LayoutDashboard className="h-4 w-4" />
                        <span className="hidden sm:inline">Dashboard</span>
                    </Link>
                    <Link to="/create-invoice" className={linkClass('/create-invoice')}>
                        <PlusCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">Create Invoice</span>
                    </Link>
                    <Link to="/invoices" className={linkClass('/invoices')}>
                        <FileText className="h-4 w-4" />
                        <span className="hidden sm:inline">Invoices</span>
                    </Link>
                    <Link to="/settings" className={linkClass('/settings')}>
                        <Settings className="h-4 w-4" />
                        <span className="hidden sm:inline">Settings</span>
                    </Link>
                    <Link to="/gst-reports" className={linkClass('/gst-reports')}>
                        <BarChart className="h-4 w-4" />
                        <span className="hidden sm:inline">Reports</span>
                    </Link>
                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-red-500 hover:bg-red-50">
                        <LogOut className="h-4 w-4" />
                        <span className="hidden sm:inline">Logout</span>
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
