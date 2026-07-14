import { SavedCalculation } from '../types';
import { ArrowLeftRight, Check, Trash2, Calendar, Award } from 'lucide-react';

interface CompareModuleProps {
  savedCalculations: SavedCalculation[];
  onRemove: (id: string) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
}

export default function CompareModule({
  savedCalculations,
  onRemove,
  selectedIds,
  onToggleSelect,
}: CompareModuleProps) {
  const selectedCalculations = savedCalculations.filter((c) => selectedIds.includes(c.id));

  // Determine the "bests" if there are multiple calculations to compare
  const getBests = () => {
    if (selectedCalculations.length < 2) return null;

    let lowestEmiId = '';
    let lowestEmiVal = Infinity;

    let lowestInterestId = '';
    let lowestInterestVal = Infinity;

    let lowestTotalId = '';
    let lowestTotalVal = Infinity;

    selectedCalculations.forEach((c) => {
      if (c.results.monthlyEmi < lowestEmiVal) {
        lowestEmiVal = c.results.monthlyEmi;
        lowestEmiId = c.id;
      }
      if (c.results.totalInterestPayable < lowestInterestVal) {
        lowestInterestVal = c.results.totalInterestPayable;
        lowestInterestId = c.id;
      }
      if (c.results.totalPayment < lowestTotalVal) {
        lowestTotalVal = c.results.totalPayment;
        lowestTotalId = c.id;
      }
    });

    return { lowestEmiId, lowestInterestId, lowestTotalId };
  };

  const bests = getBests();

  const formatVal = (val: number, currency: string) => {
    return currency + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div id="loan-comparison-container" className="bg-white rounded-3xl border border-slate-250 shadow-md shadow-slate-200/40 p-6 sm:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-slate-250 gap-4">
        <div>
          <h2 id="compare-module-title" className="text-xl font-extrabold text-slate-850 font-display flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-indigo-600" />
            Side-by-Side Loan Comparator
          </h2>
          <p id="compare-module-subtitle" className="text-sm text-slate-500 mt-1 font-medium">
            Compare up to 3 different loan scenarios to identify the most financially sound choice.
          </p>
        </div>
      </div>

      {savedCalculations.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <p className="text-slate-600 font-medium">No saved calculations yet</p>
          <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
            Calculate a loan above and click "Save to Comparison" to add options to this list.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {/* List of saved calculations with checkboxes */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              1. Select Loans to Compare ({selectedCalculations.length} of 3 selected)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedCalculations.map((calc) => {
                const isSelected = selectedIds.includes(calc.id);
                const disabled = !isSelected && selectedIds.length >= 3;

                return (
                  <div
                    key={calc.id}
                    onClick={() => {
                      if (!disabled) onToggleSelect(calc.id);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-indigo-50/50 border-indigo-450 ring-2 ring-indigo-650/15'
                        : disabled
                        ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                        : 'bg-white border-slate-250 hover:border-indigo-400 hover:shadow-xs'
                    }`}
                  >
                    {/* Checkbox badge */}
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(calc.id);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-100 transition-all"
                        title="Delete calculation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-all border ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-white border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                      </div>
                    </div>

                    <div className="pr-12">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {calc.inputs.currency}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800 mt-2 font-display truncate">
                        {calc.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(calc.createdAt).toLocaleDateString()}
                      </p>

                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200 text-xs">
                        <div>
                          <span className="text-slate-400 block">Amount:</span>
                          <span className="font-mono font-bold text-slate-700">
                            {formatVal(calc.inputs.loanAmount, calc.inputs.currency)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Rate / Tenure:</span>
                          <span className="font-sans font-bold text-slate-700">
                            {calc.inputs.interestRate}% | {calc.inputs.tenureValue}{' '}
                            {calc.inputs.tenureUnit === 'years' ? 'Yrs' : 'Mos'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Comparison Grid Matrix */}
          {selectedCalculations.length > 0 && (
            <div className="pt-6 border-t border-slate-250">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                2. Comparative Analysis Matrix
              </h3>

              <div className="overflow-x-auto rounded-2xl border border-slate-250 bg-slate-50/20">
                <table className="w-full border-collapse text-left text-sm min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-250">
                      <th className="p-4 font-bold text-slate-700 w-1/4">Metric</th>
                      {selectedCalculations.map((calc) => (
                        <th key={calc.id} className="p-4 font-extrabold text-slate-800 font-display text-center">
                          {calc.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-250 font-sans">
                    {/* Loan Amount */}
                    <tr className="hover:bg-slate-50/20">
                      <td className="p-4 text-slate-600 font-medium">Principal Loan Amount</td>
                      {selectedCalculations.map((calc) => (
                        <td key={calc.id} className="p-4 text-center font-mono font-semibold text-slate-800">
                          {formatVal(calc.inputs.loanAmount, calc.inputs.currency)}
                        </td>
                      ))}
                    </tr>

                    {/* Interest Rate */}
                    <tr className="hover:bg-slate-50/20">
                      <td className="p-4 text-slate-600 font-medium">Interest Rate (Annual)</td>
                      {selectedCalculations.map((calc) => (
                        <td key={calc.id} className="p-4 text-center font-sans font-semibold text-slate-850">
                          {calc.inputs.interestRate}% p.a.
                        </td>
                      ))}
                    </tr>

                    {/* Tenure */}
                    <tr className="hover:bg-slate-50/20">
                      <td className="p-4 text-slate-600 font-medium">Loan Tenure</td>
                      {selectedCalculations.map((calc) => (
                        <td key={calc.id} className="p-4 text-center font-sans font-semibold text-slate-800">
                          {calc.inputs.tenureValue} {calc.inputs.tenureUnit === 'years' ? 'Years' : 'Months'}
                          <span className="text-[10px] text-slate-400 block font-normal">
                            ({calc.inputs.tenureUnit === 'years' ? calc.inputs.tenureValue * 12 : calc.inputs.tenureValue} months)
                          </span>
                        </td>
                      ))}
                    </tr>

                    {/* Monthly EMI */}
                    <tr className="bg-indigo-50/10 hover:bg-indigo-50/20 font-semibold">
                      <td className="p-4 text-indigo-900 font-bold">Monthly EMI</td>
                      {selectedCalculations.map((calc) => {
                        const isBest = bests?.lowestEmiId === calc.id;
                        return (
                          <td key={calc.id} className="p-4 text-center">
                            <span className="font-mono text-base font-bold text-indigo-700 block">
                              {formatVal(calc.results.monthlyEmi, calc.inputs.currency)}
                            </span>
                            {isBest && (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold mt-1">
                                <Award className="w-3 h-3" /> Cheapest EMI
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Total Interest */}
                    <tr className="hover:bg-slate-50/20">
                      <td className="p-4 text-slate-600 font-medium">Total Interest Cost</td>
                      {selectedCalculations.map((calc) => {
                        const isBest = bests?.lowestInterestId === calc.id;
                        return (
                          <td key={calc.id} className="p-4 text-center">
                            <span className="font-mono font-semibold text-slate-800 block">
                              {formatVal(calc.results.totalInterestPayable, calc.inputs.currency)}
                            </span>
                            {isBest && (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold mt-1">
                                <Award className="w-3 h-3" /> Lowest Interest
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Total Payments */}
                    <tr className="bg-slate-100/30 hover:bg-slate-100/50">
                      <td className="p-4 text-slate-700 font-bold">Total Payback Amount</td>
                      {selectedCalculations.map((calc) => {
                        const isBest = bests?.lowestTotalId === calc.id;
                        return (
                          <td key={calc.id} className="p-4 text-center">
                            <span className="font-mono font-bold text-slate-850 block">
                              {formatVal(calc.results.totalPayment, calc.inputs.currency)}
                            </span>
                            {isBest && (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold mt-1">
                                <Award className="w-3 h-3" /> Minimum Total
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              {selectedCalculations.length < 2 && (
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span>ℹ️</span>
                  <span>Select at least <strong>two</strong> saved calculations above to show comparative win/loss badges.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
