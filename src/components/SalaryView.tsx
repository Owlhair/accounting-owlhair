import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserCheck, 
  Building2, 
  DollarSign, 
  ShieldCheck, 
  ShieldAlert, 
  Calendar, 
  Plus, 
  Trash2, 
  Copy, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Settings, 
  ChevronRight, 
  ChevronLeft,
  ArrowUpRight, 
  Coins, 
  CreditCard, 
  Send, 
  Sparkles,
  Layers,
  ChevronDown,
  Info,
  Check,
  History,
  RefreshCw,
  Clock,
  LayoutGrid,
  List
} from 'lucide-react';
import { 
  SalaryEmployee, 
  SalarySettings, 
  SalaryAllowance, 
  SalaryCalculationResult, 
  FiscalPeriod, 
  AppSettings, 
  Transaction,
  ExpenseCard
} from '../types';
import { 
  calculateEmployeeSalary, 
  calculateTotalSalarySummary, 
  DEFAULT_SALARY_SETTINGS,
  SalaryTotalSummary 
} from '../utils/salaryCalculator';
import { SalaryMinimapBreakdown } from './SalaryMinimapBreakdown';

// Format YYYY-MM to Japanese display (例: "2025年8月")
const formatMonthLabel = (m: string) => {
  if (!m) return '';
  const parts = m.split('-');
  if (parts.length >= 2) {
    return `${parts[0]}年${parseInt(parts[1], 10)}月`;
  }
  return m;
};

// Calculate previous month YYYY-MM
const getPreviousMonth = (m: string): string => {
  if (!m || !m.includes('-')) return '2025-07';
  const [y, mon] = m.split('-').map(Number);
  const prevDate = new Date(y, mon - 2, 1);
  const py = prevDate.getFullYear();
  const pm = String(prevDate.getMonth() + 1).padStart(2, '0');
  return `${py}-${pm}`;
};

// Calculate next month YYYY-MM
const getNextMonth = (m: string): string => {
  if (!m || !m.includes('-')) return '2025-09';
  const [y, mon] = m.split('-').map(Number);
  const nextDate = new Date(y, mon, 1);
  const ny = nextDate.getFullYear();
  const nm = String(nextDate.getMonth() + 1).padStart(2, '0');
  return `${ny}-${nm}`;
};

interface SalaryViewProps {
  settings: AppSettings;
  transactions: Transaction[];
  fiscalPeriods: FiscalPeriod[];
  selectedFilter: string;
  onSelectFilter: (filter: string) => void;
  onSaveSalaryEmployees: (employees: SalaryEmployee[], targetMonth?: string) => void;
  onSaveSalarySettings: (settings: SalarySettings) => void;
  onRegisterSalaryToTransactions: (payload: {
    targetMonth: string;
    payDate: string;
    monthEndDate: string;
    summary: SalaryTotalSummary;
    results: SalaryCalculationResult[];
  }) => void;
  onSyncToMonthEndExpenseCard?: (summary: SalaryTotalSummary, targetMonth: string) => void;
}

