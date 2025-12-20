import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

/**
 * [환경 변수 안전 로더]
 * 컴파일러 경고를 방지하기 위해 import.meta 대신 
 * 환경별 전역 객체를 안전하게 참조합니다.
 */
const getRawConfig = () => {
  try {
    // 1. 캔버스 미리보기 환경 (__firebase_config)
    if (typeof __firebase_config !== 'undefined') {
      return JSON.parse(__firebase_config);
    }

    // 2. Vercel/Vite 배포 환경 (호환성 있는 방식으로 접근)
    // 전역 process.env 또는 meta.env를 안전하게 검사
    const globalEnv = typeof window !== 'undefined' ? (window as any)._env_ : null;
    const processEnv = typeof process !== 'undefined' ? process.env : null;
    
    // Vite 배포 환경 변수 접근 (문자열 리터럴로 직접 접근하여 컴파일러 최적화 활용)
    const viteEnv = (import.meta as any).env?.VITE_FIREBASE_CONFIG;
    
    const configStr = viteEnv || (processEnv?.VITE_FIREBASE_CONFIG) || globalEnv?.VITE_FIREBASE_CONFIG;
    
    return configStr ? JSON.parse(configStr) : null;
  } catch (e) {
    console.error("Config load error:", e);
    return null;
  }
};

const firebaseConfig = getRawConfig();

export default function App() {
  const [status, setStatus] = useState('시스템 초기화 중...');
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 설정값이 없는 경우 즉시 에러 처리
    if (!firebaseConfig) {
      setError('설정값(VITE_FIREBASE_CONFIG)을 찾을 수 없습니다. 환경 변수를 확인하세요.');
      setStatus('연결 실패');
      return;
    }

    let isMounted = true;

    const startConnection = async () => {
      try {
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);

        // 익명 로그인 시도
        const cred = await signInAnonymously(auth);
        
        if (isMounted) {
          addStatusLog('로그인 시도 성공');
        }

        // 인증 상태 리스너
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          if (isMounted && currentUser) {
            setUser(currentUser);
            setStatus('연결 성공!');
          }
        });

        return unsubscribe;
      } catch (err) {
        if (isMounted) {
          setError(`시스템 에러: ${err.message}`);
          setStatus('연결 실패');
        }
      }
    };

    const addStatusLog = (msg) => {
      console.log(`[Firebase] ${msg}`);
    };

    const cleanupPromise = startConnection();

    return () => {
      isMounted = false;
      cleanupPromise.then(unsub => unsub && unsub());
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900 font-sans p-6 text-center">
      <div className="max-w-md w-full border-4 border-slate-900 p-8 shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] bg-white">
        <h1 className="text-4xl font-black mb-8 uppercase tracking-tighter italic border-b-4 border-slate-900 pb-2">
          Firebase Auth
        </h1>

        <div className={`text-xl font-bold py-4 px-8 mb-8 inline-block border-4 border-slate-900 transition-colors ${user ? 'bg-emerald-400' : 'bg-amber-300'}`}>
          {status}
        </div>

        {user && (
          <div className="text-left bg-slate-100 p-5 border-2 border-slate-900 rounded-sm">
            <p className="text-[10px] uppercase font-black text-slate-500 mb-2 tracking-widest">Active User UID</p>
            <p className="text-xs font-mono break-all font-bold text-slate-800">{user.uid}</p>
          </div>
        )}

        {error && (
          <div className="mt-8 p-4 bg-rose-50 border-4 border-rose-500 text-rose-600 text-sm font-black uppercase">
            {error}
          </div>
        )}

        {!firebaseConfig && !error && (
          <p className="mt-6 text-sm text-slate-400 font-medium">
            Vercel 배포 시 환경 변수명을 <br/>
            <span className="font-mono font-bold text-slate-600 underline">VITE_FIREBASE_CONFIG</span>로 설정하세요.
          </p>
        )}
        
        <button 
          onClick={() => window.location.reload()}
          className="mt-10 w-full bg-slate-900 text-white py-5 font-black text-xl hover:bg-slate-800 transition-transform active:scale-95 uppercase tracking-widest"
        >
          Retry Connection
        </button>
      </div>
      
      <p className="mt-8 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
        Simple Connectivity Diagnostic Tool v1.0
      </p>
    </div>
  );
}
