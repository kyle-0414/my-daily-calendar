import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Calendar, 
  MapPin, 
  Plus, 
  Trash2, 
  Plane, 
  AlertCircle, 
  Loader2,
  CheckCircle2
} from 'lucide-react';

// --- Firebase 초기화 (전역 변수 확인 루틴 포함) ---
const getFirebaseConfig = () => {
  try {
    if (typeof __firebase_config !== 'undefined') {
      return JSON.parse(__firebase_config);
    }
  } catch (e) {
    console.error("Firebase config parse error", e);
  }
  return null;
};

const config = getFirebaseConfig();
const app = config ? initializeApp(config) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'trip-manager-v2';

const App = () => {
  const [user, setUser] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState(null);
  
  const [newTrip, setNewTrip] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    budget: ''
  });

  // 1. 인증 프로세스 (RULE 3 준수)
  useEffect(() => {
    if (!auth) {
      setError("Firebase 설정 정보가 누락되었습니다.");
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        // 토큰 우선 순위 적용
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("인증 실패:", err);
        setError(`인증 오류: ${err.message}`);
        setLoading(false);
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // 인증 성공 후 데이터 로딩은 다음 useEffect에서 처리
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. 실시간 데이터 구독 (RULE 1 & 2 준수)
  useEffect(() => {
    if (!user || !db) return;

    // RULE 1: 반드시 /artifacts/{appId}/public/data/ 경로 사용
    const tripsRef = collection(db, 'artifacts', appId, 'public', 'data', 'trips');
    
    // RULE 2: 복잡한 쿼리(orderBy 등) 없이 단순 fetch 후 클라이언트에서 정렬
    const unsubscribe = onSnapshot(tripsRef, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // JS 메모리 내 정렬 (생성일순)
        const sorted = data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setTrips(sorted);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore 구독 오류:", err);
        setError("데이터 접근 권한이 없습니다. (Permission Denied)");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleAddTrip = async (e) => {
    e.preventDefault();
    if (!newTrip.destination || !user || !db) return;

    try {
      const tripsRef = collection(db, 'artifacts', appId, 'public', 'data', 'trips');
      await addDoc(tripsRef, {
        ...newTrip,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewTrip({ destination: '', startDate: '', endDate: '', budget: '' });
    } catch (err) {
      console.error("추가 실패:", err);
    }
  };

  const deleteTrip = async (id) => {
    if (!user || !db) return;
    try {
      const tripDoc = doc(db, 'artifacts', appId, 'public', 'data', 'trips', id);
      await deleteDoc(tripDoc);
    } catch (err) {
      console.error("삭제 실패:", err);
    }
  };

  // 로딩 화면
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-400 font-medium">여행 정보를 동기화하는 중...</p>
      </div>
    );
  }

  // 에러 화면
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200 max-w-sm w-full text-center border border-slate-100">
          <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-3">연결에 실패했습니다</h2>
          <p className="text-slate-500 mb-8 leading-relaxed text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
          >
            시스템 재시작
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
              <Plane className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-black text-slate-900">Trip Planner</h1>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-slate-800 transition-all active:scale-90"
          >
            <Plus size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-black text-slate-900 mb-2">나의 여행 일정</h2>
          <p className="text-slate-400 text-sm font-medium">총 {trips.length}개의 예정된 여행이 있습니다.</p>
        </div>

        <div className="space-y-4">
          {trips.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-100">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="text-slate-300 w-8 h-8" />
              </div>
              <p className="text-slate-400 font-bold">아직 여행 일정이 없어요.</p>
            </div>
          ) : (
            trips.map(trip => (
              <div key={trip.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all group relative overflow-hidden">
                <div className="flex justify-between items-start relative z-10">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-lg">
                      {trip.destination[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-800 mb-1">{trip.destination}</h3>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                          <Calendar size={12} className="text-blue-500" />
                          <span>{trip.startDate || '일정 미정'}</span>
                        </div>
                        {trip.budget && (
                          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                            <span className="text-blue-500 text-[10px] w-3 h-3 border border-blue-500 rounded-full flex items-center justify-center font-serif leading-none">₩</span>
                            <span>{Number(trip.budget).toLocaleString()} 원</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteTrip(trip.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* 추가 모달 */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 overflow-hidden">
            <div className="p-8">
              <h2 className="text-2xl font-black text-slate-900 mb-6">어디로 떠나시나요?</h2>
              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Destination</label>
                  <input 
                    required
                    placeholder="도착지를 입력하세요"
                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all font-bold placeholder:text-slate-300"
                    value={newTrip.destination}
                    onChange={e => setNewTrip({...newTrip, destination: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Start Date</label>
                    <input 
                      type="date"
                      className="w-full px-4 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-xs"
                      value={newTrip.startDate}
                      onChange={e => setNewTrip({...newTrip, startDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Budget</label>
                    <input 
                      type="number"
                      placeholder="예산"
                      className="w-full px-4 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-xs placeholder:text-slate-300"
                      value={newTrip.budget}
                      onChange={e => setNewTrip({...newTrip, budget: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 p-6 flex gap-3">
              <button 
                type="button" 
                onClick={() => setIsAdding(false)} 
                className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                취소
              </button>
              <button 
                onClick={handleAddTrip}
                className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all"
              >
                일정 추가하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
