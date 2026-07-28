// ================================================================
// atwad-firebase.js — تهيئة Firebase مركزية (Compat SDK)
// يُحمَّل بعد firebase-app/database/auth-compat.js وقبل atwad-auth.js
// ================================================================

const firebaseConfig = {
  apiKey: "AIzaSyAjq2PVCkAVYwqpIpKIGx01LkbCB3TmW6w",
  authDomain: "atwad-booking.firebaseapp.com",
  databaseURL: "https://atwad-booking-default-rtdb.firebaseio.com",
  projectId: "atwad-booking",
  storageBucket: "atwad-booking.firebasestorage.app",
  messagingSenderId: "110922546416",
  appId: "1:110922546416:web:d8cd48aa90f2d6ce9cd635",
  measurementId: "G-9SKT2Q41Z4"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

window.db = firebase.database();
window.auth = firebase.auth();
