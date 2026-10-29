/*
 * atwad-closing.js — قوائم إغلاق الزيارة، مصدرٌ واحد لصفحة الفني وصفحة الإدارة.
 *
 * كانت القائمة واحدةً تسأل عن تنقيط الماء وميلان الصينية، وهي أسئلةُ
 * زيارةِ غسيل. فالفنيّ الذي يركّب كمبروسراً يُسأل عمّا لا يخصّ عمله،
 * ثم تظهر زيارته في الإحصاءات ناقصةَ الإغلاق — فيبدو مقصّراً وهو مُتقن.
 *
 * فصارت ثلاثاً: غسيل، وصيانة، وتركيب. وتُختار بحسب الخدمة المسجَّلة.
 *
 * والمفاتيح تُحفظ كما هي في فَيَربيس، وصفحة الإدارة تقرؤها بالمفتاح لا
 * بالترتيب — فسجلٌّ قديم بمفاتيح الغسيل يبقى مقروءاً بعد هذا التغيير.
 */
(function () {
  'use strict';

  /* ===== غسيل ===== */
  var WASH = [
    { k:'drainTest',
      ar:'اختبار صرف الماء',
      arS:'صُبّ ماء في صينية التصريف وخرج من طرف الخرطوم — وأُرسل فيديو الاختبار',
      en:'Drain-water test',
      enS:'Pour water into the drain tray and see it come out of the hose end — send the test video' },
    { k:'tilt',
      ar:'ميلان الوحدة الداخلية والصينية باتجاه الصرف',
      arS:'لا ميلان عكسي يحبس الماء في الصينية',
      en:'Indoor unit and tray tilted towards the drain',
      enS:'No reverse tilt that traps water in the tray' },
    { k:'hose',
      ar:'خرطوم الصرف نظيف وبلا ثنيات',
      arS:'لا سدد من بقايا الغسيل ولا انحناء يرفع الخرطوم',
      en:'Drain hose clean and without kinks',
      enS:'No blockage from washing residue and no bend lifting the hose' },
    { k:'cover',
      ar:'الحشوات والغطاء والفلاتر مُعادة بإحكام',
      arS:'أي فجوة في العزل تسبب تكاثفًا خارج الصينية',
      en:'Insulation, cover and filters refitted tightly',
      enS:'Any gap in the insulation causes condensation outside the tray' },
    { k:'runTest',
      ar:'تشغيل المكيف 10 دقائق ومعاينة بلا تنقيط',
      arS:'المعاينة بعد التشغيل الفعلي، لا قبله',
      en:'Run the AC for 10 minutes and check for no dripping',
      enS:'Check after it actually runs, not before' },
    { k:'customer',
      ar:'العميل شاهد الاختبار',
      arS:'العميل حضر اختبار الصرف أو التشغيل قبل المغادرة',
      en:'Customer watched the test',
      enS:'The customer was present for the drain or run test before you left' }
  ];

  /* ===== صيانة وإصلاح ===== */
  var MAINT = [
    { k:'mFault',
      ar:'الخلل مُشخَّصٌ ومكتوب',
      arS:'اكتب سبب العطل في الملاحظة أدناه — لا «تم الإصلاح» وحدها',
      en:'Fault diagnosed and written down',
      enS:'Write the cause in the note below — not just "fixed"' },
    { k:'mPart',
      ar:'القطعة المركَّبة مذكورةٌ باسمها',
      arS:'نوعها وسعتها — كمبروسر، مكثّف، لوحة، مروحة…',
      en:'Installed part named',
      enS:'Type and rating — compressor, capacitor, board, fan…' },
    { k:'mOld',
      ar:'القطعة القديمة أُريت للعميل أو سُلِّمت له',
      arS:'يمنع نزاعاً لاحقاً حول ما استُبدل',
      en:'Old part shown or handed to the customer',
      enS:'Prevents later disputes about what was replaced' },
    { k:'mMeasure',
      ar:'قياس الضغط والتيار بعد الإصلاح',
      arS:'تأشير فقط — لا تُدخل أرقاماً هنا',
      en:'Pressure and current measured after the repair',
      enS:'Tick only — no numbers needed here' },
    { k:'mRun',
      ar:'تشغيل المكيف 10 دقائق واستقرار التبريد',
      arS:'المعاينة بعد التشغيل الفعلي، لا قبله',
      en:'Run the AC for 10 minutes and cooling is stable',
      enS:'Check after it actually runs, not before' },
    { k:'mNoise',
      ar:'لا أصوات ولا اهتزاز بعد التركيب',
      arS:'القطعة مثبّتةٌ في موضعها ولا تلامس غيرها',
      en:'No noise or vibration after fitting',
      enS:'The part is seated firmly and touches nothing else' },
    { k:'mWitness',
      ar:'العميل شاهد التشغيل بعد الإصلاح',
      arS:'حضر التشغيل قبل المغادرة',
      en:'Customer watched it run after the repair',
      enS:'Present for the run test before you left' }
  ];

  /* ===== تركيب مكيف جديد ===== */
  var INSTALL = [
    { k:'iMount',
      ar:'تثبيت الوحدتين على قاعدةٍ مستوية',
      arS:'الكانات مربوطة والوحدة الخارجية غير مائلة',
      en:'Both units mounted on a level base',
      enS:'Brackets tightened and the outdoor unit not leaning' },
    { k:'iDrain',
      ar:'مسار التصريف منحدرٌ إلى الخارج',
      arS:'لا ارتفاع في الخرطوم يحبس الماء',
      en:'Drain route sloping outwards',
      enS:'No rise in the hose that traps water' },
    { k:'iInsul',
      ar:'عزل مواسير النحاس كاملاً',
      arS:'لا جزء مكشوف يُنتج تكاثفاً',
      en:'Copper pipes fully insulated',
      enS:'No exposed section that produces condensation' },
    { k:'iVacuum',
      ar:'تفريغ الهواء من الدائرة',
      arS:'تأشير فقط — لا تُدخل أرقاماً هنا',
      en:'Circuit vacuumed',
      enS:'Tick only — no numbers needed here' },
    { k:'iLeak',
      ar:'فحص وصلات الغاز بلا تسرّب',
      arS:'افحص الوصلات الأربع بعد الربط',
      en:'Gas connections checked, no leak',
      enS:'Check all four joints after tightening' },
    { k:'iRun',
      ar:'تشغيل المكيف 10 دقائق وتبريد سليم',
      arS:'المعاينة بعد التشغيل الفعلي، لا قبله',
      en:'Run the AC for 10 minutes with proper cooling',
      enS:'Check after it actually runs, not before' },
    { k:'iClean',
      ar:'موقع العمل نظيفٌ ومسلَّم',
      arS:'لا مخلفات ولا ثقوب مكشوفة',
      en:'Work area cleaned and handed over',
      enS:'No debris and no open holes left behind' }
  ];

  /* توحيد الحروف ثم التقطيع إلى كلمات.
     درسٌ كلّف يوماً: «لوح» تقع داخل «الوحدة»، فالمطابقة بالكلمة كاملةً
     لا بجزءٍ منها. */
  function tokens(service) {
    var s = String(service || '')
      .replace(/[ً-ْـ]/g, '')
      .replace(/[آأإٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .toLowerCase();
    var raw = s.split(/[^0-9ء-يa-z]+/);
    var out = {}, i, w;
    for (i = 0; i < raw.length; i++) {
      w = raw[i];
      if (!w) continue;
      out[w] = 1;
      /* واو العطف تُزال أولاً: «غسيل وصيانة» كلمتُها الثانية «وصيانة»
         فلا تطابق «صيانة» ما لم تُجرَّد — وكانت تخرج غسيلاً لا مختلطة. */
      if (w.indexOf('و') === 0 && w.length > 3) { w = w.slice(1); out[w] = 1; }
      /* ثم أداة التعريف: الناس يكتبون «الغسيل» و«غسيل» */
      if (w.indexOf('ال') === 0 && w.length > 3) out[w.slice(2)] = 1;
    }
    return out;
  }

  function anyOf(tok, words) {
    for (var i = 0; i < words.length; i++) { if (tok[words[i]]) return true; }
    return false;
  }

  var WASH_W    = ['غسيل', 'تنظيف', 'نظافه', 'wash', 'washing', 'clean', 'cleaning'];
  var MAINT_W   = ['صيانه', 'اصلاح', 'كشف', 'عطل', 'اعطال', 'تعبئه', 'فريون', 'غاز',
                   'repair', 'maintenance', 'fix', 'freon', 'gas', 'service'];
  /* قطعٌ تُركَّب في إصلاح، لا في تركيب مكيفٍ جديد */
  var PART_W    = ['كمبروسر', 'كومبروسر', 'ضاغط', 'بطاريه', 'مكثف', 'لوحه', 'بورده',
                   'مروحه', 'موتور', 'ثرموستات', 'ريموت', 'حساس', 'compressor',
                   'capacitor', 'board', 'fan', 'motor', 'thermostat', 'sensor' ];
  var INSTALL_W = ['تركيب', 'install', 'installation', 'fitting', 'mount'];

  var API = {
    WASH: WASH, MAINT: MAINT, INSTALL: INSTALL,

    /**
     * نوع الزيارة من اسم الخدمة:
     *   'wash' · 'maint' · 'install' · 'mixed' · '' إن لم يُعرف
     *
     * والصيانة تسبق التركيب: «تركيب كمبروسر» و«تركيب بطارية» إصلاحٌ
     * تُركَّب فيه قطعة، لا تركيبُ مكيفٍ جديد. ولولا هذا لسُئل الفنيّ عن
     * تفريغ الدائرة وعزل المواسير وهو يبدّل مكثّفاً.
     */
    kindOf: function (service) {
      var tok = tokens(service);
      var w = anyOf(tok, WASH_W);
      var m = anyOf(tok, MAINT_W) || anyOf(tok, PART_W);
      var i = anyOf(tok, INSTALL_W);

      /* باقة الصيانة السنوية: زيارتها الدورية زيارةُ غسيل */
      if (tok['باقه'] || tok['عقد']) return 'wash';

      if (i && anyOf(tok, PART_W)) return 'maint';   // تركيب قطعةٍ = إصلاح
      if (w && m) return 'mixed';
      if (m) return 'maint';
      if (i) return 'install';
      if (w) return 'wash';
      return '';
    },

    /** بنود القائمة لنوعٍ ما — والمجهول يُعامَل معاملة الغسيل */
    itemsFor: function (kind) {
      if (kind === 'maint')   return MAINT.slice();
      if (kind === 'install') return INSTALL.slice();
      if (kind === 'mixed')   return WASH.concat(MAINT);
      return WASH.slice();
    },

    /** أتحتاج هذه الزيارة ملاحظةً مكتوبة؟ الإصلاح يحتاجها دائماً */
    needsNote: function (kind) {
      return kind === 'maint' || kind === 'mixed';
    },

    /** اسم النوع للعرض */
    kindLabel: function (kind, lang) {
      var AR = { wash:'غسيل', maint:'صيانة وإصلاح', install:'تركيب', mixed:'غسيل وصيانة' };
      var EN = { wash:'Washing', maint:'Repair', install:'Installation', mixed:'Wash + repair' };
      var m = (lang === 'en') ? EN : AR;
      return m[kind] || (lang === 'en' ? 'Visit' : 'زيارة');
    },

    /**
     * نصُّ بندٍ بمفتاحه — تقرأ به صفحةُ الإدارة ما حُفظ.
     * والمفتاح المجهول يُرجَع كما هو لا يُسقَط: سجلٌّ قديم أو بندٌ
     * حُذف لاحقاً يبقى ظاهراً في الملخّص بدل أن يختفي بلا أثر.
     */
    label: function (key, lang) {
      var all = WASH.concat(MAINT).concat(INSTALL);
      for (var i = 0; i < all.length; i++) {
        if (all[i].k === key) return (lang === 'en') ? all[i].en : all[i].ar;
      }
      return String(key);
    }
  };

  window.AtwadClosing = API;
})();
