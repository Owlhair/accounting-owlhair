import { SalaryEmployee, SalarySettings, SalaryCalculationResult } from '../types';

export type { SalaryCalculationResult };

export const DEFAULT_SALARY_SETTINGS: SalarySettings = {
  payDay: 25,                    // 毎月25日支給
  monthEndPayDay: 0,             // 末日（0=当月末または月末納付）
  healthInsuranceRate: 0.05,     // 協会けんぽ折半分 (5.0% = 全体10.0%)
  careInsuranceRate: 0.008,      // 介護保険料折半分 (0.8% = 全体1.6%)
  pensionRate: 0.0915,           // 厚生年金保険料折半分 (9.15% = 全体18.3%)
  empInsuranceEmployeeRate: 0.006,// 雇用保険・労働者負担率 (6/1000 = 0.6%)
  empInsuranceCompanyRate: 0.0095,// 雇用保険・事業主負担率 (9.5/1000 = 0.95%)
  childContributionRate: 0.0036, // 子ども・子育て拠出金 (3.6/1000 = 0.36%)
};

export const DEFAULT_SALARY_EMPLOYEES: SalaryEmployee[] = [
  {
    id: 'emp-exec-1',
    name: '代表取締役（役員）',
    type: 'executive',
    store: '全社共通',
    baseSalary: 450000,
    allowances: [],
    hasSocialInsurance: true,     // 役員：社保あり
    hasEmploymentInsurance: false,// 役員：雇用保険なし（原則加入不可）
    hasCareInsurance: true,       // 40歳以上介護保険
    dependentsCount: 1,           // 扶養1人
    residentTax: 22000,
    memo: '役員報酬（毎月定額・定期同額給与）',
    isActive: true,
  },
  {
    id: 'emp-staff-1',
    name: '店長・スタイリスト',
    type: 'salary',
    store: '本店',
    baseSalary: 280000,
    allowances: [
      { id: 'alw-1', title: '役職手当', amount: 30000, isTaxable: true },
      { id: 'alw-2', title: '通勤手当', amount: 10000, isTaxable: false },
    ],
    hasSocialInsurance: true,     // 正社員：社保あり
    hasEmploymentInsurance: true, // 正社員：雇用保険あり
    hasCareInsurance: false,      // 40歳未満
    dependentsCount: 0,
    residentTax: 13500,
    memo: '本店店長（社保・雇保加入）',
    isActive: true,
  },
  {
    id: 'emp-part-1',
    name: 'パート・アシスタント',
    type: 'salary',
    store: '太宰府店',
    baseSalary: 85000,
    allowances: [
      { id: 'alw-3', title: '通勤手当', amount: 5000, isTaxable: false },
    ],
    hasSocialInsurance: false,    // 短時間パート：社保なし
    hasEmploymentInsurance: false,// 週20時間未満：雇用保険なし
    hasCareInsurance: false,
    dependentsCount: 0,
    residentTax: 0,
    memo: '週3日勤務パート（扶養内・社保雇用保険なし）',
    isActive: true,
  },
];

/**
 * 総支給額から標準報酬月額（概算テーブル）を算定
 */
export function getStandardMonthlyRemuneration(grossSalary: number): number {
  if (grossSalary <= 63000) return 58000;
  if (grossSalary <= 73000) return 68000;
  if (grossSalary <= 83000) return 78000;
  if (grossSalary <= 93000) return 88000;
  if (grossSalary <= 101000) return 98000;
  if (grossSalary <= 107000) return 104000;
  if (grossSalary <= 114000) return 110000;
  if (grossSalary <= 122000) return 118000;
  if (grossSalary <= 130000) return 126000;
  if (grossSalary <= 138000) return 134000;
  if (grossSalary <= 146000) return 142000;
  if (grossSalary <= 155000) return 150000;
  if (grossSalary <= 165000) return 160000;
  if (grossSalary <= 175000) return 170000;
  if (grossSalary <= 185000) return 180000;
  if (grossSalary <= 195000) return 190000;
  if (grossSalary <= 210000) return 200000;
  if (grossSalary <= 230000) return 220000;
  if (grossSalary <= 250000) return 240000;
  if (grossSalary <= 270000) return 260000;
  if (grossSalary <= 290000) return 280000;
  if (grossSalary <= 310000) return 300000;
  if (grossSalary <= 330000) return 320000;
  if (grossSalary <= 350000) return 340000;
  if (grossSalary <= 370000) return 360000;
  if (grossSalary <= 395000) return 380000;
  if (grossSalary <= 425000) return 410000;
  if (grossSalary <= 455000) return 440000;
  if (grossSalary <= 485000) return 470000;
  if (grossSalary <= 515000) return 500000;
  if (grossSalary <= 545000) return 530000;
  if (grossSalary <= 575000) return 560000;
  if (grossSalary <= 605000) return 590000;
  if (grossSalary <= 635000) return 620000;
  if (grossSalary <= 665000) return 650000;
  if (grossSalary <= 695000) return 680000;
  return Math.min(grossSalary, 1390000);
}

