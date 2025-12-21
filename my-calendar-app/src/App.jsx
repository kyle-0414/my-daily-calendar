import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  limit 
} from 'firebase/firestore';

const App = () => {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('initial');
  const [user, setUser] = useState(null);

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev, { 
      id: Date.now() + Math.random(), 
      msg: typeof msg === 'object' ? JSON.stringify(msg) : msg, 
      type, 
      time: new Date().toLocaleTimeString() 
    }]);
  };

  useEffect(() => {
    const runDiagnostic = async () => {
      addLog('진단을 시작합니다...');

      // 1. Firebase Config 확인
      let config;
      try {
        config = JSON.parse(__firebase_config);
        addLog('Firebase 설정 로드 성공');
      } catch (err) {
        addLog('Firebase 설정 로드 실패 (JSON Parse Error)', 'error');
        setStatus('error');
        return;
      }

      // 2. Firebase 초기화
      const app = initializeApp(config);
      const auth = getAuth(app);
      const db = getFirestore(app);
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'diag-app-id';
      addLog(`App ID: ${appId}`);

      // 3. 인증 시도
      try {
        addLog('인증 시도 중...');
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          addLog('Custom Token 사용 시도');
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          addLog('익명 로그인 시도');
          await signInAnonymously(auth);
        }
      } catch (err) {
        addLog(`인증 실패: ${err.message}`, 'error');
        setStatus('error');
      }

      // 4. Auth 상태 변경 감시
      onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          addLog(`인증 성공! UID: ${currentUser.uid}`, 'success');
          
          // 5. Firestore 읽기 테스트
          try {
            addLog('Firestore 데이터 읽기 시도 중...');
            // 규칙 확인을 위해 가장 기본적인 경로 시도
            const testPath = `artifacts/${appId}/public/data/test_collection`;
            addLog(`타겟 경로: ${testPath}`);
            
            const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'test_collection'), limit(1));
            await getDocs(q);
            
            addLog('Firestore 연결 성공!', 'success');
            setStatus('connected');
          } catch (err) {
            addLog(`Firestore 에러 (권한 부족 가능성): ${err.code} - ${err.message}`, 'error');
            setStatus('db_error');
          }
        } else {
          addLog('로그아웃 상태 또는 인증 대기 중...');
        }
      });
    };

    runDiagnostic();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 font-mono">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 border-b border-gray-700 pb-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-400">Firebase Connectivity Debugger</h1>
          <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
            status === 'connected' ? 'bg-green-900 text-green-300' :
            status === 'error' || status === 'db_error' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300'
          }`}>
            {status}
          </div>
        </header>

        <section className="bg-black rounded-lg p-4 shadow-xl border border-gray-800 h-[500px] overflow-y-auto">
          {logs.map(log => (
            <div key={log.id} className="mb-2 text-sm flex">
              <span className="text-gray-500 mr-3 shrink-0">[{log.time}]</span>
              <span className={
                log.type === 'error' ? 'text-red-400' :
                log.type === 'success' ? 'text-green-400' : 'text-blue-300'
              }>
                {log.type === 'error' ? '✖ ' : log.type === 'success' ? '✔ ' : 'ℹ '}
                {log.msg}
              </span>
            </div>
          ))}
          {status === 'initial' && <div className="animate-pulse text-gray-500">대기 중...</div>}
        </section>

        {user && (
          <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <h2 className="text-sm font-bold text-gray-400 mb-2 uppercase">현재 세션 정보</h2>
            <p className="text-xs">User ID: <span className="text-yellow-400">{user.uid}</span></p>
            <p className="text-xs mt-1">Provider: <span className="text-yellow-400">{user.isAnonymous ? 'Anonymous' : 'Custom'}</span></p>
          </div>
        )}

        <div className="mt-8 text-xs text-gray-500">
          <p>※ Firestore 에러가 발생하면 콘솔의 'Rules' 탭에서 보안 규칙이 해당 경로를 허용하는지 확인하세요.</p>
        </div>
      </div>
    </div>
  );
};

export default App;
