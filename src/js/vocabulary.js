/* ============================================================
   VOCABULARY.JS
   หน้าที่: โหลดคำศัพท์จาก src/data/n5_vocab.json มาแสดงเป็นการ์ดที่พลิกดูความหมายได้
   พร้อมช่องค้นหาและปุ่มกรองตามหมวดหมู่

   ต้องโหลดหลัง i18n.js และ nav.js เสมอ (ดู <script> ท้าย vocabulary.html)
   ============================================================ */

// ------------------------------------------------------------
// state ทั้งหมดของหน้านี้ เก็บไว้เป็นตัวแปรระดับบนสุด (module-level)
// ทุกครั้งที่ state ตัวใดเปลี่ยน เราจะเรียก renderGrid() ใหม่
// เพื่อ "วาดใหม่ทั้งกริด" ตาม state ปัจจุบัน — แนวคิดนี้คล้าย state+render
// ที่ใช้ในเฟรมเวิร์กสมัยใหม่ (React ก็ทำงานคล้ายๆ กันในหลักการ)
// ------------------------------------------------------------
let allWords = [];          // คำศัพท์ทั้งหมด (โหลดจาก json ครั้งเดียว)
let currentCategory = 'all'; // หมวดหมู่ที่กำลังเลือกกรองอยู่
let currentSearch = '';      // ข้อความค้นหาปัจจุบัน (ตัวพิมพ์เล็กเสมอ เพื่อเทียบง่าย)
let currentLang = 'th';      // ภาษาปัจจุบัน (อัปเดตจาก event languagechanged)

// ใช้เป็นคำแปล "สำรอง" ก่อนที่ i18n.js จะโหลดไฟล์ภาษาจริงเสร็จ (กันไม่ให้จอว่าง/พังตอนเริ่มโหลด)
let currentDict = {
  'category.all': 'ทั้งหมด',
  'category.greetings': 'คำทักทาย',
  'category.people': 'คนและครอบครัว',
  'category.time': 'เวลา',
  'category.places': 'สถานที่',
  'category.food': 'อาหารและเครื่องดื่ม',
  'category.verbs': 'คำกริยา',
  'category.adjectives': 'คำคุณศัพท์',
  'category.numbers': 'ตัวเลข',
  'vocab.count_template': 'พบ {count} จาก {total} คำ',
  'vocab.flip_hint': 'แตะเพื่อดูความหมาย',
};

// หยิบ element ที่ต้องใช้บ่อยๆ เก็บไว้ในตัวแปรตั้งแต่ต้นไฟล์
const vocabGridEl = document.getElementById('vocabGrid');
const vocabLoadingEl = document.getElementById('vocabLoading');
const vocabNoResultsEl = document.getElementById('vocabNoResults');
const vocabCountEl = document.getElementById('vocabCount');
const categoryChipsEl = document.getElementById('categoryChips');
const vocabSearchEl = document.getElementById('vocabSearch');

// ------------------------------------------------------------
// 1) โหลดข้อมูลคำศัพท์จากไฟล์ json (asynchronous — ต้องรอเน็ตเวิร์ก/ดิสก์ตอบกลับ)
//    path เป็น ../ เพราะไฟล์นี้ถูกเรียกจากหน้าใน pages/ เสมอ
// ------------------------------------------------------------
async function loadWords() {
  try {
    const res = await fetch('../data/n5_vocab.json');
    if (!res.ok) throw new Error(`โหลด n5_vocab.json ไม่สำเร็จ (status ${res.status})`);

    allWords = await res.json(); // แปลงข้อความ json ให้เป็น array ของ object พร้อมใช้งาน

    renderCategoryChips();
    renderGrid();
  } catch (err) {
    console.error(err);
    vocabLoadingEl.textContent = 'เกิดข้อผิดพลาดในการโหลดคำศัพท์ ลองรีเฟรชหน้าดูนะครับ';
  }
}

// ------------------------------------------------------------
// 2) สร้างปุ่มหมวดหมู่แบบอัตโนมัติจากข้อมูลจริง (ไม่ได้เขียนไว้ตายตัวใน HTML)
//    ขั้นตอน: ["greetings","people","greetings", ...] -> Set ตัดตัวซ้ำออก -> ["greetings","people",...]
// ------------------------------------------------------------
function renderCategoryChips() {
  const categories = [...new Set(allWords.map((w) => w.category))];

  // ปุ่มแรกคือ "ทั้งหมด" เสมอ ตามด้วยหมวดหมู่ที่เจอจริงในข้อมูล
  const chipsHtml = ['all', ...categories]
    .map((cat) => {
      const label = currentDict[`category.${cat}`] || cat;
      const isActive = cat === currentCategory ? 'active' : '';
      return `<button type="button" class="chip ${isActive}" data-category="${cat}">${label}</button>`;
    })
    .join('');

  categoryChipsEl.innerHTML = chipsHtml;

  // ผูก event ให้ทุกปุ่มที่เพิ่งสร้าง (ต้องผูกใหม่ทุกครั้งเพราะ innerHTML เขียนทับปุ่มเดิมไปแล้ว)
  categoryChipsEl.querySelectorAll('.chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentCategory = btn.dataset.category;
      renderCategoryChips(); // วาดปุ่มใหม่ เพื่ออัปเดตว่าปุ่มไหนเป็น active
      renderGrid();          // วาดการ์ดใหม่ตามหมวดที่เพิ่งเลือก
    });
  });
}

