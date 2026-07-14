/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TenureUnit = 'years' | 'months';

export interface LoanInputs {
  loanAmount: number;
  interestRate: number;
  tenureValue: number;
  tenureUnit: TenureUnit;
  currency: string;
}

export interface AmortizationPeriod {
  periodIndex: number; // 1-indexed (month number)
  paymentNumber: number;
  yearNumber: number;
  monthInYear: number;
  emi: number;
  interestPaid: number;
  principalPaid: number;
  remainingBalance: number;
}

export interface YearlyBreakdown {
  yearNumber: number;
  principalPaid: number;
  interestPaid: number;
  totalPaid: number;
  remainingBalance: number;
  monthlyBreakdown: AmortizationPeriod[];
}

export interface LoanResults {
  monthlyEmi: number;
  totalInterestPayable: number;
  totalPayment: number;
  amortizationSchedule: AmortizationPeriod[];
  yearlyBreakdown: YearlyBreakdown[];
}

export interface SavedCalculation {
  id: string;
  name: string;
  inputs: LoanInputs;
  results: Omit<LoanResults, 'amortizationSchedule' | 'yearlyBreakdown'>;
  createdAt: string;
}
