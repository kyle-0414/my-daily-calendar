import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  query
} from 'firebase/firestore';
import { 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  Send, 
  Database,
  User as UserIcon
} from 'lucide-react';

/**
 * 전역 환경 변수 설정
 * 환경에서 제공하는 값을 사용하거나 기본값을 설정합니다.
 */
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : { apiKey: "", authDomain: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: "" };

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Firebase 초기화 (컴포넌트 외부에서 한 번만 실행)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState(null);

  // 1. 인증 처리 (Rule 3 준수)
  useEffect(() => {
    const initAuth = async () => {
      try {
        setStatus('Authenticating...');
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
        setError("인증에 실패했습니다. 설정을 확인해주세요.");
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) setStatus('Authenticated');
    });

    return () => unsubscribe();
  }, []);

  // 2. 실시간 데이터 페칭 (Rule 1 & 2 준수)
  useEffect(() => {
    if (!user) return;

    setStatus('Connecting to Database...');
    // Rule 1: 지정된 경로 사용 /artifacts/{appId}/public/data/{collection}
    const publicDataRef = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
    
    // Rule 2: 복잡한 쿼리(orderBy 등) 없이 가져온 후 JS에서 정렬
    const q = query(publicDataRef);

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const fetchedItems = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // 클라이언트 사이드 정렬 (최신순)
        const sortedItems = fetchedItems.sort((a, b) => 
          (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        );
        
        setItems(sortedItems);
        setLoading(false);
        setStatus('Ready');
      },
      (err) => {
        console.error("Firestore Error:", err);
        setError("데이터를 불러오는 중 권한 오류가 발생했습니다.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // 데이터 추가 핸들러
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !user) return;

    try {
      const publicDataRef = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
      await addDoc(publicDataRef, {
        text: inputValue,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setInputValue('');
    } catch (err) {
      console.error("Add Doc Error:", err);
      setError("메시지 전송에 실패했습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* 헤더 섹션 */}
        <header className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Database className="text-blue-500" />
              Cloud Messenger
            </h1>
            <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${
              user ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {user ? <CheckCircle2 size={14} /> : <Loader2 size={14} className="animate-spin" />}
              {status}
            </div>
          </div>
          
          {user && (
            <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 p-3 rounded-lg overflow-hidden">
              <UserIcon size={16} />
              <span className="truncate">UID: {user.uid}</span>
            </div>
          )}
        </header>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">문제가 발생했습니다</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </div>
        )}

        {/* 입력 섹션 */}
        <form onSubmit={handleAddItem} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={user ? "메시지를 입력하세요..." : "로그인 대기 중..."}
            disabled={!user}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-100 transition-all"
          />
          <button
            type="submit"
            disabled={!user || !inputValue.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            <Send size={18} />
            전송
          </button>
        </form>

        {/* 리스트 섹션 */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider ml-1">
            최근 메시지 ({items.length})
          </h2>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p>데이터를 불러오는 중...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-12 text-center text-slate-400">
              <p>아직 등록된 메시지가 없습니다.</p>
              <p className="text-xs">첫 번째 메시지를 남겨보세요!</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {items.map((item) => (
                <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center group animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <span className="text-slate-700">{item.text}</span>
                  <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded">
                    {item.createdAt?.seconds 
                      ? new Date(item.createdAt.seconds * 1000).toLocaleTimeString() 
                      : 'Sending...'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
