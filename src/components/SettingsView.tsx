/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Hammer, Award, Settings, ShieldAlert, KeyRound, Save, Info, CheckCircle } from "lucide-react";

interface SettingsViewProps {
  userRole: string;
  userName: string;
  onChangePassword: (oldP: string, newP: string) => Promise<any>;
}

export default function SettingsView({ userRole, userName, onChangePassword }: SettingsViewProps) {
  // State variables representing tax & profile particulars
  const [companyName, setCompanyName] = useState("ARTISAN EMBROIDERY INC.");
  const [ntnStr, setNtnStr] = useState("8829102-3");
  const [strnStr, setStrnStr] = useState("110099223311");
  const [tajimaCapacity, setTajimaCapacity] = useState("16 multi-head machines");
  const [addressLine, setAddressLine] = useState("Liaqatabad Industrial Sector, Gate 4, Faisalabad, Punjab");
  
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPwdMessage, setShowPwdMessage] = useState(false);

  // States for general config save state
  const [savedConfig, setSavedConfig] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedConfig(true);
    setTimeout(() => setSavedConfig(false), 3000);
  };

  const handleChangePwdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onChangePassword(oldPassword, newPassword);
      setOldPassword("");
      setNewPassword("");
      setShowPwdMessage(true);
      setTimeout(() => setShowPwdMessage(false), 4000);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const isAdmin = userRole === "admin";

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto" id="settings-view-panel">
      <div>
        <h3 className="text-slate-800 font-extrabold text-lg select-none font-sans flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-600 animate-spin-slow" />
          <span>System & Security Settings</span>
        </h3>
        <p className="text-xs text-slate-400 font-mono">Configure corporate NTN profiles and user authorization keys</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Award className="text-indigo-600 w-5 h-5" />
            <span className="font-extrabold text-sm text-slate-800 uppercase tracking-wider font-sans">Embroidery Factory Profile</span>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-medium">
            <div>
              <label className="block text-[10px] uppercase font-mono font-bold tracking-widest text-slate-400 mb-1">Company Registered Name</label>
              <input
                id="cfg-comp-name"
                type="text"
                disabled={!isAdmin}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 outline-none focus:bg-white text-slate-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-mono font-bold tracking-widest text-slate-400 mb-1">Government NTN Code</label>
                <input
                  id="cfg-ntn"
                  type="text"
                  disabled={!isAdmin}
                  value={ntnStr}
                  onChange={(e) => setNtnStr(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 outline-none focus:bg-white text-slate-700 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono font-bold tracking-widest text-slate-400 mb-1">Sales Tax STRN</label>
                <input
                  id="cfg-strn"
                  type="text"
                  disabled={!isAdmin}
                  value={strnStr}
                  onChange={(e) => setStrnStr(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 outline-none focus:bg-white text-slate-700 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-mono font-bold tracking-widest text-slate-400 mb-1">Machine Capacity Indices</label>
              <input
                id="cfg-capacity"
                type="text"
                disabled={!isAdmin}
                value={tajimaCapacity}
                onChange={(e) => setTajimaCapacity(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 outline-none focus:bg-white text-slate-700"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-mono font-bold tracking-widest text-slate-400 mb-1">Corporate Physical Address</label>
              <textarea
                id="cfg-address"
                disabled={!isAdmin}
                rows={2}
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 outline-none resize-none focus:bg-white text-slate-700"
              />
            </div>

            {isAdmin ? (
              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                {savedConfig ? (
                  <span className="text-emerald-600 text-[11px] font-bold flex items-center gap-1.5 animate-bounce">
                    <CheckCircle className="w-4 h-4" />
                    <span>Profile saved successfully!</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-mono uppercase font-black">Authorized Level: {userRole}</span>
                )}
                <button
                  type="submit"
                  id="save-factory-settings-btn"
                  className="flex items-center gap-1.5 px-4.5 py-2.5 bg-slate-900 border border-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer transition-all shadow shadow-slate-950/15"
                >
                  <Save className="w-4 h-4 stroke-[2.5]" />
                  <span>SAVE SETTINGS</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 flex items-start gap-2 text-[10px] leading-relaxed">
                <ShieldAlert className="w-4.5 h-4.5 shrink-0 text-amber-500 mt-0.5" />
                <span>You are currently authorized under employee level [<strong>{userRole}</strong>]. Altering corporate STRN profiles or factory physical addresses is restricted to high tier Administrators.</span>
              </div>
            )}
          </form>
        </div>

        {/* Password / Access management card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <KeyRound className="text-indigo-600 w-5 h-5" />
            <span className="font-extrabold text-sm text-slate-800 uppercase tracking-wider font-sans">Authorized User Key Change</span>
          </div>

          <form onSubmit={handleChangePwdSubmit} className="space-y-4 text-xs font-medium">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <p className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-400 leading-none">Authentication details</p>
              <p className="text-slate-800 font-black text-sm uppercase mt-2">Operator: {userName}</p>
              <p className="text-xs text-indigo-600 font-bold font-mono">Role hierarchy: {userRole}</p>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-mono font-bold tracking-widest text-slate-400 mb-1">Old Operator Password</label>
              <input
                id="pwd-old"
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter current password key"
                className="w-full text-xs border border-slate-200 rounded-lg py-2 px-3 outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-mono font-bold tracking-widest text-slate-400 mb-1">New Operator Password</label>
              <input
                id="pwd-new"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Declare fresh security key"
                className="w-full text-xs border border-slate-200 rounded-lg py-2 px-3 outline-none"
              />
            </div>

            {showPwdMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-[10px] flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 animate-bounce shrink-0" />
                <span>Security password matching credentials updated successfully!</span>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                id="change-password-settings-btn"
                className="flex items-center gap-1.5 px-4.5 py-2.5 bg-slate-900 border border-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer transition-all shadow shadow-slate-950/15"
              >
                <Save className="w-4 h-4 stroke-[2.5]" />
                <span>CHANGE SECURITY PASSWORD</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
