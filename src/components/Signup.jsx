import React, { useState } from 'react';
import { Card, Button, Input } from './ui/Components';
import { UserCheck } from 'lucide-react';

const Signup = ({ onSignup }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Name is required');
            return;
        }
        if (!phone.trim()) {
            setError('Mobile number is required');
            return;
        }
        // Basic mobile validation (optional, can be strict regex if needed)
        if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
            setError('Please enter a valid 10-digit mobile number');
            return;
        }

        onSignup({ name, phone });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-md bg-white/80 backdrop-blur-sm shadow-xl border-t-4 border-t-primary">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                        <UserCheck size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">Welcome</h1>
                    <p className="text-muted-foreground text-center mt-2">
                        Please enter your details to continue to the Invoice App.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                        label="Full Name"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            setError('');
                        }}
                    />
                    <Input
                        label="Mobile Number"
                        placeholder="9876543210"
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                            setPhone(e.target.value);
                            setError('');
                        }}
                    />

                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-100">
                            {error}
                        </div>
                    )}

                    <Button type="submit" className="w-full py-6 text-lg">
                        Get Started
                    </Button>
                </form>
            </Card>
        </div>
    );
};

export default Signup;