// ------------------------------------------------------------
// 3) เช็คว่าคำนี้ตรงกับคำค้นหาไหม (ค้นทุกภาษาที่มี ไม่ใช่แค่ภาษาที่กำลังแสดงอยู่
//    เผื่อผู้ใช้จำคำเป็นภาษาอังกฤษ แต่ตอนนี้สลับ UI เป็นภาษาญี่ปุ่นอยู่ ก็ยังค้นเจอ)
// ------------------------------------------------------------
function matchesSearch(word) {
  if (!currentSearch) return true;

  const haystack = [
    word.kanji,
    word.kana,
    word.romaji,
    word.meaning.th,
    word.meaning.en,
    word.meaning.ja,
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(currentSearch);
}

// รวมเงื่อนไข "หมวดหมู่ที่เลือก" + "คำค้นหา" เข้าด้วยกัน ได้ผลลัพธ์ที่จะเอาไปวาดจริง
function getFilteredWords() {
  return allWords.filter(
    (w) => (currentCategory === 'all' || w.category === currentCategory) && matchesSearch(w)
  );
}

// ------------------------------------------------------------
// 4) วาดการ์ดคำศัพท์ทั้งหมดลงจอ ตาม state ปัจจุบัน (หมวดหมู่ + คำค้นหา + ภาษา)
// ------------------------------------------------------------
function renderGrid() {
  if (allWords.length === 0) return; // ยังโหลดไม่เสร็จ ไม่ต้องทำอะไร

  vocabLoadingEl.hidden = true;

  const filtered = getFilteredWords();

  // อัปเดตข้อความ "พบ X จาก Y คำ" โดยแทนที่ {count} และ {total} ในเทมเพลตคำแปล
  vocabCountEl.textContent = currentDict['vocab.count_template']
    .replace('{count}', filtered.length)
    .replace('{total}', allWords.length);

  vocabNoResultsEl.hidden = filtered.length > 0;

  // .map() แปลง array ของคำศัพท์ ให้กลายเป็น array ของ HTML string ทีละใบ
  // แล้ว .join('') รวมทุกใบเป็น string เดียวยาวๆ ก่อนแปะลง DOM ทีเดียว
  // (แปะทีเดียวเร็วกว่าแปะทีละใบใน loop มาก)
  vocabGridEl.innerHTML = filtered
    .map((word) => {
      const categoryLabel = currentDict[`category.${word.category}`] || word.category;
      const meaning = word.meaning[currentLang] || word.meaning.th;
      const hint = currentDict['vocab.flip_hint'];

      return `
        <div class="vocab-card" data-id="${word.id}">
          <div class="vocab-card-inner">
            <div class="vocab-card-front">
              <span class="vocab-card-category">${categoryLabel}</span>
              <p class="vocab-card-kanji">${word.kanji}</p>
              <p class="vocab-card-kana">${word.kana}</p>
              <p class="vocab-card-romaji">${word.romaji}</p>
              <span class="vocab-card-hint">${hint}</span>
            </div>
            <div class="vocab-card-back">
              <p class="vocab-card-meaning">${meaning}</p>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  // ผูก event คลิก/แตะ ให้ทุกการ์ดที่เพิ่งสร้าง — กดแล้วสลับ class "flipped" (ดู CSS .vocab-card.flipped)
  vocabGridEl.querySelectorAll('.vocab-card').forEach((card) => {
    card.addEventListener('click', () => card.classList.toggle('flipped'));
  });
}

// ------------------------------------------------------------
// 5) ผูก event ให้ช่องค้นหา: พิมพ์ทุกตัวอักษรจะ trigger ทันที (event "input")
// ------------------------------------------------------------
vocabSearchEl.addEventListener('input', (e) => {
  currentSearch = e.target.value.trim().toLowerCase();
  renderGrid();
});

// ------------------------------------------------------------
// 6) ฟัง event "languagechanged" จาก i18n.js เพื่ออัปเดตภาษาที่ใช้แสดงความหมาย
//    รวมถึงป้ายหมวดหมู่และข้อความนับจำนวน แล้ว "วาดใหม่ทั้งหมด" ให้ตรงภาษาล่าสุด
// ------------------------------------------------------------
document.addEventListener('languagechanged', (e) => {
  currentLang = e.detail.lang;
  currentDict = e.detail.dict;
  renderCategoryChips();
  renderGrid();
});

// เริ่มโหลดข้อมูลทันทีที่สคริปต์นี้ถูกรัน
loadWords();