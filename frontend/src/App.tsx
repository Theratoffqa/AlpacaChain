/**
 * AlpacaChain App — Connected to Alpaquitay Backend
 * 
 * All 4 pages are now wired to real API endpoints:
 *  Page 1: WelcomePage   → POST /api/auth/token
 *  Page 2: DashboardPage → GET  /api/contracts + POST /api/contracts/upload
 *  Page 3: PaymentPage   → POST /api/payments/fiserv/create-session
 *  Page 4: DocumentCenter→ GET  /api/contracts + POST /api/contracts/:id/verify
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, ShieldCheck, Leaf, Stethoscope, MapPin, CheckCircle2,
  Clock, ArrowRight, Search, Inbox, Send, FileCheck, FileEdit,
  CreditCard, Wallet, Globe, Menu, X, ChevronRight, Lock,
  ExternalLink, Mail, Upload, AlertTriangle, RefreshCw, Hash
} from 'lucide-react';
import { CERTIFICATE_TYPES } from './constants';
import * as api from './apiService';
import type { ContractData, IntegrityResult } from './apiService';

import alpaquitaLogo from './assets/alpaquita.png';

const LOGO_URL = alpaquitaLogo;

const Logo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <div className={`${className} rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-alpaca-purple shadow-md`}>
    <img src={LOGO_URL} alt="AlpacaChain Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
  </div>
);

// ─── Shared Components ───

const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
  const baseStyles = "px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: any = {
    primary: "bg-alpaca-purple text-white hover:bg-alpaca-purple-dark shadow-lg shadow-alpaca-purple/20",
    secondary: "bg-alpaca-grey text-alpaca-purple border-2 border-alpaca-purple hover:bg-alpaca-grey-light",
    ghost: "bg-transparent text-slate-400 hover:bg-alpaca-grey-light hover:text-white",
    danger: "bg-red-900/30 text-red-400 hover:bg-red-900/50",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Input = ({ label, placeholder, type = "text", value, onChange, icon: Icon }: any) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="text-sm font-medium text-slate-300 ml-1">{label}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />}
      <input type={type} placeholder={placeholder} value={value} onChange={onChange}
        className={`w-full px-4 py-3 ${Icon ? 'pl-11' : ''} bg-alpaca-grey border border-slate-700 text-white placeholder:text-slate-600 rounded-xl focus:ring-2 focus:ring-alpaca-purple/20 focus:border-alpaca-purple outline-none transition-all`}
      />
    </div>
  </div>
);

const Toast = ({ message, type = 'info' }: { message: string; type?: string }) => {
  if (!message) return null;
  const colors: any = {
    success: 'bg-emerald-900/50 text-emerald-400 border-emerald-800',
    error: 'bg-red-900/50 text-red-400 border-red-800',
    info: 'bg-alpaca-purple/20 text-alpaca-purple-light border-alpaca-purple/30',
  };
  return (
    <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
      className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl border shadow-2xl text-sm font-medium ${colors[type]}`}>
      {message}
    </motion.div>
  );
};

// ─── Utility ───
function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusColor(status: string) {
  switch (status) {
    case 'verified': case 'paid': return 'bg-emerald-900/30 text-emerald-400';
    case 'tampered': return 'bg-red-900/30 text-red-400';
    case 'uploaded': return 'bg-amber-900/30 text-amber-400';
    default: return 'bg-slate-700 text-slate-400';
  }
}

// ═══════════════════════════════════════════════
//  PAGE 1: WELCOME / LOGIN
// ═══════════════════════════════════════════════

const WelcomePage = ({ onLogin }: { onLogin: () => void }) => {
  const [ruc, setRuc] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!ruc || !password) { setError('RUC y password requeridos'); return; }
    setLoading(true);
    setError('');
    try {
      // userId = RUC, apiKey = password (maps to JWT_SECRET in backend .env)
      await api.login(ruc, password);
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-alpaca-black overflow-hidden relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-alpaca-purple/10 rounded-full blur-[120px] pointer-events-none" />
      
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        <div className="space-y-8 text-center lg:text-left">
          <div className="space-y-2">
            <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              className="text-alpaca-purple font-mono text-sm tracking-[0.2em] uppercase">
              Secure Smart Contracts
            </motion.p>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="text-7xl md:text-8xl font-bold text-white logo-font leading-[0.9] tracking-tighter">
              Alpaca<br />Chain
            </motion.h1>
          </div>
          
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-xl text-slate-400 max-w-md mx-auto lg:mx-0 leading-relaxed">
            Authentic, certified trade powered by the blockchain. Secure your exports with the trust of the Andes.
          </motion.p>

          <div className="bg-alpaca-grey/50 backdrop-blur-md p-8 rounded-3xl border border-slate-800 space-y-6 max-w-md mx-auto lg:mx-0">
            <div className="space-y-4">
              <Input label="RUC (Registro Unico de Contribuyentes)" placeholder="20123456789"
                value={ruc} onChange={(e: any) => setRuc(e.target.value)} />
              <Input label="Email" placeholder="business@peru.com" type="email"
                value={email} onChange={(e: any) => setEmail(e.target.value)} />
              <Input label="Password" placeholder="API Key from .env" type="password"
                value={password} onChange={(e: any) => setPassword(e.target.value)} />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 p-3 rounded-xl">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <Button onClick={handleSubmit} className="w-full py-4" disabled={loading}>
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <>Create Secure Account <ArrowRight className="w-5 h-5" /></>}
            </Button>

            <p className="text-center text-xs text-slate-500">
              Use RUC as userId and the JWT_SECRET from backend .env as password
            </p>
          </div>
        </div>

        <div className="relative hidden lg:block">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 20 }} className="relative z-10">
            <div className="w-full aspect-square max-w-[500px] mx-auto rounded-[3rem] bg-white p-2 shadow-2xl shadow-alpaca-purple/20 overflow-hidden border-4 border-alpaca-purple/30">
              <img src={LOGO_URL} alt="Alpaca Mascot" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute -top-6 -right-6 bg-alpaca-purple text-white p-6 rounded-3xl shadow-2xl border-2 border-white/20 backdrop-blur-xl">
              <ShieldCheck className="w-8 h-8 mb-2" />
              <p className="text-xs font-black uppercase tracking-widest">Verified<br />Secure</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }}
              className="absolute -bottom-4 -left-8 bg-alpaca-grey p-4 rounded-2xl rounded-bl-none shadow-xl border border-slate-700 max-w-[220px]">
              <p className="text-sm font-medium text-slate-200">
                "I'm your guide. Let's get your business secured with AlpacaChain."
              </p>
            </motion.div>
          </motion.div>
          <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] border border-alpaca-purple/10 rounded-full animate-pulse" />
        </div>
      </motion.div>
    </div>
  );
};

// ═══════════════════════════════════════════════
//  PAGE 2: DASHBOARD (connected to backend)
// ═══════════════════════════════════════════════

const DashboardPage = ({ onNext, onLogout }: { onNext: () => void; onLogout: () => void }) => {
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCertType, setSelectedCertType] = useState<string | null>(null);

  const loadContracts = useCallback(async () => {
    try {
      const data = await api.listContracts();
      setContracts(data.contracts);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadContracts(); }, [loadContracts]);

  const showToast = (message: string, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'info' }), 3000);
  };

  const handleCertClick = (certId: string) => {
    setSelectedCertType(certId);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const contract = await api.uploadContractFile(file, { certificateType: selectedCertType || 'general' });
      showToast(`Certificate uploaded! SHA-256: ${contract.sha256Hash.slice(0, 16)}...`, 'success');
      loadContracts();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const verifiedCount = contracts.filter(c => c.status === 'verified' || c.status === 'paid').length;
  const lastDate = contracts.length > 0 ? formatDate(contracts[0].createdAt) : 'None';

  return (
    <div className="min-h-screen bg-alpaca-black">
      <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.txt" onChange={handleFileSelected} />

      {/* Header */}
      <header className="bg-alpaca-black border-b border-slate-800 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Logo className="w-10 h-10" />
            <h1 className="text-2xl font-bold text-alpaca-purple logo-font">AlpacaChain</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-white">Connected to Backend</p>
              <p className="text-xs text-emerald-400">● localhost:3000</p>
            </div>
            <Button variant="ghost" onClick={onLogout} className="text-sm">Logout</Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Stats */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white">Dashboard</h2>
            <p className="text-slate-400">Your certificates secured on the blockchain</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="bg-alpaca-grey p-4 rounded-2xl shadow-sm border border-slate-800 flex-1 md:flex-none min-w-[150px]">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Certificates</p>
              <p className="text-2xl font-bold text-alpaca-purple">{loading ? '...' : contracts.length}</p>
            </div>
            <div className="bg-alpaca-grey p-4 rounded-2xl shadow-sm border border-slate-800 flex-1 md:flex-none min-w-[150px]">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Verified</p>
              <p className="text-2xl font-bold text-emerald-400">{loading ? '...' : verifiedCount}</p>
            </div>
            <div className="bg-alpaca-grey p-4 rounded-2xl shadow-sm border border-slate-800 flex-1 md:flex-none min-w-[150px]">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Last Upload</p>
              <p className="text-lg font-bold text-alpaca-purple">{loading ? '...' : lastDate}</p>
            </div>
          </div>
        </div>

        {/* Upload: Certificate Types */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-200">
              {uploading ? 'Uploading...' : 'New Certificate Request'}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {CERTIFICATE_TYPES.map((type) => (
              <motion.div key={type.id} whileHover={{ y: -5 }}
                className={`bg-alpaca-grey p-6 rounded-3xl border-2 border-transparent hover:border-alpaca-purple/30 shadow-sm hover:shadow-xl transition-all cursor-pointer group ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => handleCertClick(type.id)}>
                <div className="w-12 h-12 rounded-2xl bg-alpaca-purple/10 flex items-center justify-center text-alpaca-purple mb-4 group-hover:scale-110 transition-transform">
                  <type.icon className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-white mb-2">{type.title}</h4>
                <p className="text-sm text-slate-400 leading-relaxed">{type.description}</p>
                <div className="mt-3 flex items-center gap-2 text-alpaca-purple text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="w-4 h-4" /> Upload PDF/TXT
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Real Contracts from Backend */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-200">Recent Activity</h3>
            <Button variant="ghost" className="text-sm" onClick={loadContracts}>
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
          </div>
          <div className="bg-alpaca-grey rounded-3xl shadow-sm border border-slate-800 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading contracts...</div>
            ) : contracts.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No certificates yet. Upload your first one above!</div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-alpaca-grey-light border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Name</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">SHA-256</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Date</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {contracts.slice(0, 8).map((c) => (
                    <tr key={c._id} className="hover:bg-alpaca-grey-light transition-colors cursor-pointer" onClick={onNext}>
                      <td className="px-6 py-4 font-medium text-slate-200">{c.originalName}</td>
                      <td className="px-6 py-4">
                        <code className="text-xs font-mono bg-alpaca-black px-2 py-1 rounded text-alpaca-purple border border-slate-800">
                          {c.sha256Hash.slice(0, 12)}...
                        </code>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">{formatDate(c.createdAt)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${statusColor(c.status)}`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* CTA */}
        <div className="bg-alpaca-purple rounded-3xl p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <h3 className="text-2xl font-bold">Ready to secure your next trade?</h3>
            <p className="text-white/70 text-sm">Deploy smart contracts for your export documents in seconds.</p>
            <Button variant="secondary" className="w-full bg-white text-alpaca-purple border-none" onClick={() => fileInputRef.current?.click()}>
              Upload Certificate Now
            </Button>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        </div>
      </main>

      <AnimatePresence>
        {toast.message && <Toast message={toast.message} type={toast.type} />}
      </AnimatePresence>
    </div>
  );
};

// ═══════════════════════════════════════════════
//  PAGE 3: PAYMENT (connected to Fiserv)
// ═══════════════════════════════════════════════

const PaymentPage = ({ onNext, contracts }: { onNext: () => void; contracts: ContractData[] }) => {
  const [method, setMethod] = useState('card');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  // Pick the most recent unpaid contract
  const contract = contracts.find(c => c.status === 'uploaded' || c.status === 'verified');
  const certType = CERTIFICATE_TYPES[0]; // Default

  const showToast = (message: string, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'info' }), 4000);
  };

  const handlePay = async () => {
    if (!contract) { showToast('No pending contract to pay', 'error'); return; }
    if (!email) { showToast('Email required for payment', 'error'); return; }

    setLoading(true);
    try {
      const session = await api.createFiservSession({
        contractId: contract._id,
        amountCents: Math.round(certType.price * 100),
        customerEmail: email,
      });
      showToast('Payment session created! Redirecting...', 'success');
      // In production, redirect to session.checkoutUrl
      // For demo, just advance to next page
      setTimeout(onNext, 2000);
    } catch (err: any) {
      showToast(`Payment failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-alpaca-black flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 bg-alpaca-grey rounded-[2rem] shadow-2xl overflow-hidden border border-slate-800">

        {/* Left: Order Summary */}
        <div className="p-10 bg-alpaca-grey-light/30 border-r border-slate-800 space-y-8">
          <h2 className="text-2xl font-bold text-alpaca-purple">Certificate Payment</h2>
          
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-white">{contract?.originalName || 'Certificate'}</p>
                <p className="text-sm text-slate-400">
                  Hash: <code className="text-xs text-alpaca-purple">{contract?.sha256Hash?.slice(0, 16) || '—'}...</code>
                </p>
              </div>
              <p className="font-bold text-white">${certType.price.toFixed(2)}</p>
            </div>
            
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-white">Blockchain Deployment</p>
                <p className="text-sm text-slate-400">SHA-256 Hash Verification</p>
              </div>
              <p className="font-bold text-white">$12.50</p>
            </div>

            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-white">Processing Fee</p>
                <p className="text-sm text-slate-400">Fiserv payment processing</p>
              </div>
              <p className="font-bold text-white">$2.45</p>
            </div>

            <div className="pt-6 border-t border-slate-700">
              <div className="flex justify-between items-center">
                <p className="text-xl font-bold text-white">Total</p>
                <p className="text-3xl font-bold text-alpaca-purple">${(certType.price + 14.95).toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-alpaca-black p-4 rounded-2xl border border-slate-800 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-900/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-400 leading-tight">
              Payment processed by Fiserv with end-to-end encryption. SHA-256 hash verified.
            </p>
          </div>
        </div>

        {/* Right: Payment Form */}
        <div className="p-10 space-y-8">
          <div className="flex gap-2 p-1 bg-alpaca-black rounded-xl">
            {['card', 'paypal', 'crypto'].map((m) => (
              <button key={m} onClick={() => setMethod(m)}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all capitalize ${
                  method === m ? 'bg-alpaca-purple text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                }`}>
                {m}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <Input label="Email (for receipt)" placeholder="your@email.com" type="email" icon={Mail}
              value={email} onChange={(e: any) => setEmail(e.target.value)} />
            <Input label="Cardholder Name" placeholder="Juan Perez" />
            <Input label="Card Number" placeholder="0000 0000 0000 0000" icon={CreditCard} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Expiry" placeholder="MM/YY" />
              <Input label="CVC" placeholder="123" icon={Lock} />
            </div>
          </div>

          <Button onClick={handlePay} className="w-full py-4 text-lg" disabled={loading}>
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Pay and Secure Documents'}
          </Button>

          <p className="text-center text-[10px] text-slate-500 uppercase tracking-widest font-bold">
            FISERV PROCESSED &bull; PCI-DSS COMPLIANT &bull; SHA-256 VERIFIED
          </p>
        </div>
      </motion.div>

      <AnimatePresence>
        {toast.message && <Toast message={toast.message} type={toast.type} />}
      </AnimatePresence>
    </div>
  );
};

