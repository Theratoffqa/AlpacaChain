import { 
  FileText, 
  ShieldCheck, 
  Leaf, 
  Stethoscope, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Search,
  Inbox,
  Send,
  FileCheck,
  FileEdit,
  CreditCard,
  Wallet,
  Globe
} from 'lucide-react';

export const COLORS = {
  primary: '#6D28D9',
  secondary: '#8B5CF6',
  accent: '#C084FC',
  bg: '#F9FAFB',
  text: '#1F2937',
};

export const CERTIFICATE_TYPES = [
  {
    id: 'origin',
    title: 'Certificate of Origin',
    description: 'Verify 100% Peruvian Origin. Builds trust with EU importers for 0% tariff.',
    icon: MapPin,
    price: 45.00
  },
  {
    id: 'wool',
    title: '100% Alpaca Wool',
    description: 'Validate the purity and quality of your fiber.',
    icon: ShieldCheck,
    price: 35.00
  },
  {
    id: 'organic',
    title: 'Organic & Fair Trade',
    description: 'Certify your sustainable and ethical practices. Valued by German buyers.',
    icon: Leaf,
    price: 55.00
  },
  {
    id: 'senasa',
    title: 'Veterinary Certificate (SENASA)',
    description: 'Required for skins/peletería.',
    icon: Stethoscope,
    price: 30.00
  }
];

export const RECENT_ACTIVITY = [
  { id: 1, subject: 'Order #8821 - Alpaca Scarf', importer: 'Berlin Textiles', date: 'Mar 20, 2026', status: 'VERIFIED' },
  { id: 2, subject: 'Order #8819 - Raw Fiber', importer: 'Milan Fashion House', date: 'Mar 18, 2026', status: 'PENDING' },
  { id: 3, subject: 'Order #8815 - Poncho Set', importer: 'Tokyo Imports', date: 'Mar 15, 2026', status: 'VERIFIED' },
];

export const INBOX_DOCUMENTS = [
  {
    id: 'doc1',
    subject: 'Certified: Order #1234 - 100% Alpaca Sweater',
    importer: 'Müller Handels GmbH, Germany',
    date: 'Oct 26, 2023',
    status: 'VERIFIED ON BLOCKCHAIN',
    type: 'Certificate of Origin'
  },
  {
    id: 'doc2',
    subject: 'Certified: Order #1235 - Premium Fiber Lot',
    importer: 'Loro Piana, Italy',
    date: 'Nov 02, 2023',
    status: 'VERIFIED ON BLOCKCHAIN',
    type: '100% Alpaca Wool'
  },
  {
    id: 'doc3',
    subject: 'Certified: Order #1240 - Ethical Collection',
    importer: 'EcoStyle, Sweden',
    date: 'Dec 12, 2023',
    status: 'PENDING SIGNATURE',
    type: 'Organic & Fair Trade'
  }
];

export const TRANSACTION_HISTORY = [
  { id: 'tx1', certificate: 'Certificate of Origin', date: 'Mar 21, 2026', txId: '0x8f2...e1a2', amount: '$45.00' },
  { id: 'tx2', certificate: '100% Alpaca Wool', date: 'Mar 19, 2026', txId: '0x3c1...b4d5', amount: '$35.00' },
  { id: 'tx3', certificate: 'Organic & Fair Trade', date: 'Mar 15, 2026', txId: '0x9a4...f7c8', amount: '$55.00' },
  { id: 'tx4', certificate: 'Veterinary Certificate', date: 'Mar 10, 2026', txId: '0x2e5...d9f0', amount: '$30.00' },
];
