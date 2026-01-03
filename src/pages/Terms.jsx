import React from 'react';
import { Card, Button } from '../components/ui/Components';
import { ArrowLeft, Shield, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Terms = () => {
    const navigate = useNavigate();

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <Button variant="ghost" className="mb-6" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>

            <div className="text-center mb-10">
                <h1 className="text-4xl font-bold tracking-tight mb-4">Terms & Privacy Policy</h1>
                <p className="text-muted-foreground text-lg">Detailed information about how we handle your data and our service limitations.</p>
            </div>

            <div className="space-y-6">
                {/* Mandatory Disclaimer */}
                <Card className="p-6 border-l-4 border-l-red-500 bg-red-50/50">
                    <div className="flex items-start gap-3">
                        <Shield className="h-6 w-6 text-red-600 mt-1" />
                        <div>
                            <h2 className="text-xl font-bold text-red-800 mb-2">Important Disclaimer</h2>
                            <p className="text-red-700 font-medium">
                                "We do not file GST on your behalf. Data accuracy depends on user input."
                            </p>
                            <p className="text-sm text-red-600 mt-2">
                                InvoiceHub is an invoicing and record-keeping tool only. We are not a tax filing service, Chartered Accountant firm, or GST Suvidha Provider (GSP). You are solely responsible for filing your returns (GSTR-1, GSTR-3B, etc.) and ensuring the accuracy of the data entered into this system.
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-8">
                    <div className="space-y-8">
                        <section>
                            <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                1. Data Accuracy & User Responsibility
                            </h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Users are responsible for the accuracy of all data entered, including GSTINs, tax rates, HSN codes, and invoice amounts. The application provides validation to help prevent common errors, but it does not verify the authenticity of the data against government databases in real-time.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                                <Shield className="h-5 w-5 text-primary" />
                                2. Privacy & Data Security
                            </h3>
                            <p className="text-muted-foreground leading-relaxed">
                                We take your data privacy seriously. Your invoice data is stored securely in your own account. We do not sell your business data to third parties.
                            </p>
                            <ul className="list-disc pl-6 mt-3 space-y-2 text-muted-foreground">
                                <li><strong>Data Storage:</strong> Your data is stored on secure cloud servers (Firebase).</li>
                                <li><strong>Data Access:</strong> Only you and authorized users with your credentials can access your data.</li>
                                <li><strong>Encryption:</strong> Data transmission is encrypted via SSL/TLS.</li>
                            </ul>
                        </section>

                        <section>
                            <h3 className="text-xl font-semibold mb-3">3. Service Availability</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                We strive for 99.9% uptime but do not guarantee uninterrupted access. We recommend regularly downloading your invoices as PDF files for your local records.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-xl font-semibold mb-3">4. Limitation of Liability</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                In no event shall InvoiceHub be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the service.
                            </p>
                        </section>
                    </div>
                </Card>

                <div className="text-center text-sm text-muted-foreground pt-8">
                    <p>Last Updated: {new Date().toLocaleDateString()}</p>
                </div>
            </div>
        </div>
    );
};

export default Terms;