/**
 * 協会けんぽ 都道府県別健康保険料率（令和6年度〜令和7年度 労使折半率）
 */
export const PREFECTURE_HEALTH_RATES: Record<string, { label: string; rate: number; fullRate: string }> = {
  '福岡県': { label: '福岡県 (折半 5.135% / 全体 10.27%)', rate: 0.05135, fullRate: '10.27%' },
  '東京都': { label: '東京都 (折半 4.99% / 全体 9.98%)', rate: 0.0499, fullRate: '9.98%' },
  '大阪府': { label: '大阪府 (折半 5.17% / 全体 10.34%)', rate: 0.0517, fullRate: '10.34%' },
  '神奈川県': { label: '神奈川県 (折半 5.01% / 全体 10.02%)', rate: 0.0501, fullRate: '10.02%' },
  '愛知県': { label: '愛知県 (折半 4.98% / 全体 9.96%)', rate: 0.0498, fullRate: '9.96%' },
  '埼玉県': { label: '埼玉県 (折半 4.89% / 全体 9.78%)', rate: 0.0489, fullRate: '9.78%' },
  '千葉県': { label: '千葉県 (折半 4.93% / 全体 9.86%)', rate: 0.0493, fullRate: '9.86%' },
  '兵庫県': { label: '兵庫県 (折半 5.17% / 全体 10.34%)', rate: 0.0517, fullRate: '10.34%' },
  '北海道': { label: '北海道 (折半 5.14% / 全体 10.28%)', rate: 0.0514, fullRate: '10.28%' },
  '佐賀県': { label: '佐賀県 (折半 5.255% / 全体 10.51%)', rate: 0.05255, fullRate: '10.51%' },
  '熊本県': { label: '熊本県 (折半 5.145% / 全体 10.29%)', rate: 0.05145, fullRate: '10.29%' },
  '全国平均': { label: '全国平均目安 (折半 5.00% / 全体 10.00%)', rate: 0.05, fullRate: '10.00%' },
};

/**
 * 国税庁 給与所得の源泉徴収税額表（月額表・甲欄）の精密算定
 * @param taxableGross 課税対象額（総支給額 - 非課税手当 - 社会保険料控除計 - 雇用保険控除）
 * @param dependents 扶養親族等の数（0人〜）
 */
