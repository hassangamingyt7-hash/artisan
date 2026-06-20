import React, { useState } from "react";
import TableActionControls, { exportToExcel, filterByDateRange } from "./TableActionControls.tsx";
import { Users, Plus, Search, Trash2, Edit3, Save, X, Activity } from "lucide-react";
import { Operator, Machine, DailyProduction } from "../types";

export default function OperatorPerformanceView({ 
  operators, machines, dailyProduction, userRole, onRefresh, 
  onAddOperator, onEditOperator, onDeleteOperator
}: any) {
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [dateFilter, setDateFilter] = useState("all");
  const [customDate, setCustomDate] = useState({ start: "", end: "" });
  const canModify = ["admin", "manager", "production manager", "accountant"].includes(userRole);

  const [showModal, setShowModal] = useState(false);
  const [editingOp, setEditingOp] = useState<Operator | null>(null);
  const [oName, setOName] = useState("");
  const [oMachineId, setOMachineId] = useState("");
  const [oBonusRate, setOBonusRate] = useState("");
  const [oBaseSalary, setOBaseSalary] = useState("");

  const handleOpenOp = (o?: Operator) => {
    if (o) {
      setEditingOp(o);
      setOName(o.name);
      setOMachineId(o.assigned_machine_id.toString());
      setOBonusRate(o.bonus_rate_per_unit.toString());
      setOBaseSalary(o.monthly_base_salary.toString());
    } else {
      setEditingOp(null);
      setOName(""); setOMachineId(""); setOBonusRate(""); setOBaseSalary("");
    }
    setShowModal(true);
  };

  const saveOp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const payload = { 
      name: oName, 
      assigned_machine_id: parseInt(oMachineId, 10), 
      bonus_rate_per_unit: parseFloat(oBonusRate), 
      monthly_base_salary: parseFloat(oBaseSalary) 
    };
    try {
      if (editingOp) await onEditOperator(editingOp.id, payload);
      else await onAddOperator(payload);
      await onRefresh();
      setShowModal(false);
      setIsSaving(false);
    } catch (e: any) { alert("Error: " + e.message); setIsSaving(false); }
  };

  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const calculateOpStats = (opId: number, baseRate: number, salary: number) => {
    const logs = dailyProduction.filter((p: any) => p.operator_id === opId);
    const totalProduced = logs.reduce((sum: number, p: any) => sum + p.quantity_produced, 0);
    const bonusEarned = totalProduced * baseRate;
    const totalPayable = salary + bonusEarned;
    return { totalProduced, bonusEarned, totalPayable };
  };

  // Export
  const exportExcel = () => {
    const csv = [
      ["Name", "Machine", "Bonus Rate", "Base Salary", "Total Produced", "Bonus Earned", "Total Payable"].join(","),
      ...operators.map((o: any) => {
        const stats = calculateOpStats(o.id, o.bonus_rate_per_unit, o.monthly_base_salary);
        return [
          o.name,
          machines.find((m: any) => m.id === o.assigned_machine_id)?.name || "N/A",
          o.bonus_rate_per_unit,
          o.monthly_base_salary,
          stats.totalProduced,
          stats.bonusEarned,
          stats.totalPayable
        ].join(",");
      })
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Operator_Performance.csv`;
    link.click();
  };

  const timeFiltered = filterByDateRange(operators, "created_at", dateFilter, customDate);
  const filtered = timeFiltered.filter((o: any) => o.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-fuchsia-600" />
            Operator Performance & Payroll
          </h2>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-lg border border-slate-200">
        <div className="relative flex-1 md:w-64 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-fuchsia-500" />
        </div>
        
        <button onClick={exportExcel} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm shrink-0">
          Export Excel
        </button>

        {canModify && (
          <button onClick={() => handleOpenOp()} className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2">
            <Plus className="w-4 h-4"/> Add Operator
          </button>
        )}
      </div>

       <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto shadow-sm">
         
        <TableActionControls 
          onPrint={() => window.print()} 
          onPdf={() => window.print()} 
          onExcel={() => exportToExcel(filtered, "operatorperformance")}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          customDateRange={customDate}
          setCustomDateRange={setCustomDate}
        />
        <table className="w-full text-left">
           <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
             <tr>
               <th className="py-3 px-4 font-semibold">Name</th>
               <th className="py-3 px-4 font-semibold">Machine</th>
               <th className="py-3 px-4 font-semibold text-right">Base Salary</th>
               <th className="py-3 px-4 font-semibold text-right">Bonus/Unit</th>
               <th className="py-3 px-4 font-semibold text-right">Production Volume</th>
               <th className="py-3 px-4 text-fuchsia-600 font-bold text-right">Total Payable</th>
               <th className="py-3 px-4 text-right font-semibold">Actions</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-slate-100 text-sm">
             {filtered.map((o: any) => {
               const stats = calculateOpStats(o.id, o.bonus_rate_per_unit, o.monthly_base_salary);
               const mObj = machines.find((m: any) => m.id === o.assigned_machine_id);
               return (
               <tr key={o.id} className="hover:bg-slate-50">
                 <td className="py-3 px-4 font-bold text-slate-800 uppercase">{o.name}</td>
                 <td className="py-3 px-4 text-slate-600">{mObj?.name || 'N/A'}</td>
                 <td className="py-3 px-4 text-right font-mono text-slate-600">{formatPKR(o.monthly_base_salary)}</td>
                 <td className="py-3 px-4 text-right font-mono text-slate-600">Rs. {o.bonus_rate_per_unit.toFixed(2)}</td>
                 <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">{stats.totalProduced.toLocaleString()}</td>
                 <td className="py-3 px-4 text-right font-mono font-black text-slate-900 bg-fuchsia-50/50">{formatPKR(stats.totalPayable)}</td>
                 <td className="py-3 px-4 text-right space-x-2">
                   <button onClick={() => handleOpenOp(o)} className="text-slate-400 hover:text-fuchsia-600 transition-colors"><Edit3 className="w-4 h-4 inline"/></button>
                   {userRole === "admin" && <button onClick={() => {if(window.confirm("Delete?")) { onDeleteOperator(o.id); onRefresh();
      setIsSaving(false); }}} className="text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4 inline"/></button>}
                 </td>
               </tr>
             )})}
           </tbody>
         </table>
       </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{editingOp ? "Edit Operator" : "Add Operator"}</h3>
            <form onSubmit={saveOp} className="space-y-4">
              <div><label className="block text-xs font-bold text-slate-500 mb-1">Name *</label><input required value={oName} onChange={e => setOName(e.target.value)} className="w-full border rounded p-2 text-sm uppercase font-bold" /></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1">Assigned Machine *</label><select required value={oMachineId} onChange={e => setOMachineId(e.target.value)} className="w-full border rounded p-2 text-sm"><option value="">Select...</option>{machines.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1">Monthly Base Salary *</label><input required type="number" step="0.01" value={oBaseSalary} onChange={e => setOBaseSalary(e.target.value)} className="w-full border rounded p-2 text-sm font-mono" /></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1">Bonus Rate (Per Unit Produced) *</label><input required type="number" step="0.01" value={oBonusRate} onChange={e => setOBonusRate(e.target.value)} className="w-full border rounded p-2 text-sm font-mono" /></div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-fuchsia-600 text-white rounded text-sm font-medium hover:bg-fuchsia-700 disabled:opacity-50 flex justify-center items-center gap-2">
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
