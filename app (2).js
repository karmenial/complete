// === المحرك التفاعلي لنشاط Complete - نسخة المجلد المستقل الذكي 🧩 ===
const INSTRUCTOR_WHATSAPP = "201149955726";

let currentQuestionIndex = 0;
let draggedWord = null;
let recognition = null;
let isRecording = false;
let answerSubmitted = false;
let shuffledQuestions = [];
let isNextMode = false;
let currentRecordingBlank = null;

// === متغيرات نظام الدرجات ===
let currentScore = 0;
let wrongAnswers = 0;
let totalQuestions = 0;
let totalBlanks = 0;
let quizFinished = false;
let studentName = "طالب أكاديمي"; // افتراضي ويتم تحديثه تلقائياً
let certificateBlob = null;

const encouragingMessages = [
  "Excellent!", "Great job!", "Perfect!", "Well done!", "Awesome!",
  "Fantastic!", "Brilliant!", "Super!", "Amazing!", "Outstanding!"
];

// دالة جلب وتصفية الأسئلة تلقائياً بناءً على بيانات الطالب من الرابط URL
async function loadTargetedQuestions() {
  // 1. التقاط مسار وبيانات الطالب من الرابط القادم من صفحة الهبوط
  const urlParams = new URLSearchParams(window.location.search);
  const studentLevel = urlParams.get('level');      // مثل: primary
  const studentGrade = urlParams.get('grade');      // مثل: 3
  const studentCurriculum = urlParams.get('type');   // مثل: AL
  const passedName = urlParams.get('studentName');
  
  if (passedName) {
    studentName = decodeURIComponent(passedName);
  }

  try {
    // 2. جلب ملف الأسئلة المستقل والمنفصل الخاص بهذا النشاط فقط
    const response = await fetch('questions.json');
    const allQuestions = await response.json();
    
    // 3. فلترة الأسئلة المخزنة في الملف المستقل لتناسب مسار الطالب الحالي تماماً
    if (studentLevel && studentGrade && studentCurriculum) {
      shuffledQuestions = allQuestions.filter(q => 
        q.level === studentLevel && 
        q.grade === studentGrade && 
        q.curriculum === studentCurriculum
      );
    } else {
      // حالة احتياطية إذا فتحت النشاط مباشرة بدون المنصة (يعرض كل الأسئلة للاختبار)
      shuffledQuestions = allQuestions;
    }

    // 4. التحقق من وجود أسئلة متوفرة
    if (shuffledQuestions.length === 0) {
      document.getElementById('quizBox').innerHTML = `
        <div style="text-align:center; padding:40px; color:hsl(0, 100%, 70%);">
          ⚠️ مرحباً يا ${studentName}، لا توجد أسئلة مضافة لهذا النشاط تناسب مسارك الدراسي حالياً!
        </div>`;
      return;
    }

    // 5. بدء تشغيل النشاط بعد نجاح الفلترة التلقائية
    totalQuestions = shuffledQuestions.length;
    document.getElementById("totalQNum").textContent = totalQuestions;
    currentQuestionIndex = 0;
    
    loadQuestion();
    initSpeechRecognition();

  } catch (error) {
    console.error("خطأ أثناء قراءة ملف الأسئلة المنفصل questions.json:", error);
    document.getElementById('quizBox').innerHTML = `<div style="color:red; padding:20px;">⚠️ فشل جلب قاعدة أسئلة النشاط المستقلة.</div>`;
  }
}

function checkSpeechRecognitionSupport() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.error("Speech Recognition API not supported");
    return false;
  }
  return true;
}

