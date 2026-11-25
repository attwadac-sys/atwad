/*
 * atwad-veh-gate.js — بوابة فحص المركبة الأسبوعي
 *
 * الفكرة: لا يُسجَّل شيء في النظام من جهة الفني (إغلاق زيارة، قبض،
 * عميل بلا موعد، مصروف بنزين) ما دام فحص المركبة الأسبوعي لم يُسجَّل.
 * الفني مشغول أو ينسى — فالنظام هو الذي يذكّره ويوقفه، لا المدير.
 *
 * مصدر الحقيقة واحد: vehicles / vehicleChecks / vehicleSettings كما
 * تكتبها صفحة الفحص (atwad-technician-vehicles-preview.html)، وحساب
 * الأسبوع هنا نسخةٌ مطابقة لحسابها: يبدأ يوم الاستحقاق (dueDay) ولا
 * يسقط بتأخّر يوم.
 *
 * درجة الإلزام تُقرأ من vehicleSettings.enforce:
 *   'block'  → يُمنع التسجيل وتظهر نافذة تحوّل الفني لصفحة الفحص
 *   غير ذلك  → تنبيه فقط ويُسمح بالتسجيل (الوضع القديم)
 * فالإدارة تفعّل المنع من صفحة المركبات بلا تعديل برمجي.
 *
 * الاستعمال في أي صفحة:
 *   AtwadVehGate.guard({ tech:'أحمد', lang:'ar' }).then(function(ok){ if(ok) ... });
 *   AtwadVehGate.guard({ vehicleId:'xyz', lang:'ar' })   ← لمصروف البنزين: مركبة محددة
 *
 * عند تعذّر القراءة من القاعدة (شبكة) تُفتح البوابة ولا تُغلق — خطأٌ
 * تقني لا يجوز أن يوقف عمل الفني، ويُسجَّل في console للمتابعة.
 */