export const SalaryView: React.FC<SalaryViewProps> = ({
  settings,
  transactions,
  fiscalPeriods,
  selectedFilter,
  onSelectFilter,
  onSaveSalaryEmployees,
  onSaveSalarySettings,
  onRegisterSalaryToTransactions,
  onSyncToMonthEndExpenseCard,
}) => {
  // Current active fiscal period (matches StoreSalesCardBoard & ExpenseCardsView)
  const currentPeriod = useMemo(() => {
    if (selectedFilter.startsWith('period-')) {
      return fiscalPeriods.find(p => p.key === selectedFilter) || fiscalPeriods[0];
    }
    const containingPeriod = fiscalPeriods.find(p => p.months && p.months.includes(selectedFilter));
    if (containingPeriod) return containingPeriod;
    return fiscalPeriods[0] || {
      periodNumber: 1,
      label: '第1期',
      key: 'period-1',
      startDate: '2024-04-01',
      endDate: '2025-03-31',
      startMonth: '2024-04',
      endMonth: '2025-03',
      months: ['2024-04', '2024-05', '2024-06', '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12', '2025-01', '2025-02', '2025-03'],
    };
  }, [selectedFilter, fiscalPeriods]);

  // Selected Month within current period
  const [activeMonth, setActiveMonth] = useState<string>(() => {
    if (selectedFilter && !selectedFilter.startsWith('period-') && selectedFilter !== 'ALL') {
      return selectedFilter;
    }
    if (currentPeriod?.months?.length > 0) {
      const thisMonth = new Date().toISOString().substring(0, 7);
      if (currentPeriod.months.includes(thisMonth)) return thisMonth;
      return currentPeriod.months[currentPeriod.months.length - 1] || '2025-08';
    }
    return '2025-08';
  });

  // Keep activeMonth in sync when period changes
  React.useEffect(() => {
    if (currentPeriod?.months?.length > 0 && !currentPeriod.months.includes(activeMonth)) {
      setActiveMonth(currentPeriod.months[0]);
    }
  }, [currentPeriod, activeMonth]);

  // When selectedFilter changes from external props (e.g. navbar or other tab)
  React.useEffect(() => {
    if (selectedFilter && !selectedFilter.startsWith('period-') && selectedFilter !== 'ALL' && selectedFilter !== activeMonth) {
      setActiveMonth(selectedFilter);
    }
  }, [selectedFilter]);

  const handleMonthSelect = (m: string) => {
    setActiveMonth(m);
    setShowMinimapBreakdown(true);
    onSelectFilter(m);
  };

  const handlePeriodSelect = (periodKey: string) => {
    onSelectFilter(periodKey);
    const target = fiscalPeriods.find(p => p.key === periodKey);
    if (target && target.months.length > 0) {
      setActiveMonth(target.months[0]);
    }
  };

  // Previous & Next months
  const prevMonth = useMemo(() => getPreviousMonth(activeMonth), [activeMonth]);
  const nextMonth = useMemo(() => getNextMonth(activeMonth), [activeMonth]);

  // Helper to get employees for a specific month (from snapshots, fallback to current settings)
  const getEmployeesForMonth = (targetMonth: string): SalaryEmployee[] => {
    if (settings.monthlySalarySnapshots && settings.monthlySalarySnapshots[targetMonth]) {
      return settings.monthlySalarySnapshots[targetMonth];
    }
    return settings.salaryEmployees || [];
  };

  // Employees for current activeMonth
  const employees = useMemo(() => {
    return getEmployeesForMonth(activeMonth);
  }, [settings.monthlySalarySnapshots, settings.salaryEmployees, activeMonth]);

  const salarySettings = useMemo(() => settings.salarySettings || DEFAULT_SALARY_SETTINGS, [settings.salarySettings]);

  // Monthly totals for 12-month progress minimap
  const salaryMonthTotals = useMemo(() => {
    const totals: Record<string, { total: number; isRegistered: boolean; count: number }> = {};
    currentPeriod.months.forEach((m) => {
      // 1. Transactions matching salary
      const txs = transactions.filter(
        (t) =>
          t.type === 'expense' &&
          (t.category === '役員報酬' || t.category === '給料手当') &&
          ((t.date_from && t.date_from.startsWith(m)) || (t.date_to && t.date_to.startsWith(m)))
      );
      const isRegistered = txs.length > 0;
      let total = txs.reduce((acc, t) => acc + (t.amount || 0), 0);

      // If no transaction yet, calculate from snapshot if available
      if (total === 0 && settings.monthlySalarySnapshots && settings.monthlySalarySnapshots[m]) {
        const snap = settings.monthlySalarySnapshots[m];
        const res = snap.map(emp => calculateEmployeeSalary(emp, salarySettings));
        const sum = calculateTotalSalarySummary(res);
        total = sum.totalGross;
      }

      totals[m] = { total, isRegistered, count: txs.length };
    });
    return totals;
  }, [currentPeriod.months, transactions, settings.monthlySalarySnapshots, salarySettings]);

  // Save employees wrapper that persists to both activeMonth snapshot and global settings
  const saveEmployees = (updated: SalaryEmployee[]) => {
    onSaveSalaryEmployees(updated, activeMonth);
  };

  // Modal / Editing states
  const [editingEmployee, setEditingEmployee] = useState<SalaryEmployee | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copySourceMonth, setCopySourceMonth] = useState<string>(prevMonth);
  const [activeTabSubView, setActiveTabSubView] = useState<'cards' | 'table'>('cards');
  const [storeFilter, setStoreFilter] = useState<string>('ALL');

  // Toggle for Pattern B minimap constituent cards breakdown
  const [showMinimapBreakdown, setShowMinimapBreakdown] = useState<boolean>(true);

  // Closed stores list
  const closedStores = settings.closedStores || [];
  const openStores = useMemo(() => {
    return (settings.stores || []).filter(s => !closedStores.includes(s));
  }, [settings.stores, closedStores]);

  // Calculate salary for each employee
  const calculationResults = useMemo(() => {
    return employees.map(emp => calculateEmployeeSalary(emp, salarySettings));
  }, [employees, salarySettings]);

  // Total Summary
  const summary = useMemo(() => {
    return calculateTotalSalarySummary(calculationResults);
  }, [calculationResults]);

  // Filtered results by store
  const filteredResults = useMemo(() => {
    if (storeFilter === 'ALL') return calculationResults;
    return calculationResults.filter(r => r.employee.store === storeFilter);
  }, [calculationResults, storeFilter]);

  // Check if current month already has salary or statutory welfare registered
  const monthRegistrationStatus = useMemo(() => {
    const monthPrefix = activeMonth;
    const salaryTx = transactions.filter(t => 
      t.type === 'expense' && 
      (t.category === '役員報酬' || t.category === '給料手当') &&
      ((t.date_from && t.date_from.startsWith(monthPrefix)) || (t.date_to && t.date_to.startsWith(monthPrefix)))
    );
    const statutoryWelfareTx = transactions.filter(t =>
      t.type === 'expense' &&
      (t.category === '法定福利費' || t.description?.includes('社会保険') || t.description?.includes('預り金')) &&
      ((t.date_from && t.date_from.startsWith(monthPrefix)) || (t.date_to && t.date_to.startsWith(monthPrefix)))
    );

    return {
      isSalaryRegistered: salaryTx.length > 0,
      salaryTxCount: salaryTx.length,
      isMonthEndRegistered: statutoryWelfareTx.length > 0,
      monthEndTxCount: statutoryWelfareTx.length,
    };
  }, [transactions, activeMonth]);

  // Helper: toggle social insurance
  const handleToggleSocialInsurance = (empId: string) => {
    const updated = employees.map(emp => {
      if (emp.id === empId) {
        return { ...emp, hasSocialInsurance: !emp.hasSocialInsurance };
      }
      return emp;
    });
    saveEmployees(updated);
  };

  // Helper: toggle employment insurance
  const handleToggleEmploymentInsurance = (empId: string) => {
    const updated = employees.map(emp => {
      if (emp.id === empId) {
        return { ...emp, hasEmploymentInsurance: !emp.hasEmploymentInsurance };
      }
      return emp;
    });
    saveEmployees(updated);
  };

  // Helper: toggle employee type (役員報酬 ⇄ 給与)
  const handleToggleEmployeeType = (empId: string) => {
    const updated = employees.map(emp => {
      if (emp.id === empId) {
        const nextType = emp.type === 'executive' ? 'salary' : 'executive';
        // 役員報酬に切り替えた場合は原則雇用保険OFFを推奨
        const nextEmpInsurance = nextType === 'executive' ? false : emp.hasEmploymentInsurance;
        return { ...emp, type: nextType, hasEmploymentInsurance: nextEmpInsurance };
      }
      return emp;
    });
    saveEmployees(updated);
  };

  // Helper: toggle active
  const handleToggleActive = (empId: string) => {
    const updated = employees.map(emp => {
      if (emp.id === empId) {
        return { ...emp, isActive: !emp.isActive };
      }
      return emp;
    });
    saveEmployees(updated);
  };

  // Helper: update base salary
  const handleUpdateBaseSalary = (empId: string, val: number) => {
    const updated = employees.map(emp => {
      if (emp.id === empId) {
        return { ...emp, baseSalary: Math.max(0, val) };
      }
      return emp;
    });
    saveEmployees(updated);
  };

  // Helper: update resident tax
  const handleUpdateResidentTax = (empId: string, val: number) => {
    const updated = employees.map(emp => {
      if (emp.id === empId) {
        return { ...emp, residentTax: Math.max(0, val) };
      }
      return emp;
    });
    saveEmployees(updated);
  };

  // Helper: update dependents count (扶養親族数の安全な更新)
  const handleUpdateDependentsCount = (empId: string, count: number) => {
    const safeCount = Math.max(0, Math.min(15, isNaN(count) ? 0 : count));
    const updated = employees.map(emp => {
      if (emp.id === empId) {
        return { ...emp, dependentsCount: safeCount };
      }
      return emp;
    });
    saveEmployees(updated);
  };

  // Helper: duplicate employee
  const handleDuplicateEmployee = (emp: SalaryEmployee) => {
    const newEmp: SalaryEmployee = {
      ...emp,
      id: `emp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `${emp.name} (コピー)`,
    };
    saveEmployees([...employees, newEmp]);
  };

  // Helper: delete employee
  const handleDeleteEmployee = (empId: string) => {
    if (confirm(`メンバー「${employees.find(e => e.id === empId)?.name || '未選択'}」を削除してよろしいですか？`)) {
      const updated = employees.filter(e => e.id !== empId);
      saveEmployees(updated);
    }
  };

  // Helper: add allowance to employee
  const handleAddAllowance = (empId: string) => {
    const updated = employees.map(emp => {
      if (emp.id === empId) {
        const newAlw: SalaryAllowance = {
          id: `alw-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
          title: '手当',
          amount: 10000,
          isTaxable: true,
        };
        return { ...emp, allowances: [...(emp.allowances || []), newAlw] };
      }
      return emp;
    });
    saveEmployees(updated);
  };

  // Helper: update allowance
  const handleUpdateAllowance = (empId: string, alwId: string, field: 'title' | 'amount' | 'isTaxable', value: any) => {
    const updated = employees.map(emp => {
      if (emp.id === empId) {
        const alws = (emp.allowances || []).map(a => {
          if (a.id === alwId) {
            return { ...a, [field]: value };
          }
          return a;
        });
        return { ...emp, allowances: alws };
      }
      return emp;
    });
    saveEmployees(updated);
  };

  // Helper: remove allowance
  const handleRemoveAllowance = (empId: string, alwId: string) => {
    const updated = employees.map(emp => {
      if (emp.id === empId) {
        return { ...emp, allowances: (emp.allowances || []).filter(a => a.id !== alwId) };
      }
      return emp;
    });
    saveEmployees(updated);
  };

  // Helper: create new employee
  const handleCreateEmployee = () => {
    const newEmp: SalaryEmployee = {
      id: `emp-${Date.now()}`,
      name: '新規スタッフ',
      type: 'salary',
      store: openStores[0] || '全社共通',
      baseSalary: 250000,
      allowances: [],
      hasSocialInsurance: true,
      hasEmploymentInsurance: true,
      hasCareInsurance: false,
      dependentsCount: 0,
      residentTax: 0,
      isActive: true,
    };
    saveEmployees([...employees, newEmp]);
  };

  // Copy Feature: Copy from previous month
  const handleCopyFromPrevMonth = () => {
    const source = getEmployeesForMonth(prevMonth);
    if (!source || source.length === 0) {
      alert(`前月（${formatMonthLabel(prevMonth)}）の給与データが見つかりませんでした。`);
      return;
    }

    const prevResults = source.map(emp => calculateEmployeeSalary(emp, salarySettings));
    const prevSummary = calculateTotalSalarySummary(prevResults);

    const ok = confirm(
      `📋 【前月給与のコピー反映】\n\n` +
      `前月（${formatMonthLabel(prevMonth)}）の給与設定を、当月（${formatMonthLabel(activeMonth)}）へ丸ごとコピーしますか？\n\n` +
      `・対象人数: ${prevSummary.employeeCount}名 (役員${prevSummary.executiveCount}名、スタッフ${prevSummary.staffCount}名)\n` +
      `・当月総支給額（額面）: ¥${prevSummary.totalGross.toLocaleString()}\n` +
      `・手取り振込総額: ¥${prevSummary.totalNetSalary.toLocaleString()}\n\n` +
      `※現在の当月（${formatMonthLabel(activeMonth)}）の設定内容は上書きされます。`
    );

    if (ok) {
      const cloned: SalaryEmployee[] = JSON.parse(JSON.stringify(source));
      saveEmployees(cloned);
      alert(`✅ 前月（${formatMonthLabel(prevMonth)}）の給与設定を当月（${formatMonthLabel(activeMonth)}）にコピー反映しました！`);
    }
  };

  // Copy Feature: Execute copy from a specified month
  const handleExecuteCopyFromMonth = (sourceMonth: string) => {
    const source = getEmployeesForMonth(sourceMonth);
    if (!source || source.length === 0) {
      alert(`${formatMonthLabel(sourceMonth)}の給与データが見つかりませんでした。`);
      return;
    }

    const srcResults = source.map(emp => calculateEmployeeSalary(emp, salarySettings));
    const srcSummary = calculateTotalSalarySummary(srcResults);

    const ok = confirm(
      `📋 【指定月給与のコピー反映】\n\n` +
      `${formatMonthLabel(sourceMonth)}の給与設定を、当月（${formatMonthLabel(activeMonth)}）へコピーしますか？\n\n` +
      `・対象人数: ${srcSummary.employeeCount}名 (役員${srcSummary.executiveCount}名、スタッフ${srcSummary.staffCount}名)\n` +
      `・総支給額: ¥${srcSummary.totalGross.toLocaleString()}\n` +
      `・手取り振込計: ¥${srcSummary.totalNetSalary.toLocaleString()}`
    );

    if (ok) {
      const cloned: SalaryEmployee[] = JSON.parse(JSON.stringify(source));
      saveEmployees(cloned);
      setIsCopyModalOpen(false);
      alert(`✅ ${formatMonthLabel(sourceMonth)}の給与設定を当月（${formatMonthLabel(activeMonth)}）にコピー反映しました！`);
    }
  };

  // Copy Feature: Quick register same as previous month to transactions
  const handleRegisterSameAsPrevMonth = () => {
    const source = getEmployeesForMonth(prevMonth);
    if (!source || source.length === 0) {
      alert(`前月（${formatMonthLabel(prevMonth)}）の給与データが見つかりませんでした。`);
      return;
    }

    const results = source.map(emp => calculateEmployeeSalary(emp, salarySettings));
    const prevSummary = calculateTotalSalarySummary(results);

    const ok = confirm(
      `⚡ 【前月と同額で一発計上】\n\n` +
      `前月（${formatMonthLabel(prevMonth)}）と全く同じ給与・社保内容で、当月（${formatMonthLabel(activeMonth)}）の取引データに一括登録しますか？\n\n` +
      `【支給日(${salarySettings.payDay}日)の計上】\n` +
      `・役員報酬: ¥${prevSummary.totalExecutiveRemuneration.toLocaleString()} (${prevSummary.executiveCount}名)\n` +
      `・給料手当: ¥${prevSummary.totalStaffSalary.toLocaleString()} (${prevSummary.staffCount}名)\n` +
      `・手取り振込計: ¥${prevSummary.totalNetSalary.toLocaleString()}\n\n` +
      `【末日の納付計上】\n` +
      `・月末にまとめて払うもの（社保労使計＋税金）: ¥${prevSummary.monthEndSummary.totalMonthEndPayment.toLocaleString()}\n\n` +
      `よろしければ「OK」を押してください。`
    );

    if (ok) {
      // 1. 当月スナップショットにも確実に保存
      const cloned: SalaryEmployee[] = JSON.parse(JSON.stringify(source));
      saveEmployees(cloned);

      // 2. 取引データへ登録実行
      const [yearStr, monthStr] = activeMonth.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const payDay = salarySettings.payDay || 25;
      const payDate = `${activeMonth}-${String(payDay).padStart(2, '0')}`;
      const lastDay = new Date(year, month, 0).getDate();
      const monthEndDate = `${activeMonth}-${String(lastDay).padStart(2, '0')}`;

      onRegisterSalaryToTransactions({
        targetMonth: activeMonth,
        payDate,
        monthEndDate,
        summary: prevSummary,
        results,
      });
    }
  };

  // Trigger: Register to Transactions
  const handleExecuteRegistration = () => {
    const [yearStr, monthStr] = activeMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const payDay = salarySettings.payDay || 25;
    const payDate = `${activeMonth}-${String(payDay).padStart(2, '0')}`;
    
    // Month-end date calculation
    const lastDay = new Date(year, month, 0).getDate();
    const monthEndDate = `${activeMonth}-${String(lastDay).padStart(2, '0')}`;

    onRegisterSalaryToTransactions({
      targetMonth: activeMonth,
      payDate,
      monthEndDate,
      summary,
      results: calculationResults,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card: Title & Fiscal Period Selector (Matched to Sales Card & Expense Card) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  給与・役員報酬
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  社保・雇用保険自動計算
                </span>
              </div>
              <h1 className="text-base font-bold text-slate-900">
                給与・役員報酬と月末支払い
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                基本給・手当から社保・雇用保険・税金を自動計算し、会社負担分を合算して末の支払いに自動連動します
              </p>
            </div>
          </div>
        </div>

        {/* Fiscal Period Switcher & Action Controls */}
        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Period Selector */}
          <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-200">
            <Calendar className="w-3.5 h-3.5 text-gray-500 ml-1.5" />
            <select
              value={selectedFilter.startsWith('period-') ? selectedFilter : currentPeriod?.key || 'period-1'}
              onChange={(e) => handlePeriodSelect(e.target.value)}
              className="text-xs font-bold bg-transparent text-gray-800 focus:outline-hidden pr-2 py-1 cursor-pointer"
            >
              {fiscalPeriods.map(p => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* SubView Switcher (Cards vs Table) */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setActiveTabSubView('cards')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTabSubView === 'cards'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-emerald-600" />
              <span>カード</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTabSubView('table')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTabSubView === 'table'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-3.5 h-3.5 text-emerald-600" />
              <span>台帳</span>
            </button>
          </div>

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-gray-600" />
            <span>設定</span>
          </button>

          {/* Add Employee Button */}
          <button
            type="button"
            onClick={handleCreateEmployee}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>メンバー追加</span>
          </button>
        </div>
      </div>

      {/* 12-Month Selector Pill Strip (Progress Tracker) - Matched to Sales Card */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-200/80 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-gray-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            {currentPeriod.label} 月別進捗ミニマップ (対象月を選択):
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500 font-medium hidden sm:inline">
              緑 = 給与計上済 / 灰 = 未計上
            </span>
            <button
              type="button"
              onClick={() => setShowMinimapBreakdown(!showMinimapBreakdown)}
              className="px-2 py-0.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>{showMinimapBreakdown ? '内訳カードを閉じる' : '内訳カードを表示'}</span>
            </button>
          </div>
        </div>

        {/* 12 Month Pills Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
          {currentPeriod.months.map(m => {
            const [, monthNum] = m.split('-');
            const monthData = salaryMonthTotals[m] || { total: 0, isRegistered: false, count: 0 };
            const isSelected = activeMonth === m;
            const hasRegisteredTx = monthData.isRegistered;

            return (
              <button
                key={m}
                type="button"
                onClick={() => handleMonthSelect(m)}
                className={`py-2 px-1.5 rounded-xl text-center transition-all flex flex-col items-center justify-center border relative cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-emerald-500 bg-emerald-50/90 border-emerald-500 shadow-xs'
                    : hasRegisteredTx
                    ? 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-100/50'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              >
                <span className={`text-xs font-black font-mono ${isSelected ? 'text-emerald-950' : 'text-gray-800'}`}>
                  {parseInt(monthNum, 10)}月
                </span>

                <span className="text-[10px] font-bold font-mono text-gray-500">
                  {monthData.total > 0 ? `¥${Math.round(monthData.total / 10000)}万` : '-'}
                </span>

                <div className="flex items-center gap-1 mt-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      hasRegisteredTx ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}
                  />
                  <span className="text-[9px] font-mono text-gray-400">
                    {hasRegisteredTx ? '計上済' : '未'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pattern B: Minimap Constituent Cards Breakdown */}
      <SalaryMinimapBreakdown
        activeMonth={activeMonth}
        calculationResults={calculationResults}
        summary={summary}
        isRegistered={monthRegistrationStatus.isSalaryRegistered}
        salaryTxCount={monthRegistrationStatus.salaryTxCount}
        transactions={transactions}
        isOpen={showMinimapBreakdown}
        onToggle={() => setShowMinimapBreakdown(!showMinimapBreakdown)}
        onEditEmployee={(emp) => setEditingEmployee(emp)}
      />

      {/* Clean Unified Action Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200">
            {formatMonthLabel(activeMonth)} 給与・報酬
          </span>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>経費カード＆出納帳へ自動連動中</span>
          </span>

          {monthRegistrationStatus.isSalaryRegistered && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-semibold rounded-md">
              <Check className="w-3 h-3 text-emerald-700" />
              出納帳 計上済
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyFromPrevMonth}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            title={`前月（${formatMonthLabel(prevMonth)}）のメンバー・給料・手当を当月にコピー`}
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            <span>前月（{formatMonthLabel(prevMonth)}）コピー</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCopyModalOpen(true)}
            className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 text-xs font-medium rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
            title="過去の任意の月から選んでコピー"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>他月からコピー...</span>
          </button>

          <button
            type="button"
            onClick={handleExecuteRegistration}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="出納帳・経費取引データを今すぐ最新内容で再反映"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>出納帳へ再反映</span>
          </button>
        </div>
      </div>

      {/* Hero Financial KPI Summary Board (The Core Value!) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. 総支給額 (額面人件費) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-indigo-600" />
              当月 総支給額（額面）
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">
              {summary.employeeCount}名
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight font-mono">
              ¥{summary.totalGross.toLocaleString()}
            </div>
            <div className="mt-2 text-[11px] text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
              <span>役員報酬: <strong className="text-gray-800 font-mono">¥{summary.totalExecutiveRemuneration.toLocaleString()}</strong> ({summary.executiveCount}名)</span>
              <span>給料手当: <strong className="text-gray-800 font-mono">¥{summary.totalStaffSalary.toLocaleString()}</strong> ({summary.staffCount}名)</span>
            </div>
          </div>
        </div>

        {/* 2. 手取り振込総額 (25日支給) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200/80 shadow-2xs relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
              <Send className="w-4 h-4 text-emerald-600" />
              毎月{salarySettings.payDay}日 手取り振込総額
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
              手取り
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight font-mono">
              ¥{summary.totalNetSalary.toLocaleString()}
            </div>
            <div className="mt-2 text-[11px] text-gray-500">
              控除（天引き預り金）合計: <strong className="text-rose-600 font-mono">¥{summary.totalDeductions.toLocaleString()}</strong>
            </div>
          </div>
        </div>

        {/* 3. 会社負担 法定福利費 */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-blue-200/80 shadow-2xs relative overflow-hidden bg-gradient-to-br from-white to-blue-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              会社負担 法定福利費
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-md">
              会社負担
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-blue-700 tracking-tight font-mono">
              ¥{summary.totalCompanyStatutoryWelfare.toLocaleString()}
            </div>
            <div className="mt-2 text-[11px] text-gray-500 flex flex-col gap-0.5">
              <span>社保(健保・厚年等): <strong className="text-gray-800 font-mono">¥{summary.totalCompanySocialInsurance.toLocaleString()}</strong></span>
              <span>雇用保険会社分: <strong className="text-gray-800 font-mono">¥{summary.totalCompanyEmploymentInsurance.toLocaleString()}</strong></span>
            </div>
          </div>
        </div>

        {/* 4. 【ユーザーの超重要要望】末にまとめて払うもの（社保納付＋預り金） */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-rose-300 shadow-sm relative overflow-hidden bg-gradient-to-br from-white via-rose-50/20 to-rose-100/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-rose-800 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-rose-600" />
              末にまとめて払うもの（月末納付）
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 bg-rose-600 text-white rounded-full animate-pulse">
              自動合算
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-rose-700 tracking-tight font-mono">
              ¥{summary.monthEndSummary.totalMonthEndPayment.toLocaleString()}
            </div>
            <div className="mt-2 text-[11px] text-gray-600 leading-relaxed">
              社保納付(本人+会社): <strong className="text-rose-700 font-mono">¥{summary.monthEndSummary.socialInsurancePayment.toLocaleString()}</strong><br />
              源泉税+住民税: <strong className="text-gray-800 font-mono">¥{(summary.monthEndSummary.withholdingTaxPayment + summary.monthEndSummary.residentTaxPayment).toLocaleString()}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & View Mode Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200/80">
        {/* Store filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500">店舗絞り込み:</span>
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-800 focus:outline-hidden"
          >
            <option value="ALL">すべての店舗・全社 ({employees.length}名)</option>
            {settings.stores.map(store => (
              <option key={store} value={store}>
                {store} ({employees.filter(e => e.store === store).length}名)
              </option>
            ))}
          </select>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTabSubView('cards')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
              activeTabSubView === 'cards'
                ? 'bg-white text-gray-900 shadow-2xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            カード表示
          </button>
          <button
            type="button"
            onClick={() => setActiveTabSubView('table')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
              activeTabSubView === 'table'
                ? 'bg-white text-gray-900 shadow-2xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            台帳テーブル
          </button>
        </div>
      </div>

      {/* Employee Cards Grid View */}
      {activeTabSubView === 'cards' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredResults.map((result) => {
            const emp = result.employee;
            const isExecutive = emp.type === 'executive';

            return (
              <div
                key={emp.id}
                className={`bg-white rounded-2xl border transition-all duration-200 shadow-2xs overflow-hidden ${
                  !emp.isActive
                    ? 'opacity-60 border-gray-200 bg-gray-50/50'
                    : isExecutive
                    ? 'border-indigo-200/90 ring-1 ring-indigo-50'
                    : 'border-gray-200/90 hover:border-gray-300'
                }`}
              >
                {/* Card Top Header */}
                <div className={`px-4 py-3 border-b flex items-center justify-between ${
                  isExecutive ? 'bg-indigo-50/70 border-indigo-100' : 'bg-slate-50/80 border-gray-100'
                }`}>
                  <div className="flex items-center gap-2.5">
                    {/* Active toggle check */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(emp.id)}
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                        emp.isActive ? 'bg-emerald-600 text-white' : 'border border-gray-300 bg-white text-transparent'
                      }`}
                      title={emp.isActive ? '現在在籍中（クリックで休職/除外）' : '休職/除外中（クリックで在籍へ）'}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900 text-base">
                          {emp.name}
                        </span>
                        
                        {/* 名目切替スイッチ（役員報酬 ⇄ 給料手当） */}
                        <button
                          type="button"
                          onClick={() => handleToggleEmployeeType(emp.id)}
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition-all cursor-pointer border ${
                            isExecutive
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs hover:bg-indigo-700'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                          }`}
                          title="クリックで「役員報酬」と「給与（給料手当）」をワンタップ切替"
                        >
                          {isExecutive ? '💼 役員報酬' : '👤 給与 (給料手当)'}
                        </button>

                        <span className="text-[10px] text-gray-500 bg-white border border-gray-200 rounded px-1.5 py-0.5">
                          {emp.store}
                        </span>
                      </div>
                      {emp.memo && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{emp.memo}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDuplicateEmployee(emp)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                      title="このメンバーを複製"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEmployee(emp.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-4">
                  {/* Section 1: 支給項目（基本給 ＋ 各種手当） */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-amber-600" />
                        支給項目（額面）
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddAllowance(emp.id)}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        手当を追加
                      </button>
                    </div>

                    <div className="space-y-2 bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                      {/* 基本給 */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-gray-700">
                          {isExecutive ? '報酬月額（役員報酬）' : '基本給'}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">¥</span>
                          <input
                            type="number"
                            step="1000"
                            value={emp.baseSalary || 0}
                            onChange={(e) => handleUpdateBaseSalary(emp.id, Number(e.target.value))}
                            className="w-28 text-right text-xs font-bold font-mono bg-white border border-gray-200 rounded-md px-2 py-1 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      {/* 手当一覧 */}
                      {(emp.allowances || []).map((alw) => (
                        <div key={alw.id} className="flex items-center justify-between gap-2 pt-1 border-t border-gray-200/60">
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              type="text"
                              value={alw.title}
                              onChange={(e) => handleUpdateAllowance(emp.id, alw.id, 'title', e.target.value)}
                              placeholder="手当名"
                              className="text-xs font-medium text-gray-700 bg-transparent border-b border-dashed border-gray-300 px-1 py-0.5 w-24 focus:outline-hidden"
                            />
                            <label className="text-[10px] text-gray-400 flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={alw.isTaxable !== false}
                                onChange={(e) => handleUpdateAllowance(emp.id, alw.id, 'isTaxable', e.target.checked)}
                                className="rounded text-indigo-600"
                              />
                              課税
                            </label>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400">¥</span>
                            <input
                              type="number"
                              step="500"
                              value={alw.amount || 0}
                              onChange={(e) => handleUpdateAllowance(emp.id, alw.id, 'amount', Number(e.target.value))}
                              className="w-24 text-right text-xs font-bold font-mono bg-white border border-gray-200 rounded-md px-2 py-1 focus:outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveAllowance(emp.id, alw.id)}
                              className="text-gray-400 hover:text-rose-500 p-0.5 ml-0.5"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* 総支給額小計 */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-xs">
                        <span className="font-bold text-gray-700">総支給額 (額面合計)</span>
                        <span className="font-black text-indigo-900 font-mono text-sm">
                          ¥{result.grossSalary.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: 保険・控除オンオフスイッチ群（超重要！） */}
                  <div>
                    <span className="text-xs font-bold text-gray-600 block mb-2">
                      保険加入・控除設定（オン/オフ切替）
                    </span>

                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-gray-100">
                      {/* 社保オンオフ */}
                      <button
                        type="button"
                        onClick={() => handleToggleSocialInsurance(emp.id)}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex items-start justify-between ${
                          emp.hasSocialInsurance
                            ? 'bg-blue-50/80 border-blue-200 text-blue-950'
                            : 'bg-white border-gray-200 text-gray-400'
                        }`}
                      >
                        <div>
                          <div className="text-[11px] font-bold flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${emp.hasSocialInsurance ? 'bg-blue-600' : 'bg-gray-300'}`} />
                            社会保険（健保・厚年）
                          </div>
                          <span className="text-[10px] block mt-0.5 text-gray-500">
                            {emp.hasSocialInsurance ? '加入中 (折半自動計算)' : '未加入 (0円)'}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          emp.hasSocialInsurance ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {emp.hasSocialInsurance ? 'ON' : 'OFF'}
                        </span>
                      </button>

                      {/* 雇用保険オンオフ */}
                      <button
                        type="button"
                        onClick={() => handleToggleEmploymentInsurance(emp.id)}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex items-start justify-between ${
                          emp.hasEmploymentInsurance
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                            : 'bg-white border-gray-200 text-gray-400'
                        }`}
                      >
                        <div>
                          <div className="text-[11px] font-bold flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${emp.hasEmploymentInsurance ? 'bg-emerald-600' : 'bg-gray-300'}`} />
                            雇用保険
                          </div>
                          <span className="text-[10px] block mt-0.5 text-gray-500">
                            {emp.hasEmploymentInsurance ? '加入中 (6/1000)' : isExecutive ? '役員除外 (0円)' : '未加入 (0円)'}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          emp.hasEmploymentInsurance ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {emp.hasEmploymentInsurance ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    </div>

                    {/* 扶養人数と住民税入力 */}
                    <div className="flex items-center justify-between gap-3 mt-2 text-xs">
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <span className="font-medium">扶養親族:</span>
                        <div className="inline-flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleUpdateDependentsCount(emp.id, (emp.dependentsCount || 0) - 1)}
                            disabled={(emp.dependentsCount || 0) <= 0}
                            className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-25 disabled:pointer-events-none text-gray-700 font-bold transition-colors cursor-pointer text-xs"
                            title="扶養人数を減らす"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min="0"
                            max="15"
                            value={emp.dependentsCount ?? 0}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const parsed = parseInt(e.target.value, 10);
                              handleUpdateDependentsCount(emp.id, isNaN(parsed) ? 0 : parsed);
                            }}
                            className="w-9 text-center text-xs font-black bg-transparent focus:outline-hidden py-0.5"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateDependentsCount(emp.id, (emp.dependentsCount || 0) + 1)}
                            className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors cursor-pointer text-xs"
                            title="扶養人数を増やす"
                          >
                            ＋
                          </button>
                        </div>
                        <span className="text-[11px] text-gray-500 font-medium">名</span>
                      </div>

                      <div className="flex items-center gap-1 text-gray-600">
                        <span className="font-medium">住民税:</span>
                        <span className="text-gray-400">¥</span>
                        <input
                          type="number"
                          step="100"
                          value={emp.residentTax || 0}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleUpdateResidentTax(emp.id, Number(e.target.value))}
                          className="w-20 text-right text-xs font-bold font-mono bg-white border border-gray-200 rounded px-1.5 py-0.5 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: 自動計算結果 (本人控除 & 手取り) */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-200/70 space-y-1.5 text-xs">
                    <div className="font-bold text-gray-700 flex items-center justify-between pb-1 border-b border-gray-200">
                      <span>本人控除（天引き預り金）の内訳</span>
                      <span className="text-rose-600 font-mono font-bold">
                        -¥{result.totalDeductions.toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-gray-600 pt-0.5">
                      <div className="flex justify-between">
                        <span>健保・厚年本人:</span>
                        <span className="font-mono">¥{result.socialInsuranceTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>雇用保険本人:</span>
                        <span className="font-mono">¥{result.employmentInsurance.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>源泉所得税:</span>
                        <span className="font-mono">¥{result.incomeTax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>住民税:</span>
                        <span className="font-mono">¥{result.residentTax.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* 手取り支給額（ハイライト） */}
                    <div className="pt-2 border-t border-gray-200 flex items-center justify-between bg-emerald-50/80 -mx-3 -mb-3 p-3 rounded-b-xl">
                      <span className="font-bold text-emerald-900 text-xs">
                        差引手取額（振込金額）
                      </span>
                      <span className="font-black text-emerald-700 font-mono text-base sm:text-lg">
                        ¥{result.netSalary.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Section 4: 会社負担 & 月末の支払いへの合算情報 */}
                  <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-200/80 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-900 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-rose-600" />
                        このメンバーの月末納付額 (末の支払い)
                      </span>
                      <span className="font-black text-rose-700 font-mono text-sm">
                        ¥{result.monthEndPaymentTotal.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[10px] text-rose-600 leading-tight">
                      内訳: 社保納付(本人+会社) ¥{(result.socialInsuranceTotal + result.companySocialInsuranceTotal).toLocaleString()} / 雇用保険会社 ¥{result.companyEmploymentInsurance.toLocaleString()} / 税金 ¥{(result.incomeTax + result.residentTax).toLocaleString()}
                    </p>
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-rose-200/60 text-gray-600">
                      <span>会社の真の総コスト（給与＋会社負担社保）:</span>
                      <strong className="font-mono text-gray-900">¥{result.totalCompanyCost.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto shadow-2xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
              <tr>
                <th className="p-3">メンバー / 店舗</th>
                <th className="p-3">区分</th>
                <th className="p-3 text-right">基本給</th>
                <th className="p-3 text-right">手当計</th>
                <th className="p-3 text-right">総支給額</th>
                <th className="p-3 text-center">扶養親族</th>
                <th className="p-3 text-center">社保</th>
                <th className="p-3 text-center">雇保</th>
                <th className="p-3 text-right">控除合計</th>
                <th className="p-3 text-right text-emerald-800 bg-emerald-50/60 font-black">手取り振込額</th>
                <th className="p-3 text-right text-blue-800">会社負担法定福利</th>
                <th className="p-3 text-right text-rose-800 bg-rose-50/60 font-black">月末納付額</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredResults.map(r => (
                <tr key={r.employee.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="p-3">
                    <span className="font-bold text-gray-900 block">{r.employee.name}</span>
                    <span className="text-[10px] text-gray-400">{r.employee.store}</span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      r.employee.type === 'executive' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {r.employee.type === 'executive' ? '役員報酬' : '給与'}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold">¥{r.totalBase.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono">¥{r.totalAllowances.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono font-bold text-gray-900">¥{r.grossSalary.toLocaleString()}</td>
                  <td className="p-3 text-center">
                    <div className="inline-flex items-center bg-gray-50 border border-gray-200 rounded-md overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleUpdateDependentsCount(r.employee.id, (r.employee.dependentsCount || 0) - 1)}
                        disabled={(r.employee.dependentsCount || 0) <= 0}
                        className="px-1.5 py-0.5 text-[10px] bg-white hover:bg-gray-100 disabled:opacity-20 text-gray-700 font-bold"
                        title="減らす"
                      >
                        −
                      </button>
                      <span className="w-5 text-center font-mono font-black text-xs text-gray-800">
                        {r.employee.dependentsCount || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateDependentsCount(r.employee.id, (r.employee.dependentsCount || 0) + 1)}
                        className="px-1.5 py-0.5 text-[10px] bg-white hover:bg-gray-100 text-gray-700 font-bold"
                        title="増やす"
                      >
                        ＋
                      </button>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      r.employee.hasSocialInsurance ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {r.employee.hasSocialInsurance ? 'ON' : 'OFF'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      r.employee.hasEmploymentInsurance ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {r.employee.hasEmploymentInsurance ? 'ON' : 'OFF'}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono text-rose-600">¥{r.totalDeductions.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono font-black text-emerald-700 bg-emerald-50/60">
                    ¥{r.netSalary.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-blue-700">
                    ¥{r.companyTotalStatutoryWelfare.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono font-black text-rose-700 bg-rose-50/60">
                    ¥{r.monthEndPaymentTotal.toLocaleString()}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDuplicateEmployee(r.employee)}
                        title="このメンバーを複製"
                        className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEmployee(r.employee.id)}
                        title="このメンバーを削除"
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                給与・社会保険料率・支給日設定
              </h3>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">毎月の給与振込日</label>
                <div className="flex items-center gap-2">
                  <span>毎月</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={salarySettings.payDay}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 25;
                      onSaveSalarySettings({ ...salarySettings, payDay: val });
                    }}
                    className="w-16 border rounded px-2 py-1 font-bold text-center"
                  />
                  <span>日振込（例: 25日、月末など）</span>
                </div>
              </div>

              <div className="border-t pt-3 space-y-2">
                <span className="font-bold text-gray-700 block">保険料率（労使折半分）</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-gray-500 block">健康保険 (本人折半):</span>
                    <input
                      type="number"
                      step="0.001"
                      value={salarySettings.healthInsuranceRate}
                      onChange={(e) => onSaveSalarySettings({ ...salarySettings, healthInsuranceRate: Number(e.target.value) })}
                      className="w-full border rounded px-2 py-1 font-mono"
                    />
                    <span className="text-[10px] text-gray-400">標準: 0.050 (5.0%)</span>
                  </div>

                  <div>
                    <span className="text-gray-500 block">厚生年金 (本人折半):</span>
                    <input
                      type="number"
                      step="0.001"
                      value={salarySettings.pensionRate}
                      onChange={(e) => onSaveSalarySettings({ ...salarySettings, pensionRate: Number(e.target.value) })}
                      className="w-full border rounded px-2 py-1 font-mono"
                    />
                    <span className="text-[10px] text-gray-400">標準: 0.0915 (9.15%)</span>
                  </div>

                  <div>
                    <span className="text-gray-500 block">雇用保険 (労働者本人):</span>
                    <input
                      type="number"
                      step="0.001"
                      value={salarySettings.empInsuranceEmployeeRate}
                      onChange={(e) => onSaveSalarySettings({ ...salarySettings, empInsuranceEmployeeRate: Number(e.target.value) })}
                      className="w-full border rounded px-2 py-1 font-mono"
                    />
                    <span className="text-[10px] text-gray-400">標準: 0.006 (0.6%)</span>
                  </div>

                  <div>
                    <span className="text-gray-500 block">雇用保険 (事業主会社負担):</span>
                    <input
                      type="number"
                      step="0.001"
                      value={salarySettings.empInsuranceCompanyRate}
                      onChange={(e) => onSaveSalarySettings({ ...salarySettings, empInsuranceCompanyRate: Number(e.target.value) })}
                      className="w-full border rounded px-2 py-1 font-mono"
                    />
                    <span className="text-[10px] text-gray-400">標準: 0.0095 (0.95%)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
              >
                設定を閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Salary From Other Month Modal */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    過去の月から給与設定をコピー
                  </h3>
                  <p className="text-xs text-slate-500">
                    指定した月の役員報酬・基本給・手当・社保設定を当月（{formatMonthLabel(activeMonth)}）へ複製します。
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Select Source Month */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                コピー元の給与月を選択:
              </label>
              <div className="relative">
                <select
                  value={copySourceMonth}
                  onChange={(e) => setCopySourceMonth(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {fiscalPeriods.map(period => (
                    <optgroup key={`copy-${period.key}`} label={period.label}>
                      {period.months.slice().sort().reverse().map(m => {
                        const hasSnap = Boolean(settings.monthlySalarySnapshots && settings.monthlySalarySnapshots[m]);
                        const isCurrent = m === activeMonth;
                        return (
                          <option key={`opt-${m}`} value={m} disabled={isCurrent}>
                            {formatMonthLabel(m)} 給与 {isCurrent ? '（※現在開いている月）' : hasSnap ? '★ 保存済データあり' : ''}
                          </option>
                        );
                      })}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview of the selected source month */}
            {(() => {
              const srcEmployees = getEmployeesForMonth(copySourceMonth);
              const srcResults = srcEmployees.map(emp => calculateEmployeeSalary(emp, salarySettings));
              const srcSummary = calculateTotalSalarySummary(srcResults);

              return (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <History className="w-4 h-4 text-emerald-600" />
                      {formatMonthLabel(copySourceMonth)} の登録データプレビュー
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                      対象: {srcSummary.employeeCount}名
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                      <span className="text-slate-400 block text-[10px]">総支給額（額面合計）</span>
                      <span className="font-mono font-black text-slate-900 text-sm">
                        ¥{srcSummary.totalGross.toLocaleString()}
                      </span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">
                        役員{srcSummary.executiveCount}名 / スタッフ{srcSummary.staffCount}名
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                      <span className="text-slate-400 block text-[10px]">手取り振込総額</span>
                      <span className="font-mono font-black text-emerald-700 text-sm">
                        ¥{srcSummary.totalNetSalary.toLocaleString()}
                      </span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">
                        月末納付計: ¥{srcSummary.monthEndSummary.totalMonthEndPayment.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Employee list preview */}
                  <div className="max-h-36 overflow-y-auto divide-y divide-slate-200/60 bg-white rounded-lg border border-slate-200/80 text-[11px]">
                    {srcEmployees.length === 0 ? (
                      <div className="p-3 text-slate-400 text-center">データがありません</div>
                    ) : (
                      srcEmployees.map(emp => (
                        <div key={emp.id} className="p-2 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-800">{emp.name}</span>
                            <span className="text-[10px] text-slate-400 ml-1.5">({emp.store})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              emp.type === 'executive' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {emp.type === 'executive' ? '役員' : '給与'}
                            </span>
                            <span className="font-mono font-bold text-slate-700">
                              ¥{(emp.baseSalary || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => handleExecuteCopyFromMonth(copySourceMonth)}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>この内容を当月（{formatMonthLabel(activeMonth)}）へコピー</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
