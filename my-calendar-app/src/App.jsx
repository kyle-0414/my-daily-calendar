// src/App.jsx
import React, { useEffect, useState } from "react";
import { auth, db, appId } from "./firebase";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, limit, query } from "firebase/firestore";

const App = () => {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("initial"); // initial | auth_error | db_error | connected
  const [user, setUser] = useState(null);

  const addLog = (msg, type = "info") => {
    setLogs((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        msg: typeof msg === "object" ? JSON.stringify(msg) : String(msg),
        type,
        time: new Date().toLocaleTimeString(),
      },
    ]);
  };

  useEffect(() => {
    const runDiagnostic = async () => {
      setLogs([]);
      setStatus("initial");
      addLog("진단을 시작합니다...");

      // 1) 환경변수 기반 설정이 들어왔는지 확인(빠른 진단)
      const envCheck = {
        apiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: !!import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: !!import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: !!import.meta.env.VITE_FIREBASE_APP_ID,
      };

      if (Object.values(envCheck).some((v) => v === false)) {
        addLog("환경변수 누락이 있습니다. Vercel Environment Variables를 확인하세요.", "error");
        addLog(envCheck, "error");
        setStatus("auth_error");
        return;
      }

      addLog("Firebase 설정 로드 성공 (Vercel Env)", "success");
      addLog(`App ID: ${appId}`);

      // 2) 인증 (Vercel에서는 커스텀 토큰 흐름 제거하고 익명 로그인으로 단순화)
      try {
        addLog("익명 로그인 시도...");
        await signInAnonymously(auth);
        addLog("익명 로그인 요청 완료", "success");
      } catch (err) {
        addLog(`인증 실패: ${err?.code || ""} - ${err?.message || err}`, "error");
        setStatus("auth_error");
        return;
      }

      // 3) Auth 상태 변경 감시 → 로그인 완료되면 Firestore 테스트
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (!currentUser) {
          addLog("로그아웃 상태 또는 인증 대기 중...");
          return;
        }

        setUser(currentUser);
        addLog(`인증 성공! UID: ${currentUser.uid}`, "success");
        addLog(`Provider: ${currentUser.isAnonymous ? "Anonymous" : "Custom"}`);

        // 4) Firestore 읽기 테스트
        try {
          addLog("Firestore 데이터 읽기 시도 중...");

          // 기존 네 경로 구조를 유지 (artifacts/{appId}/public/data/test_collection)
          const colRef = collection(db, "artifacts", appId, "public", "data", "test_collection");
          const q = query(colRef, limit(1));

          await getDocs(q);

          addLog("Firestore 연결 성공!", "success");
          setStatus("connected");
        } catch (err) {
          addLog(`Firestore 에러: ${err?.code || "unknown"} - ${err?.message || err}`, "error");
          addLog("※ permission-denied이면 Firestore Rules에서 해당 경로 read를 허용해야 합니다.", "error");
          setStatus("db_error");
        }
      });

      // cleanup
      return () => unsubscribe();
    };

    const cleanupPromise = runDiagnostic();
    return () => {
      // runDiagnostic이 unsubscribe 반환하는 구조가 아니라서, 여기서는 별도 처리 없이 둠
      // (필요하면 runDiagnostic 구조를 바꿔서 unsubscribe를 밖으로 빼도 됨)
      void cleanupPromise;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 font-mono">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 border-b border-gray-700 pb-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-400">Firebase Connectivity Debugger</h1>
          <div
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              status === "connected"
                ? "bg-green-900 text-green-300"
                : status === "auth_error" || status === "db_error"
                ? "bg-red-900 text-red-300"
                : "bg-yellow-900 text-yellow-300"
            }`}
          >
            {status}
          </div>
        </header>

        <section className="bg-black rounded-lg p-4 shadow-xl border border-gray-800 h-[500px] overflow-y-auto custom-scrollbar">
          {logs.map((log) => (
            <div key={log.id} className="mb-2 text-sm flex">
              <span className="text-gray-500 mr-3 shrink-0">[{log.time}]</span>
              <span
                className={
                  log.type === "error"
                    ? "text-red-400"
                    : log.type === "success"
                    ? "text-green-400"
                    : "text-blue-300"
                }
              >
                {log.type === "error" ? "✖ " : log.type === "success" ? "✔ " : "ℹ "}
                {log.msg}
              </span>
            </div>
          ))}
          {status === "initial" && <div className="animate-pulse text-gray-500">대기 중...</div>}
        </section>

        {user && (
          <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <h2 className="text-sm font-bold text-gray-400 mb-2 uppercase">현재 세션 정보</h2>
            <p className="text-xs">
              User ID: <span className="text-yellow-400">{user.uid}</span>
            </p>
            <p className="text-xs mt-1">
              Provider: <span className="text-yellow-400">{user.isAnonymous ? "Anonymous" : "Custom"}</span>
            </p>
          </div>
        )}

        <div className="mt-8 text-xs text-gray-500">
          <p>※ Firestore 에러가 발생하면 Firebase Console → Firestore Database → Rules에서 보안 규칙을 확인하세요.</p>
          <p className="mt-1">현재 테스트 경로: <span className="text-gray-300">artifacts/{appId}/public/data/test_collection</span></p>
        </div>
      </div>
    </div>
  );
};

export default App;
