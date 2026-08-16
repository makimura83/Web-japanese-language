/* ============================================================
   APP.JS
   ไฟล์นี้มีเฉพาะฟีเจอร์ที่ใช้ "เฉพาะหน้าแรก" เท่านั้น คือ "คำศัพท์วันนี้"
   ส่วนโค้ดที่ใช้ร่วมกันทุกหน้า (เมนูมือถือ, ปี footer) ย้ายไปอยู่ที่ src/js/nav.js แล้ว
   ต้องโหลดหลัง i18n.js และ nav.js เสมอ (ดู <script> ท้าย index.html)
   ============================================================ */


// ------------------------------------------------------------
// 1) "คำศัพท์วันนี้" — ตอนนี้ใช้ข้อมูลตัวอย่างที่เขียนไว้ตรงๆ ในไฟล์นี้ก่อน (array ของ object)
//    ทีหลังตอนทำหน้า vocabulary.html เราจะเปลี่ยนไปดึงจาก
//    src/data/n5_vocab.json จริงด้วย fetch() แทน (เดี๋ยวสอนตอนนั้น)
//
//    field "meaning" เก็บเป็น object แยกตามภาษา {th, en, ja} เพื่อให้สลับภาษา
//    ได้โดยไม่ต้องสุ่มคำใหม่ — คำ (kanji/kana) เป็นภาษาญี่ปุ่นเสมอไม่เปลี่ยนตามภาษา UI
//    เปลี่ยนแค่ "คำแปล/ความหมาย" ที่แสดงให้ผู้ใช้อ่านเท่านั้น
// ------------------------------------------------------------
const sampleWords = [
  { kanji: '水',    kana: 'みず',     meaning: { th: 'น้ำ',       en: 'water',    ja: '飲み物' } },
  { kanji: '食べる', kana: 'たべる',   meaning: { th: 'กิน',       en: 'to eat',   ja: '食事をする' } },
  { kanji: '学校',  kana: 'がっこう', meaning: { th: 'โรงเรียน', en: 'school',   ja: '勉強する場所' } },
  { kanji: '友達',  kana: 'ともだち', meaning: { th: 'เพื่อน',   en: 'friend',   ja: '仲がいい人' } },
  { kanji: '今日',  kana: 'きょう',   meaning: { th: 'วันนี้',   en: 'today',    ja: '本日' } },
];

const wordKanjiEl = document.getElementById('wordKanji');
const wordKanaEl = document.getElementById('wordKana');
const wordMeaningEl = document.getElementById('wordMeaning');
const newWordBtn = document.getElementById('newWordBtn');

// ค่าเริ่มต้นก่อนที่ i18n.js จะโหลดไฟล์ภาษาเสร็จ (i18n.js จะยิง event มาอัปเดตให้ทันทีที่พร้อม)
let currentLang = 'th';
// เก็บ "คำที่กำลังแสดงอยู่ตอนนี้" ไว้ต่างหาก เพื่อให้ตอนสลับภาษาแค่แปลคำเดิม ไม่ต้องสุ่มคำใหม่
let currentWord = sampleWords[0];

// วาดคำปัจจุบัน (currentWord) ลงจอ ตามภาษาปัจจุบัน (currentLang)
function renderWord() {
  wordKanjiEl.textContent = currentWord.kanji;
  wordKanaEl.textContent = currentWord.kana;
  // fallback เป็นภาษาไทยเผื่อ currentLang มีค่าที่ไม่มีคำแปลอยู่ในนั้น (ป้องกันจอว่าง)
  wordMeaningEl.textContent = currentWord.meaning[currentLang] || currentWord.meaning.th;
}

// สุ่มคำใหม่ 1 คำ แล้ววาดลงจอ
function showRandomWord() {
  const index = Math.floor(Math.random() * sampleWords.length);
  currentWord = sampleWords[index];
  renderWord();
}

// เรียกครั้งแรกทันทีตอนหน้าเว็บโหลดเสร็จ จะได้ไม่เห็นข้อความ "กำลังโหลด..." ค้างอยู่
showRandomWord();

// ทุกครั้งที่กดปุ่ม "สุ่มคำใหม่" ให้เรียกฟังก์ชันเดิมซ้ำ
newWordBtn.addEventListener('click', showRandomWord);

// ------------------------------------------------------------
// 2) ฟัง custom event "languagechanged" ที่ i18n.js ยิงออกมาทุกครั้งที่ผู้ใช้กดสลับภาษา
//      e.detail.lang คือรหัสภาษาที่เพิ่งถูกเลือก ('th' | 'en' | 'ja')
//      หมายเหตุ: ตั้งใจ "ไม่" เรียก showRandomWord() ตรงนี้ เพราะไม่อยากให้คำที่ผู้ใช้
//      กำลังดูอยู่เปลี่ยนไปเฉยๆ แค่เพราะสลับภาษา — แค่แปลคำเดิมใหม่ก็พอ
// ------------------------------------------------------------
document.addEventListener('languagechanged', (e) => {
  currentLang = e.detail.lang;
  renderWord();
});

// ------------------------------------------------------------
// 5) CTA ปุ่ม "เริ่มดูแผนที่บทเรียน" ใช้ href="#lesson-map" ใน HTML
//    เบราว์เซอร์เลื่อนหน้าจอไปหา element ที่มี id="lesson-map" ให้อัตโนมัติ
//    เราแค่เติม scroll-behavior: smooth ใน CSS ก็พอ ไม่จำเป็นต้องใช้ JS เพิ่ม
//    (นี่คือตัวอย่างว่า "บางอย่างทำด้วย CSS ล้วนก็พอ ไม่ต้องใช้ JS ทุกอย่าง")
// ------------------------------------------------------------