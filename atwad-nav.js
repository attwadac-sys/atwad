/**
 * أطواد — التنقل بين الصفحات وحماية البيانات غير المحفوظة
 * يُحمَّل في نهاية كل صفحة:  <script src="atwad-nav.js"></script>
 *
 * يعالج ثلاث مشكلات:
 *  ١) القائمة الجانبية مخفية على الجوال (أقل من 900 بكسل) فلا توجد وسيلة
 *     تنقل داخل النظام — يُضاف هنا شريط سفلي للجوال.
 *  ٢) الانتقال كان يستبدل الصفحة الحالية فتضيع البيانات المدخلة. الآن كل
 *     انتقال إلى صفحة أخرى يُفتح في تبويب خاص بها، والصفحة الحالية تبقى
 *     مفتوحة بما فيها. ولكل صفحة تبويب واحد يُعاد استخدامه، فلا تتكاثر
 *     التبويبات على الجوال.
 *  ٣) زر الرجوع أو إغلاق التبويب وفيه بيانات غير محفوظة يطلب تأكيداً.
 *
 * الشريط السفلي يختفي تلقائياً ما دامت نافذة منبثقة مفتوحة، وطبقته أدنى
 * من طبقات نوافذ النظام، حتى لا يحجب أزرارها أبداً.
 *
 * لا يلمس هذا الملف بيانات Firebase ولا أي منطق قائم؛ يعمل على طبقة
 * التنقل فقط. لاستثناء حقل من حساب «البيانات غير المحفوظة» أضف إليه
 * الخاصية data-nosave.
 */
