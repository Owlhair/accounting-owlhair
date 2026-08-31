import React, { useState, useMemo } from 'react';
import { Transaction, FiscalPeriod } from '../types';
import { formatCurrency } from '../utils/calculations';
import { 
  calculateFinancialStatement, 
  getTaxSavingStrategies, 
  DEFAULT_TAX_PARAMS, 
  TaxForecastParams 
} from '../utils/taxCalculations';
import { 
  Building2, 
  Calculator, 
  TrendingUp, 
  ShieldCheck, 
  Sparkles, 
  FileText, 
  Printer, 
  Sliders, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  ArrowRight,
  Landmark,
  Coins,
  Percent,
  Receipt,
  Info
} from 'lucide-react';

interface FinancialStatementViewProps {
  transactions: Transaction[];
  fiscalPeriods: FiscalPeriod[];
  selectedFilter: string;
  onSelectFilter: (filterId: string) => void;
  onOpenAddExpense: () => void;
}

export const FinancialStatementView: React.FC<FinancialStatementViewProps> = ({
  transactions,
  fiscalPeriods,
  selectedFilter,
  onSelectFilter,
  onOpenAddExpense,
}) => {
  const [params, setParams] = useState<TaxForecastParams>(DEFAULT_TAX_PARAMS);
  const [simulatedExtraExpense, setSimulatedExtraExpense] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'statement' | 'tax_breakdown' | 'tax_saving'>('statement');

  // Find currently selected period
  const currentPeriod = useMemo(() => {
    if (selectedFilter.startsWith('period-')) {
      return fiscalPeriods.find(p => p.key === selectedFilter) || fiscalPeriods[0] || null;
    }
    return fiscalPeriods[0] || null;
  }, [selectedFilter, fiscalPeriods]);

  // Compute standard financial statement
  const statement = useMemo(() => {
    return calculateFinancialStatement(transactions, currentPeriod, fiscalPeriods, params);
  }, [transactions, currentPeriod, fiscalPeriods, params]);

  // Simulated statement with extra expense for tax saving experiment
  const simulatedStatement = useMemo(() => {
    if (simulatedExtraExpense <= 0) return statement;

    // Clone transactions with simulated expense
    const dummyExpense: Transaction = {
      id: 'simulated-tax-saving',
      date_from: currentPeriod?.months[0] ? `${currentPeriod.months[0]}-01` : '2025-01-01',
      date_to: currentPeriod?.months[0] ? `${currentPeriod.months[0]}-01` : '2025-01-01',
      type: 'expense',
      category: '節税対策（共済・備品等）',
      amount: simulatedExtraExpense,
      payment_method: '口座振替',
      granularity: 'monthly',
      description: 'シミュレーション追加経費',
      source_type: 'manual',
      confirmed: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return calculateFinancialStatement([...transactions, dummyExpense], currentPeriod, fiscalPeriods, params);
  }, [transactions, currentPeriod, fiscalPeriods, params, simulatedExtraExpense, statement]);

  // Tax saving suggestions
  const taxSavingIdeas = useMemo(() => {
    const profit = statement.fullYearProjection.projectedProfit > 0 
      ? statement.fullYearProjection.projectedProfit 
      : statement.profitBeforeTax;
    return getTaxSavingStrategies(profit, statement.taxEstimation.effectiveTaxRate || 25);
  }, [statement]);

  // Tax difference from simulation
  const taxDifference = statement.taxEstimation.totalCorporateIncomeTaxes - simulatedStatement.taxEstimation.totalCorporateIncomeTaxes;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">
                想定決算書 ＆ 税金シミュレーター
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                損益計算書(P/L)と法人税・消費税の見込みをリアルタイム集計します
              </p>
            </div>
          </div>
        </div>

        {/* Period & Entity Controls */}
        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto">
          {/* Period Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
            <Building2 className="w-3.5 h-3.5 text-indigo-600 ml-1" />
            <select
              value={selectedFilter}
              onChange={(e) => onSelectFilter(e.target.value)}
              className="bg-transparent text-xs font-bold pr-2 py-1 focus:outline-hidden cursor-pointer"
            >
              {fiscalPeriods.map(p => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Entity Type Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setParams(prev => ({ ...prev, entityType: 'corporate' }))}
              className={`px-3 py-1 rounded-lg transition-all ${
                params.entityType === 'corporate'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              法人
            </button>
            <button
              type="button"
              onClick={() => setParams(prev => ({ ...prev, entityType: 'individual' }))}
              className={`px-3 py-1 rounded-lg transition-all ${
                params.entityType === 'individual'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              個人
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors text-xs font-bold flex items-center gap-1"
            title="決算書を印刷・PDF出力"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Card 1: Sales Revenue */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold mb-1">
            <span>想定売上高（累計）</span>
            <Coins className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            {formatCurrency(statement.grossSales)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-[11px]">
            <span className="text-gray-500">入力済期間</span>
            <span className="font-bold text-gray-700">{statement.elapsedMonths} ヶ月分</span>
          </div>
        </div>

        {/* Card 2: Operating Profit */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold mb-1">
            <span>想定税引前利益</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className={`text-xl sm:text-2xl font-black tracking-tight ${
            statement.profitBeforeTax >= 0 ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {formatCurrency(statement.profitBeforeTax)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-[11px]">
            <span className="text-gray-500">粗利益率</span>
            <span className="font-bold text-emerald-700">{statement.grossProfitMargin}%</span>
          </div>
        </div>

        {/* Card 3: Estimated Taxes */}
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent bg-white p-4 sm:p-5 rounded-2xl border border-amber-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-900 font-bold mb-1">
            <span>想定税金合計 (法人税等+消費税)</span>
            <Landmark className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-950 tracking-tight">
            {formatCurrency(statement.taxEstimation.totalTaxBurden)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-100 text-[11px]">
            <span className="text-amber-800">実効税率（法人所得税）</span>
            <span className="font-bold text-amber-900">{statement.taxEstimation.effectiveTaxRate}%</span>
          </div>
        </div>

        {/* Card 4: Net Profit After Tax */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold mb-1">
            <span>税引後 手残り純利益</span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className={`text-xl sm:text-2xl font-black tracking-tight ${
            statement.netProfitAfterTax >= 0 ? 'text-indigo-600' : 'text-rose-600'
          }`}>
            {formatCurrency(statement.netProfitAfterTax)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-[11px]">
            <span className="text-gray-500">年間着地予測 純利益</span>
            <span className="font-bold text-indigo-900">
              {formatCurrency(statement.fullYearProjection.projectedNetProfit)}
            </span>
          </div>
        </div>

      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('statement')}
          className={`pb-3 px-4 text-xs sm:text-sm font-black border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'statement'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          想定損益計算書 (P/L)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tax_breakdown')}
          className={`pb-3 px-4 text-xs sm:text-sm font-black border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'tax_breakdown'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Landmark className="w-4 h-4" />
          税金内訳 ＆ 納税シミュレーション
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tax_saving')}
          className={`pb-3 px-4 text-xs sm:text-sm font-black border-b-2 transition-all flex items-center gap-2 relative ${
            activeTab === 'tax_saving'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          節税アクションプラン ＆ シミュレーター
          <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[9px] font-black rounded-full">
            おすすめ
          </span>
        </button>
      </div>

      {/* TAB 1: Financial Statement (P/L) */}
      {activeTab === 'statement' && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
          
          <div className="text-center pb-4 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
              損 益 計 算 書（想定試算表）
            </h2>
            <p className="text-xs text-gray-500 font-medium mt-1">
              対象期: {statement.periodLabel}（入力済 {statement.elapsedMonths} ヶ月間 累計）
            </p>
          </div>

          {/* Traditional Japanese Format Financial Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold">
                  <th className="py-2.5 px-4 text-left">勘定科目 / 区分</th>
                  <th className="py-2.5 px-4 text-right">金額 (円)</th>
                  <th className="py-2.5 px-4 text-right">売上比率</th>
                  <th className="py-2.5 px-4 text-left hidden sm:table-cell">備考・内訳</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                
                {/* Ⅰ 売上高 */}
                <tr className="bg-indigo-50/40 font-black text-indigo-950">
                  <td className="py-3 px-4">Ⅰ. 売上高</td>
                  <td className="py-3 px-4 text-right text-base font-mono">{formatCurrency(statement.grossSales)}</td>
                  <td className="py-3 px-4 text-right font-mono">100.0%</td>
                  <td className="py-3 px-4 text-xs text-gray-500 hidden sm:table-cell">全店舗・全売上合計</td>
                </tr>
                {statement.salesBreakdown.map(item => (
                  <tr key={item.name} className="hover:bg-gray-50/60 text-gray-700">
                    <td className="py-2 px-8">（うち）{item.name}</td>
                    <td className="py-2 px-4 text-right font-mono">{formatCurrency(item.amount)}</td>
                    <td className="py-2 px-4 text-right font-mono text-gray-500">{item.ratio}%</td>
                    <td className="py-2 px-4 text-xs text-gray-400 hidden sm:table-cell">-</td>
                  </tr>
                ))}

                {/* Ⅱ 売上原価 */}
                <tr className="bg-gray-50 font-black text-gray-900">
                  <td className="py-3 px-4">Ⅱ. 売上原価（仕入・材料費）</td>
                  <td className="py-3 px-4 text-right font-mono text-rose-600">▲ {formatCurrency(statement.cogs)}</td>
                  <td className="py-3 px-4 text-right font-mono">
                    {statement.grossSales > 0 ? (statement.cogs / statement.grossSales * 100).toFixed(1) : 0}%
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-500 hidden sm:table-cell">仕入・外注・薬剤等</td>
                </tr>
                {statement.cogsBreakdown.map(item => (
                  <tr key={item.name} className="hover:bg-gray-50/60 text-gray-700">
                    <td className="py-2 px-8">（うち）{item.name}</td>
                    <td className="py-2 px-4 text-right font-mono text-rose-600">▲ {formatCurrency(item.amount)}</td>
                    <td className="py-2 px-4 text-right font-mono text-gray-500">{item.ratio}%</td>
                    <td className="py-2 px-4 text-xs text-gray-400 hidden sm:table-cell">-</td>
                  </tr>
                ))}

                {/* 売上総利益 */}
                <tr className="bg-emerald-50/60 font-black text-emerald-950 border-y-2 border-emerald-200">
                  <td className="py-3.5 px-4 text-sm sm:text-base">売 上 総 利 益（粗利）</td>
                  <td className="py-3.5 px-4 text-right text-base sm:text-lg font-mono text-emerald-700">
                    {formatCurrency(statement.grossProfit)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-800">
                    {statement.grossProfitMargin}%
                  </td>
                  <td className="py-3.5 px-4 text-xs text-emerald-700 font-bold hidden sm:table-cell">粗利率 {statement.grossProfitMargin}%</td>
                </tr>

                {/* Ⅲ 販売費及び一般管理費 */}
                <tr className="bg-gray-50 font-black text-gray-900">
                  <td className="py-3 px-4">Ⅲ. 販売費及び一般管理費</td>
                  <td className="py-3 px-4 text-right font-mono text-rose-600">▲ {formatCurrency(statement.sgaExpenses)}</td>
                  <td className="py-3 px-4 text-right font-mono">
                    {statement.grossSales > 0 ? (statement.sgaExpenses / statement.grossSales * 100).toFixed(1) : 0}%
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-500 hidden sm:table-cell">店舗家賃・人件費・光熱費等</td>
                </tr>
                {statement.sgaBreakdown.map(item => (
                  <tr key={item.name} className="hover:bg-gray-50/60 text-gray-700">
                    <td className="py-2 px-8">（うち）{item.name}</td>
                    <td className="py-2 px-4 text-right font-mono text-rose-600">▲ {formatCurrency(item.amount)}</td>
                    <td className="py-2 px-4 text-right font-mono text-gray-500">{item.ratio}%</td>
                    <td className="py-2 px-4 text-xs text-gray-400 hidden sm:table-cell">-</td>
                  </tr>
                ))}

                {/* 営業利益 / 税引前当期純利益 */}
                <tr className="bg-indigo-50/80 font-black text-indigo-950 border-y-2 border-indigo-200">
                  <td className="py-3.5 px-4 text-sm sm:text-base">営 業 利 益 / 税引前当期純利益</td>
                  <td className={`py-3.5 px-4 text-right text-base sm:text-lg font-mono ${
                    statement.profitBeforeTax >= 0 ? 'text-indigo-700' : 'text-rose-600'
                  }`}>
                    {formatCurrency(statement.profitBeforeTax)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold">
                    {statement.operatingProfitMargin}%
                  </td>
                  <td className="py-3.5 px-4 text-xs text-indigo-700 font-bold hidden sm:table-cell">営業利益率 {statement.operatingProfitMargin}%</td>
                </tr>

                {/* Ⅳ 法人税等 */}
                <tr className="text-amber-900 bg-amber-50/40 font-bold">
                  <td className="py-3 px-4">Ⅳ. 法人税、住民税及び事業税（想定）</td>
                  <td className="py-3 px-4 text-right font-mono text-amber-700">
                    ▲ {formatCurrency(statement.taxEstimation.totalCorporateIncomeTaxes)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-gray-500">
                    {statement.taxEstimation.effectiveTaxRate}%
                  </td>
                  <td className="py-3 px-4 text-xs text-amber-700 hidden sm:table-cell">実効税率 {statement.taxEstimation.effectiveTaxRate}%</td>
                </tr>

                {/* Ⅴ 当期純利益 */}
                <tr className="bg-slate-900 text-white font-black">
                  <td className="py-4 px-4 text-sm sm:text-base">当 期 純 利 益（税引後）</td>
                  <td className="py-4 px-4 text-right text-lg sm:text-xl font-mono text-emerald-400">
                    {formatCurrency(statement.netProfitAfterTax)}
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-gray-300">
                    {statement.grossSales > 0 ? (statement.netProfitAfterTax / statement.grossSales * 100).toFixed(1) : 0}%
                  </td>
                  <td className="py-4 px-4 text-xs text-emerald-300 hidden sm:table-cell">会社に残る手残り利益</td>
                </tr>

              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>この損益計算書は入力済みのデータから自動算出された概算試算表です。</span>
            </div>
            <button
              type="button"
              onClick={onOpenAddExpense}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-xs"
            >
              ＋ 経費・領収書を追加する
            </button>
          </div>

        </div>
      )}

      {/* TAB 2: Tax Breakdown & Simulation */}
      {activeTab === 'tax_breakdown' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 2 Cols: Tax Breakdown Details */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-black text-gray-900">想定税金の内訳（詳細）</h2>
                <p className="text-xs text-gray-500">中小法人の税率体系（所得800万円以下 15%、800万円超 23.2%）に基づく試算</p>
              </div>
              <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-black">
                実効税率 約{statement.taxEstimation.effectiveTaxRate}%
              </span>
            </div>

            <div className="space-y-3">
              {/* Item 1: Corporate Tax */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-900 block">1. 法人税（国税）</span>
                  <span className="text-[11px] text-gray-500">所得800万以下: 15% / 所得800万超: 23.2%</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-gray-900 font-mono">
                    {formatCurrency(statement.taxEstimation.corporateTax)}
                  </span>
                </div>
              </div>

              {/* Item 2: Local Corporate Tax */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-900 block">2. 地方法人税</span>
                  <span className="text-[11px] text-gray-500">法人税額の 10.3%</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-gray-900 font-mono">
                    {formatCurrency(statement.taxEstimation.localCorporateTax)}
                  </span>
                </div>
              </div>

              {/* Item 3: Resident Tax */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-900 block">3. 法人住民税（所得割 ＋ 均等割）</span>
                  <span className="text-[11px] text-gray-500">
                    所得割(法人税×7%) ＋ 均等割(年間70,000円 ※赤字でも発生)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-gray-900 font-mono">
                    {formatCurrency(statement.taxEstimation.residentTax)}
                  </span>
                </div>
              </div>

              {/* Item 4: Enterprise Tax */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-900 block">4. 法人事業税 ＆ 特別法人事業税</span>
                  <span className="text-[11px] text-gray-500">所得段階に応じた段階税率（約3.5%〜7.0%）</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-gray-900 font-mono">
                    {formatCurrency(statement.taxEstimation.enterpriseTax)}
                  </span>
                </div>
              </div>

              {/* Subtotal Corporate Income Taxes */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-amber-950 block">法人所得課税 小計</span>
                  <span className="text-[11px] text-amber-800">利益に対して課税される税金の合計</span>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-amber-950 font-mono">
                    {formatCurrency(statement.taxEstimation.totalCorporateIncomeTaxes)}
                  </span>
                </div>
              </div>

              {/* Consumption Tax */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-indigo-950 block">5. 想定消費税（簡易課税概算）</span>
                    <span className="text-[10px] bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded-full font-bold">
                      みなし仕入率 50%
                    </span>
                  </div>
                  <span className="text-[11px] text-indigo-800">
                    預かり消費税 (売上×10/110) × 50%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-indigo-950 font-mono">
                    {formatCurrency(statement.taxEstimation.consumptionTax)}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Right 1 Col: Full Year Projection & Advice */}
          <div className="space-y-4">
            
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-md space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black tracking-tight">12ヶ月 期末年間着地予測</h3>
              </div>

              <p className="text-xs text-indigo-200 leading-relaxed font-medium">
                現在の月平均ペース（{statement.elapsedMonths}ヶ月実績）で推移した場合の決算着地予想です。
              </p>

              <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">着地 想定売上</span>
                  <span className="font-mono font-bold">{formatCurrency(statement.fullYearProjection.projectedSales)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">着地 想定経費</span>
                  <span className="font-mono font-bold text-rose-300">▲ {formatCurrency(statement.fullYearProjection.projectedExpenses)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400 font-bold">着地 想定利益</span>
                  <span className="font-mono font-black text-emerald-400 text-sm">
                    {formatCurrency(statement.fullYearProjection.projectedProfit)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400 font-bold">着地 想定法人税等</span>
                  <span className="font-mono font-black text-amber-400 text-sm">
                    {formatCurrency(statement.fullYearProjection.projectedTaxes)}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-white/10 rounded-2xl text-[11px] text-indigo-100">
                期末までに対策をとることで、この想定税金を大幅に圧縮できます！
              </div>
            </div>

            {/* Quick Tax Settings */}
            <div className="bg-white rounded-3xl border border-gray-200 p-5 space-y-3">
              <h4 className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>税務シミュレーション条件設定</span>
              </h4>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">消費税の計算方式</label>
                  <select
                    value={params.consumptionTaxMode}
                    onChange={(e) => setParams(prev => ({ ...prev, consumptionTaxMode: e.target.value as 'simple' | 'standard' }))}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-bold"
                  >
                    <option value="simple">簡易課税（サービス業・理美容等 50%）</option>
                    <option value="standard">本則課税（実額仕入控除）</option>
                  </select>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={params.hasConsumptionTax}
                      onChange={(e) => setParams(prev => ({ ...prev, hasConsumptionTax: e.target.checked }))}
                      className="rounded text-indigo-600"
                    />
                    <span className="font-bold text-gray-700">消費税 課税事業者（納税義務あり）</span>
                  </label>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 3: Tax Saving Strategies & Interactive Calculator */}
      {activeTab === 'tax_saving' && (
        <div className="space-y-6">
          
          {/* Interactive Experiment Slider Card */}
          <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-500/30 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-bold mb-2">
                  <Calculator className="w-3.5 h-3.5" />
                  <span>リアルタイム節税シミュレーター</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  あといくら経費・共済を使えば税金はいくら減る？
                </h2>
                <p className="text-xs text-indigo-200 mt-1">
                  スライダーを動かして追加の経費・節税投資を入力すると、削減できる税金と手残り利益を瞬時にシミュレーションします。
                </p>
              </div>

              {simulatedExtraExpense > 0 && (
                <div className="p-4 bg-emerald-500/20 border border-emerald-400/40 rounded-2xl text-right">
                  <span className="text-[11px] text-emerald-300 font-bold block">節税効果（税金削減額）</span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                    ▲ {formatCurrency(taxDifference)}
                  </span>
                </div>
              )}
            </div>

            {/* Slider Control */}
            <div className="space-y-3 bg-white/5 p-5 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-indigo-200">追加の節税経費・共済積立額</span>
                <span className="text-lg font-black text-amber-400 font-mono">
                  {formatCurrency(simulatedExtraExpense)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={5000000}
                step={100000}
                value={simulatedExtraExpense}
                onChange={(e) => setSimulatedExtraExpense(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                <span>0円</span>
                <span>100万円</span>
                <span>200万円</span>
                <span>300万円</span>
                <span>500万円</span>
              </div>
            </div>

            {/* Comparison Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-white/10 rounded-2xl">
                <span className="text-xs text-gray-400 block mb-1">対策前 法人税等</span>
                <span className="text-base font-black font-mono text-gray-200">
                  {formatCurrency(statement.taxEstimation.totalCorporateIncomeTaxes)}
                </span>
              </div>
              <div className="p-4 bg-white/10 rounded-2xl">
                <span className="text-xs text-emerald-300 block mb-1">対策後 想定法人税等</span>
                <span className="text-base font-black font-mono text-emerald-400">
                  {formatCurrency(simulatedStatement.taxEstimation.totalCorporateIncomeTaxes)}
                </span>
              </div>
              <div className="p-4 bg-white/10 rounded-2xl">
                <span className="text-xs text-amber-300 block mb-1">対策後 手残り利益</span>
                <span className="text-base font-black font-mono text-amber-400">
                  {formatCurrency(simulatedStatement.netProfitAfterTax)}
                </span>
              </div>
            </div>
          </div>

          {/* Actionable Tax-Saving Checklist */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900">決算期末までに検討できる実践的節税策</h3>
                <p className="text-xs text-gray-500">国税庁公認の合法的な損金算入・税額控除メニュー</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {taxSavingIdeas.map(idea => (
                <div 
                  key={idea.id} 
                  className={`bg-white rounded-3xl border p-5 space-y-3 transition-all ${
                    idea.isApplicable ? 'border-indigo-200 hover:border-indigo-400 shadow-xs' : 'border-gray-200 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-gray-900">{idea.title}</h4>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                          最大控除枠: {formatCurrency(idea.maxDeduction)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-gray-400 block">想定節税効果</span>
                      <span className="text-xs font-black text-emerald-600 font-mono">
                        約 {formatCurrency(idea.estimatedTaxSaved)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed font-medium">
                    {idea.description}
                  </p>

                  <div className="p-3 bg-gray-50 rounded-2xl text-[11px] text-gray-700 space-y-1">
                    <span className="font-bold text-indigo-900 block flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                      実行のポイント・期日
                    </span>
                    <p className="text-gray-600 leading-relaxed">
                      {idea.actionGuide}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
