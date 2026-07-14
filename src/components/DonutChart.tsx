import { useState } from 'react';

interface DonutChartProps {
  principal: number;
  interest: number;
  currencySymbol: string;
}

export default function DonutChart({ principal, interest, currencySymbol }: DonutChartProps) {
  const [hoveredSegment, setHoveredSegment] = useState<'principal' | 'interest' | null>(null);

  const total = principal + interest;
  const principalPercentage = total > 0 ? (principal / total) * 100 : 50;
  const interestPercentage = total > 0 ? (interest / total) * 100 : 50;

  // SVG parameters
  const radius = 60;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius; // ~376.991

  // Segment stroke dash calculations
  const principalLength = (principalPercentage / 100) * circumference;
  const interestLength = (interestPercentage / 100) * circumference;

  // We rotate the chart to start from the top (-90deg)
  const principalDashOffset = 0;
  // Interest starts where Principal ends
  const interestDashOffset = -principalLength;

  const formatCurrency = (val: number) => {
    return currencySymbol + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div id="emi-donut-chart-container" className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-slate-250 shadow-md shadow-slate-200/30">
      <h3 id="breakdown-chart-title" className="text-sm font-extrabold text-slate-800 mb-6 font-display">
        Loan Composition Breakdown
      </h3>

      <div className="relative w-48 h-48 flex items-center justify-center">
        {/* SVG Circle Drawing */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
          {/* Base Background Track */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
          />

          {/* Principal Segment */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="var(--color-indigo-600, #4f46e5)"
            strokeWidth={hoveredSegment === 'principal' ? strokeWidth + 3 : strokeWidth}
            strokeDasharray={`${principalLength} ${circumference}`}
            strokeDashoffset={principalDashOffset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-in-out cursor-pointer hover:stroke-[17px]"
            onMouseEnter={() => setHoveredSegment('principal')}
            onMouseLeave={() => setHoveredSegment(null)}
            style={{
              stroke: '#4f46e5', // Primary indigo-600
              transformOrigin: 'center',
            }}
          />

          {/* Interest Segment */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="var(--color-emerald-500, #10b981)"
            strokeWidth={hoveredSegment === 'interest' ? strokeWidth + 3 : strokeWidth}
            strokeDasharray={`${interestLength} ${circumference}`}
            strokeDashoffset={interestDashOffset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-in-out cursor-pointer hover:stroke-[17px]"
            onMouseEnter={() => setHoveredSegment('interest')}
            onMouseLeave={() => setHoveredSegment(null)}
            style={{
              stroke: '#10b981', // Secondary emerald-500
              transformOrigin: 'center',
            }}
          />
        </svg>

        {/* Inner Text Center overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs text-slate-500 uppercase tracking-widest font-sans font-bold">
            {hoveredSegment ? (hoveredSegment === 'principal' ? 'Principal' : 'Interest') : 'Total Cost'}
          </span>
          <span className="text-lg font-black text-slate-850 font-mono mt-1">
            {hoveredSegment
              ? hoveredSegment === 'principal'
                ? `${principalPercentage.toFixed(1)}%`
                : `${interestPercentage.toFixed(1)}%`
              : formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* Modern Interactive Legends */}
      <div className="grid grid-cols-2 gap-4 w-full mt-6">
        {/* Principal Legend Card */}
        <button
          onClick={() => {}}
          onMouseEnter={() => setHoveredSegment('principal')}
          onMouseLeave={() => setHoveredSegment(null)}
          className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all duration-200 ${
            hoveredSegment === 'principal'
              ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-600/15 scale-102'
              : 'bg-white border-slate-250 hover:border-indigo-300 hover:bg-slate-50 shadow-xs'
          }`}
        >
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 block"></span>
            <span className="text-xs font-bold text-slate-700">Principal</span>
          </div>
          <span className="text-sm font-extrabold text-slate-800 font-mono mt-1">{formatCurrency(principal)}</span>
          <span className="text-[10px] text-indigo-700 font-bold bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md mt-1.5">
            {principalPercentage.toFixed(1)}%
          </span>
        </button>

        {/* Interest Legend Card */}
        <button
          onClick={() => {}}
          onMouseEnter={() => setHoveredSegment('interest')}
          onMouseLeave={() => setHoveredSegment(null)}
          className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all duration-200 ${
            hoveredSegment === 'interest'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/15 scale-102'
              : 'bg-white border-slate-250 hover:border-emerald-300 hover:bg-slate-50 shadow-xs'
          }`}
        >
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
            <span className="text-xs font-bold text-slate-700">Total Interest</span>
          </div>
          <span className="text-sm font-extrabold text-slate-800 font-mono mt-1">{formatCurrency(interest)}</span>
          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md mt-1.5">
            {interestPercentage.toFixed(1)}%
          </span>
        </button>
      </div>
    </div>
  );
}
