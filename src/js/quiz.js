/* ============================================================
   QUIZ.JS
   จุดสำคัญของไฟล์นี้: "ไม่มีไฟล์ข้อมูลแบบทดสอบแยกต่างหาก"
   เราสร้างโจทย์แบบทดสอบจากข้อมูลที่มีอยู่แล้ว 2 ไฟล์ คือ
   n5_vocab.json (หน้าคำศัพท์) และ n5_grammar.json (หน้าไวยากรณ์)
   แล้วสุ่มมาทำเป็นคำถามแบบ 4 ตัวเลือกเอง — เป็นตัวอย่างของการ "ใช้ข้อมูลเดิมซ้ำ"
   แทนที่จะต้องพิมพ์ชุดคำถามแยกต่างหากด้วยมือทั้งหมด

   ต้องโหลดหลัง i18n.js และ nav.js เสมอ (ดู <script> ท้าย quiz.html)
   ============================================================ */

const QUESTIONS_PER_QUIZ = 10; // จำนวนข้อต่อแบบทดสอบ 1 ชุด
const OPTIONS_PER_QUESTION = 4; // ตัวเลือกต่อข้อ (1 ถูก + 3 หลอก)

// แคชข้อมูลไว้หลังโหลดครั้งแรก จะได้ไม่ต้อง fetch ซ้ำทุกครั้งที่กด "ทำอีกครั้ง"
const dataCache = { vocab: null, grammar: null };

// state ของแบบทดสอบที่กำลังทำอยู่
let quizType = null;      // 'vocab' | 'grammar'
let questions = [];       // แต่ละข้อ = { raw, options: [...raw 4 ตัว], answeredIndex }
let currentIndex = 0;
let score = 0;

let currentLang = 'th';
let currentDict = {
  'quiz.question_progress': 'ข้อที่ {current} จาก {total}',
  'quiz.next_button': 'ข้อถัดไป',
  'quiz.finish_button': 'ดูผลลัพธ์',
  'quiz.result_template': 'คุณได้ {score} จาก {total} คะแนน',
  'quiz.score_high': 'เก่งมาก! เข้าใจดีเลย 🎉',
  'quiz.score_mid': 'ทำได้ดี ลองทบทวนอีกนิดนะ 💪',
  'quiz.score_low': 'ไม่เป็นไร ลองอ่านทบทวนแล้วมาทำใหม่ได้เลย 📖',
};

// หยิบ element ที่ใช้บ่อยไว้ล่วงหน้า
const quizSetupEl = document.getElementById('quizSetup');
const quizPlayEl = document.getElementById('quizPlay');
const quizResultEl = document.getElementById('quizResult');

const quizProgressEl = document.getElementById('quizProgress');
const quizMainEl = document.getElementById('quizMain');
const quizSubEl = document.getElementById('quizSub');
const quizOptionsEl = document.getElementById('quizOptions');
const quizNextBtn = document.getElementById('quizNextBtn');

const quizScoreTextEl = document.getElementById('quizScoreText');
const quizScoreMessageEl = document.getElementById('quizScoreMessage');
const quizRetryBtn = document.getElementById('quizRetryBtn');
const quizNewBtn = document.getElementById('quizNewBtn');

// ------------------------------------------------------------
// ฟังก์ชันช่วย: สลับลำดับสมาชิกใน array แบบสุ่ม (Fisher–Yates shuffle)
// คืนค่าเป็น array ใหม่เสมอ ไม่แก้ array เดิม (กันบั๊กจากผลข้างเคียงที่ไม่ตั้งใจ)
// ------------------------------------------------------------
function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]; // สลับตำแหน่ง i กับ j
  }
  return result;
}

// ------------------------------------------------------------
// โหลดข้อมูลตาม type ที่เลือก (โหลดครั้งเดียวแล้วแคชไว้ใน dataCache)
// ------------------------------------------------------------
async function loadData(type) {
  if (dataCache[type]) return dataCache[type]; // มีแคชแล้ว ใช้เลย ไม่ต้องขอเน็ตเวิร์กซ้ำ

  const path = type === 'vocab' ? '../data/n5_vocab.json' : '../data/n5_grammar.json';
  const res = await fetch(path);
  if (!res.ok) throw new Error(`โหลดข้อมูลไม่สำเร็จ: ${path}`);

  dataCache[type] = await res.json();
  return dataCache[type];
}

