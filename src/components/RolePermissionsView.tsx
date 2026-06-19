import React, { useState, useEffect } from "react";
import { ShieldCheck, Plus, Search, Trash2, Edit3, Save, X } from "lucide-react";

export default function RolePermissionsView({ 
  permissions, userRole, onRefresh, onSave, onUpdate 
}: any) {
  const isAdmin = userRole === "admin";
  const [editingRole, setEditingRole] = useState<any>(null);

  const modules = ["customers", "brands", "suppliers", "inventory", "ledger", "orders", "purchases", "machines", "operators", "expenses", "payments", "invoices", "reports"];
  
  const defaultMatrix = modules.reduce((acc: any, m: string) => {
    acc[m] = { view: true, add: false, edit: false, delete: false, print: false, export: false };
    return acc;
  }, {});

  const [roleName, setRoleName] = useState("");
  const [matrix, setMatrix] = useState<any>(JSON.parse(JSON.stringify(defaultMatrix)));

  useEffect(() => {
    if (editingRole) {
      setRoleName(editingRole.role_name);
      try {
        setMatrix(JSON.parse(editingRole.permissions_json));
      } catch (e) {
        setMatrix(JSON.parse(JSON.stringify(defaultMatrix)));
      }
    } else {
      setRoleName("");
      setMatrix(JSON.parse(JSON.stringify(defaultMatrix)));
    }
  }, [editingRole]);

  const handleToggle = (mod: string, perm: string) => {
    const updated = { ...matrix };
    if (!updated[mod]) updated[mod] = { view: true, add: false, edit: false, delete: false, print: false, export: false };
    updated[mod][perm] = !updated[mod][perm];
    setMatrix(updated);
  };

  const savePermissions = async () => {
    if (!roleName) return alert("Enter role name");
    const payload = { role_name: roleName, permissions_json: JSON.stringify(matrix) };
    try {
      if (editingRole) await onUpdate(editingRole.id, payload);
      else await onSave(payload);
      setEditingRole(null);
      onRefresh();
    } catch (e) { alert("Error saving permissions"); }
  };

  if (!isAdmin) {
    return <div className="p-10 flex justify-center"><p className="text-xl text-slate-400 font-bold">Only Super Admin can access this matrix.</p></div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            Roles & Custom Permissions Matrix
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Configure granular ERP access per role</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 bg-white border border-slate-200 rounded-lg p-4 shadow-sm h-fit">
          <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Custom Roles</h3>
          <ul className="space-y-2 mb-4">
            {permissions.map((p: any) => (
              <li key={p.id} className="flex items-center justify-between">
                <button onClick={() => setEditingRole(p)} className={`text-sm font-bold w-full text-left px-3 py-2 rounded transition-colors ${editingRole?.id === p.id ? "bg-emerald-50 text-emerald-700" : "hover:bg-slate-50 text-slate-700"}`}>
                  {p.role_name.toUpperCase()}
                </button>
              </li>
            ))}
          </ul>
          <button onClick={() => setEditingRole(null)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-colors">
            <Plus className="w-4 h-4"/> Create New Layout
          </button>
        </div>

        <div className="md:col-span-3 bg-white border border-slate-200 rounded-lg p-0 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 block sm:flex justify-between items-center gap-4 space-y-4 sm:space-y-0 text-sm font-bold text-slate-600 uppercase">
             <input disabled={editingRole !== null} value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="e.g. ACCOUNTANT" className="border border-slate-300 rounded px-3 py-2 w-full max-w-xs focus:border-emerald-500 outline-none" />
             <button onClick={savePermissions} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded shadow-sm">Save Rules</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-semibold text-slate-800">Module Access</th>
                  <th className="py-3 px-4 font-semibold text-center">View</th>
                  <th className="py-3 px-4 font-semibold text-center">Add</th>
                  <th className="py-3 px-4 font-semibold text-center">Edit</th>
                  <th className="py-3 px-4 font-semibold text-center">Delete</th>
                  <th className="py-3 px-4 font-semibold text-center">Print</th>
                  <th className="py-3 px-4 font-semibold text-center">Excel / PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {modules.map(mod => (
                  <tr key={mod} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 text-slate-600 capitalize">{mod}</td>
                    {(["view", "add", "edit", "delete", "print", "export"]).map(perm => (
                      <td key={perm} className="text-center py-2.5 px-4 cursor-pointer" onClick={() => handleToggle(mod, perm)}>
                        <input type="checkbox" checked={matrix[mod]?.[perm] || false} onChange={() => {}} className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