function initSpeechRecognition() {
  if (!checkSpeechRecognitionSupport()) return;
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  
  recognition.onstart = function() {
    isRecording = true;
    if(currentRecordingBlank) {
      currentRecordingBlank.classList.add("recording");
    }
  };
  
  recognition.onresult = function(event) {
    const speechToText = event.results[0][0].transcript.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").trim();
    if(currentRecordingBlank) {
      currentRecordingBlank.textContent = speechToText;
      currentRecordingBlank.classList.remove("recording");
      currentRecordingBlank.classList.add("filled");
      
      const wordItems = document.querySelectorAll(".word-item");
      wordItems.forEach(item => {
        if(item.textContent.toLowerCase().trim() === speechToText) {
          item.style.visibility = "hidden";
        }
      });
    }
    checkIfAllBlanksFilled();
  };
  
  recognition.onerror = function() {
    stopRecordingProcess();
  };
  
  recognition.onend = function() {
    stopRecordingProcess();
  };
}

function stopRecordingProcess() {
  isRecording = false;
  const allBlanks = document.querySelectorAll(".blank");
  allBlanks.forEach(b => b.classList.remove("recording"));
}

function startVoiceInput(blankElement) {
  if(!recognition) {
    alert("Voice input is not supported or permitted on this browser.");
    return;
  }
  if(answerSubmitted) return;
  
  if (isRecording) {
    recognition.stop();
    if(currentRecordingBlank === blankElement) {
      return;
    }
  }
  
  currentRecordingBlank = blankElement;
  recognition.start();
}

function loadQuestion() {
  answerSubmitted = false;
  isNextMode = false;
  
  document.getElementById("successMessage").style.display = "none";
  document.getElementById("correctAnswerPopup").style.display = "none";
  document.getElementById("correctAnswerOverlay").style.display = "none";
  
  const actionBtn = document.getElementById("actionBtn");
  actionBtn.textContent = "Submit";
  actionBtn.disabled = true;
  
  const currentQuestion = shuffledQuestions[currentQuestionIndex];
  document.getElementById("currentQNum").textContent = currentQuestionIndex + 1;
  document.getElementById("questionReason").textContent = currentQuestion.reason || "Complete the blanks";
  
  const passageContainer = document.getElementById("passageContainer");
  passageContainer.innerHTML = "";
  
  let passageText = currentQuestion.passage;
  const blankRegex = /\{blank(\d+)\}/g;
  let lastIndex = 0;
  let match;
  
  while ((match = blankRegex.exec(passageText)) !== null) {
    const textBefore = passageText.substring(lastIndex, match.index);
    if (textBefore) {
      passageContainer.appendChild(document.createTextNode(textBefore));
    }
    
    const blankId = match[1];
    const blankSpan = document.createElement("span");
    blankSpan.className = "blank";
    blankSpan.id = `blank_${blankId}`;
    blankSpan.setAttribute("data-blank-id", blankId);
    blankSpan.setAttribute("role", "textbox");
    blankSpan.setAttribute("aria-label", `Blank ${blankId}`);
    
    blankSpan.ondragover = (e) => e.preventDefault();
    blankSpan.ondrop = (e) => handleDrop(e, blankSpan);
    blankSpan.onclick = () => startVoiceInput(blankSpan);
    
    passageContainer.appendChild(blankSpan);
    lastIndex = blankRegex.lastIndex;
  }
  
  const textAfter = passageText.substring(lastIndex);
  if (textAfter) {
    passageContainer.appendChild(document.createTextNode(textAfter));
  }
  
  totalBlanks = currentQuestion.correctAnswer.length;
  
  const wordsContainer = document.getElementById("wordsContainer");
  wordsContainer.innerHTML = "";
  
  const originalOptions = [...currentQuestion.options];
  const shuffledOptions = originalOptions.sort(() => Math.random() - 0.5);
  
  shuffledOptions.forEach(word => {
    const wordDiv = document.createElement("div");
    wordDiv.className = "word-item";
    wordDiv.textContent = word;
    wordDiv.draggable = true;
    wordDiv.setAttribute("role", "button");
    
    wordDiv.ondragstart = (e) => { draggedWord = wordDiv; wordDiv.classList.add("dragging"); };
    wordDiv.ondragend = () => { wordDiv.classList.remove("dragging"); };
    wordDiv.onclick = () => handleWordClick(wordDiv);
    
    wordsContainer.appendChild(wordDiv);
  });
}