export function calculateWithholdingTax(taxableGross: number, dependents: number): number {
  if (taxableGross < 88000) return 0;

  // 扶養親族等の数（安全に0以上）
  const depCount = Math.max(0, Math.min(15, dependents || 0));

  // 1. 扶養親族0人の基準税額の算定（国税庁 月額表・甲欄準拠）
  let taxZero = 0;
  if (taxableGross < 89000) taxZero = 130;
  else if (taxableGross < 90000) taxZero = 160;
  else if (taxableGross < 91000) taxZero = 200;
  else if (taxableGross < 93000) taxZero = 280;
  else if (taxableGross < 95000) taxZero = 360;
  else if (taxableGross < 97000) taxZero = 440;
  else if (taxableGross < 99000) taxZero = 520;
  else if (taxableGross < 101000) taxZero = 600;
  else if (taxableGross < 103000) taxZero = 720;
  else if (taxableGross < 105000) taxZero = 840;
  else if (taxableGross < 107000) taxZero = 960;
  else if (taxableGross < 109000) taxZero = 1080;
  else if (taxableGross < 111000) taxZero = 1200;
  else if (taxableGross < 113000) taxZero = 1320;
  else if (taxableGross < 115000) taxZero = 1440;
  else if (taxableGross < 117000) taxZero = 1560;
  else if (taxableGross < 120000) taxZero = 1740;
  else if (taxableGross < 125000) taxZero = 2040;
  else if (taxableGross < 130000) taxZero = 2340;
  else if (taxableGross < 140000) taxZero = 2790;
  else if (taxableGross < 150000) taxZero = 3250;
  else if (taxableGross < 160000) taxZero = 3710;
  else if (taxableGross < 170000) taxZero = 4170;
  else if (taxableGross < 180000) taxZero = 4630;
  else if (taxableGross < 190000) taxZero = 5090;
  else if (taxableGross < 200000) taxZero = 5550;
  else if (taxableGross < 210000) taxZero = 6010;
  else if (taxableGross < 220000) taxZero = 6470;
  else if (taxableGross < 230000) taxZero = 6930;
  else if (taxableGross < 240000) taxZero = 7390;
  else if (taxableGross < 250000) taxZero = 7850;
  else if (taxableGross < 260000) taxZero = 8310;
  else if (taxableGross < 280000) taxZero = 9230;
  else if (taxableGross < 300000) taxZero = 10150;
  else if (taxableGross < 350000) {
    taxZero = 10150 + Math.floor((taxableGross - 300000) * 0.0736);
  } else if (taxableGross < 400000) {
    taxZero = 13830 + Math.floor((taxableGross - 350000) * 0.103);
  } else if (taxableGross < 500000) {
    taxZero = 18990 + Math.floor((taxableGross - 400000) * 0.103);
  } else if (taxableGross < 700000) {
    taxZero = 29310 + Math.floor((taxableGross - 500000) * 0.139);
  } else {
    taxZero = 57090 + Math.floor((taxableGross - 700000) * 0.204);
  }

  // 2. 扶養親族等の数による軽減額（国税庁 月額表・甲欄基準）
  // 扶養親族1人あたり、所得税率5%帯では月約1,590円、10%帯では月約2,580円、20%帯では月約5,170円控除
  let deductionPerDependent = 1590;
  if (taxableGross >= 700000) {
    deductionPerDependent = 5170;
  } else if (taxableGross >= 350000) {
    deductionPerDependent = 2580;
  }

  const finalTax = Math.max(0, taxZero - depCount * deductionPerDependent);
  return finalTax;
}

export const estimateWithholdingTax = calculateWithholdingTax;

/**
 * 単一従業員/役員の給与・会社負担・月末支払いの精密自動計算
 */
