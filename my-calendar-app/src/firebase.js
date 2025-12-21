// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * Vercel + Vite 환경변수 기반 Firebase 설정
 * - Vercel Project Settings > Environment Variables 에서 VITE_로 시작하는 키들을 등록해야 함
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// (선택) 실행 중 설정 누락을 빠르게 찾기 위한 가드
const requiredKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

for (const k of requiredKeys) {
  if (!import.meta.env[k]) {
    // 개발 중 바로 눈에 띄게 하려면 throw, 운영에서는 console.warn으로 바꿔도 됨
    // eslint-disable-next-line no-console
    console.warn(`[firebase] Missing env: ${k}`);
  }
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Firestore 경로 구분에 쓰고 싶으면 appId를 그대로 사용 (너의 기존 로직과 호환)
export const appId = import.meta.env.VITE_FIREBASE_APP_ID || "diag-app-id";
