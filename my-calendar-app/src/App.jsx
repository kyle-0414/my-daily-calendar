import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, query, onSnapshot } from 'firebase/firestore';

/**
 * [핵심 로직] Vercel과 캔버스 환경 모두를 지원하는 환경 변수 로더
 */
const getFirebaseConfig = () => {
  try {
    // 1. Vercel 배포 환경 변수 (VITE_ 로 시작하는 환경 변수)
    // 컴파일 에러를 방지하기 위해 window나 process 객체를 통해 접근합니다.
    const envConfig = typeof process !== 'undefined' && process.env?.VITE_FIREBASE_CONFIG;
    if (envConfig) return JSON.parse(envConfig);

    // 2. 캔버스 미리보기 환경 변수
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
      return JSON.parse(__firebase_config);
    }
  } catch (e) {
    console.error("Firebase 설정 로드 실패:", e);
  }
  return null;
};

const firebaseConfig = getFirebaseConfig();
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function App() {
  const [status, setStatus] = useState({
    env: '검사 중...',
    auth: '대기 중...',
    configFound: !!firebaseConfig
  });
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!firebaseConfig) return;

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    // 인증 처리 (RULE 3 준수)
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        setStatus(prev => ({ ...prev, auth: `인증 에러: ${err.message}` }));
      }
    };

    initAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setStatus(prev => ({ ...prev, auth: `연결됨 (UID: ${currentUser.uid.substring(0, 8)}...)` }));
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <div className="max-w-2xl mx-auto bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span className="text-blue-400">🚀</span> 시스템 환경 연결 진단
        </h1>

        <div className="space-y-4">
          <div className="p-4 bg-gray-700 rounded-lg flex justify-between items-center">
            <span>Firebase 설정 감지</span>
            <span className={status.configFound ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
              {status.configFound ? "성공" : "실패"}
            </span>
          </div>

          <div className="p-4 bg-gray-700 rounded-lg flex justify-between items-center">
            <span>인증 상태</span>
            <span className="text-blue-300 font-mono text-sm">{status.auth}</span>
          </div>

          <div className="p-4 bg-gray-700 rounded-lg flex justify-between items-center">
            <span>현재 App ID</span>
            <span className="text-yellow-400 font-mono text-sm">{appId}</span>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-900/30 border border-blue-800 rounded-lg">
          <h2 className="text-sm font-semibold text-blue-300 mb-2">💡 팁</h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            Vercel에 등록하신 <code className="bg-black/50 px-1 rounded text-pink-400">VITE_FIREBASE_CONFIG</code> 키는 
            변경하지 않으셔도 됩니다. 위 코드가 실행될 때 Vercel 환경인지 미리보기 환경인지 자동으로 판단하여 
            설정값을 읽어옵니다.
          </p>
        </div>

        <button 
          onClick={() => window.location.reload()}
          className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-500 transition-colors rounded-lg font-bold"
        >
          상태 새로고침
        </button>
      </div>
    </div>
  );
}
