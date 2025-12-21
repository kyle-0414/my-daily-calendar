// src/App.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  CheckCircle2,
  Calendar as CalendarIcon,
  Clock,
  Loader2,
  LayoutGrid,
  Settings,
  Bell,
  Search,
  CheckSquare,
  BarChart3,
} from "lucide-react";

// ✅ 변경: firebase 초기화는 firebase.js에서만 처리
import { auth, db, appId } from "./firebase";

import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
} from "firebase/firestore";

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [searchTerm, setSearchTerm] = useState("");

  // Helper to format date to YYYY-MM-DD consistently
  const formatDate = (date) => {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  };

  // ✅ 변경: Vercel+Vite 환경에서는 익명 로그인만 사용 (성공했던 방식)
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth Error:", error);
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const tasksCollection = collection(
      db,
      "artifacts",
      appId,
      "users",
      user.uid,
      "tasks"
    );

    const unsubscribe = onSnapshot(
      query(tasksCollection),
      (snapshot) => {
        setTasks(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
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
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({
        day: i,
        dateStr,
        currentMonth: true,
        tasks: tasks.filter((t) => t.date === dateStr),
      });
    }
    return days;
  }, [currentDate, tasks]);

  const handleAddTask = async () => {
    if (!newTask.trim() || !user) return;

    const dateStr = formatDate(selectedDate);
    const taskId = crypto.randomUUID();

    try {
      await setDoc(doc(db, "artifacts", appId, "users", user.uid, "tasks", taskId), {
        date: dateStr,
        text: newTask,
        completed: false,
        priority: newPriority,
        createdAt: new Date().toISOString(),
      });

      setNewTask("");
      setIsModalOpen(false);
    } catch (error) {
      console.error("Add Error:", error);
    }
  };

  const toggleTask = async (id, status) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "artifacts", appId, "users", user.uid, "tasks", id), {
        completed: !status,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const deleteTask = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "artifacts", appId, "users", user.uid, "tasks", id));
    } catch (error) {
      console.error(error);
    }
  };

  const jumpToTaskDate = (dateStr) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const targetDate = new Date(year, month - 1, day);
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(targetDate);
    setSearchTerm("");
  };

  const displayTasks = useMemo(() => {
    if (searchTerm.trim() === "") {
      const selectedDateStr = formatDate(selectedDate);
      return tasks.filter((t) => t.date === selectedDateStr);
    }
    return tasks.filter((t) => t.text.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [tasks, selectedDate, searchTerm]);

  const progress = useMemo(() => {
    const selectedDateStr = formatDate(selectedDate);
    const todaysTasks = tasks.filter((t) => t.date === selectedDateStr);
    if (todaysTasks.length === 0) return 0;
    return Math.round((todaysTasks.filter((t) => t.completed).length / todaysTasks.length) * 100);
  }, [tasks, selectedDate]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900">
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
            { icon: <LayoutGrid size={18} />, label: "Dashboard", active: true },
            { icon: <CalendarIcon size={18} />, label: "Schedule", active: false },
            { icon: <BarChart3 size={18} />, label: "Analytics", active: false },
            { icon: <Settings size={18} />, label: "Settings", active: false },
          ].map((item, i) => (
            <button
              key={i}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                item.active
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              }`}
            >
              {item.icon}
              <span className="hidden lg:block text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="px-3 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold ring-2 ring-white">
              JD
            </div>
            <div className="hidden lg:block overflow-hidden">
              <p className="text-xs font-bold text-slate-700 truncate">Jane Doe</p>
              <p className="text-[10px] text-slate-400 truncate tracking-tight uppercase font-bold">
                Workspace
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* 2. Calendar Section */}
        <section className="flex-1 flex flex-col bg-white overflow-hidden">
          <header className="px-8 py-6 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-6">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
              </h2>
              <div className="flex bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() =>
                    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
                  }
                  className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-500"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() =>
                    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
                  }
                  className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-500"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setCurrentDate(new Date());
                  setSelectedDate(new Date());
                }}
                className="text-xs font-bold px-5 py-2.5 hover:bg-slate-50 rounded-xl border border-slate-200 transition-all active:scale-95 bg-white text-slate-600"
              >
                Today
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                <div
                  key={d}
                  className={`py-4 text-[10px] font-black uppercase tracking-[0.2em] bg-slate-50 text-center ${
                    i === 0 ? "text-rose-500" : i === 6 ? "text-blue-500" : "text-slate-400"
                  }`}
                >
                  {d}
                </div>
              ))}

              {calendarDays.map((item, idx) => {
                const dayDateStr = item.dateStr;
                const isSelected = item.day && formatDate(selectedDate) === dayDateStr;
                const isToday = item.day && formatDate(new Date()) === dayDateStr;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (item.day) {
                        const [y, m, d] = item.dateStr.split("-").map(Number);
                        setSelectedDate(new Date(y, m - 1, d));
                      }
                    }}
                    className={`min-h-[120px] p-3 bg-white transition-all cursor-pointer group relative
                      ${!item.currentMonth ? "bg-slate-50/40 opacity-40" : "hover:bg-indigo-50/30"}
                      ${isSelected ? "z-10 ring-4 ring-inset ring-indigo-500/10 bg-indigo-50/20" : ""}`}
                  >
                    {item.day && (
                      <div className="h-full flex flex-col">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 text-sm font-bold rounded-xl mb-3 transition-all
                          ${
                            isToday
                              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                              : isSelected
                              ? "text-indigo-600 font-black"
                              : "text-slate-500"
                          }`}
                        >
                          {item.day}
                        </span>
                        <div className="flex-1 space-y-1.5">
                          {item.tasks.slice(0, 3).map((t) => (
                            <div
                              key={t.id}
                              className={`text-[10px] px-2 py-1 rounded-lg border truncate transition-all ${
                                t.completed
                                  ? "bg-slate-50 text-slate-300 border-transparent line-through"
                                  : "bg-white border-slate-100 text-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                              }`}
                            >
                              {t.text}
                            </div>
                          ))}
                          {item.tasks.length > 3 && (
                            <p className="text-[9px] text-slate-300 font-bold pl-1">
                              +{item.tasks.length - 3} more
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 3. Panel Section */}
        <aside className="w-80 lg:w-[400px] bg-slate-50 border-l border-slate-100 p-6 flex flex-col gap-6 overflow-hidden">
          {/* Top Search & Utilities */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative group">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
                size={16}
              />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-100 rounded-2xl text-xs font-medium focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all shadow-sm"
              />
            </div>
            <button className="p-2.5 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 hover:shadow-md transition-all">
              <Bell size={18} />
            </button>
          </div>

          {/* Tasks Main Card */}
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
            <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base tracking-tight text-slate-900">
                  {searchTerm.trim() !== "" ? "Search Results" : "Tasks"}
                </h3>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">
                  {searchTerm.trim() !== "" ? `${displayTasks.length} Found` : formatDate(selectedDate)}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-8 h-8 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
              {displayTasks.length > 0 ? (
                displayTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => searchTerm.trim() !== "" && jumpToTaskDate(task.date)}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all
                    ${
                      searchTerm.trim() !== ""
                        ? "hover:border-indigo-200 cursor-pointer bg-slate-50/50"
                        : "bg-white border-slate-50 hover:border-slate-200 hover:shadow-md"
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTask(task.id, task.completed);
                      }}
                      className={`shrink-0 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all 
                      ${
                        task.completed
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-slate-200 bg-white hover:border-indigo-400"
                      }`}
                    >
                      {task.completed && <CheckCircle2 size={12} />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-bold truncate ${
                          task.completed ? "text-slate-300 line-through" : "text-slate-700"
                        }`}
                      >
                        {task.text}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            task.priority === "high"
                              ? "bg-rose-500"
                              : task.priority === "medium"
                              ? "bg-indigo-500"
                              : "bg-slate-300"
                          }`}
                        />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                          {task.priority}
                        </span>
                      </div>
                    </div>

                    {searchTerm.trim() === "" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTask(task.id);
                        }}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 py-8">
                  <Clock size={24} className="opacity-20 mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                    Empty List
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 4. Productivity Progress Card (Compact Style) */}
          <div className="bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] relative overflow-hidden transition-all hover:shadow-md">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-800 tracking-tight">Productivity</h4>
                <span className="text-3xl font-black text-slate-900 tracking-tighter">
                  {progress}%
                </span>
              </div>

              <div className="space-y-2">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">
                    Active Tracker
                  </p>
                  <p className="text-[8px] text-indigo-600 font-black uppercase tracking-widest">
                    Daily Goal
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Modern Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl border border-white/20 animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xl font-black tracking-tight text-slate-900">New Task</h4>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-all"
                >
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block">
                    Task Description
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                    placeholder="Enter task..."
                    className="w-full p-4 bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl outline-none transition-all text-sm font-bold shadow-inner"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block">
                    Priority Level
                  </label>
                  <div className="flex gap-2">
                    {["high", "medium", "low"].map((p) => (
                      <button
                        key={p}
                        onClick={() => setNewPriority(p)}
                        className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2
                        ${
                          newPriority === p
                            ? "bg-slate-900 border-slate-900 text-white shadow-lg translate-y-[-1px]"
                            : "bg-white text-slate-400 border-slate-50 hover:bg-slate-50"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={handleAddTask}
                  className="w-full py-4 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl font-black text-sm shadow-lg shadow-indigo-200 transition-all active:scale-95"
                >
                  Create Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
