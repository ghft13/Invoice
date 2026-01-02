import React, { useState } from 'react';
import { Card, Button, Input } from './ui/Components';
import { UserCheck, Lock, Mail, Phone, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
    const [isLogin, setIsLogin] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { signup, login } = useAuth();
    // Use window.location as fallback if needed, but App structure handles redirect usually
    // However, since we are moving this inside Routes eventually or calling it from App,
    // we need to handle "success" 

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Validation
        if (!email.trim() || !password.trim()) {
            setError('Email and Password are required');
            setLoading(false);
            return;
        }

        if (!isLogin && (!name.trim())) {
            setError('Name is required for signup');
            setLoading(false);
            return;
        }

        try {
            if (isLogin) {
                await login(email, password);
            } else {
                await signup(email, password, name, phone);
            }
            // Success is handled by AuthState listener in App.jsx which will redirect/render dashboard
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
                        <UserCheck size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
                    <p className="text-muted-foreground text-center mt-2">
                        {isLogin ? 'Enter your credentials to access your dashboard' : 'Sign up to start managing your invoices'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
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

                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-100">
                            {error}
                        </div>
                    )}

                    <Button type="submit" className="w-full py-2 text-lg" disabled={loading}>
                        {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-sm text-primary hover:underline"
                    >
                        {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
                    </button>
                </div>
            </Card>
        </div>
    );
};

export default Signup;
