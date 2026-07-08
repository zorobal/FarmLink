/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { NotificationLog } from '../types';
import { MessageSquare, Mail, PhoneCall, AlertTriangle, Eye, EyeOff, Bell } from 'lucide-react';

interface NotificationLogPanelProps {
  logs: NotificationLog[];
  language: 'FR' | 'EN';
  onClearLogs?: () => void;
}

export const NotificationLogPanel: React.FC<NotificationLogPanelProps> = ({
  logs,
  language,
  onClearLogs
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getCanalIcon = (canal: 'app' | 'sms' | 'whatsapp' | 'call') => {
    switch (canal) {
      case 'sms':
        return <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 rounded font-bold font-mono">SMS</span>;
      case 'whatsapp':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded font-bold font-mono">WA</span>;
      case 'call':
        return <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-bold font-mono">CALL</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 text-[10px] px-1.5 py-0.5 rounded font-bold font-mono">APP</span>;
    }
  };

  const sortedLogs = [...logs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div id="notification-logs-drawer" className="fixed bottom-4 right-4 z-50">
      {/* Floating Toggle Button */}
      <button
        id="btn-toggle-notif-drawer"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-green-600 text-white border border-green-700 px-3 py-2 rounded shadow-lg hover:bg-green-700 transition-all font-bold text-xs focus:outline-none"
      >
        <Bell className="w-3.5 h-3.5 animate-bounce" />
        <span>
          {language === 'FR' 
            ? `Communications (${logs.length})` 
            : `Communications (${logs.length})`}
        </span>
        {isOpen ? <EyeOff className="w-3 h-3 text-green-100 ml-1" /> : <Eye className="w-3 h-3 text-green-100 ml-1" />}
      </button>

      {/* Drawer Body */}
      {isOpen && (
        <div id="notif-drawer-body" className="absolute bottom-11 right-0 w-80 sm:w-96 bg-white border border-gray-200 rounded shadow-xl overflow-hidden animate-in slide-in-from-bottom duration-150">
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-green-600" />
              <h4 className="text-[10px] font-bold text-gray-800 tracking-wider uppercase font-mono">
                {language === 'FR' ? "Simulation des Communications" : "Communications Simulator"}
              </h4>
            </div>
            <span className="text-[9px] bg-green-100 text-green-800 px-2 py-0.5 rounded font-mono font-bold uppercase">
              {language === 'FR' ? "Canal Live" : "Live Channel"}
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto p-2 space-y-2 scrollbar-thin">
            {sortedLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs">
                {language === 'FR' 
                  ? "Aucune notification envoyée pour le moment." 
                  : "No notifications triggered yet."}
              </div>
            ) : (
              sortedLogs.map((log) => (
                <div key={log.id} className="bg-gray-50 hover:bg-gray-100/80 border border-gray-150 p-2.5 rounded text-[11px]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-800 font-mono text-[10px]">
                      {log.recipientName} ({log.recipientRole})
                    </span>
                    <div className="flex items-center gap-1.5">
                      {getCanalIcon(log.canal)}
                      <span className="text-[9px] text-gray-400 font-mono">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 leading-normal font-sans font-normal whitespace-pre-wrap">
                    {log.content}
                  </p>
                  <div className="mt-1 flex items-center justify-end">
                    <span className="text-[8px] uppercase tracking-wider text-green-600 font-bold font-mono">
                      ● Status: {log.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-gray-50 p-2 border-t border-gray-200 text-center text-[9px] text-gray-500 font-mono">
            {language === 'FR' 
              ? "Les SMS et WhatsApp s'exécutent en simulation." 
              : "SMS & WhatsApp operate in simulated sandbox."}
          </div>
        </div>
      )}
    </div>
  );
};
