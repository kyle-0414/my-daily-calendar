import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * [강력한 설정 로더]
 * 1. Vite 전용 환경 변수 (Vercel 배포용)
 * 2. 전역 변수 (캔버스 미리보기용)
 */
const getFirebaseConfig = () => {
  try {
    // 1. Vite 환경 변수 확인 (import.meta.env 사용)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_FIREBASE_CONFIG) {
      return JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG);
    }

    // 2. 캔버스 전역 변수 확인
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
      return JSON.parse(__firebase_config);
    }

    // 3. 일반 process.env 확인 (기타 환경)
    if (typeof process !== 'undefined' && process.env && process.env.VITE_FIREBASE_CONFIG) {
      return JSON.parse(process.env.VITE_FIREBASE_CONFIG);
    }
  } catch (e) {
    console.error("Firebase Configuration Error:", e);
  }
  return null;
};

const firebaseConfig = getFirebaseConfig();
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function App() {
  const [status, setStatus] = useState({
    initialized: false,
    authStatus: '초기화 중...',
    error: null
  });
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!firebaseConfig) {
      setStatus(s => ({ ...s, error: 'Firebase 설정을 찾을 수 없습니다. 환경 변수를 확인해주세요.' }));
      return;
    }

    try {
      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const db = getFirestore(app);

      const initAuth = async () => {
        try {
          if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
          } else {
            await signInAnonymously(auth);
          }
        } catch (err) {
          console.error("Auth Error:", err);
          setStatus(s => ({ ...s, authStatus: `인증 실패: ${err.message}` }));
        }
      };

      initAuth();

      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          setStatus(s => ({ 
            ...s, 
            initialized: true, 
            authStatus: `연결됨 (UID: ${currentUser.uid})` 
          }));
        }
      });

      return () => unsubscribe();
    } catch (err) {
      setStatus(s => ({ ...s, error: `Firebase 초기화 실패: ${err.message}` }));
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-white mb-6 border-b border-slate-800 pb-4">
          Firebase 연결 진단
        </h1>

        {status.error ? (
          <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-lg text-red-400 text-sm mb-4">
            <strong>⚠️ 오류:</strong> {status.error}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">설정 로드 상태</span>
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded">성공</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">인증 상태</span>
              <span className="text-sm font-mono text-blue-400">{status.authStatus}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">App ID</span>
              <span className="text-sm font-mono text-slate-500">{appId}</span>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <p className="text-xs text-slate-500 leading-relaxed italic">
                * Vercel 배포 시에는 <strong>VITE_FIREBASE_CONFIG</strong>를 사용하고, 
                현재 미리보기 환경에서는 <strong>__firebase_config</strong>를 자동으로 사용합니다.
              </p>
            </div>
          </div>
        )}

        <button 
          onClick={() => window.location.reload()}
          className="w-full mt-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20"
        >
          재시도
        </button>
      </div>
    </div>
  );
}
