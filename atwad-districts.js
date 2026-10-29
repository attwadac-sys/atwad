/*
 * atwad-districts.js — مصدرٌ واحد لأحياء نطاق الخدمة.
 *
 * كانت القائمة مكتوبةً داخل صفحة الحجز، فكلُّ حيٍّ يُضاف يحتاج تعديل شفرة
 * ورفع ملف. صارت هنا، ونسخةٌ منها في فَيَربيس تحت publicSettings/districts
 * تُحرَّر من شاشة «إدارة الأحياء».
 *
 * وقاعدةُ السلامة: القائمة المكتوبة أدناه هي الاحتياط. إن تعذّرت قراءة
 * فَيَربيس — أو لم تُنشر قواعدها — عملت الصفحة بالاحتياط ولم تظهر للعميل
 * فارغة. فصفحةُ حجزٍ بلا أحياء أسوأ من قائمةٍ قديمة.
 *
 * حدُّ النطاق: شمال شارع فلسطين.
 */
(function () {
  'use strict';

  var PATH = 'publicSettings/districts';

  /* الشريحة: اسمٌ ظاهر، وحدٌّ أدنى للمكيفات يُقبل به الحجز الإلكتروني.
     حدُّ 1 يعني بلا شرط. وما دون الحدّ لا يُرفض، بل يُحوَّل إلى واتساب. */
  var DEFAULT_ZONES = [
    { id: 'coastal', label: 'الشمال الساحلي', minUnits: 1, items: [
      'أبحر الشمالية', 'أبحر الجنوبية', 'الشراع', 'الياقوت', 'الزمرد',
      'اللؤلؤ', 'المرجان', 'البساتين', 'الشاطئ', 'المحمدية'
    ] },
    { id: 'mid', label: 'الشمال الأوسط', minUnits: 1, items: [
      'النعيم', 'النهضة', 'الزهراء', 'السلامة', 'الروضة',
      'الخالدية', 'البوادي', 'الربوة', 'الفيصلية'
    ] },
    { id: 'newext', label: 'الشمال والامتداد الجديد', minUnits: 1, items: [
      'الرياض', 'الصفوة', 'الحمدانية', 'الصالحية', 'الفلاح',
      'الرحمانية', 'طيبة', 'الأصالة', 'المروة'
    ] },
    /* الشريط بين التحلية وشارع فلسطين — يُملأ من شاشة الإدارة */
    { id: 'palestine', label: 'شمال شارع فلسطين', minUnits: 5, items: [] }
  ];

  /** نسخةٌ عميقة: المستدعي قد يعدّل، فلا يمسّ الاحتياط */
  function cloneZones(zones) {
    var out = [], i, z;
    for (i = 0; i < zones.length; i++) {
      z = zones[i];
      out.push({
        id: String(z.id || ('z' + i)),
        label: String(z.label || ''),
        minUnits: Math.max(1, parseInt(z.minUnits, 10) || 1),
        items: (z.items || []).slice()
      });
    }
    return out;
  }

  /** توحيد الحروف قبل المقارنة — الناس يكتبون الهمزة والتاء كيفما اتفق */
  function norm(name) {
    return String(name || '')
      .replace(/[ً-ْـ]/g, '')
      .replace(/[آأإٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/^حي\s+/, '')
      .replace(/\s+/g, '')
      .trim();
  }

  /** أصحيحةٌ بنيةُ ما جاء من فَيَربيس؟ خطأٌ فيها يُفرِغ القائمة على العميل */
  function isValidZones(zones) {
    var i, z, total = 0;
    if (!zones || Object.prototype.toString.call(zones) !== '[object Array]') return false;
    if (zones.length === 0) return false;
    for (i = 0; i < zones.length; i++) {
      z = zones[i];
      if (!z || typeof z !== 'object') return false;
      if (!z.label) return false;
      if (z.items && Object.prototype.toString.call(z.items) !== '[object Array]') return false;
      total += (z.items || []).length;
    }
    return total > 0;
  }

  var API = {
    PATH: PATH,

    /** الشرائح المعتمدة الآن — الاحتياط حتى يكتمل التحميل */
    zones: cloneZones(DEFAULT_ZONES),

    /** مصدر القائمة الحالية: 'default' أو 'firebase' */
    source: 'default',

    defaults: function () { return cloneZones(DEFAULT_ZONES); },

    norm: norm,

    /**
     * يقرأ القائمة من فَيَربيس مرةً واحدة ثم ينادي cb.
     * ويُنادى cb في كل حال — حتى عند الفشل — وإلا بقيت الصفحة تنتظر.
     */
    load: function (db, cb) {
      var done = false;
      var self = this;
      function finish() {
        if (done) return;
        done = true;
        if (typeof cb === 'function') cb(self.zones, self.source);
      }
      if (!db || typeof db.ref !== 'function') {
        console.warn('[districts] لا اتصال بفَيَربيس — القائمة الاحتياطية');
        finish();
        return;
      }
      /* مهلةٌ قصوى: شبكةٌ بطيئة لا تترك العميل أمام قائمةٍ فارغة */
      setTimeout(finish, 6000);
      db.ref(PATH).once('value').then(function (snap) {
        var val = snap.val();
        if (isValidZones(val)) {
          self.zones = cloneZones(val);
          self.source = 'firebase';
        } else if (val) {
          console.warn('[districts] قائمة فَيَربيس غير صالحة البنية — اعتُمد الاحتياط');
        }
        finish();
      }).catch(function (err) {
        console.warn('[districts] تعذّرت قراءة قائمة الأحياء:', err);
        finish();
      });
    },

    /** يحفظ القائمة — للإدارة وحدها، وقواعد فَيَربيس هي الحارس */
    save: function (db, zones) {
      if (!db || typeof db.ref !== 'function') {
        return Promise.reject(new Error('لا اتصال بفَيَربيس'));
      }
      if (!isValidZones(zones)) {
        return Promise.reject(new Error('القائمة فارغة أو بنيتها غير صالحة'));
      }
      return db.ref(PATH).set(cloneZones(zones));
    },

    /** الشريحة التي ينتمي إليها الحي، أو null */
    zoneOf: function (name) {
      var n = norm(name), i, j, items;
      if (!n) return null;
      for (i = 0; i < this.zones.length; i++) {
        items = this.zones[i].items || [];
        for (j = 0; j < items.length; j++) {
          if (norm(items[j]) === n) return this.zones[i];
        }
      }
      return null;
    },

    /** الحدّ الأدنى للمكيفات في هذا الحي — 1 لمن لا شرط عليه */
    minUnitsFor: function (name) {
      var z = this.zoneOf(name);
      return z ? z.minUnits : 1;
    },

    /** أمدرجٌ هذا الحي في النطاق؟ */
    isListed: function (name) {
      return this.zoneOf(name) !== null;
    },

    /** كل الأحياء في قائمةٍ واحدة */
    all: function () {
      var out = [], i, j, items;
      for (i = 0; i < this.zones.length; i++) {
        items = this.zones[i].items || [];
        for (j = 0; j < items.length; j++) out.push(items[j]);
      }
      return out;
    },

    /**
     * يبني خيارات <select> من الشرائح.
     * الشريحةُ الخالية لا تظهر — فمجموعةٌ فارغة تُربك العميل.
     */
    fillSelect: function (selectEl, placeholder) {
      if (!selectEl) return;
      var html = '<option value="">' + (placeholder || '-- اختر الحي --') + '</option>';
      var i, j, z, items, label;
      for (i = 0; i < this.zones.length; i++) {
        z = this.zones[i];
        items = (z.items || []).slice();
        if (items.length === 0) continue;
        items.sort(function (a, b) { return String(a).localeCompare(String(b), 'ar'); });
        label = z.label + (z.minUnits > 1 ? ' — من ' + z.minUnits + ' مكيفات' : '');
        html += '<optgroup label="' + label.replace(/"/g, '&quot;') + '">';
        for (j = 0; j < items.length; j++) {
          html += '<option>' + String(items[j]).replace(/</g, '&lt;') + '</option>';
        }
        html += '</optgroup>';
      }
      selectEl.innerHTML = html;
    }
  };

  window.AtwadDistricts = API;
})();
