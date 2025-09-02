<script>
// منع الزر الأيمن
document.addEventListener("contextmenu", e => e.preventDefault());

// منع الاختصارات
document.addEventListener("keydown", function(e) {
  if (e.keyCode == 123) e.preventDefault(); // F12
  if (e.ctrlKey && e.shiftKey && (e.keyCode == 73 || e.keyCode == 74)) e.preventDefault(); // Ctrl+Shift+I / J
  if (e.ctrlKey && e.keyCode == 85) e.preventDefault(); // Ctrl+U
});

// كشف فتح الـ DevTools عن طريق تغير حجم الشاشة
(function() {
  let threshold = 160; // عرض DevTools تقريبا
  setInterval(function() {
    if (
      window.outerWidth - window.innerWidth > threshold ||
      window.outerHeight - window.innerHeight > threshold
    ) {
      // إذا DevTools مفتوح → redirect
      window.location.href = "/store";
    }
  }, 1000);
})();
</script>
