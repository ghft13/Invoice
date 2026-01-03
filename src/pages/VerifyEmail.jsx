import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, Button } from '../components/ui/Components';
import { Mail, CheckCircle, RefreshCw, LogOut } from 'lucide-react';

const VerifyEmail = () => {
    const { currentUser, verifyEmail, logout } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [countdown, setCountdown] = useState(0);

    // Check verification status periodically
    useEffect(() => {
        const interval = setInterval(async () => {
            if (currentUser) {
                await currentUser.reload();
                if (currentUser.emailVerified) {
                    navigate('/dashboard');
                }
            }
        }, 3000); // Check every 3s

        return () => clearInterval(interval);
    }, [currentUser, navigate]);

    // Also check on mount
    useEffect(() => {
        if (currentUser?.emailVerified) {
            navigate('/dashboard');
        }
    }, [currentUser, navigate]);


    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleResend = async () => {
        setError('');
        setMessage('');
        setLoading(true);
        try {
            await verifyEmail(currentUser);
            setMessage('Verification email sent! Check your inbox.');
            setCountdown(60);
        } catch (err) {
            console.error(err);
            setError(err.message.replace('Firebase: ', ''));
            if (err.code === 'auth/too-many-requests') {
                setCountdown(60);
            }
        }
        setLoading(false);
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (e) {
            console.error(e);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-md bg-white/80 backdrop-blur-sm shadow-xl border-t-4 border-t-yellow-500 p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
                        <Mail size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">Verify Your Email</h1>
                    <p className="text-muted-foreground">
                        We sent a verification email to <span className="font-semibold text-gray-900">{currentUser?.email}</span>.
                        <br />
                        Please check your inbox and click the link to verify your account.
                    </p>

                    {message && (
                        <div className="w-full p-3 text-sm text-green-600 bg-green-50 rounded-md border border-green-100 flex items-center justify-center gap-2">
                            <CheckCircle size={16} /> {message}
                        </div>
                    )}

                    {error && (
                        <div className="w-full p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="w-full space-y-3 pt-4">
                        <Button
                            onClick={handleResend}
                            disabled={loading || countdown > 0}
                            className="w-full"
                            variant="outline"
                        >
                            {loading ? <RefreshCw className="animate-spin mr-2 h-4 w-4" /> : null}
                            {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Verification Email'}
                        </Button>

                        <Button
                            onClick={() => window.location.reload()}
                            className="w-full bg-primary text-white hover:bg-primary/90"
                        >
                            I've Verified My Email
                        </Button>

                        <button
                            onClick={handleLogout}
                            className="text-sm text-gray-500 hover:text-gray-900 flex items-center justify-center w-full mt-4"
                        >
                            <LogOut size={14} className="mr-1" /> Sign Out
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default VerifyEmail;
