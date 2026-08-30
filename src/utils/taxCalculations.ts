import { Transaction, FiscalPeriod } from '../types';

export interface TaxForecastParams {
  entityType: 'corporate' | 'individual'; // 法人 or 個人事業主
  capitalAmount: number; // 資本金（デフォルト 1,000万円以下）
  hasConsumptionTax: boolean; // 消費税課税事業者か
  consumptionTaxMode: 'simple' | 'standard'; // 簡易課税 or 本則課税
  simpleTaxRate: number; // 簡易課税みなし仕入率 (美容・サービス業: 50%, 飲食: 60%, 小売: 80%)
  blueReturnDeduction: number; // 青色申告特別控除 (個人: 65万円 or 55万円 or 10万円)
  projectFullYear: boolean; // 12ヶ月年間着地予測を適用するか
}

export interface StatementItem {
  name: string;
  amount: number;
  ratio: number; // 売上高対比 (%)
  note?: string;
}

export interface EstimatedFinancialStatement {
  periodLabel: string;
  elapsedMonths: number;
  totalMonths: number;
  isProjected: boolean; // 予測値が含まれるか

  // 売上
  grossSales: number;
  salesBreakdown: StatementItem[];

  // 売上原価
  cogs: number;
  cogsBreakdown: StatementItem[];

  // 売上総利益（粗利）
  grossProfit: number;
  grossProfitMargin: number; // %

  // 販管費（販売費及び一般管理費）
  sgaExpenses: number;
  sgaBreakdown: StatementItem[];

  // 営業利益
  operatingProfit: number;
  operatingProfitMargin: number; // %

  // 経常利益
  ordinaryProfit: number;

  // 税引前当期利益
  profitBeforeTax: number;

  // 想定税金内訳
  taxEstimation: {
    corporateTax: number; // 法人税 (国税)
    localCorporateTax: number; // 地方法人税
    residentTax: number; // 法人住民税（所得割 + 均等割約7万円）
    enterpriseTax: number; // 法人事業税 + 特別法人事業税
    totalCorporateIncomeTaxes: number; // 法人所得課税合計
    consumptionTax: number; // 想定消費税
    totalTaxBurden: number; // 全税金合計
    effectiveTaxRate: number; // 実効税率 (%)
    perCapitaTax: number; // 均等割（赤字でもかかる7万円）
  };

  // 税引後当期純利益
  netProfitAfterTax: number;

  // 年間着地予測（もし期中データの場合）
  fullYearProjection: {
    projectedSales: number;
    projectedExpenses: number;
    projectedProfit: number;
    projectedTaxes: number;
    projectedNetProfit: number;
  };
}

export interface TaxSavingIdea {
  id: string;
  title: string;
  category: 'immediate' | 'medium' | 'long_term';
  maxDeduction: number;
  estimatedTaxSaved: number;
  description: string;
  actionGuide: string;
  isApplicable: boolean;
}

// Default settings
export const DEFAULT_TAX_PARAMS: TaxForecastParams = {
  entityType: 'corporate',
  capitalAmount: 3000000, // 300万円
  hasConsumptionTax: true,
  consumptionTaxMode: 'simple',
  simpleTaxRate: 0.50, // 第5種（サービス業・理美容等: 50%）
  blueReturnDeduction: 650000,
  projectFullYear: true,
};

/**
 * 渡された取引リスト・期情報から、リアルタイム想定損益計算書（P/L）と想定税金を精密計算する
 */