function handleWordClick(wordDiv) {
  if(answerSubmitted) return;
  const nextEmptyBlank = Array.from(document.querySelectorAll(".blank")).find(b => !b.textContent.trim());
  if (nextEmptyBlank) {
    nextEmptyBlank.textContent = wordDiv.textContent;
    nextEmptyBlank.classList.add("filled");
    wordDiv.style.visibility = "hidden";
    checkIfAllBlanksFilled();
  }
}

function handleDrop(e, blankSpan) {
  e.preventDefault();
  if(answerSubmitted) return;
  if (draggedWord) {
    if (blankSpan.textContent.trim()) {
      const oldWord = blankSpan.textContent.trim();
      const hiddenWordItem = Array.from(document.querySelectorAll(".word-item")).find(item => item.textContent === oldWord && item.style.visibility === "hidden");
      if(hiddenWordItem) hiddenWordItem.style.visibility = "visible";
    }
    blankSpan.textContent = draggedWord.textContent;
    blankSpan.classList.add("filled");
    draggedWord.style.visibility = "hidden";
    checkIfAllBlanksFilled();
  }
}

function checkIfAllBlanksFilled() {
  const allBlanks = document.querySelectorAll(".blank");
  const allFilled = Array.from(allBlanks).every(b => b.textContent.trim() !== "");
  document.getElementById("actionBtn").disabled = !allFilled;
}

function submitAnswer() {
  answerSubmitted = true;
  if (isRecording && recognition) recognition.stop();
  
  const currentQuestion = shuffledQuestions[currentQuestionIndex];
  const allBlanks = document.querySelectorAll(".blank");
  let isCorrect = true;
  
  allBlanks.forEach((blank) => {
    const blankId = parseInt(blank.getAttribute("data-blank-id")) - 1;
    const studentAns = blank.textContent.trim().toLowerCase();
    const correctAns = currentQuestion.correctAnswer[blankId].toLowerCase();
    
    if (studentAns === correctAns) {
      blank.className = "blank correct-blank";
    } else {
      blank.className = "blank wrong-blank";
      isCorrect = false;
    }
  });
  
  if (isCorrect) {
    currentScore++;
    showSuccessMessage();
  } else {
    wrongAnswers++;
    showCorrectAnswerPopup();
  }
  
  updateScoreBoard();
}

function showSuccessMessage() {
  const msgBox = document.getElementById("successMessage");
  const randomMsg = encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)];
  msgBox.textContent = `🎉 ${randomMsg} 🎉`;
  msgBox.style.display = "block";
  
  const actionBtn = document.getElementById("actionBtn");
  actionBtn.textContent = "Next";
  isNextMode = true;
  actionBtn.disabled = false;
  actionBtn.focus();
}