export function calculateEmployeeSalary(
  employee: SalaryEmployee,
  settings: SalarySettings = DEFAULT_SALARY_SETTINGS
): SalaryCalculationResult {
  const totalBase = employee.baseSalary || 0;
  const totalAllowances = (employee.allowances || []).reduce((acc, cur) => acc + (cur.amount || 0), 0);
  const grossSalary = totalBase + totalAllowances;

  // 非課税手当の合計（通勤手当等）
  const nonTaxableAllowances = (employee.allowances || [])
    .filter((a) => a.isTaxable === false)
    .reduce((acc, cur) => acc + (cur.amount || 0), 0);

  // 1. 社会保険（健康保険・厚生年金・介護保険）
  let healthInsurance = 0;
  let careInsurance = 0;
  let welfarePension = 0;
  let companyHealthInsurance = 0;
  let companyCareInsurance = 0;
  let companyWelfarePension = 0;
  let companyChildContribution = 0;

  if (employee.hasSocialInsurance) {
    // 標準報酬月額（直接指定があれば優先、なければ総支給額から算定）
    const stdRemuneration =
      employee.standardMonthlyRemuneration && employee.standardMonthlyRemuneration > 0
        ? employee.standardMonthlyRemuneration
        : getStandardMonthlyRemuneration(grossSalary);

    // 健康保険（本人分）
    if (employee.customOverrides?.healthInsurance !== undefined) {
      healthInsurance = employee.customOverrides.healthInsurance;
    } else {
      healthInsurance = Math.floor(stdRemuneration * settings.healthInsuranceRate);
    }

    // 介護保険（本人分）
    if (employee.hasCareInsurance) {
      if (employee.customOverrides?.careInsurance !== undefined) {
        careInsurance = employee.customOverrides.careInsurance;
      } else {
        careInsurance = Math.floor(stdRemuneration * settings.careInsuranceRate);
      }
    }

    // 厚生年金（本人分）
    if (employee.customOverrides?.welfarePension !== undefined) {
      welfarePension = employee.customOverrides.welfarePension;
    } else {
      // 厚生年金の上限（32等級 650,000円）
      const pensionStd = Math.min(stdRemuneration, 650000);
      welfarePension = Math.floor(pensionStd * settings.pensionRate);
    }

    // 会社負担分 (労使折半 + 子ども子育て拠出金)
    companyHealthInsurance = healthInsurance;
    companyCareInsurance = careInsurance;
    companyWelfarePension = welfarePension;
    companyChildContribution = Math.floor(stdRemuneration * settings.childContributionRate);
  }

  const socialInsuranceTotal = healthInsurance + careInsurance + welfarePension;
  const companySocialInsuranceTotal =
    companyHealthInsurance +
    companyCareInsurance +
    companyWelfarePension +
    companyChildContribution;

  // 2. 雇用保険
  let employmentInsurance = 0;
  let companyEmploymentInsurance = 0;

  if (employee.hasEmploymentInsurance) {
    if (employee.customOverrides?.employmentInsurance !== undefined) {
      employmentInsurance = employee.customOverrides.employmentInsurance;
    } else {
      employmentInsurance = Math.floor(grossSalary * settings.empInsuranceEmployeeRate);
    }
    companyEmploymentInsurance = Math.floor(grossSalary * settings.empInsuranceCompanyRate);
  }

  // 3. 所得税（源泉徴収税額）
  // 課税対象額 = 総支給額 - 非課税手当 - (社保控除計 + 雇用保険控除)
  const taxableAmount = Math.max(
    0,
    grossSalary - nonTaxableAllowances - socialInsuranceTotal - employmentInsurance
  );

  let incomeTax = 0;
  if (employee.customOverrides?.incomeTax !== undefined) {
    incomeTax = employee.customOverrides.incomeTax;
  } else {
    incomeTax = estimateWithholdingTax(taxableAmount, employee.dependentsCount || 0);
  }

  // 4. 住民税
  const residentTax = employee.residentTax || 0;

  // 控除合計
  const totalDeductions = socialInsuranceTotal + employmentInsurance + incomeTax + residentTax;

  // 差引支給額（手取り振込額）
  const netSalary = Math.max(0, grossSalary - totalDeductions);

  // 会社負担法定福利費計
  const companyTotalStatutoryWelfare = companySocialInsuranceTotal + companyEmploymentInsurance;

  // 会社の総人件費（総支給 + 会社負担法定福利費）
  const totalCompanyCost = grossSalary + companyTotalStatutoryWelfare;

  // 月末にまとめて納付する金額（社保本人預り＋社保会社負担＋雇用保険会社負担＋源泉税＋住民税）
  const monthEndPaymentTotal =
    (socialInsuranceTotal + companySocialInsuranceTotal) +
    companyEmploymentInsurance +
    incomeTax +
    residentTax;

  return {
    employee,
    totalBase,
    totalAllowances,
    grossSalary,
    healthInsurance,
    careInsurance,
    welfarePension,
    socialInsuranceTotal,
    employmentInsurance,
    taxableAmount,
    incomeTax,
    residentTax,
    totalDeductions,
    netSalary,
    companyHealthInsurance,
    companyCareInsurance,
    companyWelfarePension,
    companyChildContribution,
    companySocialInsuranceTotal,
    companyEmploymentInsurance,
    companyTotalStatutoryWelfare,
    totalCompanyCost,
    monthEndPaymentTotal,
  };
}

/**
 * 全従業員の集計サマリー
 */
export interface SalaryTotalSummary {
  employeeCount: number;
  executiveCount: number;
  staffCount: number;
  totalGross: number;                  // 総額面
  totalExecutiveRemuneration: number;  // 役員報酬合計
  totalStaffSalary: number;            // 給料手当合計
  totalAllowances: number;             // 手当合計
  
  // 控除合計
  totalHealthInsurance: number;
  totalCareInsurance: number;
  totalWelfarePension: number;
  totalSocialInsurance: number;
  totalEmploymentInsurance: number;
  totalIncomeTax: number;
  totalResidentTax: number;
  totalDeductions: number;             // 控除合計（預り金総額）
  totalNetSalary: number;              // 手取り振込総額 (25日等に払うもの)
  
  // 会社負担分
  totalCompanyHealthInsurance: number;
  totalCompanyCareInsurance: number;
  totalCompanyWelfarePension: number;
  totalCompanyChildContribution: number;
  totalCompanySocialInsurance: number;
  totalCompanyEmploymentInsurance: number;
  totalCompanyStatutoryWelfare: number;// 法定福利費会社負担合計
  
  // 会社の真の人件費
  totalCompanyCost: number;            // 総支給額 + 会社負担法定福利費
  
