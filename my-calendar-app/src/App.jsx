import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, query } from 'firebase/firestore';
import { ShieldAlert, Database, Key, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

/**
 * 1. 환경 변수 체크 (가장 빈번한 문제 원인)
 */
const rawConfig = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
const firebaseConfig = rawConfig ? JSON.parse(rawConfig) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'MISSING_APP_ID';

export default function App() {
  const [step, setStep] = useState({
    config: !!firebaseConfig,
    auth: false,
    firestore: false
  });
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  const addLog = (msg) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  useEffect(() => {
    if (!firebaseConfig) {
      setError("Firebase 설정(Config)을 찾을 수 없습니다. 환경 변수 주입이 필요합니다.");
      return;
    }

    try {
      addLog("Firebase 초기화 중...");
      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const db = getFirestore(app);

      addLog("익명 로그인 시도...");
      signInAnonymously(auth)
        .then(() => {
          setStep(prev => ({ ...prev, auth: true }));
          addLog("로그인 성공!");
        })
        .catch(err => {
          setError(`로그인 실패: ${err.message}`);
          addLog(`에러 발생: ${err.code}`);
        });

      onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          addLog(`사용자 연결됨: ${currentUser.uid}`);
          
          // Firestore 연결 테스트
          addLog("데이터베이스 연결 테스트 중...");
          const testPath = collection(db, 'artifacts', appId, 'public', 'data', 'connection_test');
          const q = query(testPath);
          
          const unsubscribe = onSnapshot(q, 
            () => {
              setStep(prev => ({ ...prev, firestore: true }));
              addLog("데이터베이스 연결 성공!");
            },
            (err) => {
              addLog(`DB 에러: ${err.code} - 권한 규칙을 확인하세요.`);
              // Rule 1 위반 시 여기가 빨간색이 됩니다.
            }
          );
          return () => unsubscribe();
        }
      });
    } catch (err) {
      setError(`초기화 오류: ${err.message}`);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-mono">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-700 pb-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <RefreshCw className="animate-spin text-blue-400" size={20} />
            시스템 연결 진단 도구
          </h1>
          <button onClick={() => window.location.reload()} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded">
            강제 새로고침
          </button>
        </div>

        {/* 진단 대시보드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatusCard 
            title="Config 주입" 
            active={step.config} 
            icon={<Key size={20} />} 
            desc={firebaseConfig?.projectId || "비어있음"}
          />
          <StatusCard 
            title="인증 서비스" 
            active={step.auth} 
            icon={<CheckCircle size={20} />} 
            desc={user ? "Session Active" : "Waiting..."}
          />
          <StatusCard 
            title="DB 권한" 
            active={step.firestore} 
            icon={<Database size={20} />} 
            desc={`ID: ${appId.substring(0, 8)}...`}
          />
        </div>

        {/* 치명적 에러 표시 */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-lg flex gap-3 text-red-200">
            <ShieldAlert className="shrink-0" />
            <div>
              <p className="font-bold underline text-sm uppercase">Critical Connection Error</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* 시스템 로그 콘솔 */}
        <div className="bg-black/50 rounded-lg p-4 h-64 overflow-y-auto border border-slate-700">
          <p className="text-[10px] text-slate-500 mb-2 font-bold uppercase tracking-widest border-b border-slate-800 pb-1">
            Real-time System Logs
          </p>
          {logs.map((log, i) => (
            <div key={i} className="text-xs mb-1.5 flex gap-2">
              <span className="text-blue-500 shrink-0">→</span>
              <span className={log.includes('에러') || log.includes('실패') ? 'text-red-400' : 'text-slate-300'}>
                {log}
              </span>
            </div>
          ))}
          {logs.length === 0 && <p className="text-xs text-slate-600">진단 시작 중...</p>}
        </div>

        <div className="text-[10px] text-slate-500 text-center">
          모든 항목이 초록색인데도 반응이 없다면, 브라우저 상단의 주소창 옆 '새로고침' 버튼을 꾹 눌러 '캐시 비우기 및 강력 새로고침'을 해주세요.
        </div>
      </div>
    </div>
  );
}

function StatusCard({ title, active, icon, desc }) {
  return (
    <div className={`p-4 rounded-xl border transition-all ${
      active ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-slate-800/50 border-slate-700 text-slate-500'
    }`}>
      <div className="flex items-center gap-3 mb-2">
        {active ? icon : <XCircle size={20} />}
        <span className="font-bold text-sm">{title}</span>
      </div>
      <p className="text-[10px] opacity-70 truncate font-mono">{desc}</p>
    </div>
  );
}