export const calculateFinancialStatement = (
  transactions: Transaction[],
  selectedPeriod: FiscalPeriod | null,
  allPeriods: FiscalPeriod[],
  params: TaxForecastParams = DEFAULT_TAX_PARAMS
): EstimatedFinancialStatement => {
  // 1. 対象期間の取引を抽出
  const filteredTx = transactions.filter(t => {
    if (!selectedPeriod) return true;
    const m = (t.date_from || t.date_to || '').substring(0, 7);
    return selectedPeriod.months.includes(m);
  });

  // 経過月数の判定（取引がある月数 or 選択期の全月数）
  const activeMonthsInTx = new Set<string>();
  filteredTx.forEach(t => {
    const m = (t.date_from || t.date_to || '').substring(0, 7);
    if (m) activeMonthsInTx.add(m);
  });

  const totalPeriodMonths = selectedPeriod?.months?.length || 12;
  const elapsedMonths = Math.max(1, activeMonthsInTx.size);

  // 2. 売上・原価・販管費の集計
  let grossSales = 0;
  const salesMap = new Map<string, number>();

  let cogs = 0;
  const cogsMap = new Map<string, number>();

  let sgaExpenses = 0;
  const sgaMap = new Map<string, number>();

  // 売上原価と判定するカテゴリキーワード
  const cogsKeywords = ['仕入', '原価', '材料', '外注', '店販仕入', '薬剤', '消耗備品仕入'];

  filteredTx.forEach(t => {
    if (t.type === 'sales') {
      grossSales += t.amount;
      const cat = t.category || '技術売上';
      salesMap.set(cat, (salesMap.get(cat) || 0) + t.amount);
    } else if (t.type === 'expense') {
      const cat = t.category || 'その他経費';
      const isCogs = cogsKeywords.some(k => cat.includes(k) || (t.subcategory && t.subcategory.includes(k)));
      if (isCogs) {
        cogs += t.amount;
        cogsMap.set(cat, (cogsMap.get(cat) || 0) + t.amount);
      } else {
        sgaExpenses += t.amount;
        sgaMap.set(cat, (sgaMap.get(cat) || 0) + t.amount);
      }
    }
  });

  // 3. 利益計算
  const grossProfit = grossSales - cogs;
  const grossProfitMargin = grossSales > 0 ? (grossProfit / grossSales) * 100 : 0;

  const operatingProfit = grossProfit - sgaExpenses;
  const operatingProfitMargin = grossSales > 0 ? (operatingProfit / grossSales) * 100 : 0;

  const ordinaryProfit = operatingProfit; // 営業外損益を考慮（現在拡張用）
  const profitBeforeTax = ordinaryProfit;

  // 4. 税金計算（中小企業法人税制に基づく概算）
  let corporateTax = 0;
  let localCorporateTax = 0;
  let residentTax = 0;
  let enterpriseTax = 0;
  const perCapitaTax = 70000; // 法人住民税均等割（資本金1000万以下・従業員50人以下）

  if (params.entityType === 'corporate') {
    if (profitBeforeTax > 0) {
      // 中小法人の軽減税率: 所得800万円以下 15%、800万円超 23.2%
      if (profitBeforeTax <= 8000000) {
        corporateTax = Math.round(profitBeforeTax * 0.15);
      } else {
        corporateTax = Math.round(8000000 * 0.15 + (profitBeforeTax - 8000000) * 0.232);
      }

      // 地方法人税（法人税額の10.3%）
      localCorporateTax = Math.round(corporateTax * 0.103);

      // 法人住民税（所得割: 法人税額の約7% + 均等割7万円）
      const residentIncomeRate = 0.07;
      residentTax = Math.round(corporateTax * residentIncomeRate) + perCapitaTax;

      // 法人事業税 + 特別法人事業税（所得800万以下 約3.5%, 超過約7%）
      if (profitBeforeTax <= 4000000) {
        enterpriseTax = Math.round(profitBeforeTax * 0.035);
      } else if (profitBeforeTax <= 8000000) {
        enterpriseTax = Math.round(4000000 * 0.035 + (profitBeforeTax - 4000000) * 0.053);
      } else {
        enterpriseTax = Math.round(4000000 * 0.035 + 4000000 * 0.053 + (profitBeforeTax - 8000000) * 0.07);
      }
    } else {
      // 赤字の場合でも均等割7万円は発生
      residentTax = perCapitaTax;
    }
  } else {
    // 個人事業主の場合（所得税 累進税率 + 住民税 10% + 事業税 約5% - 青色控除）
    const taxableIncome = Math.max(0, profitBeforeTax - params.blueReturnDeduction);
    if (taxableIncome > 0) {
      // 簡易所得税計算
      let incomeTax = 0;
      if (taxableIncome <= 1950000) incomeTax = taxableIncome * 0.05;
      else if (taxableIncome <= 3300000) incomeTax = taxableIncome * 0.10 - 97500;
      else if (taxableIncome <= 6950000) incomeTax = taxableIncome * 0.20 - 427500;
      else if (taxableIncome <= 9000000) incomeTax = taxableIncome * 0.23 - 636000;
      else incomeTax = taxableIncome * 0.33 - 1536000;

      // 住民税 10%
      residentTax = Math.round(taxableIncome * 0.10);
      // 個人事業税（事業主控除290万控除後 5%）
      enterpriseTax = Math.round(Math.max(0, taxableIncome - 2900000) * 0.05);
      corporateTax = Math.round(incomeTax);
    }
  }

  const totalCorporateIncomeTaxes = corporateTax + localCorporateTax + residentTax + enterpriseTax;

  // 5. 消費税概算計算
  let consumptionTax = 0;
  if (params.hasConsumptionTax && grossSales > 0) {
    if (params.consumptionTaxMode === 'simple') {
      // 簡易課税: 預かり消費税 (売上×10/110) × (1 - みなし仕入率)
      const outputTax = grossSales * (10 / 110);
      consumptionTax = Math.round(outputTax * (1 - params.simpleTaxRate));
    } else {
      // 本則課税概算: (売上 - 原価 - 課税経費) × 10/110
      const taxableExpenses = cogs + sgaExpenses * 0.75; // 人件費など非課税を除く概算
      consumptionTax = Math.max(0, Math.round((grossSales - taxableExpenses) * (10 / 110)));
    }
  }

  const totalTaxBurden = totalCorporateIncomeTaxes + consumptionTax;
  const effectiveTaxRate = profitBeforeTax > 0 ? Math.round((totalCorporateIncomeTaxes / profitBeforeTax) * 1000) / 10 : 0;
  const netProfitAfterTax = profitBeforeTax - totalCorporateIncomeTaxes;

  // 6. 年間着地予測（12ヶ月換算）
  const annualFactor = elapsedMonths > 0 ? (totalPeriodMonths / elapsedMonths) : 1;
  const projectedSales = Math.round(grossSales * annualFactor);
  const projectedExpenses = Math.round((cogs + sgaExpenses) * annualFactor);
  const projectedProfit = projectedSales - projectedExpenses;
  
  let projectedTaxes = perCapitaTax;
  if (projectedProfit > 0) {
    if (projectedProfit <= 8000000) {
      projectedTaxes = Math.round(projectedProfit * 0.22) + perCapitaTax;
    } else {
      projectedTaxes = Math.round(8000000 * 0.22 + (projectedProfit - 8000000) * 0.33) + perCapitaTax;
    }
  }
  const projectedNetProfit = projectedProfit - projectedTaxes;

  // 7. 内訳リスト整形
  const toStatementItems = (map: Map<string, number>, base: number): StatementItem[] => {
    return Array.from(map.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        ratio: base > 0 ? Math.round((amount / base) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  return {
    periodLabel: selectedPeriod ? selectedPeriod.label : '全期間',
    elapsedMonths,
    totalMonths: totalPeriodMonths,
    isProjected: elapsedMonths < totalPeriodMonths,
    grossSales,
    salesBreakdown: toStatementItems(salesMap, grossSales),
    cogs,
    cogsBreakdown: toStatementItems(cogsMap, grossSales),
    grossProfit,
    grossProfitMargin: Math.round(grossProfitMargin * 10) / 10,
    sgaExpenses,
    sgaBreakdown: toStatementItems(sgaMap, grossSales),
    operatingProfit,
    operatingProfitMargin: Math.round(operatingProfitMargin * 10) / 10,
    ordinaryProfit,
    profitBeforeTax,
    taxEstimation: {
      corporateTax,
      localCorporateTax,
      residentTax,
      enterpriseTax,
      totalCorporateIncomeTaxes,
      consumptionTax,
      totalTaxBurden,
      effectiveTaxRate,
      perCapitaTax,
    },
    netProfitAfterTax,
    fullYearProjection: {
      projectedSales,
      projectedExpenses,
      projectedProfit,
      projectedTaxes,
      projectedNetProfit,
    },
  };
};

/**
 * 現在の想定利益に基づく実践的な節税提案リスト
 */
export const getTaxSavingStrategies = (
  projectedProfit: number,
  effectiveTaxRate: number = 25
): TaxSavingIdea[] => {
  const rate = (effectiveTaxRate || 25) / 100;

  return [
    {
      id: 'safety_mutual_aid',
      title: '経営セーフティ共済（倒産防止共済）',
      category: 'immediate',
      maxDeduction: 2400000,
      estimatedTaxSaved: Math.round(Math.min(projectedProfit, 2400000) * rate),
      description: '月額最大20万円（年最大240万円、累計800万円まで）を全額損金・経費にできる最強の公的節税策です。解約手当金も40ヶ月以上で100%戻ります。',
      actionGuide: '決算月までに前納（年払い）手続きを行うことで、当期の損金として計上できます。',
      isApplicable: projectedProfit > 500000,
    },
    {
      id: 'small_assets_depreciation',
      title: '少額減価償却資産の特例（一括即時償却）',
      category: 'immediate',
      maxDeduction: 3000000,
      estimatedTaxSaved: Math.round(Math.min(projectedProfit, 1000000) * rate),
      description: '取得価額30万円未満のパソコン、店舗什器、施術機材、備品などを年間300万円まで購入年度に一括で全額経費計上できます。',
      actionGuide: '来期に購入予定だった必要な機材やPC・タブレットを決算期末までに前倒しで購入・納品・使用開始します。',
      isApplicable: projectedProfit > 300000,
    },
    {
      id: 'settlement_bonus',
      title: '決算賞与（役員・従業員への業績インセンティブ）',
      category: 'immediate',
      maxDeduction: 2000000,
      estimatedTaxSaved: Math.round(Math.min(projectedProfit, 1500000) * rate),
      description: '決算月に各スタッフへ支給額を通知し、決算終了後1ヶ月以内に支払うことで、当期の損金に算入できます。スタッフのモチベーションUPと節税を両立。',
      actionGuide: '決算月末日までに全受給者へ書面で金額を通知し、翌月末までに銀行振込で支給します。',
      isApplicable: projectedProfit > 1000000,
    },
    {
      id: 'prepaid_expenses',
      title: '短期前払費用の特例（家賃・リース料・サーバー代の1年分前払い）',
      category: 'medium',
      maxDeduction: 1200000,
      estimatedTaxSaved: Math.round(Math.min(projectedProfit, 800000) * rate),
      description: '店舗家賃や通信費、保険料など、1年以内に役務提供を受ける費用を年払いで一括先払いすることで、当期の損金にできます。',
      actionGuide: '大家さんや契約先に「年払い契約」への変更を打診し、決算月内に支払いを完了させます。',
      isApplicable: projectedProfit > 500000,
    },
    {
      id: 'small_enterprise_mutual_aid',
      title: '小規模企業共済 / iDeCo（役員・経営者の退職金積立）',
      category: 'long_term',
      maxDeduction: 840000,
      estimatedTaxSaved: Math.round(840000 * 0.30),
      description: '経営者個人の所得税・住民税を節税できる国の退職金制度。月額最大7万円（年84万円）が全額所得控除になります。',
      actionGuide: '中小機構にて手続き。掛金全額が所得控除され、将来退職金として低税率で受け取れます。',
      isApplicable: true,
    },
  ];
};
