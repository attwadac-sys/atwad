// ================================================================
// atwad-auth.js — حماية مشتركة لصفحات الإدارة
// ملاحظة أمنية: auth != null مؤقتة لمستخدم واحد.
// بعد الاستقرار، قيّد الوصول بـ UID محدد أو Custom Claim:
// "auth != null && auth.token.admin == true"
// ================================================================
(function() {
  'use strict';

  // دالة تنظيف HTML لمنع XSS
  window.escapeHTML = function(s) {
    if(s == null) return '';
    return String(s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  };

  var LOGIN_HTML = '<div id="authOverlay" style="position:fixed;inset:0;background:#0C3B5E;z-index:99999;'
    +'display:flex;align-items:center;justify-content:center;font-family:Tajawal,sans-serif;">'
    +'<div style="background:#fff;border-radius:18px;padding:36px 28px;width:320px;'
    +'box-shadow:0 20px 60px rgba(0,0,0,.35);text-align:center;">'
    +'<div style="font-size:32px;margin-bottom:8px">❄️</div>'
    +'<h2 style="font-size:17px;font-weight:900;color:#0C3B5E;margin:0 0 4px">أطواد لصيانة المكيفات</h2>'
    +'<p style="font-size:12px;color:#94A3B8;margin:0 0 22px">لوحة الإدارة</p>'
    +'<input id="authEmail" type="email" placeholder="البريد الإلكتروني" autocomplete="email"'
    +' style="width:100%;padding:11px 14px;border:1.5px solid #E2E8F0;border-radius:10px;'
    +'font-family:Tajawal,sans-serif;font-size:14px;box-sizing:border-box;margin-bottom:10px;direction:ltr;">'
    +'<input id="authPass" type="password" placeholder="كلمة المرور" autocomplete="current-password"'
    +' style="width:100%;padding:11px 14px;border:1.5px solid #E2E8F0;border-radius:10px;'
    +'font-family:Tajawal,sans-serif;font-size:14px;box-sizing:border-box;margin-bottom:14px;direction:ltr;">'
    +'<button id="authBtn" style="width:100%;padding:13px;background:linear-gradient(90deg,#0C3B5E,#0077B6);'
    +'color:#fff;border:none;border-radius:11px;font-family:Tajawal,sans-serif;font-size:14px;font-weight:800;cursor:pointer;">دخول</button>'
    +'<div id="authErr" style="font-size:12px;color:#EF4444;margin-top:10px;min-height:18px;"></div>'
    +'</div></div>';

  document.addEventListener('DOMContentLoaded', function() {
    document.body.insertAdjacentHTML('afterbegin', LOGIN_HTML);
    document.body.style.overflow = 'hidden';

    document.getElementById('authBtn').addEventListener('click', doLogin);
    document.getElementById('authPass').addEventListener('keydown', function(e){
      if(e.key === 'Enter') doLogin();
    });
  });

  function doLogin() {
    var email = (document.getElementById('authEmail').value || '').trim();
    var pass  = document.getElementById('authPass').value || '';
    var btn   = document.getElementById('authBtn');
    var err   = document.getElementById('authErr');
    if(!email || !pass) { err.textContent = 'أدخل البريد وكلمة المرور'; return; }
    btn.disabled = true; btn.textContent = 'جاري التحقق...'; err.textContent = '';
    firebase.auth().signInWithEmailAndPassword(email, pass).catch(function(e) {
      btn.disabled = false; btn.textContent = 'دخول';
      var msgs = {
        'auth/user-not-found':'البريد غير مسجل',
        'auth/wrong-password':'كلمة المرور خاطئة',
        'auth/invalid-email':'بريد غير صالح',
        'auth/too-many-requests':'محاولات كثيرة — انتظر'
      };
      err.textContent = msgs[e.code] || 'خطأ: ' + e.message;
    });
  }
  window.__atwadLogin = doLogin; // للتوافق

  firebase.auth().onAuthStateChanged(function(user) {
    var overlay = document.getElementById('authOverlay');
    var btn = document.getElementById('authBtn');
    if(user) {
      // مسجّل
      if(overlay) overlay.style.display = 'none';
      document.body.style.overflow = '';
      // تفعيل صفحة مرة واحدة فقط — منع التكرار
      if(!window.__atwadPageInitialized) {
        window.__atwadPageInitialized = true;
        if(typeof window.__atwadInitPage === 'function') window.__atwadInitPage(user);
      }
      // زر الخروج
      if(!document.getElementById('authSignOutBtn')) {
        var b = document.createElement('button');
        b.id = 'authSignOutBtn';
        b.textContent = '🚪 خروج (' + (user.email||'').split('@')[0] + ')';
        b.style.cssText = 'position:fixed;bottom:16px;left:16px;z-index:9000;'
          +'padding:8px 14px;background:#EF4444;color:#fff;border:none;border-radius:9px;'
          +'font-family:Tajawal,sans-serif;font-size:12px;font-weight:700;cursor:pointer;';
        b.onclick = function() {
          if(confirm('تسجيل الخروج؟')) {
            // فصل مستمعات Firebase
            if(typeof window.__atwadCleanup === 'function') window.__atwadCleanup();
            firebase.auth().signOut().then(function() {
              // إعادة تحميل الصفحة لمسح جميع البيانات من DOM
              window.location.reload();
            });
          }
        };
        document.body.appendChild(b);
      }
    } else {
      // غير مسجّل — أظهر overlay وأخفِ المحتوى
      if(overlay) {
        overlay.style.display = 'flex';
        // مسح الحقول
        var e = document.getElementById('authEmail');
        var p = document.getElementById('authPass');
        if(e) e.value = ''; if(p) p.value = '';
        var b2 = document.getElementById('authBtn');
        if(b2){ b2.disabled = false; b2.textContent = 'دخول'; }
      }
      document.body.style.overflow = 'hidden';
      // إخفاء المحتوى الإداري بشكل كامل
      document.querySelectorAll('main, .main-content, .container, .page-body, nav, header')
        .forEach(function(el){ el.style.visibility = 'hidden'; });
      var signOut = document.getElementById('authSignOutBtn');
      if(signOut) signOut.remove();
      // window.__atwadPageInitialized = false; لو أردنا إعادة init عند عودة الدخول
    }
  });
})();
