import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, Trash2, CheckCircle2, 
  Calendar as CalendarIcon, Clock, Loader2, Search, CheckSquare
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc, query
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG || "{}");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "my-calendar-app";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) { setUser(u); setLoading(false); }
      else { signInAnonymously(auth); }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'tasks'));
    return onSnapshot(q, (s) => {
      setTasks(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  const progress = useMemo(() => {
    const dStr = selectedDate.toISOString().split('T')[0];
    const todayTasks = tasks.filter(t => t.date === dStr);
    if (todayTasks.length === 0) return 0;
    return Math.round((todayTasks.filter(t => t.completed).length / todayTasks.length) * 100);
  }, [tasks, selectedDate]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <main className="flex-1 flex overflow-hidden">
        {/* 캘린더 영역 */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">{currentDate.getFullYear()}년 {currentDate.getMonth()+1}월</h2>
            <div className="flex gap-2">
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth()-1, 1))} className="p-2 bg-white border rounded-lg"><ChevronLeft/></button>
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 1))} className="p-2 bg-white border rounded-lg"><ChevronRight/></button>
            </div>
          </div>
          {/* 달력 그리드 생략 - 구조에 맞춰 구현 */}
          <p className="text-center text-slate-400">날짜를 선택하여 일정을 관리하세요.</p>
        </div>

        {/* 우측 패널 */}
        <div className="w-80 border-l bg-white p-6 flex flex-col gap-6">
          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-500">Progress</span>
              <span className="text-2xl font-black">{progress}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <h3 className="font-bold mb-4">오늘의 할 일</h3>
            {/* 할 일 목록 반복 */}
          </div>
          <button onClick={() => setIsModalOpen(true)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold">+ 할 일 추가</button>
        </div>
      </main>
    </div>
  );
}
