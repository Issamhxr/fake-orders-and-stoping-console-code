<script>
(function(){
  // -----------------------
  // 1) Anti-inspect / block common DevTools keys & right-click
  // -----------------------
  (function antiInspect(){
    // block right click
    document.addEventListener('contextmenu', function(e){ e.preventDefault(); }, true);
    // block right mouse down (extra)
    document.addEventListener('mousedown', function(e){ if (e.button === 2) e.preventDefault(); }, true);
    // block selection copy (optional)
    // document.addEventListener('copy', function(e){ e.preventDefault(); }, true);

    // block keys (F12, Ctrl/Cmd+Shift+I/J/C/K, Ctrl/Cmd+U, Ctrl/Cmd+Shift+K etc)
    window.addEventListener('keydown', function(e){
      try {
        const key = (e.key || '').toLowerCase();
        const ctrlOrCmd = e.ctrlKey || e.metaKey; // metaKey for Mac (Cmd)
        const shift = e.shiftKey;
        // F12
        if (e.key === 'F12' || e.keyCode === 123) { e.preventDefault(); e.stopPropagation(); return; }
        // Ctrl/Cmd + Shift + (I, J, C, K) — common devtools combos
        if (ctrlOrCmd && shift && (key === 'i' || key === 'j' || key === 'c' || key === 'k')) {
          e.preventDefault(); e.stopPropagation(); return;
        }
        // Ctrl/Cmd + U (view source)
        if (ctrlOrCmd && key === 'u') { e.preventDefault(); e.stopPropagation(); return; }
        // Ctrl/Cmd + Shift + K (Firefox console)
        if (ctrlOrCmd && shift && key === 'k') { e.preventDefault(); e.stopPropagation(); return; }
        // Ctrl/Cmd + Shift + S / P (some dev combos) - optional
        if (ctrlOrCmd && shift && (key === 's' || key === 'p')) { e.preventDefault(); e.stopPropagation(); return; }
      } catch(err){}
    }, true);

    // Optional lightweight devtools detector (not intrusive) — logs a warning if likely open
    (function detectDevtools(){
      let opened = false;
      const threshold = 160;
      setInterval(function(){
        try {
          const widthDiff = window.outerWidth - window.innerWidth;
          const heightDiff = window.outerHeight - window.innerHeight;
          const likelyOpen = widthDiff > threshold || heightDiff > threshold;
          if (likelyOpen && !opened) {
            opened = true;
            console.warn('[antiInspect] DevTools likely opened');
          } else if (!likelyOpen && opened) {
            opened = false;
            console.warn('[antiInspect] DevTools closed');
          }
        } catch(e){}
      }, 1000);
    })();
  })();

  // -----------------------
  // 2) Product-specific "one purchase per 24h" blocker
  // -----------------------
  (function productBlocker(){
    const LIMIT_MS = 24 * 60 * 60 * 1000; // 24h
    const REDIRECT_SECONDS = 10;

    // Get product identifier — prefer og:title (your provided meta), fallback to other methods
    function getProductSlug(){
      try {
        const og = document.querySelector('meta[property="og:title"], meta[name="og:title"]');
        if (og && og.content) return og.content.trim().substring(0,200);
        // canonical URL slug fallback
        const can = document.querySelector('link[rel="canonical"]');
        if (can && can.href) {
          try { const u = new URL(can.href); const parts = u.pathname.split('/').filter(Boolean); if (parts.length) return parts[parts.length-1]; } catch(e){}
        }
        // path-based fallback (/product/slug)
        const m = location.pathname.match(/\/(?:products?|product|p|item)\/([^\/?#]+)/i);
        if (m && m[1]) return m[1];
        // json-ld fallback
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const s of scripts) {
          try {
            const data = JSON.parse(s.textContent || s.innerText || '{}');
            const arr = Array.isArray(data) ? data : (Array.isArray(data['@graph']) ? data['@graph'] : [data]);
            for (const node of arr) {
              if (!node) continue;
              const t = node['@type'] || node.type;
              if (!t) continue;
              const typeStr = (Array.isArray(t) ? t[0] : t).toString().toLowerCase();
              if (typeStr.includes('product')) {
                const id = node.sku || node.productID || node.name || node.url;
                if (id) return String(id).trim().replace(/\s+/g,'-').substring(0,200);
              }
            }
          } catch(e){}
        }
        // final fallback: title + pathname
        if (document.title) return document.title.trim().substring(0,200).replace(/\s+/g,'-');
      } catch(e){}
      return 'unknown-product';
    }

    const slug = getProductSlug();
    const productKey = 'yc_prod_' + encodeURIComponent(slug);
    console.log('[YouCanBlock] productKey ->', productKey);

    function now(){ return Date.now(); }
    function isBlocked(){
      try {
        const t = Number(localStorage.getItem(productKey) || 0);
        if (!t) return false;
        return (now() - t) < LIMIT_MS;
      } catch(e){ return false; }
    }
    function markAttempt(){
      try { localStorage.setItem(productKey, String(now())); } catch(e){}
    }

    // Overlay UI (shows remaining until allowed + redirect countdown)
    function showOverlay(){
      if (document.getElementById('yc_prod_block_overlay')) return;
      const ts = Number(localStorage.getItem(productKey) || 0);
      const prevOverflow = document.documentElement.style.overflow || '';

      const overlay = document.createElement('div');
      overlay.id = 'yc_prod_block_overlay';
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.zIndex = '9999999';
      overlay.style.background = 'rgba(0,0,0,0.92)';
      overlay.style.color = '#fff';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.textAlign = 'center';
      overlay.style.padding = '20px';
      overlay.style.fontFamily = 'sans-serif';
      overlay.innerHTML = `
        <div style="max-width:720px">
          <h2 style="margin:0 0 12px;font-size:22px">⚠️ لا يمكنك شراء هذا المنتج الآن</h2>
          <p style="margin:0 0 10px">يمكنك المحاولة مرة أخرى بعد: <strong id="yc_time_left">--</strong></p>
          <p style="margin:6px 0 18px">🔄 سيتم تحويلك للصفحة الرئيسية خلال <span id="yc_redirect">` + REDIRECT_SECONDS + `</span> ثانية</p>
          <div><button id="yc_close_btn" style="padding:8px 12px;border-radius:6px;border:0;background:#fff;color:#000;cursor:pointer">إغلاق (لن يسمح بالشراء)</button></div>
        </div>
      `;
      document.body.appendChild(overlay);
      document.documentElement.style.overflow = 'hidden';

      function formatMs(ms){
        if (ms <= 0) return '0s';
        const s = Math.floor(ms/1000);
        const h = Math.floor(s/3600);
        const m = Math.floor((s%3600)/60);
        const sec = s%60;
        return `${h}h ${m}m ${sec}s`;
      }

      const elLeft = document.getElementById('yc_time_left');
      let upd = setInterval(function(){
        const leftMs = Math.max(0, LIMIT_MS - (now() - ts));
        if (elLeft) elLeft.textContent = formatMs(leftMs);
        if (leftMs <= 0) { clearInterval(upd); }
      }, 1000);

      let rd = REDIRECT_SECONDS;
      const rdEl = document.getElementById('yc_redirect');
      const rdInt = setInterval(function(){
        rd--;
        if (rdEl) rdEl.textContent = String(Math.max(0, rd));
        if (rd <= 0) {
          clearInterval(rdInt);
          clearInterval(upd);
          try { document.documentElement.style.overflow = prevOverflow; } catch(e){}
          location.href = '/';
        }
      }, 1000);

      document.getElementById('yc_close_btn').addEventListener('click', function(){
        clearInterval(rdInt);
        clearInterval(upd);
        try { document.documentElement.style.overflow = prevOverflow; } catch(e){}
        const o = document.getElementById('yc_prod_block_overlay');
        if (o) o.remove();
      });
    }

    // Detect "buy" intent (flexible)
    const buyKeywords = /(add to cart|add-to-cart|addtocart|addcart|add cart|buy now|buy|checkout|cart|purchase|pay|order|اضف|أضف|اضافة للسلة|اضافة الى السلة|اضافة|سلة|شراء|طلب|دفع|تأكيد|شراء الآن)/i;
    function looksLikeBuy(el){
      if (!el) return false;
      const textParts = [
        (el.innerText||''),
        (el.value||''),
        (el.getAttribute && el.getAttribute('aria-label') || ''),
        el.id||'',
        el.className||'',
        (el.getAttribute && el.getAttribute('href') || '')
      ].join(' ').toLowerCase();
      return buyKeywords.test(textParts);
    }

    // Attach to buttons found now, plus observe for dynamic changes
    function attachToButton(btn){
      if (!btn || btn.dataset.ycBound) return;
      btn.dataset.ycBound = '1';
      btn.addEventListener('click', function(e){
        if (!looksLikeBuy(btn)) return;
        if (isBlocked()){
          e.preventDefault(); e.stopPropagation();
          showOverlay();
          return false;
        } else {
          // first purchase → mark attempt (store timestamp)
          markAttempt();
          // allow default behavior
        }
      }, true);
    }

    function scanAndAttach(){
      const selectors = [
        "button[type='submit']",
        "button.add-to-cart",
        "button[class*='add']",
        "button[class*='buy']",
        "a.add-to-cart",
        "[data-add-to-cart]",
        "input[type='submit']"
      ];
      const nodes = document.querySelectorAll(selectors.join(','));
      nodes.forEach(attachToButton);
    }

    // general click delegation (fallback)
    function globalClickHandler(e){
      const btn = e.target.closest('button, a, input[type="submit"]');
      if (!btn) return;
      if (!looksLikeBuy(btn)) return;
      if (isBlocked()){
        e.preventDefault(); e.stopPropagation();
        showOverlay();
        return false;
      } else {
        markAttempt();
      }
    }

    scanAndAttach();
    try {
      const mo = new MutationObserver(function(){ scanAndAttach(); });
      mo.observe(document.body || document.documentElement, {childList:true, subtree:true});
    } catch(e){}

    document.addEventListener('click', globalClickHandler, true);

    // Form submit safeguard
    document.addEventListener('submit', function(e){
      try {
        const form = e.target;
        const txt = (form.getAttribute('action')||'') + ' ' + form.className + ' ' + (form.id||'');
        if (/cart|checkout|order|purchase/i.test(txt) || form.querySelector('[name*="product"], [name*="variant"], [name*="quantity"]')) {
          if (isBlocked()){
            e.preventDefault(); e.stopPropagation(); showOverlay(); return false;
          } else {
            markAttempt();
          }
        }
      } catch(err){}
    }, true);

    // Test reset: add ?ycreset=1 to URL to clear stored block for this product
    try { if (location.search.indexOf('ycreset=1') !== -1) { localStorage.removeItem(productKey); console.log('[YouCanBlock] reset key', productKey); } } catch(e){}
  })();

})(); 
</script>
