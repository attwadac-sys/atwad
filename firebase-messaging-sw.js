// ================================================================
// firebase-messaging-sw.js — عامل الخدمة الذي يستقبل الإشعار
//                             والصفحة مغلقة أو الجوال نائم
//
// موضعه: جذر المستودع، فيُخدَم من /atwad/firebase-messaging-sw.js
// ونطاقه /atwad/ — أي أنه يغطّي صفحات النظام كلها ولا يتجاوزها.
//
// تنبيه: مكتبة Firebase تبحث افتراضياً عن هذا الملف في جذر النطاق
// (/firebase-messaging-sw.js) لا في /atwad/. ولهذا تُسجّله صفحة
// atwad-push.html بنفسها وتُمرّر التسجيل إلى getToken — بدون ذلك
// لا يُعثر على العامل ويفشل الحصول على الرمز.
// ================================================================

importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAjq2PVCkAVYwqpIpKIGx01LkbCB3TmW6w",
  authDomain: "atwad-booking.firebaseapp.com",
  databaseURL: "https://atwad-booking-default-rtdb.firebaseio.com",
  projectId: "atwad-booking",
  storageBucket: "atwad-booking.firebasestorage.app",
  messagingSenderId: "110922546416",
  appId: "1:110922546416:web:d8cd48aa90f2d6ce9cd635"
});

var messaging = firebase.messaging();

/* بدون هذين، يُنزّل المتصفحُ العاملَ الجديد ويتركه «منتظراً» ما دامت
   صفحةٌ من الموقع مفتوحة، فيظلّ القديم هو العامل ولا يظهر أثر أي إصلاح.
   skipWaiting يُنصّب الجديد فوراً، و clients.claim يُسلّمه الصفحات المفتوحة. */
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(event){
  event.waitUntil(self.clients.claim());
});

/* تنبيه المساء يُرسَل من نوع data كي نتحكّم بالعنوان والنصّ والوجهة.
   لكن حملات Firebase Console تُرسل من نوع notification، وتعريفُ هذه
   الدالة يمنع العرض التلقائي — فلو قرأنا data وحدها لظهر إشعارٌ بلا
   عنوانٍ ولا نصّ، أو لم يظهر. فنقرأ الاثنين، data أولاً. */
messaging.onBackgroundMessage(function(payload) {
  var d = (payload && payload.data) || {};
  var n = (payload && payload.notification) || {};
  var title = d.title || n.title || 'أطواد';
  var body  = d.body  || n.body  || '';
  var url   = d.url   || 'atwad-attention.html';
  if(self.console && console.log){ console.log('[atwad-sw] وصلت رسالة:', payload); }

  self.registration.showNotification(title, {
    body: body,
    icon: 'icon-192.png',
    badge: 'favicon-32.png',
    tag: d.tag || 'atwad-evening',   // يستبدل القديم بدل تكديس الإشعارات
    renotify: true,
    dir: 'rtl',
    lang: 'ar',
    data: { url: url },
    requireInteraction: d.sticky === '1'
  });
});

// ضغط الإشعار يفتح الصفحة المقصودة، ويستعمل تبويباً مفتوحاً إن وُجد
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var target = (event.notification.data && event.notification.data.url) || 'atwad-attention.html';
  var full = new URL(target, self.registration.scope).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url === full && 'focus' in list[i]) return list[i].focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(full);
      return null;
    })
  );
});
