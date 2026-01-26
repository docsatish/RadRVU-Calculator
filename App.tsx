import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { INITIAL_STUDY_DB, DEFAULT_RVU_RATE } from './constants';
import { ScannedStudy, CalculationResults, StudyDefinition } from './types';
import { performOCRAndMatch } from './services/geminiService';
import DashboardCards from './components/DashboardCards';
import StudyTable from './components/StudyTable';

const ABBREVIATIONS: Record<string, string> = {
  'us': 'ultrasound',
  'usg': 'ultrasound',
  'ultrasonic': 'ultrasound',
  'bx': 'biopsy',
  'mammo': 'mammogram',
  'mammography': 'mammogram',
  'xr': 'xray',
  'cr': 'xray',
  'dr': 'xray',
  'mr': 'mri',
  'fu': 'followup',
  'followup': 'followup',
  'ltd': 'limited',
  'scr': 'screening',
  'scrn': 'screening',
  'dx': 'diagnostic',
  'diag': 'diagnostic',
  'bil': 'bilateral',
  'bilat': 'bilateral',
  'unilat': 'unilateral',
  'w': 'with',
  'wo': 'without',
  'cont': 'contrast',
  'thor': 'thoracic',
  'abd': 'abdomen',
  'pelv': 'pelvis',
  'ang': 'angio',
  'cerv': 'cervical',
  'lumb': 'lumbar',
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'database'>('dashboard');
  const [db, setDb] = useState<StudyDefinition[]>(INITIAL_STUDY_DB);
  const [studies, setStudies] = useState<ScannedStudy[]>([]);
  const [rvuRate, setRvuRate] = useState<number>(DEFAULT_RVU_RATE);
  const [isScanning, setIsScanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Image Inspection State
  const [lastImage, setLastImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  const results = useMemo((): CalculationResults => {
    const totalRVU = studies.reduce((acc, s) => acc + (s.rvu * s.quantity), 0);
    return {
      totalRVU,
      totalEarnings: totalRVU * rvuRate,
      studyCount: studies.reduce((acc, s) => acc + s.quantity, 0)
    };
  }, [studies, rvuRate]);

  const normalizeToken = (t: string) => {
    const low = t.toLowerCase().replace(/[^a-z0-9]/g, '');
    return ABBREVIATIONS[low] || low;
  };

  const getSignificantWords = (s: string) => {
    // List of words to ignore specifically for "Directional Neutrality"
    const lateralIgnoreSet = new Set(['lt', 'rt', 'left', 'right']);
    // Filler words that don't help in clinical matching
    const fillerIgnoreSet = new Set(['the', 'and', 'for', 'or', 'of', 'in']);

    return s.toLowerCase()
      .split(/[^a-z0-9/]/) // Keep / for w/o etc
      .filter(w => w.length > 0)
      .map(w => {
        const clean = w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
        return normalizeToken(clean);
      })
      .filter(w => w.length > 0 && !lateralIgnoreSet.has(w) && !fillerIgnoreSet.has(w));
  };

  const calculateWordOverlap = (s1: string, s2: string) => {
    const words1 = new Set(getSignificantWords(s1));
    const words2 = getSignificantWords(s2);
    let matches = 0;
    words2.forEach(w => {
      if (words1.has(w)) matches++;
    });
    return matches;
  };

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError("Please upload an image file.");
      return;
    }

    setIsScanning(true);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setLastImage(base64String);
      try {
        const extracted = await performOCRAndMatch(base64String, db);
        
        const processed: ScannedStudy[] = extracted
          .map((ex: any, index: number) => {
            let bestMatch: StudyDefinition | null = null;
            let highestOverlap = 0;

            db.forEach(dbItem => {
              const sigWordsInDb = getSignificantWords(dbItem.name);
              const overlap = calculateWordOverlap(ex.originalText || ex.name, dbItem.name);
              
              // Dynamic threshold: If the database name is very short (e.g. 2 words),
              // we shouldn't require 4 words overlap.
              const threshold = Math.min(4, sigWordsInDb.length);
              
              if (overlap >= threshold && overlap > highestOverlap) {
                highestOverlap = overlap;
                bestMatch = dbItem;
              }
            });

            if (!bestMatch) {
              const normalizedExName = ex.name.toLowerCase().replace(/[^a-z0-9]/g, '');
              bestMatch = db.find(s => s.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedExName) || null;
            }
            
            if (bestMatch) {
              return {
                id: `${Date.now()}-${index}-${Math.random()}`,
                cpt: bestMatch.cpt,
                name: bestMatch.name, 
                rvu: bestMatch.rvu,
                quantity: ex.quantity || 1,
                confidence: ex.confidence ?? 0.0,
                originalText: ex.originalText
              };
            }
            return null;
          })
          .filter(Boolean) as ScannedStudy[];

        setStudies(prev => [...prev, ...processed]);
      } catch (err) {
        setError("AI Analysis failed. Check image quality.");
        console.error(err);
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  }, [db]);

  const parseCSV = (content: string): StudyDefinition[] => {
    const lines = content.split('\n');
    const results: StudyDefinition[] = [];
    const regex = /(".*?"|[^",\r\n]+)(?=\s*,|\s*$)/g;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const matches = line.match(regex);
      if (matches && matches.length >= 3) {
        const cpt = matches[0].replace(/"/g, '').trim();
        const name = matches[1].replace(/"/g, '').trim();
        const rvuValue = matches[2].replace(/"/g, '').trim().replace(/,/g, '');
        const rvu = parseFloat(rvuValue);
        
        if (!isNaN(rvu)) {
          results.push({ cpt, name, rvu, category: 'Other' });
        }
      }
    }
    return results;
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const newDb = parseCSV(content);
      if (newDb.length > 0) {
        setDb(newDb);
        alert(`Successfully imported ${newDb.length} codes into the RVU database.`);
      }
    };
    reader.readAsText(file);
  };

  const deleteStudy = (id: string) => setStudies(prev => prev.filter(s => s.id !== id));
  const clearAll = () => {
    if (window.confirm("Clear today's worklist?")) {
      setStudies([]);
      setLastImage(null);
    }
  };

  const handleMouseDown = () => zoom > 1 && setIsPanning(true);
  const handleMouseUp = () => setIsPanning(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPosition(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
  };

  useEffect(() => {
    if (!isModalOpen) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isModalOpen]);

  return (
    <div className="min-h-screen pb-20 px-4 md:px-8 bg-[#f8fafc]">
      <header className="max-w-7xl mx-auto py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">RadRVU Pro</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-slate-500 font-medium italic">Radiology Productivity Suite</p>
              <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">Abbreviation Aware Engine</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-white p-3 px-5 rounded-2xl shadow-sm border border-slate-200">
            <label className="text-sm font-bold text-slate-500 uppercase tracking-tight">Conv. Rate:</label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-400 font-bold">$</span>
              <input 
                type="number" 
                value={rvuRate} 
                onChange={(e) => setRvuRate(parseFloat(e.target.value) || 0)}
                className="pl-7 pr-4 py-2 w-24 rounded-xl border border-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none font-mono text-indigo-600 font-bold"
              />
            </div>
          </div>
        </div>

        <div className="flex p-1 bg-slate-200/50 rounded-2xl w-fit mb-8">
          <button onClick={() => setActiveTab('dashboard')} className={`px-8 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Dashboard</button>
          <button onClick={() => setActiveTab('database')} className={`px-8 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'database' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>RVU Database</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {activeTab === 'dashboard' ? (
          <>
            <DashboardCards totalRVU={results.totalRVU} totalEarnings={results.totalEarnings} studyCount={results.studyCount} rvuRate={rvuRate} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                <div 
                  onDragOver={(e) => {e.preventDefault(); setIsDragging(true);}}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if(f) processFile(f);}}
                  className={`bg-indigo-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden transition-all duration-300 ${isDragging ? 'scale-105 ring-4 ring-indigo-200' : ''}`}
                >
                  <h2 className="text-xl font-bold mb-4">Scan Worklist</h2>
                  <p className="text-indigo-100 mb-6 text-sm leading-relaxed">Drop a screenshot here. System understands "US" as Ultrasound, "BX" as Biopsy, etc.</p>
                  <label className="block w-full text-center py-4 bg-white text-indigo-600 rounded-xl font-bold cursor-pointer hover:bg-indigo-50 transition-all">
                    {isScanning ? "AI Analyzing..." : "Upload Screenshot"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {const f = e.target.files?.[0]; if(f) processFile(f);}} disabled={isScanning} />
                  </label>
                  {error && <div className="mt-4 p-3 bg-red-500/20 rounded-lg text-xs font-bold text-red-50">{error}</div>}
                </div>

                {lastImage && (
                  <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm overflow-hidden group">
                    <h3 className="font-bold text-slate-800 mb-3 text-xs uppercase tracking-wider px-2">Current Worklist Image</h3>
                    <div 
                      className="relative rounded-2xl overflow-hidden cursor-zoom-in aspect-video bg-slate-100 border border-slate-100"
                      onClick={() => setIsModalOpen(true)}
                    >
                      <img src={lastImage} alt="Worklist thumbnail" className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="bg-white text-indigo-600 px-4 py-2 rounded-full font-bold text-sm shadow-xl flex items-center gap-2">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H9" /></svg>
                           Inspect
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {studies.length > 0 && (
                  <button onClick={clearAll} className="w-full py-2 text-slate-400 hover:text-red-500 text-xs font-bold uppercase tracking-widest transition-colors">Reset Worklist</button>
                )}
              </div>

              <div className="lg:col-span-2">
                <StudyTable studies={studies} onDelete={deleteStudy} />
                {studies.length === 0 && !isScanning && (
                  <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-300 bg-white">
                    <p className="font-bold">Worklist is empty</p>
                    <p className="text-sm">Scan a list to calculate today's totals.</p>
                  </div>
                )}
                {isScanning && studies.length === 0 && (
                  <div className="space-y-4 animate-pulse">
                    {[1,2,3].map(i => <div key={i} className="h-24 bg-white border border-slate-100 rounded-3xl w-full"></div>)}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Reference RVU Database</h2>
                <p className="text-slate-500 text-sm">Matches are verified against this list after intelligent abbreviation expansion.</p>
              </div>
              <label className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm cursor-pointer hover:bg-indigo-700 transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Import CSV Database
                <input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
              </label>
            </div>
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-slate-50 text-slate-500 text-xs uppercase tracking-widest font-black">
                  <tr>
                    <th className="px-8 py-4">CPT Code</th>
                    <th className="px-8 py-4">Description</th>
                    <th className="px-8 py-4 text-right">Work RVU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {db.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-4 font-mono font-bold text-indigo-600 text-sm">{item.cpt}</td>
                      <td className="px-8 py-4 text-sm text-slate-700 font-medium">{item.name}</td>
                      <td className="px-8 py-4 text-right font-mono font-black text-slate-900">{item.rvu.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {isModalOpen && lastImage && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md">
          <div className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-md border-b border-white/10">
            <h3 className="text-white font-bold px-4">Image Inspector</h3>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4 text-white">
                <span className="text-xs font-bold uppercase tracking-widest text-white/50">Zoom</span>
                <input 
                  type="range" min="1" max="4" step="0.1" 
                  value={zoom} 
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-32 accent-indigo-500"
                />
                <span className="font-mono text-sm w-12">{zoom.toFixed(1)}x</span>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-white/70 hover:text-white transition-colors"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          <div 
            className="flex-1 overflow-hidden relative cursor-move flex items-center justify-center"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseUp}
          >
            <div
              className="transition-transform duration-75 ease-out"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                transformOrigin: 'center center'
              }}
            >
              <img 
                ref={imageRef}
                src={lastImage} 
                alt="Full Worklist" 
                className="max-w-[90vw] max-h-[80vh] object-contain shadow-2xl pointer-events-none"
              />
            </div>
          </div>

          <div className="p-3 bg-white/5 text-center text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold">
            Drag to pan when zoomed • Use slider to adjust focus
          </div>
        </div>
      )}
    </div>
  );
};

export default App;