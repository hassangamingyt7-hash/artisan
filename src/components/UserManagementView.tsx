import React, { useState, useEffect } from "react";
import { Users, Plus, Edit, Trash2, KeyRound } from "lucide-react";

// We will fetch users from /api/users
export default function UserManagementView({ userRole }: { userRole: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", username: "", password: "", role: "manager" });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("artisan_token");
      const res = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("artisan_token");
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        setNewUser({ name: "", email: "", username: "", password: "", role: "manager" });
        fetchUsers();
      } else {
        alert("Failed to create user. Ensure username is unique.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if(!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      const token = localStorage.getItem("artisan_token");
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (userRole !== "admin") {
    return <div className="p-8 text-red-500">Access Denied. Admins only.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-600" />
          Operator Access Management
        </h2>
        <p className="text-sm text-slate-500">Create software access for your clients. Each user has isolated multi-tenant data access.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <h3 className="font-semibold text-slate-800">Add New Operator (Tenant)</h3>
        </div>
        <div className="p-4">
          <form className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end" onSubmit={handleCreateUser}>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
              <input required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Ali Raza" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Login Username</label>
              <input required value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="ali123" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Password</label>
              <input required type="text" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Secret Key" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Role / Access</label>
              <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                <option value="manager">Tenant</option>
                <option value="admin">System Administrator</option>
              </select>
            </div>
            <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm flex justify-center items-center gap-2">
               <Plus className="w-4 h-4" /> Issue Access
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Operator Name</th>
              <th className="px-4 py-3">Login Identifier</th>
              <th className="px-4 py-3">Access Role</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
               <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                 <td className="px-4 py-3 font-mono text-xs text-slate-500">#{u.id}</td>
                 <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                 <td className="px-4 py-3 font-mono text-xs text-blue-600">{u.username || u.email}</td>
                 <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                      {u.role}
                    </span>
                 </td>
                 <td className="px-4 py-3">
                    <button onClick={() => handleDelete(u.id)} disabled={u.id === 1} className={`p-1.5 rounded transition-colors ${u.id === 1 ? 'text-slate-300' : 'text-red-500 hover:bg-red-50'}`}>
                       <Trash2 className="w-4 h-4" />
                    </button>
                 </td>
               </tr>
            ))}
            {users.length === 0 && !loading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No operators registered.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
