import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  LayoutDashboard, 
  ShieldAlert, 
  Settings, 
  Activity, 
  Users, 
  Mic, 
  Send, 
  CheckCircle2, 
  Circle, 
  Play, 
  Pause, 
  AlertTriangle,
  Brain,
  Menu,
  X
} from 'lucide-react';

// --- Types ---
type View = 'dashboard' | 'chat' | 'tools' | 'network';

// --- Mock Data ---
const MOCK_METRICS = [
  { label: 'Sobriety', status: 'success', streak: 12, unit: 'days' },
  { label: 'Exercise', status: 'warning', streak: 0, unit: 'days' },
  { label: 'Meditation', status: 'success', streak: 4, unit: 'days' },
  { label: 'Journaling', status: 'success', streak: 12, unit: 'days' },
];

const LEADING_INDICATORS = [
  { id: 1, text: 'Missed exercise 2 days in a row', severity: 'medium' },
  { id: 2, text: 'Sleep efficiency < 60%', severity: 'low' },
];

// --- Components ---

// 1. DENTS Widget (Generative UI Component)
const DentsWidget = () => {
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [isActive, setIsActive] = useState(true);
  const [steps, setSteps] = useState([
    { id: 'delay', label: 'Delay: I will not act for 10 minutes.', checked: false },
    { id: 'escape', label: 'Escape: Leave the immediate situation.', checked: false },
    { id: 'neutralize', label: 'Neutralize: "This is just a thought, not a command."', checked: false },
    { id: 'tasks', label: 'Tasks: Do the dishes or walk around the block.', checked: false },
    { id: 'swap', label: 'Swap: Change the feeling (music, cold water).', checked: false },
  ]);

  useEffect(() => {
    let interval: any;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleStep = (id: string) => {
    setSteps(steps.map(s => s.id === id ? { ...s, checked: !s.checked } : s));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-slate-800 border border-indigo-500/30 rounded-lg p-4 my-3 shadow-lg max-w-md w-full">
      <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
        <h3 className="text-indigo-400 font-bold flex items-center gap-2">
          <ShieldAlert size={18} />
          DENTS Protocol Active
        </h3>
        <div className={`font-mono text-xl font-bold ${timeLeft < 120 ? 'text-red-400' : 'text-slate-200'}`}>
          {formatTime(timeLeft)}
        </div>
      </div>
      
      <div className="space-y-3">
        {steps.map((step) => (
          <div 
            key={step.id} 
            onClick={() => toggleStep(step.id)}
            className={`flex items-start gap-3 p-2 rounded cursor-pointer transition-colors ${step.checked ? 'bg-slate-700/50 opacity-60' : 'hover:bg-slate-700'}`}
          >
            <div className={`mt-1 ${step.checked ? 'text-green-500' : 'text-slate-500'}`}>
              {step.checked ? <CheckCircle2 size={20} /> : <Circle size={20} />}
            </div>
            <span className={`text-sm ${step.checked ? 'line-through text-slate-500' : 'text-slate-200'}`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-700 flex justify-between text-xs text-slate-400">
        <span>Intensity: 7/10</span>
        <button className="text-slate-300 hover:text-white underline">Log outcome</button>
      </div>
    </div>
  );
};

// 2. Dashboard View
const Dashboard = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {MOCK_METRICS.map((metric, i) => (
          <div key={i} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">{metric.label}</div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${metric.status === 'success' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {metric.streak}
              </span>
              <span className="text-slate-500 text-sm">{metric.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Leading Indicators Warning */}
      <div className="bg-amber-900/20 border border-amber-600/30 p-4 rounded-lg">
        <h3 className="text-amber-500 font-semibold flex items-center gap-2 mb-2">
          <AlertTriangle size={18} />
          Risk Analysis: Leading Indicators Detected
        </h3>
        <p className="text-slate-300 text-sm mb-3">
          Your metrics suggest a drift in discipline. The IRF identifies this as a high-risk window for rationalization.
        </p>
        <ul className="space-y-2">
          {LEADING_INDICATORS.map((ind) => (
            <li key={ind.id} className="flex items-center gap-2 text-sm text-slate-400 bg-black/20 p-2 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              {ind.text}
            </li>
          ))}
        </ul>
        <button className="mt-3 text-xs bg-amber-700/30 hover:bg-amber-700/50 text-amber-200 px-3 py-1.5 rounded border border-amber-600/30 transition-colors">
          Review Commitment Statement
        </button>
      </div>

      {/* Three Pillars Status */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
          <h3 className="text-slate-200 font-medium mb-4 flex items-center justify-between">
            Today's Practice
            <span className="text-xs text-slate-500">Jan 18</span>
          </h3>
          <div className="space-y-3">
            {['Morning Stoic Prep', 'Daily Metrics Log', 'Evening Inventory'].map((task, i) => (
              <div key={i} className="flex items-center gap-3 p-2 hover:bg-slate-700/50 rounded cursor-pointer group">
                <div className={`w-5 h-5 rounded border ${i === 0 ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 group-hover:border-slate-400'} flex items-center justify-center`}>
                  {i === 0 && <CheckCircle2 size={14} className="text-white" />}
                </div>
                <span className={i === 0 ? 'text-slate-500 line-through' : 'text-slate-300'}>{task}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
          <h3 className="text-slate-200 font-medium mb-4">Support Network Status</h3>
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-900 flex items-center justify-center text-indigo-300 font-bold text-xs">SP</div>
                  <div>
                    <div className="text-sm text-slate-200">Sarah P. (Primary)</div>
                    <div className="text-xs text-slate-500">Last check-in: Yesterday</div>
                  </div>
                </div>
                <button className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded">Update</button>
             </div>
             <div className="flex items-center justify-between opacity-60">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 font-bold text-xs">DR</div>
                  <div>
                    <div className="text-sm text-slate-200">Dr. Roberts</div>
                    <div className="text-xs text-slate-500">Session in 3 days</div>
                  </div>
                </div>
                <button className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded">Prep</button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 3. Chat Interface (Remi)
const ChatInterface = () => {
  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Date Separator */}
        <div className="flex justify-center">
          <span className="text-xs font-mono text-slate-600 bg-slate-900 px-2">Today, 10:23 AM</span>
        </div>

        {/* User Message */}
        <div className="flex justify-end">
          <div className="bg-indigo-600 text-white p-3 rounded-2xl rounded-tr-sm max-w-[85%] shadow-md">
            <p className="text-sm">I'm struggling right now. I know I should go to the gym but I'm just sitting here thinking about having a drink. It's been a hard week.</p>
          </div>
        </div>

        {/* AI Message with Tool Use */}
        <div className="flex justify-start items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex-shrink-0 flex items-center justify-center text-white font-bold text-xs shadow-lg">
            R
          </div>
          <div className="flex flex-col gap-2 max-w-[90%]">
            <div className="bg-slate-800 text-slate-200 p-4 rounded-2xl rounded-tl-sm border border-slate-700 shadow-md">
              <p className="text-sm mb-3">
                I hear that you're in the "danger zone"—inactive and ruminating. This is a classic <strong>Rationalization Pattern</strong> setup.
              </p>
              <p className="text-sm">
                We aren't going to debate the drink. We are going to manage the physiology first. I'm initiating the <strong>DENTS protocol</strong>.
              </p>
              <p className="text-sm mt-2 font-semibold text-emerald-400">
                Your only job right now is to delay.
              </p>
            </div>
            
            {/* The Generative Widget */}
            <DentsWidget />

            {/* Follow up bubbles */}
             <div className="bg-slate-800 text-slate-200 p-3 rounded-2xl rounded-tl-sm border border-slate-700 shadow-md w-fit">
              <p className="text-sm">Once the timer starts, put on your shoes. That is the "Tasks" step. Can you do that?</p>
            </div>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-800 border-t border-slate-700">
        <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-xl border border-slate-700 focus-within:border-indigo-500 transition-colors">
          <button className="p-2 text-slate-400 hover:text-white transition-colors">
            <Mic size={20} />
          </button>
          <input 
            type="text" 
            placeholder="Type your check-in..." 
            className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
          />
          <button className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg transition-all">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---
const App = () => {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Responsive check could go here, for now assuming responsive CSS handles generic layout
  
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Brain className="text-white" size={20} />
            </div>
            <h1 className="font-bold text-xl tracking-tight">RecoveryLM</h1>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-emerald-500 font-mono bg-emerald-500/10 px-2 py-1 rounded w-fit">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            System Online
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeView === 'dashboard' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
          >
            <LayoutDashboard size={18} />
            Command Center
          </button>
          
          <button 
            onClick={() => setActiveView('chat')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeView === 'chat' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
          >
            <MessageSquare size={18} />
            Remi (Assistant)
          </button>

          <button 
            onClick={() => setActiveView('tools')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeView === 'tools' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
          >
            <Activity size={18} />
            Tools & Metrics
          </button>

          <button 
             onClick={() => setActiveView('network')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeView === 'network' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
          >
            <Users size={18} />
            Support Network
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
           <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white text-sm font-medium">
             <Settings size={18} />
             Settings
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Brain className="text-white" size={20} />
            </div>
            <span className="font-bold">RecoveryLM</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-300">
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </header>

         {/* Mobile Menu Overlay */}
         {isMobileMenuOpen && (
          <div className="absolute top-16 left-0 w-full bg-slate-900 border-b border-slate-800 z-50 p-4 shadow-xl md:hidden">
            <nav className="space-y-2">
               {['dashboard', 'chat', 'tools'].map((v) => (
                 <button 
                  key={v}
                  onClick={() => { setActiveView(v as View); setIsMobileMenuOpen(false); }}
                  className="block w-full text-left p-3 text-slate-300 capitalize bg-slate-800 rounded"
                 >
                   {v}
                 </button>
               ))}
            </nav>
          </div>
        )}

        {/* Top Bar (Desktop) & SOS */}
        <div className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center justify-between px-6 z-10">
          <div className="hidden md:block">
            <h2 className="text-lg font-semibold text-white capitalize">{activeView === 'dashboard' ? 'Command Center' : 'Remi / Chat'}</h2>
            <p className="text-xs text-slate-500">Local-First Vault: Encrypted</p>
          </div>
          
          <button className="bg-red-900/20 hover:bg-red-600 hover:text-white text-red-500 border border-red-900/50 px-4 py-2 rounded-md flex items-center gap-2 text-sm font-bold transition-all ml-auto md:ml-0">
             <ShieldAlert size={16} />
             SOS / EMERGENCY
          </button>
        </div>

        {/* View Content */}
        <div className="flex-1 overflow-hidden bg-slate-950 relative">
          {activeView === 'dashboard' && (
            <div className="h-full overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto">
              <Dashboard />
            </div>
          )}
          
          {activeView === 'chat' && (
             <div className="h-full max-w-3xl mx-auto border-x border-slate-800 shadow-2xl">
               <ChatInterface />
             </div>
          )}
          
          {(activeView === 'tools' || activeView === 'network') && (
            <div className="flex items-center justify-center h-full text-slate-500">
              <p>Module under construction in mockup.</p>
            </div>
          )}
        </div>
        
        {/* Mobile Bottom Nav */}
        <div className="md:hidden bg-slate-900 border-t border-slate-800 flex justify-around p-3 pb-5">
           <button onClick={() => setActiveView('dashboard')} className={`${activeView === 'dashboard' ? 'text-indigo-400' : 'text-slate-500'}`}>
             <LayoutDashboard size={24} />
           </button>
           <button onClick={() => setActiveView('chat')} className={`${activeView === 'chat' ? 'text-indigo-400' : 'text-slate-500'}`}>
             <MessageSquare size={24} />
           </button>
           <button onClick={() => setActiveView('tools')} className={`${activeView === 'tools' ? 'text-indigo-400' : 'text-slate-500'}`}>
             <Activity size={24} />
           </button>
        </div>
      </main>
    </div>
  );
};

export default App;