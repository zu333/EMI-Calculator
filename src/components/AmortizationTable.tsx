import { useState } from 'react';
import { YearlyBreakdown, AmortizationPeriod } from '../types';
import { ChevronDown, ChevronUp, Calendar, Info } from 'lucide-react';

interface AmortizationTableProps {
  yearlyBreakdown: YearlyBreakdown[];
  currencySymbol: string;
  startDateStr: string; // "YYYY-MM" format
}

export default function AmortizationTable({ yearlyBreakdown, currencySymbol, startDateStr }: AmortizationTableProps) {
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({ 1: true }); // Expand year 1 by default
  const [viewType, setViewType] = useState<'yearly' | 'monthly_flat'>('yearly');

  // Format calendar month/year
  const getPeriodLabel = (periodIndex: number) => {
    if (!startDateStr) return `Month ${periodIndex}`;

    const [startYear, startMonthZeroBased] = startDateStr.split('-').map(Number);
    const date = new Date(startYear, startMonthZeroBased - 1);
    // Add periodIndex - 1 months
    date.setMonth(date.getMonth() + periodIndex - 1);

    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const toggleYear = (yearNum: number) => {
    setExpandedYears((prev) => ({
      ...prev,
      [yearNum]: !prev[yearNum],
    }));
  };

  const formatCurrency = (val: number) => {
    return currencySymbol + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Generate initial loan amount to calculate progress accurately
  const initialPrincipal = yearlyBreakdown.length > 0
    ? (yearlyBreakdown[0].principalPaid + yearlyBreakdown[0].remainingBalance)
    : 0;

  // Flatten all months for flat list option
  const allMonths: AmortizationPeriod[] = yearlyBreakdown.flatMap(y => y.monthlyBreakdown);

  return (
    <div id="amortization-card" className="bg-white rounded-3xl border border-slate-250 shadow-md shadow-slate-200/40 p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-250 gap-4">
        <div>
          <h2 id="amortization-schedule-title" className="text-xl font-extrabold text-slate-850 font-display flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Amortization & Payoff Schedule
          </h2>
          <p id="amortization-schedule-subtitle" className="text-sm text-slate-500 mt-1 font-medium">
            Track your principal reduction and interest payments over the lifetime of the loan.
          </p>
        </div>

        {/* View toggles */}
        <div className="flex bg-slate-100/90 p-1 rounded-xl self-start border border-slate-250">
          <button
            onClick={() => setViewType('yearly')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewType === 'yearly'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-850'
            }`}
          >
            Yearly Summary
          </button>
          <button
            onClick={() => setViewType('monthly_flat')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewType === 'monthly_flat'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-850'
            }`}
          >
            All Months Flat
          </button>
        </div>
      </div>

      {/* Information Alert */}
      <div className="flex items-start gap-3 bg-indigo-50/40 rounded-2xl p-4 mt-6 text-indigo-950 border border-indigo-200/50 shadow-xs">
        <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed text-indigo-900 font-sans font-medium">
          <strong>Protip:</strong> In the early stages of a loan, a larger portion of your monthly EMI goes towards paying off the interest. Over time, the ratio reverses, and more of your payment is applied towards reducing the principal.
        </p>
      </div>

      {/* Schedule Table Container */}
      <div className="mt-6 overflow-x-auto">
        {viewType === 'yearly' ? (
          /* YEARLY COLLAPSIBLE VIEW */
          <div className="space-y-4 min-w-[640px]">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider font-sans border-b border-slate-250">
              <div className="col-span-3">Timeline</div>
              <div className="col-span-2 text-right">Principal Paid</div>
              <div className="col-span-2 text-right">Interest Paid</div>
              <div className="col-span-2 text-right">Total Payment</div>
              <div className="col-span-3 text-right">Remaining Balance</div>
            </div>

            {/* Table Body */}
            {yearlyBreakdown.map((year, index) => {
              const isExpanded = !!expandedYears[year.yearNumber];
              const remainingPct = initialPrincipal > 0 ? (year.remainingBalance / initialPrincipal) * 100 : 0;

              return (
                <div
                  key={year.yearNumber}
                  className="border border-slate-250 rounded-2xl overflow-hidden shadow-xs hover:shadow-sm hover:border-indigo-300 transition-all"
                >
                  {/* Year Header Row */}
                  <div
                    onClick={() => toggleYear(year.yearNumber)}
                    className={`grid grid-cols-12 gap-4 items-center px-4 py-4 cursor-pointer select-none transition-colors ${
                      isExpanded ? 'bg-slate-50/80 font-semibold' : 'bg-white hover:bg-slate-50/40'
                    }`}
                  >
                    <div className="col-span-3 flex items-center gap-3">
                      <div className="p-1 rounded-lg bg-slate-100/80 group-hover:bg-white text-slate-600 transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-800 font-display">Year {year.yearNumber}</span>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {year.monthlyBreakdown.length} installments
                        </div>
                      </div>
                    </div>

                    <div className="col-span-2 text-right font-mono text-sm text-slate-800">
                      {formatCurrency(year.principalPaid)}
                    </div>

                    <div className="col-span-2 text-right font-mono text-sm text-emerald-600">
                      {formatCurrency(year.interestPaid)}
                    </div>

                    <div className="col-span-2 text-right font-mono text-sm text-indigo-600 font-semibold">
                      {formatCurrency(year.totalPaid)}
                    </div>

                    <div className="col-span-3 text-right">
                      <span className="font-mono text-sm font-bold text-slate-800 block">
                        {formatCurrency(year.remainingBalance)}
                      </span>
                      {/* Progress Bar of Payoff */}
                      <div className="w-24 ml-auto mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(0, 100 - remainingPct)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Collapsible Monthly Breakdowns */}
                  {isExpanded && (
                    <div className="bg-slate-50/40 border-t border-slate-250 px-4 py-2 divide-y divide-slate-200">
                      {year.monthlyBreakdown.map((month) => (
                        <div
                          key={month.paymentNumber}
                          className="grid grid-cols-12 gap-4 items-center py-2.5 text-xs text-slate-600 font-sans"
                        >
                          <div className="col-span-3 font-medium text-slate-700 pl-7 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            {getPeriodLabel(month.paymentNumber)}
                          </div>
                          <div className="col-span-2 text-right font-mono">
                            {formatCurrency(month.principalPaid)}
                          </div>
                          <div className="col-span-2 text-right font-mono text-emerald-600">
                            {formatCurrency(month.interestPaid)}
                          </div>
                          <div className="col-span-2 text-right font-mono text-indigo-600">
                            {formatCurrency(month.emi)}
                          </div>
                          <div className="col-span-3 text-right font-mono text-slate-700">
                            {formatCurrency(month.remainingBalance)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* FLAT MONTHS LIST (PAGINATED-STYLE OR COMPACT LIST) */
          <div className="min-w-[640px]">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-250 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Payment #</th>
                  <th className="py-3 px-4">Calendar Period</th>
                  <th className="py-3 px-4 text-right">EMI Payment</th>
                  <th className="py-3 px-4 text-right">Principal Portion</th>
                  <th className="py-3 px-4 text-right">Interest Portion</th>
                  <th className="py-3 px-4 text-right">Ending Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm font-sans">
                {allMonths.map((m) => (
                  <tr key={m.paymentNumber} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-500">#{m.paymentNumber}</td>
                    <td className="py-3 px-4 font-medium text-slate-700">{getPeriodLabel(m.paymentNumber)}</td>
                    <td className="py-3 px-4 text-right font-mono text-indigo-600 font-semibold">{formatCurrency(m.emi)}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">{formatCurrency(m.principalPaid)}</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-600">{formatCurrency(m.interestPaid)}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-800 font-bold">{formatCurrency(m.remainingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
