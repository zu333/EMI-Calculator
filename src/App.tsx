import { useState, useEffect, FormEvent } from 'react';
import {
  Calculator,
  Percent,
  Calendar as CalendarIcon,
  TrendingUp,
  Save,
  RotateCcw,
  Clock,
  Sparkles,
  DollarSign,
  Briefcase,
  Layers,
  ArrowRight,
  HelpCircle,
  AlertTriangle,
  Bookmark,
  Home
} from 'lucide-react';
import { TenureUnit, LoanInputs, LoanResults, SavedCalculation } from './types';
import DonutChart from './components/DonutChart';
import AmortizationTable from './components/AmortizationTable';
import CompareModule from './components/CompareModule';

// Predefined currencies with symbols and standard configurations
const CURRENCIES = [
  { symbol: '$', code: 'USD', name: 'US Dollar' },
  { symbol: '₹', code: 'INR', name: 'Indian Rupee' },
  { symbol: 'Rs', code: 'PKR', name: 'Pakistani Rupee' },
  { symbol: '€', code: 'EUR', name: 'Euro' },
  { symbol: '£', code: 'GBP', name: 'British Pound' },
  { symbol: '¥', code: 'JPY', name: 'Japanese Yen' },
  { symbol: 'C$', code: 'CAD', name: 'Canadian Dollar' },
  { symbol: 'A$', code: 'AUD', name: 'Australian Dollar' },
];

// Auto-detect user's currency based on their locale or timezone
const detectLocalCurrency = (): string => {
  try {
    // 1. Detect by locale (preferred)
    const locale = (navigator.language || (navigator.languages && navigator.languages[0]) || '').toUpperCase();
    if (locale.includes('IN')) return '₹'; // India
    if (locale.includes('PK')) return 'Rs'; // Pakistan
    if (locale.includes('GB')) return '£'; // United Kingdom
    if (locale.includes('JP')) return '¥'; // Japan
    if (locale.includes('CA')) return 'C$'; // Canada
    if (locale.includes('AU')) return 'A$'; // Australia
    
    // Check European countries
    const euroLocales = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'FI', 'GR', 'IE', 'PT', 'AT'];
    if (euroLocales.some(el => locale.includes(el))) return '€';

    // 2. Fallback check by timezone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Calcutta') || tz.includes('Kolkata') || tz.includes('Asia/Kolkata') || tz.includes('Asia/Calcutta')) {
      return '₹';
    }
    if (tz.includes('Karachi') || tz.includes('Asia/Karachi') || tz.includes('Islamabad') || tz.includes('Lahore')) {
      return 'Rs';
    }
    if (tz.includes('London') || tz.includes('Europe/London')) {
      return '£';
    }
    if (tz.includes('Tokyo') || tz.includes('Asia/Tokyo')) {
      return '¥';
    }
    if (tz.includes('Europe') || tz.includes('Paris') || tz.includes('Berlin') || tz.includes('Rome') || tz.includes('Madrid')) {
      return '€';
    }
    if (tz.includes('Sydney') || tz.includes('Melbourne') || tz.includes('Australia') || tz.includes('Brisbane')) {
      return 'A$';
    }
    if (tz.includes('Toronto') || tz.includes('Vancouver') || tz.includes('Canada')) {
      return 'C$';
    }
  } catch (e) {
    console.warn('Could not auto-detect location/currency:', e);
  }
  return '$'; // Default to US Dollar if undetermined
};