(function(){
  'use strict';

  var PAGES = [
    { file:'index.html',              label:'الرئيسية',  icon:'🏠' },
    { file:'atwad-customers.html',    label:'العملاء',   icon:'👥' },
    { file:'atwad-appointments.html', label:'المواعيد',  icon:'📅' },
    { file:'atwad-workorders.html',   label:'الأوامر',   icon:'🔧' },
    { file:'atwad-finance.html',      label:'المالية',   icon:'💰' },
    { file:'atwad-reports.html',      label:'التقارير',  icon:'📊' }
  ];

  var INTERNAL = /^(index|atwad-[\w-]+)\.html$/;

  function currentPage(){
    var last = location.pathname.split('/').pop();
    return last ? last : 'index.html';
  }

  /** اسم ثابت لتبويب كل صفحة، حتى لا تتكاثر التبويبات بلا حد */
  function tabName(file){
    return 'atwad_' + String(file).replace(/[^A-Za-z0-9]/g, '_');
  }

  /** نُسمّي التبويب الحالي باسم صفحته ليُعاد استخدامه لا تكراره */
  function claimTab(){
    if(String(window.name).indexOf('atwad_') !== 0){
      window.name = tabName(currentPage());
    }
  }

  /* ===== رصد البيانات غير المحفوظة ===== */

  /** حقول البحث والفلترة لا تُعدّ بيانات تضيع */
  function isSearchField(f){
    if(f.type === 'search') return true;
    var hay = [
      f.id || '', f.name || '', f.className || '',
      f.getAttribute('placeholder') || ''
    ].join(' ').toLowerCase();
    return hay.indexOf('search') !== -1
        || hay.indexOf('filter') !== -1
        || hay.indexOf('ابحث')  !== -1
        || hay.indexOf('بحث')   !== -1;
  }

  /** الحقل داخل نافذة مغلقة أو قسم مخفي لا يُحسب */
  function isVisible(el){
    return !!el.offsetParent;
  }

  /**
   * يرجع true إذا كان في الصفحة حقل ظاهر أدخل فيه المستخدم قيمة
   * تختلف عن قيمته الأصلية. يُحسب لحظة الحاجة، فلا يحتاج تتبعاً مستمراً،
   * وإغلاق النافذة بعد الحفظ يُخفي حقولها فتخرج من الحساب تلقائياً.
   */
  function hasUnsavedInput(){
    var fields = document.querySelectorAll('input, textarea');
    for(var i = 0; i < fields.length; i++){
      var f = fields[i];
      if(f.type === 'hidden' || f.disabled || f.readOnly) continue;
      if(f.hasAttribute('data-nosave')) continue;
      if(isSearchField(f)) continue;
      if(!isVisible(f)) continue;

      if(f.type === 'checkbox' || f.type === 'radio'){
        if(f.checked !== f.defaultChecked) return true;
        continue;
      }
      var now  = String(f.value || '').trim();
      var orig = String(f.defaultValue || '').trim();
      if(now && now !== orig) return true;
    }
    return false;
  }

  /* ===== تنبيه خفيف ===== */
  function notice(text){
    var box = document.getElementById('atwadNavNotice');
    if(!box){
      box = document.createElement('div');
      box.id = 'atwadNavNotice';
      document.body.appendChild(box);
    }
    box.textContent = text;
    box.className = 'show';
    setTimeout(function(){
      var el = document.getElementById('atwadNavNotice');
      if(el) el.className = '';
    }, 3600);
  }

  /* ===== الانتقال ===== */
  /**
   * كل انتقال إلى صفحة أخرى يُفتح في تبويب جديد، فتبقى الصفحة الحالية
   * مفتوحة بكل ما فيها. الضغط على الصفحة الحالية نفسها يعيدك لأعلاها.
   */
  function go(file){
    if(file === currentPage()){
      window.scrollTo(0, 0);
      return;
    }
    // تبويب واحد لكل صفحة: إن كان مفتوحاً نعود إليه، وإلا يُفتح تبويب جديد.
    // هكذا تبقى الصفحة الحالية وما فيها من بيانات، ولا تتجمّع عشرات التبويبات.
    var win = window.open(file, tabName(file));
    if(win){
      try {
        win.focus();
      } catch(err){
        console.warn('[atwad-nav] تعذّر تنشيط التبويب:', err);
      }
      return;
    }

    // المتصفح منع التبويب الجديد — ننتقل في نفس التبويب بعد تحذير إن لزم
    notice('متصفحك يمنع التبويبات الجديدة — افتح الإعدادات واسمح بها لهذا الموقع');
    if(hasUnsavedInput()){
      if(!window.confirm('لديك بيانات غير محفوظة في هذه الصفحة. المغادرة الآن تفقدها. هل تريد المتابعة؟')) return;
    }
    location.href = file;
  }

  /* ===== إعادة ربط التنقل القائم ===== */
  function handlerFor(target){
    return function(e){
      e.preventDefault();
      e.stopPropagation();
      go(target);
    };
  }

  /** عناصر القائمة الجانبية تستخدم onclick="location.href='...'" */
  function rebindSidebar(){
    var nodes = document.querySelectorAll('[onclick]');
    for(var i = 0; i < nodes.length; i++){
      var raw = nodes[i].getAttribute('onclick') || '';
      var m = raw.match(/location\.href\s*=\s*['"]([\w-]+\.html)['"]/);
      if(!m) continue;
      if(!INTERNAL.test(m[1])) continue;
      nodes[i].removeAttribute('onclick');
      nodes[i].addEventListener('click', handlerFor(m[1]));
    }
  }

  /** بطاقات الصفحة الرئيسية وروابط الصفحات الداخلية */
  function rebindLinks(){
    var links = document.querySelectorAll('a[href]');
    for(var i = 0; i < links.length; i++){
      var href = links[i].getAttribute('href') || '';
      if(!INTERNAL.test(href)) continue;
      if(links[i].getAttribute('target')) continue;
      links[i].addEventListener('click', handlerFor(href));
    }
  }

  /* ===== شريط الجوال ===== */
  function buildMobileBar(){
    if(document.getElementById('atwadMobileNav')) return;

    var here = currentPage();
    var bar  = document.createElement('nav');
    bar.id = 'atwadMobileNav';
    bar.setAttribute('aria-label', 'التنقل بين صفحات النظام');

    for(var i = 0; i < PAGES.length; i++){
      var p   = PAGES[i];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = (p.file === here) ? 'amn-item active' : 'amn-item';
      btn.innerHTML = '<span class="amn-ic">' + p.icon + '</span>' +
                      '<span class="amn-tx">' + p.label + '</span>';
      btn.addEventListener('click', handlerFor(p.file));
      bar.appendChild(btn);
    }
    document.body.appendChild(bar);
  }

  function injectStyles(){
    if(document.getElementById('atwadNavStyles')) return;
    var css = document.createElement('style');
    css.id = 'atwadNavStyles';
    css.textContent =
      '#atwadNavNotice{position:fixed;bottom:84px;right:50%;transform:translate(50%,14px);' +
        'background:#0A2540;color:#fff;font-family:inherit;font-size:13px;font-weight:700;' +
        'padding:12px 18px;border-radius:12px;box-shadow:0 8px 28px rgba(10,37,64,.3);' +
        'z-index:9999;max-width:88vw;text-align:center;line-height:1.6;' +
        'opacity:0;visibility:hidden;transition:opacity .22s,transform .22s,visibility .22s;}' +
      '#atwadNavNotice.show{opacity:1;visibility:visible;transform:translate(50%,0);}' +

      '#atwadMobileNav{display:none;}' +

      '@media(max-width:900px){' +
        '#atwadMobileNav{display:flex;position:fixed;bottom:0;right:0;left:0;z-index:90;' +
          'background:#0A2540;border-top:1px solid rgba(255,255,255,.1);' +
          'padding:6px 2px calc(6px + env(safe-area-inset-bottom,0px));' +
          'box-shadow:0 -4px 20px rgba(10,37,64,.22);}' +
        '#atwadMobileNav .amn-item{flex:1;min-width:0;background:none;border:none;' +
          'display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 2px;' +
          'color:rgba(255,255,255,.62);cursor:pointer;border-radius:10px;' +
          'font-family:inherit;-webkit-tap-highlight-color:transparent;}' +
        '#atwadMobileNav .amn-item.active{color:#38BDF8;background:rgba(56,189,248,.14);}' +
        '#atwadMobileNav .amn-ic{font-size:19px;line-height:1;}' +
        '#atwadMobileNav .amn-tx{font-size:10.5px;font-weight:700;white-space:nowrap;}' +
        '#atwadMobileNav .amn-item:focus-visible{outline:2px solid #38BDF8;outline-offset:-2px;}' +
        'body.atwad-nav-off #atwadMobileNav{display:none !important;}' +
        'body{padding-bottom:70px !important;}' +
        '#atwadNavNotice{bottom:96px;}' +
      '}' +
      '@media(prefers-reduced-motion:reduce){' +
        '#atwadNavNotice{transition:none;}' +
      '}';
    document.head.appendChild(css);
  }

  /* ===== إخفاء الشريط عند فتح نافذة ===== */
  /*
   * نوافذ النظام كلها أبناء مباشرون للـ body وتغطي الشاشة. إن بقي الشريط
   * ظاهراً فوقها حجب أزرارها السفلية — وهذا ما منع «متابعة إلى الحجز».
   * نُخفيه ما دامت نافذة مفتوحة، ونُعيده عند إغلاقها.
   */
  var SKIP_IDS = { atwadMobileNav:1, atwadNavNotice:1, atwadNavStyles:1 };

  function overlayOpen(){
    var kids = document.body.children;
    for(var i = 0; i < kids.length; i++){
      var el = kids[i];
      if(el.id && SKIP_IDS[el.id]) continue;
      var tag = el.tagName;
      if(tag === 'SCRIPT' || tag === 'STYLE' || tag === 'LINK' || tag === 'NOSCRIPT') continue;

      var cs = window.getComputedStyle(el);
      if(cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
      if(cs.position !== 'fixed' && cs.position !== 'absolute') continue;

      var z = parseInt(cs.zIndex, 10);
      if(isNaN(z) || z < 100) continue;

      var r = el.getBoundingClientRect();
      if(r.height >= window.innerHeight * 0.5 && r.width >= window.innerWidth * 0.6) return true;
    }
    return false;
  }

  var barHidden = false;
  function syncBar(){
    var hide = overlayOpen();
    if(hide === barHidden) return;
    barHidden = hide;
    if(hide){
      document.body.classList.add('atwad-nav-off');
    } else {
      document.body.classList.remove('atwad-nav-off');
    }
  }

  function watchOverlays(){
    var pending = false;
    function schedule(){
      if(pending) return;
      pending = true;
      window.requestAnimationFrame(function(){
        pending = false;
        syncBar();
      });
    }
    if(window.MutationObserver){
      new MutationObserver(schedule).observe(document.body, {
        subtree: true, childList: true,
        attributes: true, attributeFilter: ['style', 'class']
      });
    }
    window.addEventListener('click', schedule, true);
    window.addEventListener('transitionend', schedule, true);
    window.addEventListener('resize', schedule);
    syncBar();
  }

  /* ===== حماية زر الرجوع وإغلاق التبويب ===== */
  function guardUnload(){
    window.addEventListener('beforeunload', function(e){
      if(!hasUnsavedInput()) return;
      e.preventDefault();
      e.returnValue = '';
      return '';
    });
  }

  function start(){
    try {
      claimTab();
      injectStyles();
      buildMobileBar();
      rebindSidebar();
      rebindLinks();
      watchOverlays();
      guardUnload();
    } catch(err){
      console.error('[atwad-nav] تعذّر تهيئة التنقل:', err);
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
