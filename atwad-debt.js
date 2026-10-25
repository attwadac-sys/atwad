// ================================================================
// atwad-debt.js — محرّك مطابقة الديون القديمة بالعميل
//
// تُحمَّل بعد atwad-firebase.js، وتعمل بلا قاعدة بيانات: تُعطى
// الجداول الثلاثة (القيود، الحجوزات، المواعيد) فتبني فهرساً.
//
// المبدأ: الهاتف هو المفتاح، لا الاسم. والقيد لا يحمل هاتفاً قبل
// 25 أكتوبر 2026، فيُستخرج من حجزه عبر firebaseRef. وما لم يُطابَق
// بهاتف يُعلَّم certain:false — ولا يُرسَل للعميل إلا بعد مراجعتك.
// ================================================================

(function(){

var BIZ = '0509720382';

/* آخر تسعة أرقام: يُسقط 966 و00 والصفر الأول، فيتطابق
   0555000111 مع +966555000111 ومع 555000111 */
function normPhone(v){
  var d = String(v == null ? '' : v).replace(/[^0-9]/g, '');
  if(d.length < 9) return '';
  return d.slice(-9);
}

var AR2LAT = {
  'ب':'b','ت':'t','ث':'t','ج':'j','ح':'h','خ':'k','د':'d','ذ':'z','ر':'r','ز':'z',
  'س':'s','ش':'s','ص':'s','ض':'d','ط':'t','ظ':'z','ع':'','غ':'g','ف':'f','ق':'k',
  'ك':'k','ل':'l','م':'m','ن':'n','ه':'h','ة':'','و':'','ي':'','ى':'','ا':'',
  'أ':'','إ':'','آ':'','ء':'','ؤ':'','ئ':''
};

/* هيكل الاسم الساكن — نسخةٌ واحدة لكل الصفحات، فلا تتباعد النسخ */
function skeleton(s){
  var t = String(s || '').toLowerCase();
  t = t.replace(/[ـً-ْ.,_\-()0-9]/g, ' ');
  t = t.replace(/\b(mr|mrs|ms|miss|dr|eng|al|el)\b/g, ' ');
  t = t.replace(/\bal(?=[a-z]{3,})/g, ' ');
  t = t.replace(/^(الاستاذ|الأستاذ|الاستاذة|الدكتور|السيد|السيدة)\s+/, '');
  t = t.replace(/(^|\s)ال/g, '$1');
  t = t.replace(/kh/g, 'k').replace(/gh/g, 'g').replace(/sh/g, 's')
       .replace(/th/g, 't').replace(/ph/g, 'f').replace(/ch/g, 's')
       .replace(/q/g, 'k');
  var out = '';
  for(var i = 0; i < t.length; i++){
    var c = t.charAt(i);
    if(Object.prototype.hasOwnProperty.call(AR2LAT, c)){ out += AR2LAT[c]; continue; }
    if(c >= 'a' && c <= 'z'){
      if('aeiouwy'.indexOf(c) >= 0) continue;
      out += c;
    }
  }
  return out.replace(/(.)\1+/g, '$1');
}

function num(v){ var n = parseFloat(v); return isNaN(n) ? 0 : n; }

function daysBetween(a, b){
  var x = new Date(String(a) + 'T00:00:00').getTime();
  var y = new Date(String(b) + 'T00:00:00').getTime();
  if(isNaN(x) || isNaN(y)) return 0;
  return Math.round((y - x) / 86400000);
}

/* هل هذا القيد دَيْنٌ قائم؟ */
function isOpenDebt(e){
  if(!e || e.type !== 'income') return false;
  if(e.warrantyRework) return false;
  var st = String(e.status || '');
  if(st === 'ملغي' || st === 'مسوى' || st === 'مدفوع') return false;
  if(!e.date) return false;
  return (num(e.amount) - num(e.paidAmount)) > 0.009;
}

/**
 * build(tx, bookings, appts) → فهرس
 * كلٌّ منها كائن { مفتاح: قيمة } كما يُعيده snap.val()
 */
function build(tx, bookings, appts){
  tx = tx || {}; bookings = bookings || {}; appts = appts || {};

  // خريطة الهواتف من الحجوزات والمواعيد: بالمفتاح، وبالاسم+التاريخ
  var phoneByKey = {};
  var phoneByNameDate = {};
  var k, v, p;
  for(k in bookings){
    if(!Object.prototype.hasOwnProperty.call(bookings, k)) continue;
    v = bookings[k] || {};
    p = normPhone(v.phone);
    if(!p) continue;
    phoneByKey[k] = p;
    var sk = skeleton(v.client || v.name || '');
    if(sk.length >= 2 && v.date){ phoneByNameDate[v.date + '|' + sk] = p; }
  }
  for(k in appts){
    if(!Object.prototype.hasOwnProperty.call(appts, k)) continue;
    v = appts[k] || {};
    p = normPhone(v.phone);
    if(!p) continue;
    if(!phoneByKey[k]) phoneByKey[k] = p;
    var sk2 = skeleton(v.client || v.name || '');
    if(sk2.length >= 2 && v.date && !phoneByNameDate[v.date + '|' + sk2]){
      phoneByNameDate[v.date + '|' + sk2] = p;
    }
  }

  var byPhone = {}, byName = {}, rows = [];
  for(k in tx){
    if(!Object.prototype.hasOwnProperty.call(tx, k)) continue;
    var e = tx[k] || {};
    if(!isOpenDebt(e)) continue;

    var name = String(e.party || e.client || '');
    var sk3 = skeleton(name);

    // الهاتف: من القيد، ثم من حجزه، ثم من الاسم+التاريخ
    var ph = normPhone(e.phone);
    var src = ph ? 'tx' : '';
    if(!ph && e.firebaseRef && phoneByKey[e.firebaseRef]){ ph = phoneByKey[e.firebaseRef]; src = 'ref'; }
    if(!ph && sk3.length >= 2 && e.date && phoneByNameDate[e.date + '|' + sk3]){
      ph = phoneByNameDate[e.date + '|' + sk3]; src = 'namedate';
    }

    var row = {
      key: k, name: name, skel: sk3, phone: ph, phoneSrc: src,
      date: String(e.date || ''),
      amount: num(e.amount),
      rem: num(e.amount) - num(e.paidAmount),
      note: String(e.paymentNote || ''),
      ref: String(e.firebaseRef || '')
    };
    rows.push(row);
    if(ph){ if(!byPhone[ph]) byPhone[ph] = []; byPhone[ph].push(row); }
    if(sk3.length >= 2){ if(!byName[sk3]) byName[sk3] = []; byName[sk3].push(row); }
  }

  return { byPhone: byPhone, byName: byName, rows: rows };
}

/**
 * lookup(index, opts) → { total, count, rows, certain }
 * opts: { phone, name, beforeDate, excludeKeys, excludeRef }
 *   beforeDate  — لا يُحتسب إلا دَيْنٌ أقدم من هذا التاريخ (زيارة اليوم ليست ديناً)
 *   excludeRef  — مفتاح الحجز الحالي، فلا يُحسب قيده ديناً سابقاً
 * certain=true إذا جاءت المطابقة من الهاتف. وإلا فمن الاسم — تحتاج تحقّقك.
 */
function lookup(index, opts){
  var out = { total: 0, count: 0, rows: [], certain: false };
  if(!index) return out;
  opts = opts || {};

  var ph = normPhone(opts.phone);
  var sk = skeleton(opts.name || '');
  var before = String(opts.beforeDate || '');
  var exRef = String(opts.excludeRef || '');
  var exKeys = {};
  if(opts.excludeKeys){
    for(var x = 0; x < opts.excludeKeys.length; x++){ exKeys[opts.excludeKeys[x]] = true; }
  }

  var pool = null, certain = false;
  if(ph && index.byPhone[ph] && index.byPhone[ph].length){
    pool = index.byPhone[ph]; certain = true;
  } else if(sk.length >= 2 && index.byName[sk] && index.byName[sk].length){
    pool = index.byName[sk]; certain = false;
  }
  if(!pool) return out;

  for(var i = 0; i < pool.length; i++){
    var r = pool[i];
    if(exKeys[r.key]) continue;
    if(exRef && r.ref === exRef) continue;
    // زيارة اليوم نفسها ليست ديناً سابقاً
    if(before && r.date >= before) continue;
    out.rows.push(r);
    out.total += r.rem;
    out.count++;
  }
  if(out.count){ out.certain = certain; }
  out.rows.sort(function(a, b){ return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
  return out;
}

/* نصّ التذكير — مهذّب، يذكر المبلغ وتاريخه، ولا يتّهم */
function reminderText(name, hit, visitDate){
  var lines = [];
  lines.push('السلام عليكم' + (name ? ' ' + String(name).trim() : ''));
  lines.push('مؤسسة أطواد لصيانة المكيفات.');
  lines.push('');
  lines.push(hit.count > 1 ? 'لديكم مبالغ مستحقة:' : 'لديكم مبلغ مستحق:');
  for(var i = 0; i < hit.rows.length; i++){
    var r = hit.rows[i];
    lines.push('• ' + Number(r.rem).toLocaleString('en-US') + ' ﷼ — زيارة ' + r.date);
  }
  lines.push('');
  lines.push('وقد وصلنا منكم طلب صيانة جديد' + (visitDate ? ' بتاريخ ' + visitDate : '') + '، ونسعد بخدمتكم.');
  lines.push('نرجو تسوية المبلغ السابق قبل الزيارة أو عند وصول الفني.');
  lines.push('');
  lines.push('للتحويل أو الاستفسار: ' + BIZ);
  lines.push('شكراً لثقتكم.');
  return lines.join('\n');
}

/* رابط واتساب للعميل — يُفتح بضغطة، ولا يُرسل شيئاً بنفسه */
function waUrl(phone, text){
  var d = String(phone == null ? '' : phone).replace(/[^0-9]/g, '');
  if(d.indexOf('00') === 0) d = d.slice(2);
  if(d.indexOf('966') === 0) d = d.slice(3);
  if(d.indexOf('0') === 0) d = d.slice(1);
  if(d.length !== 9) return '';
  return 'https://wa.me/966' + d + '?text=' + encodeURIComponent(text);
}

window.AtwadDebt = {
  normPhone: normPhone,
  skeleton: skeleton,
  isOpenDebt: isOpenDebt,
  daysBetween: daysBetween,
  build: build,
  lookup: lookup,
  reminderText: reminderText,
  waUrl: waUrl,
  BIZ: BIZ
};

})();
