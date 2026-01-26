
import React, { useState, useCallback, useMemo } from 'react';
import { RADIOLOGY_STUDY_DB, DEFAULT_RVU_RATE } from './constants';
import { ScannedStudy, CalculationResults } from './types';
import { performOCRAndMatch } from './services/geminiService';
import DashboardCards from './components/DashboardCards';
import StudyTable from './components/StudyTable';

const App: React.FC = () => {
  const [studies, setStudies] = useState<ScannedStudy[]>([]);
  const [rvuRate, setRvuRate] = useState<number>(DEFAULT_RVU_RATE);
  const [isScanning, setIsScanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const results = useMemo((): CalculationResults => {
    const totalRVU = studies.reduce((acc, s) => acc + (s.rvu * s.quantity), 0);
    return {
      totalRVU,
      totalEarnings: totalRVU * rvuRate,
      studyCount: studies.reduce((acc, s) => acc + s.quantity, 0)
    };
  }, [studies, rvuRate]);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError("Please upload an image file (PNG, JPG, etc.)");
      return;
    }

    setIsScanning(true);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const extracted = await performOCRAndMatch(base64String);
        
        const processed: ScannedStudy[] = extracted.map((ex: any, index: number) => {
          const dbMatch = RADIOLOGY_STUDY_DB.find(s => s.cpt === ex.cpt);
          return {
            id: `${Date.now()}-${index}-${Math.random()}`,
            cpt: ex.cpt || 'N/A',
            name: dbMatch?.name || ex.name,
            rvu: dbMatch?.rvu || 0,
            quantity: ex.quantity || 1,
            confidence: ex.confidence || 0.5,
            originalText: ex.originalText
          };
        });

        setStudies(prev => [...prev, ...processed]);
      } catch (err) {
        setError("AI Analysis failed. Please try a clearer image.");
        console.error(err);
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isScanning) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isScanning) return;

    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const deleteStudy = (id: string) => {
    setStudies(prev => prev.filter(s => s.id !== id));
  };

  const clearAll = () => {
    if (window.confirm("Are you sure you want to clear the current day's calculations?")) {
      setStudies([]);
    }
  };

  return (
    <div className="min-h-screen pb-20 px-4 md:px-8">
      {/* Header */}
      <header className="max-w-7xl mx-auto py-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">RadRVU Calculator</h1>
          <p className="text-slate-500 mt-1">Intelligent wRVU tracking for the modern radiologist.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <label className="text-sm font-semibold text-slate-600 whitespace-nowrap">Conversion ($ per RVU):</label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-slate-400">$</span>
            <input 
              type="number" 
              value={rvuRate} 
              onChange={(e) => setRvuRate(parseFloat(e.target.value) || 0)}
              className="pl-7 pr-4 py-2 w-28 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none font-mono"
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        <DashboardCards 
          totalRVU={results.totalRVU} 
          totalEarnings={results.totalEarnings} 
          studyCount={results.studyCount}
          rvuRate={rvuRate}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls Column */}
          <div className="lg:col-span-1 space-y-6">
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden group transition-all duration-300
                ${isDragging ? 'scale-[1.02] ring-4 ring-indigo-300 ring-offset-2' : ''}
              `}
            >
              <div className={`
                absolute inset-0 border-4 border-dashed border-white/30 rounded-3xl m-2 transition-opacity duration-300
                ${isDragging ? 'opacity-100' : 'opacity-0'}
              `} />
              
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h8v2H8V8zm0 4h8v2H8v-2zm0 4h5v2H8v-2z" />
                </svg>
              </div>
              
              <h2 className="text-xl font-bold mb-4">Scan Worklist</h2>
              <p className="text-indigo-100 mb-6 text-sm">
                Drop a screenshot here or click to upload your PACS worklist. Our AI will identify procedures and match CPT codes.
              </p>
              
              <label className={`
                block w-full text-center py-4 rounded-xl font-bold cursor-pointer transition-all shadow-lg active:scale-95
                ${isScanning ? 'bg-indigo-400 text-white cursor-not-allowed' : 'bg-white text-indigo-600 hover:bg-indigo-50'}
              `}>
                {isScanning ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  "Select or Drop Image"
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileUpload}
                  disabled={isScanning}
                />
              </label>

              {error && (
                <div className="mt-4 p-3 bg-red-400/20 border border-red-400/30 rounded-lg text-sm font-medium text-red-50">
                  {error}
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Manual Quick Add
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {RADIOLOGY_STUDY_DB.slice(0, 6).map(study => (
                  <button 
                    key={study.cpt}
                    onClick={() => setStudies(prev => [...prev, {
                      id: Date.now().toString() + Math.random(),
                      cpt: study.cpt,
                      name: study.name,
                      rvu: study.rvu,
                      quantity: 1,
                      confidence: 1.0
                    }])}
                    className="text-left px-4 py-2 text-sm rounded-lg border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-slate-700 flex justify-between items-center group"
                  >
                    <span>{study.name}</span>
                    <span className="font-mono text-xs text-indigo-600 font-bold group-hover:translate-x-1 transition-transform">{study.rvu}</span>
                  </button>
                ))}
              </div>
            </div>

            {studies.length > 0 && (
              <button 
                onClick={clearAll}
                className="w-full py-3 text-slate-400 hover:text-red-500 font-medium transition-colors text-sm"
              >
                Clear All Data
              </button>
            )}
          </div>

          {/* Results Column */}
          <div className="lg:col-span-2">
            <StudyTable studies={studies} onDelete={deleteStudy} />
            
            {studies.length === 0 && !isScanning && (
              <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400">
                <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-medium">No studies scanned yet</p>
                <p className="text-sm">Upload or drag a worklist screenshot to start.</p>
              </div>
            )}

            {isScanning && studies.length === 0 && (
              <div className="space-y-4 animate-pulse">
                {[1,2,3].map(i => (
                  <div key={i} className="h-20 bg-slate-100 rounded-2xl w-full"></div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="max-w-7xl mx-auto mt-20 pt-8 border-t border-slate-200 text-center">
        <p className="text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} RadRVU Pro. Built for efficiency. AI Powered Matching.
        </p>
      </footer>
    </div>
  );
};

export default App;