function showCorrectAnswerPopup() {
  const currentQuestion = shuffledQuestions[currentQuestionIndex];
  const listContainer = document.getElementById("correctAnswerList");
  listContainer.innerHTML = "";
  
  currentQuestion.correctAnswer.forEach((ans, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>Blank ${idx + 1}:</span> <strong>${ans}</strong>`;
    listContainer.appendChild(li);
  });
  
  document.getElementById("correctAnswerPopup").style.display = "flex";
  document.getElementById("correctAnswerOverlay").style.display = "block";
  document.getElementById("gotItBtn").focus();
}

function closeCorrectAnswerPopup() {
  document.getElementById("correctAnswerPopup").style.display = "none";
  document.getElementById("correctAnswerOverlay").style.display = "none";
  
  const actionBtn = document.getElementById("actionBtn");
  actionBtn.textContent = "Next";
  isNextMode = true;
  actionBtn.disabled = false;
  actionBtn.focus();
}

function readCorrectAnswer() {
  const currentQuestion = shuffledQuestions[currentQuestionIndex];
  if ('speechSynthesis' in window) {
    let textToRead = currentQuestion.passage;
    currentQuestion.correctAnswer.forEach((ans, idx) => {
      textToRead = textToRead.replace(`{blank${idx+1}}`, ans);
    });
    
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } else {
    alert("Text-to-speech not supported in this browser.");
  }
}

function updateScoreBoard() {
  document.getElementById("scoreValue").textContent = currentScore;
  document.getElementById("wrongValue").textContent = wrongAnswers;
}

function nextQuestion() {
  currentQuestionIndex++;
  if (currentQuestionIndex < totalQuestions) {
    loadQuestion();
  } else {
    finishQuizAndShowCertificate();
  }
}

function handleAction() {
  if (isNextMode) {
    nextQuestion();
  } else {
    submitAnswer();
  }
}

function finishQuizAndShowCertificate() {
  quizFinished = true;
  document.getElementById("quizBox").style.display = "none";
  document.getElementById("certificateSection").style.display = "block";
  
  // وضع اسم الطالب الفعلي في الشهادة تلقائياً
  document.getElementById("certStudentName").textContent = studentName;
  document.getElementById("certScore").textContent = `${currentScore} / ${totalQuestions}`;
  
  const now = new Date();
  document.getElementById("certDate").textContent = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function saveCertificateAsImage() {
  const overlay = document.getElementById("loadingOverlay");
  overlay.style.display = "flex";
  
  const card = document.getElementById("mainCertificateCard");
  
  html2canvas(card, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null
  }).then(canvas => {
    canvas.toBlob((blob) => {
      certificateBlob = blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${studentName}_Certificate.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      overlay.style.display = "none";
    }, 'image/png');
  }).catch(err => {
    console.error("Canvas error:", err);
    overlay.style.display = "none";
    alert("Failed to generate certificate image.");
  });
}

function sendToWhatsApp() {
  const messageText = `Hello Mr. Medo, I have successfully finished the Complete Activity! 🎯\n` +
                      `👤 Student Name: ${studentName}\n` +
                      `🏆 Score: ${currentScore} / ${totalQuestions}\n` +
                      `💪 Wrong Answers: ${wrongAnswers}`;
  
  const encodedText = encodeURIComponent(messageText);
  window.open(`https://api.whatsapp.com/send?phone=${INSTRUCTOR_WHATSAPP}&text=${encodedText}`, '_blank');
}

function restartQuiz() {
  quizFinished = false;
  currentScore = 0;
  wrongAnswers = 0;
  currentQuestionIndex = 0;
  
  document.getElementById("quizBox").style.display = "block";
  document.getElementById("certificateSection").style.display = "none";
  
  updateScoreBoard();
  loadQuestion();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleEnterKey(event) {
  if (event.key === 'Enter' || event.keyCode === 13) {
    if (document.getElementById('successMessage').style.display === 'block') {
      document.getElementById("successMessage").style.display = "none";
      const actionBtn = document.getElementById("actionBtn");
      actionBtn.textContent = "Next";
      isNextMode = true;
      actionBtn.disabled = false;
      actionBtn.focus();
      return;
    }
    
    if (document.getElementById('correctAnswerPopup').style.display === 'flex') {
      closeCorrectAnswerPopup();
      return;
    }
    
    if (isNextMode && !document.getElementById('actionBtn').disabled) {
      nextQuestion();
      return;
    }
    
    if (!isNextMode && !document.getElementById('actionBtn').disabled) {
      submitAnswer();
      return;
    }
    event.preventDefault();
  }
}

document.getElementById("actionBtn").onclick = handleAction;
window.onkeydown = handleEnterKey;

// تشغيل جلب الأسئلة المحلية تلقائياً بمجرد فتح الصفحة
window.onload = function() {
  loadTargetedQuestions();
};