import React, { useState } from "react";
import { Settings, Plus, Search, Trash2, Edit3, Save, X, Activity } from "lucide-react";
import { Machine, Operator, DailyProduction } from "../types";

export default function MachineProductionView({ 
  machines, operators, dailyProduction, userRole, onRefresh, 
  onAddMachine, onEditMachine, onDeleteMachine,
  onAddProduction, onEditProduction, onDeleteProduction
}: any) {
  const [activeSubTab, setActiveSubTab] = useState<"machines" | "production">("production");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("All Time");
  const canModify = ["admin", "manager", "production manager", "operator"].includes(userRole);

  // Machine Modal
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [mName, setMName] = useState("");
  const [mNum, setMNum] = useState("");
  const [mType, setMType] = useState("");
  const [mStatus, setMStatus] = useState("Running");
  const [mDate, setMDate] = useState("");

  // Production Modal
  const [showProdModal, setShowProdModal] = useState(false);
  const [editingProd, setEditingProd] = useState<DailyProduction | null>(null);
  const [pDate, setPDate] = useState(new Date().toISOString().substring(0, 10));
  const [pMachineId, setPMachineId] = useState("");
  const [pOpId, setPOpId] = useState("");
  const [pBrand, setPBrand] = useState("");
  const [pDesign, setPDesign] = useState("");
  const [pQty, setPQty] = useState("");
  const [pHours, setPHours] = useState("");
  const [pRemarks, setPRemarks] = useState("");

  const handleOpenMachine = (m?: Machine) => {
    if (m) {
      setEditingMachine(m);
      setMName(m.name);
      setMNum(m.machine_number);
      setMType(m.machine_type);
      setMStatus(m.status);
      setMDate(m.installation_date || "");
    } else {
      setEditingMachine(null);
      setMName(""); setMNum(""); setMType(""); setMStatus("Running"); setMDate("");
    }
    setShowMachineModal(true);
  };

  const saveMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: mName, machine_number: mNum, machine_type: mType, status: mStatus, installation_date: mDate };
    try {
      if (editingMachine) await onEditMachine(editingMachine.id, payload);
      else await onAddMachine(payload);
      setShowMachineModal(false);
      onRefresh();
    } catch (e) { alert("Error saving machine"); }
  };

  const handleOpenProd = (p?: DailyProduction) => {
    if (p) {
      setEditingProd(p);
      setPDate(p.date); setPMachineId(p.machine_id.toString()); setPOpId(p.operator_id.toString());
      setPBrand(p.brand_name); setPDesign(p.design_name); setPQty(p.quantity_produced.toString());
      setPHours(p.working_hours.toString()); setPRemarks(p.remarks);
    } else {
      setEditingProd(null);
      setPDate(new Date().toISOString().substring(0, 10)); setPMachineId(""); setPOpId("");
      setPBrand(""); setPDesign(""); setPQty(""); setPHours(""); setPRemarks("");
    }
    setShowProdModal(true);
  };

  const saveProd = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { 
      date: pDate, machine_id: parseInt(pMachineId, 10), operator_id: parseInt(pOpId, 10),
      brand_name: pBrand, design_name: pDesign, quantity_produced: parseInt(pQty, 10),
      working_hours: parseFloat(pHours), remarks: pRemarks
    };
    try {
      if (editingProd) await onEditProduction(editingProd.id, payload);
      else await onAddProduction(payload);
      setShowProdModal(false);
      onRefresh();
    } catch (e) { alert("Error saving production log"); }
  };

  const exportExcel = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const keys = Object.keys(data[0]);
    const csv = [
      keys.join(","),
      ...data.map(row => keys.map(k => `"${(row[k] || "").toString().replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  // Filtering
  const filteredMachines = machines.filter((m: any) => m.name.toLowerCase().includes(search.toLowerCase()) || m.machine_number.toLowerCase().includes(search.toLowerCase()));
  const filteredProd = dailyProduction.filter((p: any) => {
    const mMatch = machines.find((m: any) => m.id === p.machine_id)?.name.toLowerCase().includes(search.toLowerCase());
    const match = mMatch || p.brand_name.toLowerCase().includes(search.toLowerCase()) || p.design_name.toLowerCase().includes(search.toLowerCase());
    
    // Simple date filter logic
    let dateMatch = true;
    const today = new Date();
    const todayStr = today.toISOString().substring(0, 10);
    
    if (dateFilter === "Today") dateMatch = p.date === todayStr;
    else if (dateFilter === "Yesterday") {
      const y = new Date(); y.setDate(today.getDate() - 1);
      dateMatch = p.date === y.toISOString().substring(0, 10);
    } else if (dateFilter === "This Week") {
      const w = new Date(); w.setDate(today.getDate() - 7);
      dateMatch = new Date(p.date) >= w;
    } else if (dateFilter === "This Month") {
      const m = new Date(); m.setMonth(today.getMonth() - 1);
      dateMatch = new Date(p.date) >= m;
    }
    
    return match && dateMatch;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-600" />
            Machine Production
          </h2>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button onClick={() => setActiveSubTab("production")} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-colors ${activeSubTab === "production" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Logs</button>
          <button onClick={() => setActiveSubTab("machines")} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-colors ${activeSubTab === "machines" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Machines</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-lg border border-slate-200">
        <div className="relative flex-1 md:w-64 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-indigo-500" />
        </div>
        
        {activeSubTab === "production" && (
          <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="border border-slate-200 rounded-md px-3 py-2 text-sm outline-none font-medium">
            <option>All Time</option>
            <option>Today</option>
            <option>Yesterday</option>
            <option>This Week</option>
            <option>This Month</option>
          </select>
        )}

        <button onClick={() => activeSubTab === "machines" ? exportExcel(filteredMachines, "Machines") : exportExcel(filteredProd, "Production_Logs")} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm shrink-0">
          Export Excel
        </button>

        {canModify && activeSubTab === "machines" && (
          <button onClick={() => handleOpenMachine()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2">
            <Plus className="w-4 h-4"/> Add Machine
          </button>
        )}
        {canModify && activeSubTab === "production" && (
          <button onClick={() => handleOpenProd()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2">
            <Plus className="w-4 h-4"/> Log Production
          </button>
        )}
      </div>

      {activeSubTab === "machines" ? (
         <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto shadow-sm">
           <table className="w-full text-left">
             <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
               <tr>
                 <th className="py-3 px-4 font-semibold">Name</th>
                 <th className="py-3 px-4 font-semibold">Number</th>
                 <th className="py-3 px-4 font-semibold">Type</th>
                 <th className="py-3 px-4 font-semibold">Status</th>
                 <th className="py-3 px-4 font-semibold">Installed</th>
                 <th className="py-3 px-4 text-right font-semibold">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100 text-sm">
               {filteredMachines.map(m => (
                 <tr key={m.id} className="hover:bg-slate-50">
                   <td className="py-3 px-4 font-bold text-slate-800">{m.name}</td>
                   <td className="py-3 px-4 font-mono">{m.machine_number}</td>
                   <td className="py-3 px-4 text-slate-600">{m.machine_type}</td>
                   <td className="py-3 px-4">
                     <span className={`px-2 py-1 rounded text-xs font-bold ${m.status === 'Running' ? 'bg-emerald-100 text-emerald-700' : m.status === 'Idle' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{m.status}</span>
                   </td>
                   <td className="py-3 px-4 text-slate-500">{m.installation_date}</td>
                   <td className="py-3 px-4 text-right space-x-2">
                     <button onClick={() => handleOpenMachine(m)} className="text-slate-400 hover:text-indigo-600 transition-colors"><Edit3 className="w-4 h-4 inline"/></button>
                     {userRole === "admin" && <button onClick={() => {if(window.confirm("Delete?")) { onDeleteMachine(m.id); onRefresh(); }}} className="text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4 inline"/></button>}
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
      ) : (
         <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto shadow-sm">
           <table className="w-full text-left">
             <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
               <tr>
                 <th className="py-3 px-4 font-semibold">Date</th>
                 <th className="py-3 px-4 font-semibold">Machine</th>
                 <th className="py-3 px-4 font-semibold">Brand / Design</th>
                 <th className="py-3 px-4 font-semibold text-right">Qty</th>
                 <th className="py-3 px-4 font-semibold text-right">Hours</th>
                 <th className="py-3 px-4 text-right font-semibold">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100 text-sm">
               {filteredProd.map(p => {
                 const mObj = machines.find((m: any) => m.id === p.machine_id);
                 return (
                 <tr key={p.id} className="hover:bg-slate-50">
                   <td className="py-3 px-4 font-medium text-slate-600">{p.date}</td>
                   <td className="py-3 px-4 font-bold text-slate-800">{mObj?.name || 'Unknown'}</td>
                   <td className="py-3 px-4 text-slate-600">
                     <span className="font-bold text-slate-800 uppercase">{p.brand_name}</span> <br/>
                     <span className="text-xs text-slate-400">{p.design_name}</span>
                   </td>
                   <td className="py-3 px-4 text-right font-mono font-bold">{p.quantity_produced.toLocaleString()}</td>
                   <td className="py-3 px-4 text-right font-mono text-slate-500">{p.working_hours} h</td>
                   <td className="py-3 px-4 text-right space-x-2">
                     <button onClick={() => handleOpenProd(p)} className="text-slate-400 hover:text-indigo-600 transition-colors"><Edit3 className="w-4 h-4 inline"/></button>
                     {userRole === "admin" && <button onClick={() => {if(window.confirm("Delete?")) { onDeleteProduction(p.id); onRefresh(); }}} className="text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4 inline"/></button>}
                   </td>
                 </tr>
               )})}
             </tbody>
           </table>
         </div>
      )}

      {/* Modals omitted for brevity - Standard form structures */}
      {showMachineModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{editingMachine ? "Edit Machine" : "Add Machine"}</h3>
            <form onSubmit={saveMachine} className="space-y-4">
              <div><label className="block text-xs font-bold text-slate-500 mb-1">Name</label><input required value={mName} onChange={e => setMName(e.target.value)} className="w-full border rounded p-2 text-sm" /></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1">Number</label><input required value={mNum} onChange={e => setMNum(e.target.value)} className="w-full border rounded p-2 text-sm" /></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1">Type</label><input required value={mType} onChange={e => setMType(e.target.value)} className="w-full border rounded p-2 text-sm" /></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1">Status</label><select value={mStatus} onChange={e => setMStatus(e.target.value)} className="w-full border rounded p-2 text-sm"><option value="Running">Running</option><option value="Idle">Idle</option><option value="Maintenance">Maintenance</option></select></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1">Install Date</label><input type="date" value={mDate} onChange={e => setMDate(e.target.value)} className="w-full border rounded p-2 text-sm" /></div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowMachineModal(false)} className="px-4 py-2 border rounded text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showProdModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{editingProd ? "Edit Production Log" : "Log Production"}</h3>
            <form onSubmit={saveProd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-500 mb-1">Date *</label><input required type="date" value={pDate} onChange={e => setPDate(e.target.value)} className="w-full border rounded p-2 text-sm" /></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">Machine *</label><select required value={pMachineId} onChange={e => setPMachineId(e.target.value)} className="w-full border rounded p-2 text-sm"><option value="">Select...</option>{machines.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">Operator *</label><select required value={pOpId} onChange={e => setPOpId(e.target.value)} className="w-full border rounded p-2 text-sm"><option value="">Select...</option>{operators.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">Brand *</label><input required value={pBrand} onChange={e => setPBrand(e.target.value)} className="w-full border rounded p-2 text-sm uppercase font-bold" /></div>
                <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1">Design *</label><input required value={pDesign} onChange={e => setPDesign(e.target.value)} className="w-full border rounded p-2 text-sm" /></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">Qty Produced *</label><input required type="number" value={pQty} onChange={e => setPQty(e.target.value)} className="w-full border rounded p-2 text-sm font-mono" /></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">Working Hours *</label><input required type="number" step="0.5" value={pHours} onChange={e => setPHours(e.target.value)} className="w-full border rounded p-2 text-sm font-mono" /></div>
                <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1">Remarks</label><input value={pRemarks} onChange={e => setPRemarks(e.target.value)} className="w-full border rounded p-2 text-sm" /></div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowProdModal(false)} className="px-4 py-2 border rounded text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700">Save Log</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