// ------------------------------------------------------------
// ดึง "ข้อความคำถามหลัก" และ "ข้อความรอง" ของ item หนึ่งตัว ตาม type
// (คำศัพท์: คันจิ+คานะ ไม่เปลี่ยนตามภาษา / ไวยากรณ์: ประโยคตัวอย่าง+คำอ่าน ไม่เปลี่ยนตามภาษาเช่นกัน)
// ------------------------------------------------------------
function getQuestionText(item, type) {
  if (type === 'vocab') return { main: item.kanji, sub: item.kana };
  return { main: item.example.jp, sub: item.example.reading };
}

// ดึง "ข้อความคำตอบ" ของ item หนึ่งตัว ตาม type และภาษาปัจจุบัน — อันนี้เปลี่ยนตามภาษาได้
function getOptionText(item, type) {
  if (type === 'vocab') return item.meaning[currentLang] || item.meaning.th;
  return item.example.meaning[currentLang] || item.example.meaning.th;
}

// ------------------------------------------------------------
// สร้างชุดคำถามแบบทดสอบ 1 ชุด จากข้อมูลดิบ (data)
// แต่ละข้อ = สุ่มหยิบ item มา 1 ตัวเป็น "คำถาม+คำตอบที่ถูก"
// แล้วสุ่มหยิบ item อื่นอีก 3 ตัวมาเป็น "ตัวเลือกหลอก"
// ------------------------------------------------------------
function buildQuestions(data) {
  const pickedItems = shuffle(data).slice(0, Math.min(QUESTIONS_PER_QUIZ, data.length));

  return pickedItems.map((correctItem) => {
    // ตัวเลือกหลอก: สุ่มจาก item อื่นที่ไม่ใช่ correctItem
    const distractors = shuffle(data.filter((d) => d.id !== correctItem.id)).slice(
      0,
      OPTIONS_PER_QUESTION - 1
    );

    const options = shuffle([correctItem, ...distractors]);

    return {
      raw: correctItem, // item ที่ถูกต้อง เก็บ reference ไว้เทียบตอนเฉลย
      options, // array ของ item ทั้ง 4 ตัว (เรียงสุ่มแล้ว) ไม่ได้เก็บเป็น "ข้อความ" ตรงๆ
      //          เพื่อให้ตอนสลับภาษา คำนวณข้อความใหม่จาก item ได้เสมอ ไม่ใช่ข้อความที่ตายตัว
      answeredIndex: null, // ผู้ใช้ยังไม่ตอบ = null, ตอบแล้วจะเก็บ index ของตัวเลือกที่กด
    };
  });
}

// ------------------------------------------------------------
// เริ่มแบบทดสอบใหม่ตาม type ที่เลือก (เรียกตอนคลิกการ์ด vocab/grammar ในหน้าเลือก
// และตอนกด "ทำแบบทดสอบชุดนี้อีกครั้ง" ก็เรียกซ้ำด้วย data ชุดเดิม)
// ------------------------------------------------------------
async function startQuiz(type) {
  quizType = type;
  const data = await loadData(type);

  questions = buildQuestions(data);
  currentIndex = 0;
  score = 0;

  quizSetupEl.hidden = true;
  quizResultEl.hidden = true;
  quizPlayEl.hidden = false;

  renderQuestion();
}

// ------------------------------------------------------------
// วาดคำถามข้อปัจจุบัน (questions[currentIndex]) ลงจอ
// ------------------------------------------------------------
function renderQuestion() {
  const question = questions[currentIndex];
  const { main, sub } = getQuestionText(question.raw, quizType);

  quizProgressEl.textContent = currentDict['quiz.question_progress']
    .replace('{current}', currentIndex + 1)
    .replace('{total}', questions.length);

  quizMainEl.textContent = main;
  quizSubEl.textContent = sub;

  quizNextBtn.hidden = true; // ปุ่ม "ข้อถัดไป" จะโผล่มาหลังตอบเท่านั้น

  quizOptionsEl.innerHTML = question.options
    .map((item, index) => `<button type="button" class="quiz-option" data-index="${index}">${getOptionText(item, quizType)}</button>`)
    .join('');

  quizOptionsEl.querySelectorAll('.quiz-option').forEach((btn) => {
    btn.addEventListener('click', () => selectAnswer(Number(btn.dataset.index)));
  });
}

// ------------------------------------------------------------
// ผู้ใช้เลือกคำตอบ: เช็คถูก/ผิด แล้วเรียก applyAnsweredUI() ไปวาดสีเฉลย
// ------------------------------------------------------------
function selectAnswer(selectedIndex) {
  const question = questions[currentIndex];
  if (question.answeredIndex !== null) return; // ตอบไปแล้ว กันกดซ้ำ

  question.answeredIndex = selectedIndex;

  const correctIndex = question.options.findIndex((item) => item.id === question.raw.id);
  if (selectedIndex === correctIndex) score += 1;

  applyAnsweredUI();
}