  // 【ユーザーのハイライト要望】末の支払い（月末納付）に自動で合算される金額
  monthEndSummary: {
    socialInsurancePayment: number;    // 社会保険料納付 (本人負担分 + 会社負担分 + 子ども子育て)
    laborInsurancePayment: number;     // 労働保険会社負担分 (雇用保険会社負担)
    withholdingTaxPayment: number;     // 源泉所得税納付 (本人預り金)
    residentTaxPayment: number;        // 住民税納付 (本人預り金)
    totalMonthEndPayment: number;      // 月末に納付・支払う総額
  };
}

export function calculateTotalSalarySummary(
  results: SalaryCalculationResult[]
): SalaryTotalSummary {
  const activeResults = results.filter((r) => r.employee.isActive);

  let totalGross = 0;
  let totalExecutiveRemuneration = 0;
  let totalStaffSalary = 0;
  let totalAllowances = 0;

  let totalHealthInsurance = 0;
  let totalCareInsurance = 0;
  let totalWelfarePension = 0;
  let totalSocialInsurance = 0;
  let totalEmploymentInsurance = 0;
  let totalIncomeTax = 0;
  let totalResidentTax = 0;
  let totalDeductions = 0;
  let totalNetSalary = 0;

  let totalCompanyHealthInsurance = 0;
  let totalCompanyCareInsurance = 0;
  let totalCompanyWelfarePension = 0;
  let totalCompanyChildContribution = 0;
  let totalCompanySocialInsurance = 0;
  let totalCompanyEmploymentInsurance = 0;
  let totalCompanyStatutoryWelfare = 0;
  let totalCompanyCost = 0;

  let executiveCount = 0;
  let staffCount = 0;

  for (const r of activeResults) {
    if (r.employee.type === 'executive') {
      executiveCount++;
      totalExecutiveRemuneration += r.grossSalary;
    } else {
      staffCount++;
      totalStaffSalary += r.grossSalary;
    }

    totalGross += r.grossSalary;
    totalAllowances += r.totalAllowances;

    totalHealthInsurance += r.healthInsurance;
    totalCareInsurance += r.careInsurance;
    totalWelfarePension += r.welfarePension;
    totalSocialInsurance += r.socialInsuranceTotal;
    totalEmploymentInsurance += r.employmentInsurance;
    totalIncomeTax += r.incomeTax;
    totalResidentTax += r.residentTax;
    totalDeductions += r.totalDeductions;
    totalNetSalary += r.netSalary;

    totalCompanyHealthInsurance += r.companyHealthInsurance;
    totalCompanyCareInsurance += r.companyCareInsurance;
    totalCompanyWelfarePension += r.companyWelfarePension;
    totalCompanyChildContribution += r.companyChildContribution;
    totalCompanySocialInsurance += r.companySocialInsuranceTotal;
    totalCompanyEmploymentInsurance += r.companyEmploymentInsurance;
    totalCompanyStatutoryWelfare += r.companyTotalStatutoryWelfare;
    totalCompanyCost += r.totalCompanyCost;
  }

  // 月末に納付する内訳（本人預り分 ＋ 会社負担分）
  const socialInsurancePayment = totalSocialInsurance + totalCompanySocialInsurance;
  const laborInsurancePayment = totalCompanyEmploymentInsurance;
  const withholdingTaxPayment = totalIncomeTax;
  const residentTaxPayment = totalResidentTax;
  const totalMonthEndPayment =
    socialInsurancePayment + laborInsurancePayment + withholdingTaxPayment + residentTaxPayment;

  return {
    employeeCount: activeResults.length,
    executiveCount,
    staffCount,
    totalGross,
    totalExecutiveRemuneration,
    totalStaffSalary,
    totalAllowances,
    totalHealthInsurance,
    totalCareInsurance,
    totalWelfarePension,
    totalSocialInsurance,
    totalEmploymentInsurance,
    totalIncomeTax,
    totalResidentTax,
    totalDeductions,
    totalNetSalary,
    totalCompanyHealthInsurance,
    totalCompanyCareInsurance,
    totalCompanyWelfarePension,
    totalCompanyChildContribution,
    totalCompanySocialInsurance,
    totalCompanyEmploymentInsurance,
    totalCompanyStatutoryWelfare,
    totalCompanyCost,
    monthEndSummary: {
      socialInsurancePayment,
      laborInsurancePayment,
      withholdingTaxPayment,
      residentTaxPayment,
      totalMonthEndPayment,
    },
  };
}
