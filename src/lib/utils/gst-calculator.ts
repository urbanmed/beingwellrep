export interface GSTDetails {
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  netAmount: number;
  grossAmount: number;
  hsnCode: string;
}

export interface CustomerDetails {
  gstin?: string;
  state: string;
  customerType: 'individual' | 'business';
}

// HSN Code for SaaS services in India
const SAAS_HSN_CODE = '998314';

// GST rates for different services
const GST_RATES = {
  saas: 18, // 18% GST for SaaS services
  individual: 18,
  business: 18
};

// Indian states with their state codes
const INDIAN_STATES = {
  'andhra pradesh': 'AP',
  'arunachal pradesh': 'AR',
  'assam': 'AS',
  'bihar': 'BR',
  'chhattisgarh': 'CG',
  'goa': 'GA',
  'gujarat': 'GJ',
  'haryana': 'HR',
  'himachal pradesh': 'HP',
  'jharkhand': 'JH',
  'karnataka': 'KA',
  'kerala': 'KL',
  'madhya pradesh': 'MP',
  'maharashtra': 'MH',
  'manipur': 'MN',
  'meghalaya': 'ML',
  'mizoram': 'MZ',
  'nagaland': 'NL',
  'odisha': 'OD',
  'punjab': 'PB',
  'rajasthan': 'RJ',
  'sikkim': 'SK',
  'tamil nadu': 'TN',
  'telangana': 'TS',
  'tripura': 'TR',
  'uttar pradesh': 'UP',
  'uttarakhand': 'UK',
  'west bengal': 'WB',
  'delhi': 'DL',
  'jammu and kashmir': 'JK',
  'ladakh': 'LA',
  'chandigarh': 'CH',
  'dadra and nagar haveli and daman and diu': 'DN',
  'lakshadweep': 'LD',
  'puducherry': 'PY',
  'andaman and nicobar islands': 'AN'
};

// Company state (where HealthVault Pro is registered)
const COMPANY_STATE = 'karnataka'; // Update this based on company registration

export function calculateGST(
  amount: number, // Amount in paisa (smallest currency unit)
  customerDetails: CustomerDetails
): GSTDetails {
  const customerState = customerDetails.state.toLowerCase();
  const companyState = COMPANY_STATE.toLowerCase();
  
  // Determine if it's intrastate or interstate transaction
  const isIntrastate = customerState === companyState;
  
  // Get applicable GST rate
  const gstRate = GST_RATES.saas;
  
  // Calculate net amount (amount before tax)
  const netAmount = Math.round(amount / (1 + gstRate / 100));
  const totalTax = amount - netAmount;
  
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  
  if (isIntrastate) {
    // For intrastate transactions: CGST + SGST
    cgst = Math.round(totalTax / 2);
    sgst = Math.round(totalTax / 2);
  } else {
    // For interstate transactions: IGST
    igst = totalTax;
  }
  
  return {
    cgst,
    sgst,
    igst,
    totalTax,
    netAmount,
    grossAmount: amount,
    hsnCode: SAAS_HSN_CODE
  };
}

export function validateGSTIN(gstin: string): boolean {
  // GSTIN format: 22AAAAA0000A1Z5
  // 15 characters: 2 state code + 10 PAN + 1 entity number + 1 Z + 1 checksum
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  
  if (!gstin || !gstinRegex.test(gstin)) {
    return false;
  }
  
  // Basic checksum validation (simplified)
  return true;
}

export function getStateFromGSTIN(gstin: string): string | null {
  if (!validateGSTIN(gstin)) {
    return null;
  }
  
  const stateCode = gstin.substring(0, 2);
  const stateCodeToName: { [key: string]: string } = {};
  
  Object.entries(INDIAN_STATES).forEach(([name, code]) => {
    // Convert state codes to numbers for GSTIN mapping
    const numericCode = Object.keys(INDIAN_STATES).indexOf(name) + 1;
    stateCodeToName[numericCode.toString().padStart(2, '0')] = name;
  });
  
  return stateCodeToName[stateCode] || null;
}

export function formatGSTAmount(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

export function generateGSTInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().substr(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `INV${year}${month}${randomNum}`;
}

export function isGSTApplicable(customerDetails: CustomerDetails): boolean {
  // GST is applicable for all transactions in India
  return true;
}