// ------------------------------------------------------------
// วาด "สถานะหลังตอบแล้ว" ลงจอ (ปิดปุ่ม, ไฮไลต์ถูก/ผิด, โชว์ปุ่มข้อถัดไป)
// แยกออกมาจาก selectAnswer() เพื่อให้เรียกซ้ำได้ตอนสลับภาษา (ซึ่งข้อนี้ "ตอบไปแล้ว" อยู่ก่อน
// จึงต้องวาด UI ใหม่โดยไม่ไปนับคะแนนซ้ำหรือโดน guard clause ใน selectAnswer กันไว้)
// ------------------------------------------------------------
function applyAnsweredUI() {
  const question = questions[currentIndex];
  const correctIndex = question.options.findIndex((item) => item.id === question.raw.id);

  quizOptionsEl.querySelectorAll('.quiz-option').forEach((btn) => {
    const idx = Number(btn.dataset.index);
    btn.disabled = true;
    btn.classList.remove('correct', 'incorrect'); // ล้างของเก่าก่อน กันซ้อนสีตอนวาดใหม่
    if (idx === correctIndex) btn.classList.add('correct');
    else if (idx === question.answeredIndex) btn.classList.add('incorrect');
  });

  // ข้อสุดท้ายให้ปุ่มขึ้นว่า "ดูผลลัพธ์" แทน "ข้อถัดไป"
  const isLastQuestion = currentIndex === questions.length - 1;
  quizNextBtn.textContent = isLastQuestion
    ? currentDict['quiz.finish_button']
    : currentDict['quiz.next_button'];
  quizNextBtn.hidden = false;
}

// ------------------------------------------------------------
// กด "ข้อถัดไป" / "ดูผลลัพธ์"
// ------------------------------------------------------------
quizNextBtn.addEventListener('click', () => {
  const isLastQuestion = currentIndex === questions.length - 1;
  if (isLastQuestion) {
    showResults();
  } else {
    currentIndex += 1;
    renderQuestion();
  }
});

// ------------------------------------------------------------
// แสดงหน้าผลลัพธ์สรุปคะแนน พร้อมข้อความให้กำลังใจตามเปอร์เซ็นต์ที่ทำได้
// ------------------------------------------------------------
function showResults() {
  quizPlayEl.hidden = true;
  quizResultEl.hidden = false;

  quizScoreTextEl.textContent = currentDict['quiz.result_template']
    .replace('{score}', score)
    .replace('{total}', questions.length);

  const percent = (score / questions.length) * 100;
  let messageKey = 'quiz.score_low';
  if (percent >= 80) messageKey = 'quiz.score_high';
  else if (percent >= 50) messageKey = 'quiz.score_mid';

  quizScoreMessageEl.textContent = currentDict[messageKey];
}

// ------------------------------------------------------------
// ปุ่มในหน้าผลลัพธ์: ทำชุดเดิมซ้ำ (สุ่มใหม่จากข้อมูลเดิม) หรือกลับไปเลือกประเภทใหม่
// ------------------------------------------------------------
quizRetryBtn.addEventListener('click', () => startQuiz(quizType));

quizNewBtn.addEventListener('click', () => {
  quizResultEl.hidden = true;
  quizSetupEl.hidden = false;
});

// ------------------------------------------------------------
// ผูก event ให้การ์ดเลือกประเภทแบบทดสอบในหน้าแรกของหน้านี้
// ------------------------------------------------------------
document.querySelectorAll('.quiz-type-btn').forEach((btn) => {
  btn.addEventListener('click', () => startQuiz(btn.dataset.quizType));
});

// ------------------------------------------------------------
// ฟัง event "languagechanged": อัปเดตภาษา แล้ว "วาดจอที่กำลังเปิดอยู่ตอนนี้ใหม่"
// (เช็คว่าตอนนี้อยู่หน้าไหนจาก attribute hidden ของแต่ละ section)
// ------------------------------------------------------------
document.addEventListener('languagechanged', (e) => {
  currentLang = e.detail.lang;
  currentDict = e.detail.dict;

  if (!quizPlayEl.hidden && questions.length > 0) {
    // กำลังทำแบบทดสอบอยู่: วาดคำถามข้อเดิมใหม่ แต่คง state คำตอบที่ตอบไปแล้วไว้เหมือนเดิม
    const question = questions[currentIndex];
    const wasAnswered = question.answeredIndex !== null;
    renderQuestion();
    if (wasAnswered) applyAnsweredUI(); // วาดสีเฉลยกลับมาให้เหมือนก่อนสลับภาษา (ไม่นับคะแนนซ้ำ)
  } else if (!quizResultEl.hidden) {
    showResults();
  }
});