import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Calendar as CalendarIcon,
  Clock,
  Loader2,
  Zap,
  LayoutGrid,
  Settings,
  Bell,
  Search,
  CheckSquare,
  BarChart3,
  User,
  ArrowRight,
  MoreHorizontal
} from 'lucide-react';

// ✅ firebase 초기화는 firebase.js로 분리된 걸 사용
import { auth, db, appId } from "./firebase";

import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  updateDoc,
  query
} from 'firebase/firestore';

import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [searchTerm, setSearchTerm] = useState('');

  // Helper to format date to YYYY-MM-DD consistently
  const formatDate = (date) => {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  };

  // ✅ (변경) 인증: Vercel 배포 환경에서는 custom token 흐름 제거하고 익명 로그인만 사용
  useEffect(() => {
    let unsubscribe = () => {};

    const initAuth = async () => {
      try {
        // 이미 로그인 되어 있으면 재로그인 시도 안 함 (불필요한 호출 방지)
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth Error:", error);
      } finally {
        // Auth 상태 감시
        unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
          setLoading(false); // user가 null이어도(로그인 실패) 일단 로딩은 끝내 UI가 보이게
        });
      }
    };

    initAuth();

    return () => unsubscribe();
  }, []);

  // ✅ (기존 그대로) 사용자 로그인 완료 후 tasks 구독
  useEffect(() => {
    if (!user) return;

    const tasksCollection = collection(db, 'artifacts', appId, 'users', user.uid, 'tasks');

    const unsubscribe = onSnapshot(
      query(tasksCollection),
      (snapshot) => {
        setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => console.error("Firestore Error:", error)
    );

    return () => unsubscribe();
  }, [user]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days = [];
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) days.push({ day: null, currentMonth: false });
    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ day: i, dateStr, currentMonth: true, tasks: tasks.filter(t => t.date === dateStr) });
    }
    return days;
  }, [currentDate, tasks]);

  const handleAddTask = async () => {
    if (!newTask.trim() || !user) return;

    const dateStr = formatDate(selectedDate);
    const taskId = crypto.randomUUID();

    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId), {
        date: dateStr,
        text: newTask,
        completed: false,
        priority: newPriority,
        createdAt: new Date().toISOString()
      });
      setNewTask('');
      setIsModalOpen(false);
    } catch (error) {
      console.error("Add Error:", error);
    }
  };

  const toggleTask = async (id, status) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', id), { completed: !status });
    } catch (error) {
      console.error(error);
    }
  };

  const deleteTask = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', id));
    } catch (error) {
      console.error(error);
    }
  };

  const jumpToTaskDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(targetDate);
    setSearchTerm('');
  };

  const displayTasks = useMemo(() => {
    if (searchTerm.trim() === '') {
      const selectedDateStr = formatDate(selectedDate);
      return tasks.filter(t => t.date === selectedDateStr);
    }
    return tasks.filter(t => t.text.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [tasks, selectedDate, searchTerm]);

  const progress = useMemo(() => {
    const selectedDateStr = formatDate(selectedDate);
    const todaysTasks = tasks.filter(t => t.date === selectedDateStr);
    if (todaysTasks.length === 0) return 0;
    return Math.round((todaysTasks.filter(t => t.completed).length / todaysTasks.length) * 100);
  }, [tasks, selectedDate]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <Loader2 className="animate-spin text-indigo-600" size={32} />
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* 이하 UI/로직은 너가 준 원본 그대로 */}
      {/* ... (여기부터는 원본 코드 그대로 유지) ... */}

      {/* 1. Sidebar */}
      <aside className="w-18 lg:w-64 bg-white border-r border-slate-200 flex flex-col py-6 transition-all duration-300">
        <div className="flex items-center gap-3 px-6 mb-8">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <CheckSquare size={20} />
          </div>
          <span className="hidden lg:block font-bold text-xl tracking-tight">FocusBoard</span>
        </div>
        
        <nav className="flex-1 px-3 space-y-1">
          {[
            { icon: <LayoutGrid size={18}/>, label: 'Dashboard', active: true },
            { icon: <CalendarIcon size={18}/>, label: 'Schedule', active: false },
            { icon: <BarChart3 size={18}/>, label: 'Analytics', active: false },
            { icon: <Settings size={18}/>, label: 'Settings', active: false },
          ].map((item, i) => (
            <button key={i} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${item.active ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>
              {item.icon}
              <span className="hidden lg:block text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="px-3 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold ring-2 ring-white">JD</div>
            <div className="hidden lg:block overflow-hidden">
              <p className="text-xs font-bold text-slate-700 truncate">Jane Doe</p>
              <p className="text-[10px] text-slate-400 truncate tracking-tight uppercase font-bold">Workspace</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* 2. Calendar Section */}
        {/* ... 이하 원본 그대로 ... */}
        {/* (너가 올린 코드 본문 전체를 그대로 붙이면 돼. 위에서 손댄 부분은 Firebase/인증 useEffect 뿐이야) */}
      </main>

      {/* Modern Modal */}
      {/* ... 이하 원본 그대로 ... */}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.1); }
        @keyframes zoom-in-95 { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-in { animation: zoom-in-95 0.2s cubic-bezier(0, 0, 0.2, 1); }
      `}</style>
    </div>
  );
};

export default App;