(function () {
  'use strict';

  var CACHE_MS = 60 * 1000;          // قراءة واحدة لكل دقيقة تكفي
  var CHECK_URL = 'atwad-technician-vehicles-preview.html';

  var _cache = null;                 // { at, vehicles, checks, settings }
  var _pending = null;

  var TXT = {
    ar: {
      title: '🚗 فحص المركبة الأسبوعي لم يُسجَّل',
      body:  'لا يمكن التسجيل قبل إتمام فحص المركبة لهذا الأسبوع. الفحص يستغرق دقيقتين.',
      late1: 'متأخر منذ', day: 'يوم', days: 'أيام', today: 'مستحق اليوم',
      go:    'إجراء الفحص الآن', close: 'إغلاق',
      warn:  '⚠️ تذكير: فحص المركبة الأسبوعي لم يُسجَّل بعد'
    },
    en: {
      title: '🚗 Weekly vehicle check not recorded',
      body:  'You cannot record anything until this week\'s vehicle check is done. It takes two minutes.',
      late1: 'Late by', day: 'day', days: 'days', today: 'Due today',
      go:    'Do the check now', close: 'Close',
      warn:  '⚠️ Reminder: this week\'s vehicle check is not recorded yet'
    }
  };

  function num(x){ var n = Number(x); return isFinite(n) ? n : 0; }
  function esc(x){
    return String(x == null ? '' : x)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* اليوم بتوقيت الرياض — الجوال قد يكون على توقيت آخر */
  function todayRiyadh(){
    try{
      return new Date(new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Riyadh',
        year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date()));
    } catch(e){
      return new Date(Date.now() + 3 * 3600 * 1000);
    }
  }

  function weekStart(settings){
    var d = todayRiyadh();
    var due = num(settings && settings.dueDay);
    if(!(due >= 0 && due <= 6)) due = 6;
    var back = (d.getDay() - due + 7) % 7;
    return new Date(d.getTime() - back * 86400000);
  }

  function weekKey(settings){
    var st = weekStart(settings);
    var m = st.getMonth() + 1, dd = st.getDate();
    return st.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (dd < 10 ? '0' + dd : dd);
  }

  function daysLate(settings){
    return Math.round((todayRiyadh() - weekStart(settings)) / 86400000);
  }

  function getDb(){
    if(window.db) return window.db;
    if(window.firebase && firebase.apps && firebase.apps.length) return firebase.database();
    return null;
  }

  /* تحميل الثلاث عقد مرة واحدة، مع تخزين قصير */
  function load(){
    if(_cache && (Date.now() - _cache.at) < CACHE_MS) return Promise.resolve(_cache);
    if(_pending) return _pending;
    var db = getDb();
    if(!db) return Promise.reject(new Error('no-db'));
    _pending = Promise.all([
      db.ref('vehicles').once('value'),
      db.ref('vehicleChecks').once('value'),
      db.ref('vehicleSettings').once('value')
    ]).then(function(res){
      _cache = {
        at: Date.now(),
        vehicles: res[0].val() || {},
        checks:   res[1].val() || {},
        settings: res[2].val() || {}
      };
      _pending = null;
      return _cache;
    }).catch(function(err){
      _pending = null;
      throw err;
    });
    return _pending;
  }

  /* المركبات المعنية: مركبة محددة، أو مركبات الفني (مطابقة driver)، أو الكل */
  function vehiclesFor(data, opts){
    var out = [];
    var list = data.vehicles || {};
    if(opts.vehicleId){
      if(list[opts.vehicleId] && list[opts.vehicleId].active !== false) out.push(opts.vehicleId);
      return out;
    }
    var who = String(opts.tech || '').trim();
    for(var id in list){
      if(!Object.prototype.hasOwnProperty.call(list, id)) continue;
      var v = list[id] || {};
      if(v.active === false) continue;
      var drv = String(v.driver || '');
      if(!who || !drv || drv.indexOf(who) !== -1) out.push(id);
    }
    return out;
  }

  /* النتيجة: { ok, mode, missing:[{id,name,plate}], weekKey, late } */
  function check(opts){
    opts = opts || {};
    return load().then(function(data){
      var wk = weekKey(data.settings);
      var ids = vehiclesFor(data, opts);
      var missing = [];
      for(var i = 0; i < ids.length; i++){
        var c = data.checks[ids[i]];
        if(!c || !c[wk]){
          var v = data.vehicles[ids[i]] || {};
          missing.push({ id: ids[i], name: v.name || ids[i], plate: v.plate || '' });
        }
      }
      var mode = (data.settings && data.settings.enforce) || 'notify';
      return {
        ok: !missing.length,
        mode: mode,
        missing: missing,
        weekKey: wk,
        late: daysLate(data.settings)
      };
    });
  }

  /* ===== النافذة ===== */
  function ensureStyle(){
    if(document.getElementById('vehGateStyle')) return;
    var st = document.createElement('style');
    st.id = 'vehGateStyle';
    st.textContent =
      '#vehGateOv{position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;font-family:Tajawal,Cairo,system-ui,sans-serif;}' +
      '#vehGateBox{background:#fff;border-radius:16px;max-width:420px;width:100%;padding:20px 18px;box-shadow:0 20px 50px rgba(0,0,0,.3);text-align:center;}' +
      '#vehGateBox h3{margin:0 0 8px;font-size:18px;color:#B91C1C;}' +
      '#vehGateBox p{margin:0 0 12px;font-size:14px;color:#334155;line-height:1.7;}' +
      '#vehGateBox .vg-veh{background:#FFF1F2;border:1.5px solid #FCA5A5;border-radius:10px;padding:8px 10px;margin:6px 0;font-size:13px;font-weight:800;color:#7F1D1D;}' +
      '#vehGateBox .vg-go{display:block;width:100%;box-sizing:border-box;margin-top:14px;padding:13px;border:none;border-radius:12px;background:#047857;color:#fff;font-size:15px;font-weight:900;text-decoration:none;cursor:pointer;font-family:inherit;}' +
      '#vehGateBox .vg-x{margin-top:8px;background:none;border:none;color:#64748B;font-size:13px;cursor:pointer;font-family:inherit;}';
    document.head.appendChild(st);
  }

  function showModal(res, lang){
    ensureStyle();
    var x = TXT[lang === 'en' ? 'en' : 'ar'];
    var old = document.getElementById('vehGateOv');
    if(old && old.parentNode) old.parentNode.removeChild(old);

    var lateTxt = res.late >= 1
      ? (x.late1 + ' ' + res.late + ' ' + (res.late === 1 ? x.day : x.days))
      : x.today;

    var vehHtml = '';
    for(var i = 0; i < res.missing.length; i++){
      var m = res.missing[i];
      vehHtml += '<div class="vg-veh">' + esc(m.name) + (m.plate ? ' · ' + esc(m.plate) : '') +
        ' — ' + esc(lateTxt) + '</div>';
    }

    var ov = document.createElement('div');
    ov.id = 'vehGateOv';
    ov.setAttribute('dir', lang === 'en' ? 'ltr' : 'rtl');
    ov.innerHTML =
      '<div id="vehGateBox">' +
        '<h3>' + esc(x.title) + '</h3>' +
        '<p>' + esc(x.body) + '</p>' +
        vehHtml +
        '<a class="vg-go" href="' + CHECK_URL + '" target="_blank" rel="noopener">' + esc(x.go) + '</a>' +
        '<button class="vg-x" type="button">' + esc(x.close) + '</button>' +
      '</div>';
    document.body.appendChild(ov);

    ov.querySelector('.vg-x').addEventListener('click', function(){
      if(ov.parentNode) ov.parentNode.removeChild(ov);
      _cache = null;   // عند العودة يُعاد الفحص من القاعدة لا من الذاكرة
    });
  }

  function toast(msg){
    if(typeof window.showToast === 'function'){ window.showToast(msg); return; }
    if(typeof window.warnBox === 'function'){ window.warnBox(msg); return; }
    console.warn(msg);
  }

  /*
   * guard: يعيد Promise<boolean>
   *   true  → اسمح بالتسجيل
   *   false → مُنع، وظهرت النافذة
   */
  function guard(opts){
    opts = opts || {};
    var lang = opts.lang || window.LANG || window.lang || 'ar';
    return check(opts).then(function(res){
      if(res.ok) return true;
      if(res.mode === 'block'){
        showModal(res, lang);
        return false;
      }
      toast(TXT[lang === 'en' ? 'en' : 'ar'].warn);
      return true;
    }).catch(function(err){
      console.warn('AtwadVehGate: تعذّر التحقق، سُمح بالتسجيل —', err && err.message ? err.message : err);
      return true;
    });
  }

  window.AtwadVehGate = { check: check, guard: guard, weekKey: weekKey, reset: function(){ _cache = null; } };
})();
