import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import CreateInvoice from './pages/CreateInvoice';
import Invoices from './pages/Invoices';
import Settings from './pages/Settings';
import GstReports from './pages/GstReports';
import Signup from './components/Signup';
import { AuthProvider, useAuth } from './context/AuthContext';

// wrapper to protect routes
const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
};

// Start Page wrapper
const Landing = () => {
  const { currentUser } = useAuth();
  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Signup />;
};


function AppRoutes() {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen bg-muted/40 font-sans text-foreground">
      {currentUser && <Navbar />}
      <Routes>
        <Route path="/login" element={<Landing />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/create-invoice" element={<PrivateRoute><CreateInvoice /></PrivateRoute>} />
        <Route path="/invoice/:id" element={<PrivateRoute><CreateInvoice /></PrivateRoute>} />
        <Route path="/invoices" element={<PrivateRoute><Invoices /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="/gst-reports" element={<PrivateRoute><GstReports /></PrivateRoute>} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
