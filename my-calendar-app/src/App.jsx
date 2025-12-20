import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * 환경 변수 및 설정을 감지하는 최적화된 로직
 */
const getFirebaseConfig = () => {
  try {
    // 1. Vite 전용 (Vercel 배포 환경에서 가장 우선순위)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_CONFIG) {
      return JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG);
    }

    // 2. 캔버스(미리보기) 전역 변수
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
      return JSON.parse(__firebase_config);
    }

    // 3. 대체 수단 (process.env)
    if (typeof process !== 'undefined' && process.env?.VITE_FIREBASE_CONFIG) {
      return JSON.parse(process.env.VITE_FIREBASE_CONFIG);
    }
  } catch (e) {
    return { error: `JSON 파싱 실패: ${e.message}` };
  }
  return null;
};

const configCandidate = getFirebaseConfig();
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function App() {
  const [log, setLog] = useState([]);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(configCandidate?.error || null);

  const addLog = (msg) => setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  useEffect(() => {
    if (!configCandidate || configCandidate.error) {
      setError(configCandidate?.error || "환경 변수(VITE_FIREBASE_CONFIG)를 찾을 수 없습니다.");
      return;
    }

    try {
      addLog("Firebase 초기화 시도 중...");
      const app = initializeApp(configCandidate);
      const auth = getAuth(app);
      const db = getFirestore(app);

      const initAuth = async () => {
        try {
          if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            addLog("Custom Token으로 로그인 시도...");
            await signInWithCustomToken(auth, __initial_auth_token);
          } else {
            addLog("익명 로그인 시도...");
            await signInAnonymously(auth);
          }
        } catch (err) {
          addLog(`인증 에러: ${err.message}`);
          setError(`인증 실패: ${err.message}`);
        }
      };

      initAuth();

      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          addLog(`로그인 성공! UID: ${currentUser.uid}`);
        }
      });

      return () => unsubscribe();
    } catch (err) {
      addLog(`초기화 치명적 에러: ${err.message}`);
      setError(err.message);
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-8 font-mono">
      <div className="max-w-2xl mx-auto border border-zinc-800 rounded-lg overflow-hidden shadow-2xl">
        <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="text-xs text-zinc-500">System Diagnostic Tool</span>
        </div>

        <div className="p-6 space-y-4">
          {error ? (
            <div className="p-4 bg-red-900/20 border border-red-500/50 rounded text-red-400">
              <h2 className="font-bold mb-1 text-sm uppercase">Diagnostic Error</h2>
              <p className="text-xs">{error}</p>
            </div>
          ) : (
            <div className="p-4 bg-green-900/20 border border-green-500/50 rounded text-green-400">
              <h2 className="font-bold mb-1 text-sm uppercase">System Online</h2>
              <p className="text-[10px] opacity-80">Firebase SDK가 정상적으로 설정값을 읽었습니다.</p>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-zinc-400 text-[10px] uppercase tracking-widest">Logs</h3>
            <div className="bg-zinc-950 p-4 rounded border border-zinc-800 h-48 overflow-y-auto text-[11px] space-y-1">
              {log.length === 0 && <span className="text-zinc-700">No logs available...</span>}
              {log.map((line, i) => (
                <div key={i} className={line.includes('에러') || line.includes('실패') ? 'text-red-400' : 'text-zinc-300'}>
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-[11px]">
            <div className="p-3 bg-zinc-900 rounded border border-zinc-800">
              <div className="text-zinc-500 mb-1 uppercase tracking-tighter">Auth UID</div>
              <div className="truncate font-bold">{user ? user.uid : 'NOT_LOGGED_IN'}</div>
            </div>
            <div className="p-3 bg-zinc-900 rounded border border-zinc-800">
              <div className="text-zinc-500 mb-1 uppercase tracking-tighter">App Target</div>
              <div className="truncate font-bold">{appId}</div>
            </div>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-white text-black text-sm font-bold rounded hover:bg-zinc-200 transition-colors"
          >
            REFRESH SYSTEM
          </button>
        </div>
      </div>
      
      <div className="mt-8 max-w-2xl mx-auto text-[10px] text-zinc-600 space-y-3 leading-relaxed border-t border-zinc-900 pt-6">
        <p>💡 <b>Vercel Config Guide</b>: 대시보드 환경 변수 섹션에서 키(Key) 이름은 <code>VITE_FIREBASE_CONFIG</code>로 지정하세요.</p>
        <p>💡 <b>JSON Format</b>: 값(Value) 입력 시 중괄호로 시작하고 끝나는 순수 JSON 객체 형태여야 합니다.</p>
      </div>
    </div>
  );
}
