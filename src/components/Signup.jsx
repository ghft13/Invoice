import React, { useState } from 'react';
import { Card, Button, Input } from './ui/Components';
import { UserCheck, Lock, Mail, Phone, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
    const [isLogin, setIsLogin] = useState(false);
    const [isReset, setIsReset] = useState(false); // New state for Reset Password mode
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState(''); // Success message
    const [loading, setLoading] = useState(false);

    const { signup, login, resetPassword } = useAuth();

    // Clear errors when switching modes
    const switchMode = (mode) => {
        setError('');
        setMessage('');
        setIsReset(mode === 'reset');
        if (mode === 'reset') {
            setIsLogin(true); // Technically related to login flow
        } else {
            setIsLogin(mode === 'login');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        // Validation
        if (!email.trim()) {
            setError('Email is required');
            setLoading(false);
            return;
        }

        if (!isReset && !password.trim()) {
            setError('Password is required');
            setLoading(false);
            return;
        }

        if (!isLogin && !isReset && (!name.trim())) {
            setError('Name is required for signup');
            setLoading(false);
            return;
        }

        try {
            if (isReset) {
                await resetPassword(email);
                setMessage('Check your email inbox for password reset instructions.');
            } else if (isLogin) {
                await login(email, password);
            } else {
                await signup(email, password, name, phone);
            }
        } catch (err) {
            setError(err.message.replace('Firebase: ', ''));
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-md bg-white/80 backdrop-blur-sm shadow-xl border-t-4 border-t-primary p-6">
                <div className="flex flex-col items-center mb-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                        {isReset ? <Mail size={32} /> : <UserCheck size={32} />}
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        {isReset ? 'Reset Password' : (isLogin ? 'Welcome Back' : 'Create Account')}
                    </h1>
                    <p className="text-muted-foreground text-center mt-2">
                        {isReset
                            ? 'Enter your email to receive a password reset link'
                            : (isLogin ? 'Enter your credentials to access your dashboard' : 'Sign up to start managing your invoices')}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name & Phone only for Signup */}
                    {!isLogin && !isReset && (
                        <>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    className="pl-10"
                                    placeholder="Full Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    className="pl-10"
                                    placeholder="Mobile Number (Optional)"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                            className="pl-10"
                            placeholder="Email Address"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    {/* Password only if NOT resetting */}
                    {!isReset && (
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                                className="pl-10"
                                placeholder="Password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Forgot Password Link */}
                    {isLogin && !isReset && (
                        <div className="text-right">
                            <button
                                type="button"
                                onClick={() => switchMode('reset')}
                                className="text-xs text-primary hover:underline font-medium"
                            >
                                Forgot Password?
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-100">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md border border-green-100">
                            {message}
                        </div>
                    )}

                    <Button type="submit" className="w-full py-2 text-lg" disabled={loading}>
                        {loading ? 'Processing...' : (isReset ? 'Send Reset Link' : (isLogin ? 'Login' : 'Sign Up'))}
                    </Button>
                </form>

                <div className="mt-6 text-center space-y-2">
                    {/* Navigation Links */}
                    {isReset ? (
                        <button
                            onClick={() => switchMode('login')}
                            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                        >
                            Back to Login
                        </button>
                    ) : (
                        <button
                            onClick={() => switchMode(isLogin ? 'signup' : 'login')}
                            className="text-sm text-primary hover:underline"
                        >
                            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
                        </button>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default Signup;
