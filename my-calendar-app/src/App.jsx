import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * 환경 변수 감지 로직 (에러 방지를 위해 try-catch 강화)
 */
const getFirebaseConfig = () => {
  try {
    // 1. Vite / Vercel 환경 변수 확인
    const viteConfig = typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_CONFIG;
    if (viteConfig) return JSON.parse(viteConfig);

    // 2. 캔버스 미리보기 전역 변수 확인
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
      return JSON.parse(__firebase_config);
    }

    // 3. process.env 확인 (기타 환경)
    if (typeof process !== 'undefined' && process.env?.VITE_FIREBASE_CONFIG) {
      return JSON.parse(process.env.VITE_FIREBASE_CONFIG);
    }
  } catch (e) {
    return { error: "설정 데이터 파싱 중 오류가 발생했습니다." };
  }
  return null;
};

const configCandidate = getFirebaseConfig();
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function App() {
  const [log, setLog] = useState([]);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(configCandidate?.error || null);

  const addLog = (msg) => setLog(prev => [...prev, `> ${msg}`]);

  useEffect(() => {
    if (!configCandidate || configCandidate.error) {
      setError(configCandidate?.error || "설정값을 찾을 수 없습니다. 환경 변수를 확인해주세요.");
      return;
    }

    let isMounted = true;

    const initializeDiagnostic = async () => {
      try {
        addLog("시스템 초기화 시작...");
        const app = initializeApp(configCandidate);
        const auth = getAuth(app);
        const db = getFirestore(app);

        // 인증 처리
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          addLog("커스텀 토큰 인증 시도...");
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          addLog("익명 로그인 세션 연결 중...");
          await signInAnonymously(auth);
        }

        onAuthStateChanged(auth, (currentUser) => {
          if (isMounted) {
            setUser(currentUser);
            if (currentUser) {
              addLog("인증 완료: 세션이 활성화되었습니다.");
            }
          }
        });

      } catch (err) {
        if (isMounted) {
          addLog(`에러 발생: ${err.message}`);
          setError(err.message);
        }
      }
    };

    initializeDiagnostic();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 p-4 md:p-10 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Firebase 연결 상태 진단</h1>
            <p className="text-xs text-zinc-500 mt-1">App ID: {appId}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${user ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'}`}>
            {user ? 'Connected' : 'Connecting'}
          </div>
        </div>

        {/* Status Card */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg">
            <div className="flex items-center space-x-2 text-red-500 font-bold text-sm mb-1">
              <span>⚠</span>
              <span>진단 오류</span>
            </div>
            <p className="text-xs text-red-400 leading-relaxed">{error}</p>
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase mb-3">사용자 세션</h2>
            <div className="space-y-1">
              <p className="text-[10px] text-zinc-500">User UID</p>
              <p className="text-sm font-mono break-all text-white">{user ? user.uid : '대기 중...'}</p>
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase mb-3">설정 상태</h2>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${configCandidate ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <p className="text-sm text-white">{configCandidate ? 'Firebase Config 로드됨' : 'Config 누락'}</p>
            </div>
          </div>
        </div>

        {/* Console Logs */}
        <div className="bg-black rounded-xl border border-zinc-800 overflow-hidden">
          <div className="bg-zinc-900/50 px-4 py-2 text-[10px] font-bold text-zinc-500 border-b border-zinc-800">
            SYSTEM CONSOLE
          </div>
          <div className="p-4 h-64 overflow-y-auto font-mono text-xs space-y-2">
            {log.map((entry, i) => (
              <div key={i} className="flex space-x-2">
                <span className="text-zinc-700">[{i+1}]</span>
                <span className={entry.includes('에러') ? 'text-red-400' : 'text-green-400'}>{entry}</span>
              </div>
            ))}
            {log.length === 0 && <p className="text-zinc-800 italic">로그를 기다리는 중...</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button 
            onClick={() => window.location.reload()}
            className="flex-1 bg-white text-black py-3 rounded-lg font-bold text-sm hover:bg-zinc-200 transition-all active:scale-95"
          >
            시스템 새로고침
          </button>
          <button 
            onClick={() => {
               const dummy = document.createElement('textarea');
               document.body.appendChild(dummy);
               dummy.value = user?.uid || 'no-uid';
               dummy.select();
               document.execCommand('copy');
               document.body.removeChild(dummy);
            }}
            className="flex-1 bg-zinc-800 text-white py-3 rounded-lg font-bold text-sm hover:bg-zinc-700 transition-all"
          >
            UID 복사하기
          </button>
        </div>

        {/* Help Footer */}
        <footer className="text-[11px] text-zinc-600 leading-relaxed border-t border-zinc-900 pt-6">
          <p className="mb-2 font-bold text-zinc-500">도움말:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Vercel 배포 시 VITE_FIREBASE_CONFIG 환경 변수가 정확한지 확인하세요.</li>
            <li>설정값은 유효한 JSON 형식이어야 하며 큰따옴표를 사용해야 합니다.</li>
            <li>연결이 되지 않을 경우 Firebase 콘솔의 Authentication 탭에서 익명 로그인이 활성화되어 있는지 확인하세요.</li>
          </ul>
        </footer>
      </div>
    </div>
  );
}