// ═══════════════════════════════════════════════
//  PAGE 4: DOCUMENT CENTER (connected to backend)
// ═══════════════════════════════════════════════

const DocumentCenterPage = ({ onLogout }: { onLogout: () => void }) => {
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<ContractData | null>(null);
  const [verification, setVerification] = useState<IntegrityResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const showToast = (message: string, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'info' }), 3000);
  };

  useEffect(() => {
    api.listContracts().then(data => {
      setContracts(data.contracts);
      if (data.contracts.length > 0) setSelectedDoc(data.contracts[0]);
      setLoading(false);
    }).catch(err => {
      showToast(err.message, 'error');
      setLoading(false);
    });
  }, []);

  const handleVerify = async () => {
    if (!selectedDoc) return;
    setVerifying(true);
    setVerification(null);
    try {
      const result = await api.verifyContract(selectedDoc._id);
      setVerification(result);
      showToast(result.isValid ? 'Integrity verified!' : 'INTEGRITY COMPROMISED!', result.isValid ? 'success' : 'error');
      // Refresh the contract list to reflect status change
      const updated = await api.listContracts();
      setContracts(updated.contracts);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setVerifying(false);
    }
  };

  const filtered = contracts.filter(c =>
    c.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.sha256Hash.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-alpaca-black flex flex-col">
      {/* Top Bar */}
      <div className="h-16 border-b border-slate-800 flex items-center px-6 gap-8 bg-alpaca-black">
        <div className="flex items-center gap-3 min-w-[180px]">
          <Logo className="w-8 h-8" />
          <h1 className="text-xl font-bold text-alpaca-purple logo-font">AlpacaChain</h1>
        </div>
        <div className="flex-1 max-w-2xl relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input type="text" placeholder="Search certificates by name or hash..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-alpaca-grey border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:ring-2 focus:ring-alpaca-purple/20 outline-none" />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-emerald-400 font-mono">● LIVE</span>
          <Button variant="ghost" onClick={onLogout} className="text-sm p-2">Logout</Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-800 p-4 space-y-2 bg-alpaca-black">
          <nav className="space-y-1">
            {[
              { icon: Inbox, label: 'All Certificates', active: true, count: contracts.length },
              { icon: CheckCircle2, label: 'Verified', count: contracts.filter(c => c.status === 'verified').length },
              { icon: Clock, label: 'Pending', count: contracts.filter(c => c.status === 'uploaded').length },
              { icon: AlertTriangle, label: 'Tampered', count: contracts.filter(c => c.status === 'tampered').length },
            ].map((item) => (
              <button key={item.label}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  item.active ? 'bg-alpaca-purple text-white' : 'text-slate-400 hover:bg-alpaca-grey'
                }`}>
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
                <span className="text-xs font-bold">{item.count}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col bg-alpaca-black/50">
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading certificates...</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-alpaca-grey border-b border-slate-700 z-10">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Certificate</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">SHA-256 Hash</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-alpaca-black">
                  {filtered.map((doc) => (
                    <tr key={doc._id} onClick={() => { setSelectedDoc(doc); setVerification(null); }}
                      className={`cursor-pointer border-b border-slate-800 transition-colors ${
                        selectedDoc?._id === doc._id ? 'bg-alpaca-purple/10' : 'hover:bg-alpaca-grey/30'
                      }`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${doc.status === 'verified' || doc.status === 'paid' ? 'bg-emerald-500' : doc.status === 'tampered' ? 'bg-red-500' : 'bg-amber-500'}`} />
                          <div>
                            <p className="text-sm font-bold text-white">{doc.originalName}</p>
                            <p className="text-xs text-slate-500">{doc.mimeType || 'text/plain'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs font-mono bg-alpaca-black px-2 py-1 rounded text-alpaca-purple border border-slate-800">
                          {doc.sha256Hash.slice(0, 20)}...
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${statusColor(doc.status)}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 text-right">{formatDate(doc.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Detail View */}
          <AnimatePresence mode="wait">
            {selectedDoc && (
              <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
                className="h-[350px] bg-alpaca-grey border-t border-slate-700 shadow-2xl p-8 flex gap-8 overflow-hidden">
                
                {/* Left: Document Preview */}
                <div className="w-1/3 h-full bg-alpaca-black rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center relative group">
                  <Hash className="w-12 h-12 text-alpaca-purple mb-3" />
                  <code className="text-[10px] font-mono text-slate-500 text-center px-4 break-all leading-relaxed">
                    {selectedDoc.sha256Hash}
                  </code>
                  <div className="absolute top-4 right-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${statusColor(selectedDoc.status)}`}>
                      {selectedDoc.status}
                    </span>
                  </div>
                </div>

                {/* Right: Details + Verify */}
                <div className="flex-1 space-y-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-bold text-white">{selectedDoc.originalName}</h3>
                      <p className="text-slate-400 text-sm">Uploaded: {formatDate(selectedDoc.createdAt)}</p>
                    </div>
                    <span className={`px-4 py-1.5 text-xs font-black rounded-full flex items-center gap-2 ${statusColor(selectedDoc.status)}`}>
                      <CheckCircle2 className="w-3 h-3" /> {selectedDoc.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Verification Result */}
                  {verification && (
                    <div className={`p-4 rounded-2xl border ${verification.isValid
                      ? 'bg-emerald-900/20 border-emerald-800 text-emerald-400'
                      : 'bg-red-900/20 border-red-800 text-red-400'}`}>
                      <p className="font-bold text-sm">
                        {verification.isValid ? '✅ Integrity Verified' : '⚠️ INTEGRITY COMPROMISED'}
                      </p>
                      <div className="mt-2 text-[10px] font-mono space-y-1 opacity-80">
                        <p>Stored:   {verification.storedHash}</p>
                        <p>Computed: {verification.computedHash}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-alpaca-black rounded-2xl border border-slate-800">
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">File Type</p>
                      <p className="text-sm font-bold text-slate-300">{selectedDoc.mimeType || 'text/plain'}</p>
                    </div>
                    <div className="p-4 bg-alpaca-black rounded-2xl border border-slate-800">
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Hash Algorithm</p>
                      <p className="text-sm font-bold text-slate-300">SHA-256</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button className="flex-1" onClick={handleVerify} disabled={verifying}>
                      {verifying ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><ShieldCheck className="w-5 h-5" /> Verify Integrity</>}
                    </Button>
                    <Button variant="secondary" className="flex-1" onClick={() => {
                      navigator.clipboard.writeText(selectedDoc.sha256Hash);
                      showToast('Hash copied!', 'info');
                    }}>
                      <ExternalLink className="w-5 h-5" /> Copy Hash
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {toast.message && <Toast message={toast.message} type={toast.type} />}
      </AnimatePresence>
    </div>
  );
};

// ═══════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════

export default function App() {
  const [currentPage, setCurrentPage] = useState(api.isAuthenticated() ? 2 : 1);
  const [contracts, setContracts] = useState<ContractData[]>([]);

  const handleLogin = () => setCurrentPage(2);
  const handleLogout = () => {
    api.clearToken();
    setCurrentPage(1);
  };

  // Load contracts for payment page
  useEffect(() => {
    if (currentPage === 3 && api.isAuthenticated()) {
      api.listContracts().then(data => setContracts(data.contracts)).catch(() => {});
    }
  }, [currentPage]);

  const nextPage = () => setCurrentPage(prev => prev < 4 ? prev + 1 : 2);

  return (
    <div className="font-sans antialiased">
      <AnimatePresence mode="wait">
        {currentPage === 1 && (
          <motion.div key="page1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}>
            <WelcomePage onLogin={handleLogin} />
          </motion.div>
        )}
        {currentPage === 2 && (
          <motion.div key="page2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <DashboardPage onNext={nextPage} onLogout={handleLogout} />
          </motion.div>
        )}
        {currentPage === 3 && (
          <motion.div key="page3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <PaymentPage onNext={nextPage} contracts={contracts} />
          </motion.div>
        )}
        {currentPage === 4 && (
          <motion.div key="page4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <DocumentCenterPage onLogout={handleLogout} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Demo Navigation */}
      <div className="fixed bottom-4 right-4 flex gap-2 z-50">
        {[1, 2, 3, 4].map(num => (
          <button key={num} onClick={() => setCurrentPage(num)}
            className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
              currentPage === num ? 'bg-alpaca-purple text-white scale-110 shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-100'
            }`}>
            {num}
          </button>
        ))}
      </div>
    </div>
  );
}
