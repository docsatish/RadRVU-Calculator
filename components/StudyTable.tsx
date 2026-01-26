
import React from 'react';
import { ScannedStudy } from '../types';

interface Props {
  studies: ScannedStudy[];
  onDelete: (id: string) => void;
}

const StudyTable: React.FC<Props> = ({ studies, onDelete }) => {
  if (studies.length === 0) return null;

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'bg-emerald-500';
    if (score >= 0.7) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Scan Results</h3>
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest font-bold text-slate-400">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> High Match</div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Probable</div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Verify</div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-3 font-semibold">CPT</th>
              <th className="px-6 py-3 font-semibold">Description (Found on Scan)</th>
              <th className="px-6 py-3 font-semibold">Qty</th>
              <th className="px-6 py-3 font-semibold">wRVU</th>
              <th className="px-6 py-3 font-semibold">Subtotal</th>
              <th className="px-6 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {studies.map((study) => (
              <tr key={study.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span 
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${getConfidenceColor(study.confidence)}`}
                      title={`Match Confidence: ${Math.round(study.confidence * 100)}%`}
                    ></span>
                    <span className="font-mono text-sm text-indigo-600 font-semibold">{study.cpt}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-bold text-slate-900 leading-tight">
                    {study.originalText || study.name}
                  </div>
                  <div className="text-[10px] text-indigo-500 font-bold uppercase tracking-tighter mt-1 opacity-70">
                    Mapped: {study.name}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 font-medium">{study.quantity}</td>
                <td className="px-6 py-4 text-sm text-slate-600 font-mono">{study.rvu.toFixed(2)}</td>
                <td className="px-6 py-4 text-sm font-black text-slate-900 font-mono">{(study.rvu * study.quantity).toFixed(2)}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => onDelete(study.id)}
                    className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-all"
                    title="Remove from list"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudyTable;
