/* ============================================================
   NAV.JS
   โค้ดในไฟล์นี้ "ใช้ร่วมกันทุกหน้า" (index, vocabulary, grammar, quiz)
   เพราะทุกหน้ามี header เดียวกัน + footer เดียวกัน
   จึงแยกออกมาจาก app.js เพื่อไม่ต้อง copy-paste โค้ดเดิมซ้ำในทุกไฟล์
   (หลักการ DRY: Don't Repeat Yourself)

   ต้องโหลดหลัง i18n.js แต่ก่อนสคริปต์เฉพาะหน้า (เช่น app.js, vocabulary.js)
   ============================================================ */

// ------------------------------------------------------------
// เมนูมือถือ: สลับ class "open" ไป-มาทุกครั้งที่กดปุ่มแฮมเบอร์เกอร์
// ------------------------------------------------------------
const navToggle = document.getElementById('navToggle');
const siteNav = document.getElementById('siteNav');

navToggle.addEventListener('click', () => {
  const isOpen = siteNav.classList.toggle('open');
  // aria-expanded ช่วยให้โปรแกรมอ่านหน้าจอ (screen reader) รู้ว่าเมนูเปิดอยู่หรือปิดอยู่
  navToggle.setAttribute('aria-expanded', isOpen);
});

// ------------------------------------------------------------
// ปีในฟุตเตอร์: ให้ JS คำนวณปีปัจจุบันแทนการพิมพ์เลขปีตายตัวใน HTML
// ------------------------------------------------------------
document.getElementById('year').textContent = new Date().getFullYear();