export default function App() {
  // --- CORE STATE ---
  const [loanAmount, setLoanAmount] = useState<number>(100000);
  const [interestRate, setInterestRate] = useState<number>(7.5);
  const [tenureValue, setTenureValue] = useState<number>(15);
  const [tenureUnit, setTenureUnit] = useState<TenureUnit>('years');
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');
  const [startDate, setStartDate] = useState<string>('2026-07'); // Default to metadata current local time (July 2026)
  
  // --- PREPAYMENT / SAVINGS FEATURE STATE ---
  const [enablePrepayment, setEnablePrepayment] = useState<boolean>(false);
  const [extraMonthlyPayment, setExtraMonthlyPayment] = useState<number>(200);

  // --- VALIDATION ERRORS ---
  const [errors, setErrors] = useState<Record<string, string>>({});

  // --- RESULTS STATE ---
  const [results, setResults] = useState<LoanResults | null>(null);
  const [baselineResults, setBaselineResults] = useState<LoanResults | null>(null); // To compare prepayment savings

  // --- CALCULATE ACTION TRACKER (for animation / triggers) ---
  const [calcTriggered, setCalcTriggered] = useState<boolean>(false);

  // --- SAVED SCENARIOS / COMPARISON STATES ---
  const [savedCalculations, setSavedCalculations] = useState<SavedCalculation[]>([]);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [saveScenarioName, setSaveScenarioName] = useState<string>('');
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);

  // --- ACTIVE TABS ---
  const [activeTab, setActiveTab] = useState<'schedule' | 'comparator'>('schedule');

  // --- INITIAL LOAD ---
  useEffect(() => {
    // Detect currency from user's location / timezone
    const detected = detectLocalCurrency();
    setCurrencySymbol(detected);

    const saved = localStorage.getItem('emi-saved-scenarios');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedCalculations(parsed);
        // Select first few as default to compare
        if (parsed.length > 0) {
          setSelectedCompareIds(parsed.slice(0, 3).map((p: SavedCalculation) => p.id));
        }
      } catch (e) {
        console.error('Failed to parse saved scenarios', e);
      }
    }
  }, []);

  // --- COMPUTE LOAN DETAILS ---
  const runCalculation = () => {
    // 1. Validate inputs
    const newErrors: Record<string, string> = {};
    if (loanAmount <= 0) {
      newErrors.loanAmount = 'Loan amount must be greater than zero.';
    }
    if (interestRate < 0) {
      newErrors.interestRate = 'Interest rate cannot be negative.';
    } else if (interestRate > 50) {
      newErrors.interestRate = 'Interest rate cannot exceed 50%.';
    }
    if (tenureValue <= 0) {
      newErrors.tenureValue = 'Tenure must be greater than zero.';
    } else {
      const months = tenureUnit === 'years' ? tenureValue * 12 : tenureValue;
      if (months > 480) {
        newErrors.tenureValue = 'Tenure cannot exceed 40 years (480 months).';
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setResults(null);
      setBaselineResults(null);
      return;
    }

    // 2. Perform EMI computation
    const calc = (amount: number, rate: number, tenureVal: number, unit: TenureUnit, extraMonthly: number) => {
      const totalMonths = unit === 'years' ? tenureVal * 12 : tenureVal;
      const monthlyRate = rate / 12 / 100;

      let emi = 0;
      if (monthlyRate === 0) {
        emi = amount / totalMonths;
      } else {
        emi = (amount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / 
              (Math.pow(1 + monthlyRate, totalMonths) - 1);
      }

      // Generate Amortization Schedule
      const schedule: any[] = [];
      let remainingBalance = amount;
      let totalInterestPayable = 0;
      let periodIndex = 1;

      while (remainingBalance > 0.01 && periodIndex <= 480) {
        const interestForMonth = remainingBalance * monthlyRate;
        let currentEmi = emi;
        let extra = extraMonthly;

        let principalForMonth = currentEmi - interestForMonth;

        // Last month payoff protection
        if (principalForMonth > remainingBalance) {
          principalForMonth = remainingBalance;
          currentEmi = principalForMonth + interestForMonth;
          extra = 0;
        }

        remainingBalance = remainingBalance - principalForMonth;

        // Apply extra prepayment if any
        let appliedExtra = 0;
        if (remainingBalance > 0.01 && extra > 0) {
          appliedExtra = Math.min(extra, remainingBalance);
          remainingBalance -= appliedExtra;
        }

        totalInterestPayable += interestForMonth;

        const yearNumber = Math.ceil(periodIndex / 12);
        const monthInYear = periodIndex % 12 === 0 ? 12 : periodIndex % 12;

        schedule.push({
          periodIndex,
          paymentNumber: periodIndex,
          yearNumber,
          monthInYear,
          emi: currentEmi + appliedExtra,
          interestPaid: interestForMonth,
          principalPaid: principalForMonth + appliedExtra,
          remainingBalance: Math.max(0, remainingBalance),
        });

        periodIndex++;
      }

      // Group into yearly breakdowns
      const yearlyMap: Record<number, any> = {};
      schedule.forEach((period) => {
        if (!yearlyMap[period.yearNumber]) {
          yearlyMap[period.yearNumber] = {
            principalPaid: 0,
            interestPaid: 0,
            totalPaid: 0,
            remainingBalance: 0,
            monthlyBreakdown: [],
          };
        }

        const yearData = yearlyMap[period.yearNumber];
        yearData.principalPaid += period.principalPaid;
        yearData.interestPaid += period.interestPaid;
        yearData.totalPaid += period.emi;
        yearData.remainingBalance = period.remainingBalance;
        yearData.monthlyBreakdown.push(period);
      });

      const yearlyBreakdown = Object.entries(yearlyMap).map(([yearStr, data]: [string, any]) => ({
        yearNumber: Number(yearStr),
        principalPaid: data.principalPaid,
        interestPaid: data.interestPaid,
        totalPaid: data.totalPaid,
        remainingBalance: data.remainingBalance,
        monthlyBreakdown: data.monthlyBreakdown,
      }));

      return {
        monthlyEmi: emi,
        totalInterestPayable,
        totalPayment: amount + totalInterestPayable,
        amortizationSchedule: schedule,
        yearlyBreakdown,
      };
    };

    // Calculate baseline (without extra prepayments)
    const base = calc(loanAmount, interestRate, tenureValue, tenureUnit, 0);
    setBaselineResults(base);

    // Calculate actual (with prepayments if enabled)
    const actual = calc(
      loanAmount,
      interestRate,
      tenureValue,
      tenureUnit,
      enablePrepayment ? extraMonthlyPayment : 0
    );
    setResults(actual);

    // Trigger visual pulse of calculation completion
    setCalcTriggered(true);
    setTimeout(() => setCalcTriggered(false), 500);
  };

  // Run calculation on initial load & whenever inputs change for absolute responsive fidelity
  useEffect(() => {
    runCalculation();
  }, [loanAmount, interestRate, tenureValue, tenureUnit, enablePrepayment, extraMonthlyPayment]);

  // --- ACTIONS ---
  const handleReset = () => {
    setLoanAmount(100000);
    setInterestRate(7.5);
    setTenureValue(15);
    setTenureUnit('years');
    setCurrencySymbol('$');
    setStartDate('2026-07');
    setEnablePrepayment(false);
    setExtraMonthlyPayment(200);
    setErrors({});
  };

  const handleSaveScenario = (e: FormEvent) => {
    e.preventDefault();
    if (!saveScenarioName.trim() || !results) return;

    const newScenario: SavedCalculation = {
      id: Date.now().toString(),
      name: saveScenarioName.trim(),
      inputs: {
        loanAmount,
        interestRate,
        tenureValue,
        tenureUnit,
        currency: currencySymbol,
      },
      results: {
        monthlyEmi: results.monthlyEmi,
        totalInterestPayable: results.totalInterestPayable,
        totalPayment: results.totalPayment,
      },
      createdAt: new Date().toISOString(),
    };

    const updated = [newScenario, ...savedCalculations];
    setSavedCalculations(updated);
    localStorage.setItem('emi-saved-scenarios', JSON.stringify(updated));

    // Automatically select for comparison if spots are available
    if (selectedCompareIds.length < 3) {
      setSelectedCompareIds([...selectedCompareIds, newScenario.id]);
    }

    setSaveScenarioName('');
    setShowSaveDialog(false);
  };

  const handleRemoveSaved = (id: string) => {
    const updated = savedCalculations.filter((c) => c.id !== id);
    setSavedCalculations(updated);
    localStorage.setItem('emi-saved-scenarios', JSON.stringify(updated));
    setSelectedCompareIds(selectedCompareIds.filter((cid) => cid !== id));
  };

  const handleToggleSelectCompare = (id: string) => {
    if (selectedCompareIds.includes(id)) {
      setSelectedCompareIds(selectedCompareIds.filter((cid) => cid !== id));
    } else if (selectedCompareIds.length < 3) {
      setSelectedCompareIds([...selectedCompareIds, id]);
    }
  };

  const formatCurrencyVal = (val: number) => {
    return currencySymbol + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Calculation details for prepayment banner
  const hasSavings = enablePrepayment && results && baselineResults && results.amortizationSchedule.length < baselineResults.amortizationSchedule.length;
  const interestSaved = hasSavings && baselineResults && results ? baselineResults.totalInterestPayable - results.totalInterestPayable : 0;
  const monthsSaved = hasSavings && baselineResults && results ? baselineResults.amortizationSchedule.length - results.amortizationSchedule.length : 0;

  return (
    <div className="min-h-screen bg-gradient-to-tr from-indigo-50/35 via-slate-50 to-emerald-50/25 text-slate-800 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Premium Navigation Header */}
      <header className="bg-white/90 border-b border-slate-250 sticky top-0 z-40 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-850 tracking-tight font-display flex items-center gap-1.5">
                EMI Calculator
                <span className="text-[10px] tracking-normal font-bold font-sans bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase">
                  Pro Planner
                </span>
              </h1>
              <p className="text-[10px] text-slate-500 font-medium font-sans">
                Ultimate Home & Vehicle Mortgage Modeler
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Home Link to teatool.vercel.app */}
            <a
              href="https://teatool.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-xl hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/40 active:scale-[0.98] transition-all shadow-xs"
              title="Go to Home"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Home</span>
            </a>

            {/* Quick currency selector */}
            <div className="flex flex-wrap items-center bg-slate-100/90 rounded-xl p-0.5 sm:p-1 border border-slate-250 gap-0.5 sm:gap-0 justify-center">
              {CURRENCIES.map((curr) => (
                <button
                  key={curr.code}
                  onClick={() => setCurrencySymbol(curr.symbol)}
                  className={`px-2 py-1 text-xs font-bold rounded-lg transition-all ${
                    currencySymbol === curr.symbol
                      ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/50'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                  }`}
                  title={`${curr.name} (${curr.symbol})`}
                >
                  {curr.symbol}
                </button>
              ))}
            </div>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 shadow-xs"
              title="Reset defaults"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Main Dashboard Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Loan Parameter Form Inputs (Takes 5 cols on lg) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-250 shadow-md shadow-slate-200/40 p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-250">
                <h2 className="text-base font-bold text-slate-850 font-display flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Loan Parameters
                </h2>
                <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 font-mono font-extrabold px-1.5 py-0.5 rounded-md">
                  CALCULATED LIVE
                </span>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="loanAmount" className="text-sm font-bold text-slate-700">
                    Loan Principal Amount
                  </label>
                  <span className="text-xs text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                    {currencySymbol}
                  </span>
                </div>
                <div className="relative rounded-2xl shadow-xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <span className="text-slate-500 font-mono text-sm font-bold">{currencySymbol}</span>
                  </div>
                  <input
                    type="number"
                    name="loanAmount"
                    id="loanAmount"
                    value={loanAmount || ''}
                    min="1"
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setLoanAmount(val);
                    }}
                    className={`block w-full rounded-2xl border ${
                      errors.loanAmount ? 'border-red-350 focus:ring-red-400' : 'border-slate-250 focus:border-indigo-500 focus:ring-indigo-500/20'
                    } py-3 pl-9 pr-4 text-slate-800 font-mono font-extrabold text-sm placeholder-slate-400 focus:outline-hidden focus:ring-2`}
                    placeholder="Enter Principal"
                  />
                </div>
                {errors.loanAmount && (
                  <p className="text-xs text-red-500 flex items-center gap-1 mt-1 font-sans">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {errors.loanAmount}
                  </p>
                )}

                {/* Slider and Preset tags for Amount */}
                <div className="pt-2 space-y-3">
                  <input
                    type="range"
                    min="5000"
                    max="1000000"
                    step="5000"
                    value={loanAmount <= 1000000 ? loanAmount : 1000000}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>{currencySymbol}5K</span>
                    <span>{currencySymbol}500K</span>
                    <span>{currencySymbol}1M+</span>
                  </div>

                  {/* Preset Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[25000, 50000, 150000, 300000, 500000].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setLoanAmount(preset)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                          loanAmount === preset
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                            : 'bg-white border-slate-250 text-slate-600 hover:text-slate-850 hover:bg-slate-50'
                        }`}
                      >
                        {formatCurrencyVal(preset).replace('.00', '')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Interest Rate Input */}
              <div className="space-y-2 pt-2 border-t border-slate-250">
                <div className="flex items-center justify-between">
                  <label htmlFor="interestRate" className="text-sm font-bold text-slate-700">
                    Interest Rate (% per annum)
                  </label>
                  <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    % p.a.
                  </span>
                </div>
                <div className="relative rounded-2xl shadow-xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Percent className="w-4 h-4 text-emerald-500" />
                  </div>
                  <input
                    type="number"
                    name="interestRate"
                    id="interestRate"
                    value={interestRate || ''}
                    step="0.05"
                    min="0"
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setInterestRate(val);
                    }}
                    className={`block w-full rounded-2xl border ${
                      errors.interestRate ? 'border-red-350 focus:ring-red-400' : 'border-slate-250 focus:border-indigo-500 focus:ring-indigo-500/20'
                    } py-3 pl-11 pr-4 text-slate-800 font-mono font-extrabold text-sm placeholder-slate-400 focus:outline-hidden focus:ring-2`}
                    placeholder="Enter Interest Rate"
                  />
                </div>
                {errors.interestRate && (
                  <p className="text-xs text-red-500 flex items-center gap-1 mt-1 font-sans">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {errors.interestRate}
                  </p>
                )}

                {/* Slider for Rate */}
                <div className="pt-2">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="0.1"
                    value={interestRate <= 20 ? interestRate : 20}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>1%</span>
                    <span>10%</span>
                    <span>20%+</span>
                  </div>
                </div>
              </div>

              {/* Loan Tenure Input */}
              <div className="space-y-2 pt-2 border-t border-slate-250">
                <div className="flex items-center justify-between">
                  <label htmlFor="tenureValue" className="text-sm font-bold text-slate-700">
                    Loan Tenure (Duration)
                  </label>
                  
                  {/* Years / Months toggle */}
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-250">
                    <button
                      type="button"
                      onClick={() => {
                        if (tenureUnit === 'months') {
                          // convert months to years approx
                          setTenureValue(Math.max(1, Math.round(tenureValue / 12)));
                          setTenureUnit('years');
                        }
                      }}
                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                        tenureUnit === 'years'
                          ? 'bg-white text-indigo-600 shadow-xs'
                          : 'text-slate-500 hover:text-slate-850'
                      }`}
                    >
                      Years
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (tenureUnit === 'years') {
                          // convert years to months
                          setTenureValue(Math.min(480, tenureValue * 12));
                          setTenureUnit('months');
                        }
                      }}
                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                        tenureUnit === 'months'
                          ? 'bg-white text-indigo-600 shadow-xs'
                          : 'text-slate-500 hover:text-slate-850'
                      }`}
                    >
                      Months
                    </button>
                  </div>
                </div>
                <div className="relative rounded-2xl shadow-xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Clock className="w-4 h-4 text-indigo-500" />
                  </div>
                  <input
                    type="number"
                    name="tenureValue"
                    id="tenureValue"
                    value={tenureValue || ''}
                    min="1"
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTenureValue(val);
                    }}
                    className={`block w-full rounded-2xl border ${
                      errors.tenureValue ? 'border-red-350 focus:ring-red-400' : 'border-slate-250 focus:border-indigo-500 focus:ring-indigo-500/20'
                    } py-3 pl-11 pr-4 text-slate-800 font-mono font-extrabold text-sm placeholder-slate-400 focus:outline-hidden focus:ring-2`}
                    placeholder={`Enter tenure in ${tenureUnit}`}
                  />
                </div>
                {errors.tenureValue && (
                  <p className="text-xs text-red-500 flex items-center gap-1 mt-1 font-sans">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {errors.tenureValue}
                  </p>
                )}

                {/* Slider for Tenure */}
                <div className="pt-2">
                  <input
                    type="range"
                    min="1"
                    max={tenureUnit === 'years' ? 30 : 360}
                    step="1"
                    value={tenureValue}
                    onChange={(e) => setTenureValue(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>1 {tenureUnit}</span>
                    <span>{tenureUnit === 'years' ? '15 years' : '180 months'}</span>
                    <span>{tenureUnit === 'years' ? '30 years' : '360 months'}</span>
                  </div>
                </div>
              </div>

              {/* Start Date Selection */}
              <div className="space-y-2 pt-2 border-t border-slate-250">
                <label htmlFor="startDate" className="text-sm font-bold text-slate-700 block">
                  First Installment Month
                </label>
                <div className="relative rounded-2xl shadow-xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <CalendarIcon className="w-4 h-4 text-indigo-500" />
                  </div>
                  <input
                    type="month"
                    name="startDate"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="block w-full rounded-2xl border border-slate-250 focus:border-indigo-500 focus:ring-indigo-500/20 py-3 pl-11 pr-4 text-slate-800 font-sans font-bold text-sm focus:outline-hidden focus:ring-2"
                  />
                </div>
              </div>

              {/* ADVANCED EXTRA MONTHLY PREPAYMENT PANEL */}
              <div className="pt-4 border-t border-slate-250">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-bold text-slate-850">Extra Monthly Payoff</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enablePrepayment}
                      onChange={(e) => setEnablePrepayment(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:height-4 after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {enablePrepayment && (
                  <div className="mt-4 p-4 rounded-2xl bg-indigo-50/40 border border-indigo-200/60 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between text-xs text-slate-700">
                      <span className="font-semibold">Prepayment Amount:</span>
                      <span className="font-mono font-black text-indigo-700">
                        {formatCurrencyVal(extraMonthlyPayment)}/mo
                      </span>
                    </div>

                    <input
                      type="range"
                      min="10"
                      max="2000"
                      step="10"
                      value={extraMonthlyPayment}
                      onChange={(e) => setExtraMonthlyPayment(Number(e.target.value))}
                      className="w-full h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <p className="text-[10px] text-indigo-800 font-medium leading-normal">
                      Adding an extra contribution each month pays off the principal balance directly and saves compound interest.
                    </p>
                  </div>
                )}
              </div>

              {/* Dynamic Explicit Calculate Trigger */}
              <button
                type="button"
                onClick={runCalculation}
                className="w-full py-3.5 px-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-md shadow-indigo-600/10 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
              >
                <Calculator className="w-4 h-4" />
                Recalculate EMI Summary
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Visual KPI Analytics & Donut Charts (Takes 7 cols on lg) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* KPI STAT CARDS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Monthly EMI */}
              <div className="bg-white rounded-2xl border-t-4 border-t-indigo-600 border-x border-b border-x-slate-250 border-b-slate-250 p-5 shadow-xs flex flex-col justify-between h-36 hover:shadow-md transition-all">
                <div>
                  <span className="text-xs text-indigo-700 uppercase font-extrabold tracking-wider block">
                    Monthly EMI
                  </span>
                  <p className="text-[10px] text-slate-500 font-medium">Principal + Base Interest</p>
                </div>
                <div>
                  <span className={`text-2xl font-black text-indigo-600 font-mono tracking-tight block ${calcTriggered ? 'animate-ping' : ''}`}>
                    {results ? formatCurrencyVal(results.monthlyEmi) : '--'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                    for {tenureValue} {tenureUnit}
                  </span>
                </div>
              </div>

              {/* Card 2: Total Interest */}
              <div className="bg-white rounded-2xl border-t-4 border-t-emerald-500 border-x border-b border-x-slate-250 border-b-slate-250 p-5 shadow-xs flex flex-col justify-between h-36 hover:shadow-md transition-all">
                <div>
                  <span className="text-xs text-emerald-700 uppercase font-extrabold tracking-wider block">
                    Total Interest
                  </span>
                  <p className="text-[10px] text-slate-500 font-medium">Cumulative Interest Cost</p>
                </div>
                <div>
                  <span className="text-2xl font-black text-slate-800 font-mono tracking-tight block">
                    {results ? formatCurrencyVal(results.totalInterestPayable) : '--'}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-block mt-1">
                    {results && results.totalPayment > 0 
                      ? `${((results.totalInterestPayable / results.totalPayment) * 100).toFixed(1)}% of total` 
                      : '--'}
                  </span>
                </div>
              </div>

              {/* Card 3: Total Payment */}
              <div className="bg-white rounded-2xl border-t-4 border-t-amber-500 border-x border-b border-x-slate-250 border-b-slate-250 p-5 shadow-xs flex flex-col justify-between h-36 hover:shadow-md transition-all">
                <div>
                  <span className="text-xs text-amber-700 uppercase font-extrabold tracking-wider block">
                    Total Payback
                  </span>
                  <p className="text-[10px] text-slate-500 font-medium">Principal + Total Interest</p>
                </div>
                <div>
                  <span className="text-2xl font-black text-slate-850 font-mono tracking-tight block">
                    {results ? formatCurrencyVal(results.totalPayment) : '--'}
                  </span>
                  <span className="text-[10px] text-indigo-700 font-extrabold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full inline-block mt-1">
                    Multiplier: {results && results.totalPayment > 0 ? (results.totalPayment / loanAmount).toFixed(2) : '--'}x
                  </span>
                </div>
              </div>
            </div>

            {/* PREPAYMENT SAVINGS METRIC ALERT BANNER */}
            {hasSavings && (
              <div className="bg-emerald-50 border border-emerald-350 rounded-2xl p-4 flex items-start gap-3 text-emerald-950 shadow-xs animate-fade-in">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-extrabold text-emerald-900">
                    Prepayment Payoff Strategy Identified!
                  </p>
                  <p className="text-xs text-emerald-800 leading-normal">
                    By making an extra payment of <strong>{formatCurrencyVal(extraMonthlyPayment)}/mo</strong>, you will pay off the loan <strong>{monthsSaved} months earlier</strong> ({Math.floor(monthsSaved / 12)} years & {monthsSaved % 12} months earlier). You will save a total of <strong className="text-emerald-700 font-extrabold">{formatCurrencyVal(interestSaved)}</strong> in interest!
                  </p>
                </div>
              </div>
            )}

            {/* HIGH-END INTERACTIVE DONUT CHART & ACTIONS */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
              {/* Donut Chart container (8 cols on md) */}
              <div className="md:col-span-8">
                {results ? (
                  <DonutChart
                    principal={loanAmount}
                    interest={results.totalInterestPayable}
                    currencySymbol={currencySymbol}
                  />
                ) : (
                  <div className="h-full bg-white rounded-3xl border border-slate-250 flex items-center justify-center p-8 text-slate-500">
                    Enter valid loan parameters to view the compositional breakdown.
                  </div>
                )}
              </div>

              {/* Call to Action Actions card (4 cols on md) */}
              <div className="md:col-span-4 flex flex-col justify-between gap-4">
                <div className="bg-white rounded-3xl border border-slate-250 p-5 shadow-sm flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Actions
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">
                      Save configurations to local drafts for comparison.
                    </p>
                  </div>

                  <div className="space-y-2 mt-4">
                    <button
                      onClick={() => setShowSaveDialog(true)}
                      className="w-full py-2.5 px-3 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-all flex items-center justify-center gap-1.5 border border-slate-700 shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save to Comparison
                    </button>
                    <p className="text-[9px] text-slate-400 text-center leading-normal">
                      Keeps active track of calculations in browser cache.
                    </p>
                  </div>
                </div>

                {/* Quick insight card */}
                <div className="bg-indigo-950 text-white rounded-3xl border border-indigo-900 p-5 flex flex-col justify-between relative overflow-hidden shadow-sm">
                  <div className="absolute -top-6 -right-6 w-20 h-20 bg-indigo-800/50 rounded-full blur-xl"></div>
                  <div>
                    <h4 className="text-[10px] font-extrabold text-indigo-200 uppercase tracking-wider">
                      Mortgage Note
                    </h4>
                    <p className="text-xs text-indigo-100 mt-2 leading-relaxed font-semibold">
                      "A home loan with lower EMI but longer tenure typically accrues double the interest cost."
                    </p>
                  </div>
                  <div className="text-[9px] text-indigo-300 mt-4 border-t border-indigo-900 pt-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Financially sound modeling
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- DIALOG MODAL FOR SAVING SCENARIOS --- */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-md w-full border border-slate-350 p-6 sm:p-8 shadow-2xl relative animate-scale-up">
              <h3 className="text-lg font-bold text-slate-800 font-display">
                Save Calculation Draft
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Assign a friendly label to easily compare this loan structure side-by-side.
              </p>

              <form onSubmit={handleSaveScenario} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="scenarioName" className="text-xs font-bold text-slate-600 block mb-1">
                    Scenario / Loan Name
                  </label>
                  <input
                    type="text"
                    id="scenarioName"
                    value={saveScenarioName}
                    onChange={(e) => setSaveScenarioName(e.target.value)}
                    placeholder="e.g., Home Mortgage Option A"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-350 focus:ring-indigo-500 focus:outline-hidden focus:ring-2 font-sans text-sm"
                    maxLength={35}
                    required
                  />
                </div>

                {results && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Principal:</span>
                      <span className="font-bold text-slate-800">{formatCurrencyVal(loanAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Interest rate:</span>
                      <span className="font-bold text-slate-800">{interestRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Monthly EMI:</span>
                      <span className="font-bold text-indigo-600">{formatCurrencyVal(results.monthlyEmi)}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSaveDialog(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-250 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/10 transition-all"
                  >
                    Save Scenario
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- BOTTOM SECTION: AMORTIZATION SCHEDULE & COMPUTE COMPARATOR --- */}
        <div className="space-y-6">
          {/* Navigation Tabs */}
          <div className="flex items-center space-x-1.5 border-b border-slate-250 pb-px">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`pb-3 text-sm font-bold px-4 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'schedule'
                  ? 'border-indigo-600 text-indigo-700 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Amortization Payoff Schedule
            </button>
            <button
              onClick={() => setActiveTab('comparator')}
              className={`pb-3 text-sm font-bold px-4 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'comparator'
                  ? 'border-indigo-600 text-indigo-700 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              Loan Comparator ({savedCalculations.length})
            </button>
          </div>

          {/* Active Tab rendering */}
          <div className="transition-all duration-300">
            {activeTab === 'schedule' ? (
              results ? (
                <AmortizationTable
                  yearlyBreakdown={results.yearlyBreakdown}
                  currencySymbol={currencySymbol}
                  startDateStr={startDate}
                />
              ) : (
                <div className="bg-white rounded-3xl border border-slate-250 shadow-sm p-12 text-center text-slate-500">
                  Amortization schedule will generate once valid inputs are provided.
                </div>
              )
            ) : (
              <CompareModule
                savedCalculations={savedCalculations}
                onRemove={handleRemoveSaved}
                selectedIds={selectedCompareIds}
                onToggleSelect={handleToggleSelectCompare}
              />
            )}
          </div>
        </div>
      </main>

      {/* Humble Footer */}
      <footer className="bg-white border-t border-slate-250 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <p className="text-xs text-slate-500 font-bold">
            EMI Calculator - Built with premium layouts, responsive charts, and amortization models.
          </p>
          <div className="flex justify-center space-x-4 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
            <span>Home Mortgages</span>
            <span>•</span>
            <span>Car Financing</span>
            <span>•</span>
            <span>Personal Credit Line</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
