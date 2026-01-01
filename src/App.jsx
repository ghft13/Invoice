import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import CreateInvoice from './pages/CreateInvoice';
import Invoices from './pages/Invoices';
import Settings from './pages/Settings';
import GstReports from './pages/GstReports';
import Signup from './components/Signup';
import { db } from './firebase';
import { collection, addDoc, doc, onSnapshot } from 'firebase/firestore';

function App() {
  const [user, setUser] = useState(() => {
    const savedForUser = localStorage.getItem('user_profile');
    return savedForUser ? JSON.parse(savedForUser) : null;
  });

  // Listen for real-time user updates
  useEffect(() => {
    if (user?.id) {
      const unsub = onSnapshot(doc(db, "users", user.id), (doc) => {
        if (doc.exists()) {
          const newData = { ...doc.data(), id: doc.id };
          if (JSON.stringify(newData) !== JSON.stringify(user)) {
            setUser(newData);
            localStorage.setItem('user_profile', JSON.stringify(newData));
          }
        }
      });
      return () => unsub();
    }
  }, [user?.id]);

  const handleSignup = async (userData) => {
    localStorage.setItem('user_profile', JSON.stringify(userData));
    setUser(userData);

    try {
      const docRef = await addDoc(collection(db, "users"), {
        ...userData,
        isPremium: false,
        invoiceCount: 0,
        createdAt: new Date()
      });
      const userWithId = { ...userData, id: docRef.id, isPremium: false, invoiceCount: 0 };
      setUser(userWithId);
      localStorage.setItem('user_profile', JSON.stringify(userWithId));
    } catch (e) {
      console.error("Error adding document: ", e);
      alert(`Firebase Error: ${e.message}`);
    }
  };

  if (!user) {
    return <Signup onSignup={handleSignup} />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-muted/40 font-sans text-foreground">
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-invoice" element={<CreateInvoice />} />
          <Route path="/invoice/:id" element={<CreateInvoice />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/gst-reports" element={<GstReports />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
