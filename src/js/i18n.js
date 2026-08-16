/* ============================================================
   I18N.JS  (i18n = internationalization ย่อมาจากตัวอักษร i + 18 ตัว + n)
   หน้าที่: โหลดไฟล์คำแปล (th.json / en.json / ja.json) แล้วแปะข้อความ
   ลงในทุก element ที่มี attribute data-i18n="..." ให้ตรงกับภาษาที่เลือก

   ต้องโหลดไฟล์นี้ "ก่อน" app.js เสมอ (ดู <script> ท้าย index.html)
   เพราะ app.js จะไปคอยฟัง event "languagechanged" ที่ไฟล์นี้เป็นคนยิงออกมา
   ============================================================ */

const SUPPORTED_LANGS = ['th', 'en', 'ja'];
const LANG_STORAGE_KEY = 'site-lang'; // ชื่อ key ที่ใช้เก็บภาษาที่เลือกไว้ใน localStorage

// ------------------------------------------------------------
// localStorage คือพื้นที่เก็บข้อมูลเล็กๆ ในเบราว์เซอร์ของผู้ใช้เอง
// (คล้าย EEPROM ใน Arduino ที่จำค่าไว้ได้แม้ปิด-เปิดใหม่)
// เราใช้มันเก็บว่า "ผู้ใช้เลือกภาษาอะไรไว้ล่าสุด" เพื่อให้พอย้ายไปหน้าอื่น
// หรือปิดแล้วเปิดเว็บใหม่ ภาษาที่เลือกไว้จะยังอยู่เหมือนเดิม
// หมายเหตุ: ต้องเปิดผ่านเซิร์ฟเวอร์จริง (Live Server / Vercel) ฟีเจอร์นี้ถึงจะทำงานสมบูรณ์
// ------------------------------------------------------------
function getSavedLang() {
  const saved = localStorage.getItem(LANG_STORAGE_KEY);
  return SUPPORTED_LANGS.includes(saved) ? saved : 'th'; // ถ้าไม่เคยเลือกไว้ ใช้ไทยเป็นค่าเริ่มต้น
}

// ดึงไฟล์ JSON ของภาษานั้นๆ มาแปลงเป็น object ด้วย fetch (เหมือนขอไฟล์จากเซิร์ฟเวอร์)
// path เป็น ../ เพราะสคริปต์นี้ถูกเรียกใช้จากหน้าใน pages/ เสมอ
async function loadDictionary(lang) {
  const res = await fetch(`../src/data/lang/${lang}.json`);
  if (!res.ok) {
    throw new Error(`โหลดไฟล์ภาษา "${lang}" ไม่สำเร็จ (status ${res.status})`);
  }
  return res.json(); // แปลงข้อความ JSON ให้กลายเป็น JS object พร้อมใช้งาน
}

// เดินไล่ทุก element ที่มี data-i18n แล้วเอาข้อความจาก dictionary ไปแปะแทนที่
function applyDictionary(dict) {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });

  // บาง element ต้องแปล aria-label (ข้อความสำหรับโปรแกรมอ่านหน้าจอ) แทน textContent
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    if (dict[key]) el.setAttribute('aria-label', dict[key]);
  });

  // และบาง element (เช่น <input>) ต้องแปล placeholder แทน textContent เหมือนกัน
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.setAttribute('placeholder', dict[key]);
  });
}

// ไฮไลต์ปุ่มภาษาที่กำลังถูกเลือกอยู่ ด้วยการเติม/ถอด class "active"
function setActiveButton(lang) {
  document.querySelectorAll('#langSwitch button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

// ฟังก์ชันหลัก: สั่งเปลี่ยนภาษาทั้งหน้า
async function setLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) lang = 'th';

  try {
    const dict = await loadDictionary(lang);

    applyDictionary(dict);
    document.documentElement.lang = lang; // อัปเดต <html lang="..."> ให้ตรงภาษาจริง (ดีต่อ accessibility/SEO)
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    setActiveButton(lang);

    // ยิง "เหตุการณ์" บอกสคริปต์อื่นๆ (เช่น app.js) ว่าภาษาถูกเปลี่ยนแล้ว
    // พร้อมแนบข้อมูลภาษา+dictionary ไปด้วยใน e.detail
    // แนวคิดนี้เรียกว่า Custom Event เหมือนเราสร้าง "สัญญาณ" ของเราเองขึ้นมาใหม่
    document.dispatchEvent(new CustomEvent('languagechanged', { detail: { lang, dict } }));
  } catch (err) {
    console.error(err);
  }
}

// ผูก event ให้ปุ่มสลับภาษาแต่ละปุ่ม (TH / EN / 日本語) ในเมนู
document.querySelectorAll('#langSwitch button').forEach((btn) => {
  btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
});

// พอสคริปต์นี้ถูกโหลด ให้เซ็ตภาษาทันที โดยใช้ภาษาที่เคยเลือกไว้ (หรือไทยถ้ายังไม่เคยเลือก)
setLanguage(getSavedLang());