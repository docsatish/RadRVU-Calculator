
import React from 'react';
import { ScannedStudy } from '../types';

interface Props {
  studies: ScannedStudy[];
  onDelete: (id: string) => void;
}

const StudyTable: React.FC<Props> = ({ studies, onDelete }) => {
  if (studies.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="text-lg font-semibold text-slate-800">Scan Results</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-3 font-semibold">CPT</th>
              <th className="px-6 py-3 font-semibold">Description</th>
              <th className="px-6 py-3 font-semibold">Quantity</th>
              <th className="px-6 py-3 font-semibold">wRVU</th>
              <th className="px-6 py-3 font-semibold">Subtotal</th>
              <th className="px-6 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {studies.map((study) => (
              <tr key={study.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-mono text-sm text-indigo-600 font-semibold">{study.cpt}</td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-slate-900">{study.name}</div>
                  {study.originalText && (
                    <div className="text-xs text-slate-400 italic">Found: "{study.originalText}"</div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{study.quantity}</td>
                <td className="px-6 py-4 text-sm text-slate-600 font-mono">{study.rvu.toFixed(2)}</td>
                <td className="px-6 py-4 text-sm font-bold text-slate-900 font-mono">{(study.rvu * study.quantity).toFixed(2)}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => onDelete(study.id)}
                    className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-all"
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
