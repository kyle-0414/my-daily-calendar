import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Calendar as CalendarIcon,
  Loader2,
  Search,
  Bell,
  Clock
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc, query
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

/**
 * [중요] Vercel 환경 변수로부터 설정을 읽어옵니다.
 * Vite 환경에서는 import.meta.env를 사용하며, 일반적인 환경 변수 접근을 위해 대체 로직을 포함합니다.
 */
const getFirebaseConfig = () => {
  try {
    // Vite 환경 변수 우선 확인
    const config = import.meta.env.VITE_FIREBASE_CONFIG;
    if (config) return JSON.parse(config);
  } catch (e) {
    console.warn("환경 변수를 읽는 중 오류가 발생했습니다.");
  }
  return {};
};

const firebaseConfig = getFirebaseConfig();

// Firebase 초기화
let app, auth, db;
if (firebaseConfig.apiKey) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

const appId = "my-calendar-app";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState('');

  // 1. Firebase 인증 및 상태 감시
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setLoading(false);
      } else {
        signInAnonymously(auth).catch(err => console.error("익명 로그인 실패:", err));
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Firestore 데이터 실시간 구독
  useEffect(() => {
    if (!user || !db) return;
    
    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'tasks'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error("Firestore 구독 에러:", error);
    });
    
    return () => unsubscribe();
  }, [user]);

  // 일정 추가 함수
  const handleAddTask = async () => {
    if (!newTask.trim() || !user || !db) return;
    const dateStr = selectedDate.toISOString().split('T')[0];
    const taskId = crypto.randomUUID();
    
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId), {
        date: dateStr,
        text: newTask,
        completed: false,
        createdAt: new Date().toISOString()
      });
      setNewTask('');
      setIsModalOpen(false);
    } catch (e) {
      console.error("추가 에러:", e);
    }
  };

  // 일정 삭제 함수
  const handleDeleteTask = async (taskId) => {
    if (!user || !db) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId));
    } catch (e) {
      console.error("삭제 에러:", e);
    }
  };

  // 일정 완료 상태 토글
  const handleToggleTask = async (task) => {
    if (!user || !db) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', task.id), {
        completed: !task.completed
      });
    } catch (e) {
      console.error("토글 에러:", e);
    }
  };

  // 달력 날짜 생성 로직
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // 이전 달 빈칸
    for (let i = 0; i < firstDay; i++) days.push(null);
    // 현재 달 날짜
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    
    return days;
  }, [currentDate]);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
      <p className="text-slate-500 font-medium">데이터베이스 연결 중...</p>
    </div>
  );

  if (!firebaseConfig.apiKey) return (
    <div className="h-screen flex items-center justify-center bg-rose-50 p-6 text-center">
      <div className="max-w-md bg-white p-8 rounded-3xl shadow-xl">
        <h2 className="text-xl font-bold text-rose-600 mb-4">설정 오류</h2>
        <p className="text-slate-600 mb-4">
          Vercel 환경 변수에 <code className="bg-slate-100 px-1 rounded">VITE_FIREBASE_CONFIG</code>가 설정되지 않았습니다.
        </p>
        <p className="text-sm text-slate-400">
          Vercel Settings {'->'} Environment Variables에서 Firebase Config JSON을 추가해 주세요.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 캘린더 카드 */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
          <header className="p-8 flex items-center justify-between border-b bg-slate-50/50">
             <div className="flex items-center gap-3">
               <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                 <CalendarIcon size={24} />
               </div>
               <h1 className="text-2xl font-black text-slate-800">
                 {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
               </h1>
             </div>
             <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} 
                  className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} 
                  className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
             </div>
          </header>
          
          <div className="p-8">
            <div className="grid grid-cols-7 gap-2 mb-4 text-center">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                <div key={day} className={`font-bold text-xs uppercase tracking-wider ${idx === 0 ? 'text-rose-500' : idx === 6 ? 'text-blue-500' : 'text-slate-400'}`}>
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((date, idx) => {
                if (!date) return <div key={`empty-${idx}`} className="aspect-square" />;
                
                const isSelected = selectedDate.toDateString() === date.toDateString();
                const isToday = new Date().toDateString() === date.toDateString();
                const dateStr = date.toISOString().split('T')[0];
                const hasTasks = tasks.some(t => t.date === dateStr);
                const isSunday = date.getDay() === 0;
                const isSaturday = date.getDay() === 6;

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(date)}
                    className={`
                      aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all duration-200
                      ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105' : 'hover:bg-slate-100'}
                      ${!isSelected && isToday ? 'bg-blue-50 text-blue-600 font-bold' : ''}
                    `}
                  >
                    <span className={`text-sm font-bold ${!isSelected && isSunday ? 'text-rose-500' : !isSelected && isSaturday ? 'text-blue-500' : ''}`}>
                      {date.getDate()}
                    </span>
                    {hasTasks && (
                      <div className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-blue-400'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 일정 상세 패널 */}
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8 flex flex-col">
           <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-800">{selectedDate.getDate()}일 일정</h2>
                <p className="text-slate-400 text-sm font-medium">오늘의 계획을 확인하세요</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(true)} 
                className="p-4 bg-blue-600 text-white rounded-[1.25rem] shadow-xl shadow-blue-100 hover:scale-110 active:scale-95 transition-all"
              >
                <Plus size={24} />
              </button>
           </div>
           
           <div className="flex-1 space-y-4 overflow-y-auto pr-2 max-h-[500px]">
              {tasks.filter(t => t.date === selectedDate.toISOString().split('T')[0]).map(task => (
                <div key={task.id} className="group flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-transparent hover:border-blue-100 hover:bg-white transition-all">
                   <div className="flex items-center gap-4">
                     <button onClick={() => handleToggleTask(task)} className="transition-transform active:scale-90">
                       {task.completed ? (
                         <CheckCircle2 className="text-green-500" size={24} />
                       ) : (
                         <Circle className="text-slate-300" size={24} />
                       )}
                     </button>
                     <span className={`font-bold text-slate-700 transition-all ${task.completed ? 'line-through text-slate-300' : ''}`}>
                       {task.text}
                     </span>
                   </div>
                   <button 
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                   >
                     <Trash2 size={18} />
                   </button>
                </div>
              ))}
              {tasks.filter(t => t.date === selectedDate.toISOString().split('T')[0]).length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                  <Clock size={48} className="mb-4 opacity-20" />
                  <p className="font-bold">일정이 없습니다.</p>
                  <p className="text-xs">새로운 일정을 추가해 보세요!</p>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* 일정 추가 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Plus size={20} />
                </div>
                <h3 className="text-xl font-black text-slate-800">새 일정 추가</h3>
             </div>
             <input 
                autoFocus
                className="w-full p-5 bg-slate-100 rounded-3xl mb-6 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-700 placeholder:text-slate-400" 
                placeholder="어떤 계획이 있으신가요?"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
             />
             <div className="flex gap-3">
                <button 
                  onClick={handleAddTask} 
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-colors"
                >
                  저장하기
                </button>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                >
                  취소
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
