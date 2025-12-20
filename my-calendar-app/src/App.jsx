import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  query,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Calendar, 
  MapPin, 
  Plus, 
  Trash2, 
  Plane, 
  ChevronRight,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react';

// --- Firebase 초기화 로직 ---
let db, auth, appId;
try {
  const firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG);
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  appId = "trip-master-v1"; // 고정 앱 ID
} catch (error) {
  console.error("Firebase 설정 오류:", error);
}

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

  // 1. 인증 처리
  useEffect(() => {
    if (!auth) {
      setError("Firebase 설정이 올바르지 않습니다. 환경 변수를 확인하세요.");
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth Error:", err);
        setError("인증에 실패했습니다.");
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  // 2. 실시간 데이터 페칭
  useEffect(() => {
    if (!user || !db) return;

    // 규칙 준수: /artifacts/{appId}/public/data/{collectionName}
    const tripsRef = collection(db, 'artifacts', appId, 'public', 'data', 'trips');
    
    const unsubscribe = onSnapshot(tripsRef, 
      (snapshot) => {
        const tripData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // 클라이언트 사이드 정렬 (최신순)
        setTrips(tripData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
        setLoading(false);
      },
      (err) => {
        console.error("Firestore Error:", err);
        setError("데이터를 불러오는 중 권한 오류가 발생했습니다.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleAddTrip = async (e) => {
    e.preventDefault();
    if (!newTrip.destination || !user) return;

    try {
      const tripsRef = collection(db, 'artifacts', appId, 'public', 'data', 'trips');
      await addDoc(tripsRef, {
        ...newTrip,
        userId: user.uid,
        createdAt: serverTimestamp(),
        status: 'planned'
      });
      setIsAdding(false);
      setNewTrip({ destination: '', startDate: '', endDate: '', budget: '' });
    } catch (err) {
      console.error("Add Trip Error:", err);
      alert("저장에 실패했습니다.");
    }
  };

  const deleteTrip = async (id) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    try {
      const tripDoc = doc(db, 'artifacts', appId, 'public', 'data', 'trips', id);
      await deleteDoc(tripDoc);
    } catch (err) {
      console.error("Delete Error:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">여행 데이터를 연결하는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-red-100">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">연결 오류 발생</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold"
          >
            다시 시도하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className="text-blue-600 w-6 h-6" />
            <h1 className="text-xl font-bold text-slate-800">TripMaster Pro</h1>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-100"
          >
            <Plus size={18} /> 여행 추가
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid gap-4">
          {trips.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <MapPin className="mx-auto text-slate-300 w-12 h-12 mb-4" />
              <p className="text-slate-500">아직 등록된 여행이 없습니다.</p>
            </div>
          ) : (
            trips.map(trip => (
              <div key={trip.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center group">
                <div className="flex items-center gap-5">
                  <div className="bg-blue-50 text-blue-600 p-4 rounded-xl font-bold text-lg">
                    {trip.destination[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">{trip.destination}</h3>
                    <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                      <Calendar size={14} />
                      <span>{trip.startDate || '일정 미정'}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => deleteTrip(trip.id)}
                  className="text-slate-300 hover:text-red-500 p-2 transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))
          )}
        </div>
      </main>

      {/* 추가 모달 */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <form onSubmit={handleAddTrip} className="p-8">
              <h2 className="text-2xl font-bold mb-6">어디로 떠나시나요?</h2>
              <div className="space-y-4">
                <input 
                  required
                  placeholder="목적지"
                  className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newTrip.destination}
                  onChange={e => setNewTrip({...newTrip, destination: e.target.value})}
                />
                <input 
                  type="date"
                  className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newTrip.startDate}
                  onChange={e => setNewTrip({...newTrip, startDate: e.target.value})}
                />
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-4 font-bold text-slate-500">취소</button>
                  <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100">일정 추가</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
