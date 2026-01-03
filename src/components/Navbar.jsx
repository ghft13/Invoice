import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, FileText, Settings, BarChart, LogOut, Package, Shield, Menu, MoreVertical } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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
                    <Link to="/clients" className={linkClass('/clients')}>
                        <FileText className="h-4 w-4" />
                        <span className="hidden sm:inline">Clients</span>
                    </Link>
                    <Link to="/items" className={linkClass('/items')}>
                        <Package className="h-4 w-4" />
                        <span className="hidden sm:inline">Items</span>
                    </Link>

                    {/* Updated Menu Dropdown */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${isMenuOpen ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                        >
                            <Menu className="h-5 w-5" />
                            <span className="hidden sm:inline">Menu</span>
                        </button>

                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-popover ring-1 ring-black ring-opacity-5 focus:outline-none z-50 border">
                                <div className="py-1">
                                    <Link
                                        to="/terms"
                                        className="flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-accent hover:text-accent-foreground w-full text-left"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <Shield className="h-4 w-4" />
                                        Terms & Privacy
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 w-full text-left"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
