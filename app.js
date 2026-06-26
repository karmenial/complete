// === رقم الواتساب الخاص بالمدرب ===
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
  let studentName = "";
  let certificateBlob = null;
  
  const encouragingMessages = [
    "Excellent!", "Great job!", "Perfect!", "Well done!", "Awesome!",
    "Fantastic!", "Brilliant!", "Super!", "Amazing!", "Outstanding!"
  ];

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
      if (currentRecordingBlank) {
        const micIcon = currentRecordingBlank.querySelector('.mic-icon');
        if (micIcon) micIcon.classList.add('recording');
      }
    };
    
    recognition.onend = function() {
      isRecording = false;
      if (currentRecordingBlank) {
        const micIcon = currentRecordingBlank.querySelector('.mic-icon');
        if (micIcon) micIcon.classList.remove('recording');
        currentRecordingBlank = null;
      }
    };
    
    recognition.onresult = function(event) {
      const transcript = event.results[0][0].transcript.trim().toLowerCase();
      if (currentRecordingBlank) {
        processVoiceInput(transcript, currentRecordingBlank);
      }
    };
    
    recognition.onerror = function(event) {
      console.error("Speech recognition error:", event.error);
      isRecording = false;
      if (currentRecordingBlank) {
        const micIcon = currentRecordingBlank.querySelector('.mic-icon');
        if (micIcon) micIcon.classList.remove('recording');
        currentRecordingBlank = null;
      }
      
      if (event.error === 'not-allowed') {
        alert("Please allow microphone access to use voice recording.");
      } else if (event.error === 'no-speech') {
        alert("No speech detected. Please try again.");
      }
    };
  }
  
  function processVoiceInput(spokenWord, blankElement) {
    const q = shuffledQuestions[currentQuestionIndex];
    const missingWordsContainer = document.getElementById('missingWords');
    
    let foundWord = null;
    for (let option of q.options) {
      if (option.toLowerCase() === spokenWord) {
        foundWord = option;
        break;
      }
    }
    
    if (foundWord) {
      const wordElements = missingWordsContainer.querySelectorAll('.word-item');
      let wordElementToRemove = null;
      
      for (let el of wordElements) {
        if (el.textContent === foundWord) {
          wordElementToRemove = el;
          break;
        }
      }
      
      if (wordElementToRemove) {
        wordElementToRemove.remove();
        
        blankElement.textContent = foundWord;
        blankElement.classList.add("filled");
        blankElement.style.backgroundColor = "#32cd32";
        
        const micIcon = blankElement.querySelector('.mic-icon');
        if (micIcon) micIcon.remove();
        
        blankElement.addEventListener('click', function returnWordHandler() {
          const word = this.textContent;
          
          const newWord = document.createElement('div');
          newWord.className = 'word-item';
          newWord.textContent = word;
          newWord.draggable = true;
          
          newWord.addEventListener("dragstart", (e) => {
            draggedWord = newWord;
            newWord.classList.add("dragging");
            e.dataTransfer.setData("text/plain", word);
          });
          newWord.addEventListener("dragend", () => {
            newWord.classList.remove("dragging");
            draggedWord = null;
          });
          
          newWord.addEventListener('click', function() {
            const emptyBlanks = document.querySelectorAll(".blank:not(.filled)");
            if (emptyBlanks.length > 0) {
              const firstEmptyBlank = emptyBlanks[0];
              firstEmptyBlank.textContent = word;
              firstEmptyBlank.classList.add("filled");
              firstEmptyBlank.style.backgroundColor = "#32cd32";
              
              const mic = firstEmptyBlank.querySelector('.mic-icon');
              if (mic) mic.remove();
              
              firstEmptyBlank.addEventListener('click', returnWordHandler);
              
              this.remove();
            }
          });
          
          missingWordsContainer.appendChild(newWord);
          
          this.textContent = '___';
          this.classList.remove('filled');
          this.style.backgroundColor = '#ff4d4d';
          
          const micIcon = document.createElement('span');
          micIcon.className = 'mic-icon';
          micIcon.innerHTML = '🎤';
          micIcon.onclick = (e) => {
            e.stopPropagation();
            startVoiceRecordingForBlank(this);
          };
          this.appendChild(micIcon);
          
          this.removeEventListener('click', returnWordHandler);
        });
      } else {
        alert(`The word "${spokenWord}" was not found in the word bank. Please try again.`);
      }
    } else {
      alert(`The word "${spokenWord}" is not in the options. Please try again.`);
    }
  }
  
  function startVoiceRecordingForBlank(blankElement) {
    if (isRecording) {
      alert("Recording is already in progress. Please wait.");
      return;
    }
    
    if (!recognition) {
      initSpeechRecognition();
    }
    
    currentRecordingBlank = blankElement;
    
    recognition.lang = 'en-US';
    
    try {
      recognition.start();
    } catch (error) {
      console.error("Error starting recognition:", error);
      recognition = null;
      initSpeechRecognition();
      currentRecordingBlank = null;
    }
  }
  
  function speakText(text, lang = 'en-US') {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 1.2;
      utterance.pitch = 1.1;
      
      utterance.onend = function() {
        console.log('النطق انتهى: ' + text);
      };
      
      utterance.onerror = function(event) {
        console.error('خطأ في النطق: ' + event.error);
      };
      
      speechSynthesis.speak(utterance);
      return true;
    } else {
      console.warn('متصفحك لا يدعم خاصية النطق');
      return false;
    }
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  const questions = [
    {
      passage: "My name is Ahmed. I live in {blank1}. I am {blank2} years old. I study at {blank3} school. My favorite subject is {blank4}. I like to play {blank5}.",
      options: ["Cairo", "12", "Al-Nasr", "Math", "football"],
      correctAnswer: ["Cairo", "12", "Al-Nasr", "Math", "football"],
      reason: "Complete the passage with the correct words in order."
    },
    {
      passage: "Yesterday was a {blank1} day. The {blank2} was shining. I went to the {blank3} with my {blank4}. We bought some {blank5}.",
      options: ["beautiful", "sun", "market", "friend", "fruits"],
      correctAnswer: ["beautiful", "sun", "market", "friend", "fruits"],
      reason: "Choose the appropriate words to complete the story."
    },
    {
      passage: "The {blank1} is very {blank2} today. I can see many {blank3} in the sky. My {blank4} and I will go to the {blank5} later.",
      options: ["weather", "nice", "birds", "mother", "park"],
      correctAnswer: ["weather", "nice", "birds", "mother", "park"],
      reason: "Fill in the blanks with suitable words about the weather and activities."
    },
    {
      passage: "I have a {blank1} cat. Its name is {blank2}. It likes to eat {blank3} and {blank4}. Sometimes it sleeps on my {blank5}.",
      options: ["small", "Mimi", "fish", "milk", "bed"],
      correctAnswer: ["small", "Mimi", "fish", "milk", "bed"],
      reason: "Complete the description of the cat with the correct words."
    }
  ];

  // === تحديث شريط النتيجة ===
  function updateScoreBoard() {
    document.getElementById("currentQNum").textContent = currentQuestionIndex + 1;
    document.getElementById("totalQNum").textContent = totalQuestions;
    document.getElementById("correctCount").textContent = currentScore;
    document.getElementById("wrongCount").textContent = wrongAnswers;
    
    const percent = totalBlanks > 0 ? Math.round((currentScore / totalBlanks) * 100) : 0;
    document.getElementById("percentage").textContent = percent + "%";
    
    const progressPercent = ((currentQuestionIndex) / totalQuestions) * 100;
    document.getElementById("progressBar").style.width = progressPercent + "%";
  }

  function loadQuestion() {
    if (shuffledQuestions.length === 0) {
      shuffledQuestions = [...questions];
      shuffleArray(shuffledQuestions);
      totalQuestions = shuffledQuestions.length;
      totalBlanks = 0;
      shuffledQuestions.forEach(q => {
        totalBlanks += q.correctAnswer.length;
      });
      currentScore = 0;
      wrongAnswers = 0;
      quizFinished = false;
      updateScoreBoard();
    }
    
    if (currentQuestionIndex >= shuffledQuestions.length) {
      showEndScreen();
      return;
    }
    
    const q = shuffledQuestions[currentQuestionIndex];
    answerSubmitted = false;
    isNextMode = false;
    
    const actionBtn = document.getElementById("actionBtn");
    actionBtn.textContent = "Submit";
    actionBtn.onclick = handleAction;
    actionBtn.disabled = false;
    
    const missingWords = document.getElementById("missingWords");
    missingWords.innerHTML = "";
    
    const shuffledWords = [...q.options];
    shuffleArray(shuffledWords);
    
    shuffledWords.forEach(word => {
      const wordEl = document.createElement("div");
      wordEl.className = "word-item";
      wordEl.textContent = word;
      wordEl.draggable = true;
      
      wordEl.onclick = () => speakText(word);
      
      wordEl.addEventListener("dragstart", (e) => {
        draggedWord = wordEl;
        wordEl.classList.add("dragging");
        e.dataTransfer.setData("text/plain", word);
      });
      wordEl.addEventListener("dragend", () => {
        wordEl.classList.remove("dragging");
        draggedWord = null;
      });
      
      wordEl.addEventListener("click", function() {
        const emptyBlanks = document.querySelectorAll(".blank:not(.filled)");
        if (emptyBlanks.length > 0) {
          const firstEmptyBlank = emptyBlanks[0];
          firstEmptyBlank.textContent = word;
          firstEmptyBlank.classList.add("filled");
          firstEmptyBlank.style.backgroundColor = "#32cd32";
          
          const micIcon = firstEmptyBlank.querySelector('.mic-icon');
          if (micIcon) micIcon.remove();
          
          firstEmptyBlank.addEventListener('click', function returnWordHandler() {
            const wordText = this.textContent;
            
            const newWord = document.createElement('div');
            newWord.className = 'word-item';
            newWord.textContent = wordText;
            newWord.draggable = true;
            
            newWord.addEventListener("dragstart", (e) => {
              draggedWord = newWord;
              newWord.classList.add("dragging");
              e.dataTransfer.setData("text/plain", wordText);
            });
            newWord.addEventListener("dragend", () => {
              newWord.classList.remove("dragging");
              draggedWord = null;
            });
            
            newWord.addEventListener('click', function() {
              const emptyBlanks = document.querySelectorAll(".blank:not(.filled)");
              if (emptyBlanks.length > 0) {
                const firstEmptyBlank = emptyBlanks[0];
                firstEmptyBlank.textContent = wordText;
                firstEmptyBlank.classList.add("filled");
                firstEmptyBlank.style.backgroundColor = "#32cd32";
                const mic = firstEmptyBlank.querySelector('.mic-icon');
                if (mic) mic.remove();
                firstEmptyBlank.addEventListener('click', returnWordHandler);
                this.remove();
              }
            });
            
            missingWords.appendChild(newWord);
            
            this.textContent = '___';
            this.classList.remove('filled');
            this.style.backgroundColor = '#ff4d4d';
            
            const micIcon = document.createElement('span');
            micIcon.className = 'mic-icon';
            micIcon.innerHTML = '🎤';
            micIcon.onclick = (e) => {
              e.stopPropagation();
              startVoiceRecordingForBlank(this);
            };
            this.appendChild(micIcon);
            
            this.removeEventListener('click', returnWordHandler);
          });
          
          this.remove();
        }
      });
      
      missingWords.appendChild(wordEl);
    });
    
    const textPassage = document.getElementById("textPassage");
    textPassage.innerHTML = "";
    
    let passageHtml = q.passage;
    for (let i = 0; i < q.correctAnswer.length; i++) {
      passageHtml = passageHtml.replace(`{blank${i+1}}`, `<span class="blank-placeholder" data-index="${i}" data-correct="${q.correctAnswer[i]}"></span>`);
    }
    
    textPassage.innerHTML = passageHtml;
    
    document.querySelectorAll(".blank-placeholder").forEach(placeholder => {
      const index = placeholder.dataset.index;
      const correctWord = placeholder.dataset.correct;
      
      const blank = document.createElement("span");
      blank.className = "blank";
      blank.dataset.index = index;
      blank.dataset.correct = correctWord;
      blank.textContent = "___";
      
      const micIcon = document.createElement("span");
      micIcon.className = "mic-icon";
      micIcon.innerHTML = "🎤";
      micIcon.onclick = (e) => {
        e.stopPropagation();
        startVoiceRecordingForBlank(blank);
      };
      
      blank.appendChild(micIcon);
      
      blank.addEventListener("dragover", (e) => {
        e.preventDefault();
        blank.style.backgroundColor = "#ff9999";
      });
      
      blank.addEventListener("dragleave", () => {
        blank.style.backgroundColor = "#ff4d4d";
      });
      
      blank.addEventListener("drop", (e) => {
        e.preventDefault();
        if (draggedWord) {
          blank.textContent = draggedWord.textContent;
          blank.classList.add("filled");
          blank.style.backgroundColor = "#32cd32";
          
          const mic = blank.querySelector('.mic-icon');
          if (mic) mic.remove();
          
          blank.addEventListener('click', function returnWordHandler() {
            const word = this.textContent;
            
            const newWord = document.createElement('div');
            newWord.className = 'word-item';
            newWord.textContent = word;
            newWord.draggable = true;
            
            newWord.addEventListener("dragstart", (e) => {
              draggedWord = newWord;
              newWord.classList.add("dragging");
              e.dataTransfer.setData("text/plain", word);
            });
            newWord.addEventListener("dragend", () => {
              newWord.classList.remove("dragging");
              draggedWord = null;
            });
            
            newWord.addEventListener('click', function() {
              const emptyBlanks = document.querySelectorAll(".blank:not(.filled)");
              if (emptyBlanks.length > 0) {
                const firstEmptyBlank = emptyBlanks[0];
                firstEmptyBlank.textContent = word;
                firstEmptyBlank.classList.add("filled");
                firstEmptyBlank.style.backgroundColor = "#32cd32";
                const mic = firstEmptyBlank.querySelector('.mic-icon');
                if (mic) mic.remove();
                firstEmptyBlank.addEventListener('click', returnWordHandler);
                this.remove();
              }
            });
            
            document.getElementById('missingWords').appendChild(newWord);
            
            this.textContent = '___';
            this.classList.remove('filled');
            this.style.backgroundColor = '#ff4d4d';
            
            const micIcon = document.createElement('span');
            micIcon.className = 'mic-icon';
            micIcon.innerHTML = '🎤';
            micIcon.onclick = (e) => {
              e.stopPropagation();
              startVoiceRecordingForBlank(this);
            };
            this.appendChild(micIcon);
            
            this.removeEventListener('click', returnWordHandler);
          });
          
          draggedWord.remove();
        }
      });
      
      placeholder.replaceWith(blank);
    });
    
    document.getElementById("listenBtn").onclick = () => {
      const fullText = q.passage.replace(/{blank\d+}/g, " ");
      speakText(fullText);
    };
    
    document.removeEventListener('keydown', handleEnterKey);
    document.addEventListener('keydown', handleEnterKey);
    
    updateScoreBoard();
  }

  function submitAnswer() {
    const blanks = document.querySelectorAll(".blank");
    let correctCount = 0;
    let wrongCount = 0;
    
    blanks.forEach(blank => {
      const correctWord = blank.dataset.correct;
      let userWord = blank.textContent.trim();
      
      if (userWord.toLowerCase() === correctWord.toLowerCase()) {
        correctCount++;
        blank.classList.add("correct");
      } else {
        wrongCount++;
        blank.classList.add("wrong");
      }
    });
    
    // تحديث النتيجة
    currentScore += correctCount;
    wrongAnswers += wrongCount;
    updateScoreBoard();
    
    answerSubmitted = true;
    
    if (correctCount === blanks.length) {
      const randomIndex = Math.floor(Math.random() * encouragingMessages.length);
      const encouragingMessage = encouragingMessages[randomIndex];
      speakText(encouragingMessage, 'en-US');
      
      const successMsg = document.getElementById("successMessage");
      successMsg.style.display = "block";
      
      setTimeout(() => {
        const actionBtn = document.getElementById("actionBtn");
        actionBtn.textContent = "Next";
        isNextMode = true;
        actionBtn.disabled = false;
        actionBtn.focus();
      }, 1500);
    } else {
      const q = shuffledQuestions[currentQuestionIndex];
      let correctText = q.passage;
      q.correctAnswer.forEach((word, i) => {
        correctText = correctText.replace(`{blank${i+1}}`, `<strong>${word}</strong>`);
      });
      
      document.getElementById("correctAnswerList").innerHTML = `<li>${correctText}</li>`;
      document.getElementById("correctAnswerPopup").style.display = "flex";
      document.getElementById("correctAnswerOverlay").style.display = "block";
      
      const correctPassage = q.passage.replace(/{blank\d+}/g, (match, offset) => {
        const index = parseInt(match.match(/\d+/)[0]) - 1;
        return q.correctAnswer[index];
      });
      speakText(correctPassage, 'en-US');
    }
  }

  function nextQuestion() {
    if (!isNextMode) return;
    
    document.getElementById("successMessage").style.display = "none";
    currentQuestionIndex++;
    
    if (currentQuestionIndex >= shuffledQuestions.length) {
      showEndScreen();
      return;
    }
    
    loadQuestion();
  }

  function closeCorrectAnswerPopup() {
    document.getElementById("correctAnswerPopup").style.display = "none";
    document.getElementById("correctAnswerOverlay").style.display = "none";
    currentQuestionIndex++;
    
    if (currentQuestionIndex >= shuffledQuestions.length) {
      showEndScreen();
      return;
    }
    
    loadQuestion();
  }
  
  function readCorrectAnswer() {
    const q = shuffledQuestions[currentQuestionIndex];
    const correctPassage = q.passage.replace(/{blank\d+}/g, (match, offset) => {
      const index = parseInt(match.match(/\d+/)[0]) - 1;
      return q.correctAnswer[index];
    });
    speakText(correctPassage, 'en-US');
  }

  function handleAction() {
    if (isNextMode) {
      nextQuestion();
    } else {
      submitAnswer();
    }
  }

  // === إظهار شاشة نهاية الاختبار ===
  function showEndScreen() {
    quizFinished = true;
    
    document.getElementById("quizBox").style.display = "none";
    document.getElementById("certificateWrapper").style.display = "block";
    
    const percent = totalBlanks > 0 ? Math.round((currentScore / totalBlanks) * 100) : 0;
    document.getElementById("finalScore").textContent = `${currentScore} / ${totalBlanks}`;
    document.getElementById("finalPercentage").textContent = percent + "%";
    document.getElementById("finalGrade").textContent = getGrade(percent);
    
    setTimeout(() => {
      speakText("تهانينا! لقد أكملت الاختبار بنجاح", 'ar-SA');
    }, 500);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // === حساب التقدير ===
  function getGrade(percent) {
    if (percent >= 90) return "ممتاز 🌟";
    if (percent >= 80) return "جيد جداً جداً 👏";
    if (percent >= 70) return "جيد جداً 👍";
    if (percent >= 60) return "جيد ✅";
    if (percent >= 50) return "مقبول";
    return "يحتاج مراجعة";
  }

  // === إصدار الشهادة ===
  function generateCertificate() {
    const name = document.getElementById("studentNameInput").value.trim();
    if (!name) {
      alert("⚠️ الرجاء إدخال اسمك أولاً!");
      document.getElementById("studentNameInput").focus();
      return;
    }
    studentName = name;
    certificateBlob = null;

    document.getElementById("nameInputSection").style.display = "none";
    document.getElementById("certificateSection").style.display = "block";

    const percent = totalBlanks > 0 ? Math.round((currentScore / totalBlanks) * 100) : 0;
    document.getElementById("certName").textContent = studentName;
    document.getElementById("certScore").textContent = `${currentScore} / ${totalBlanks}`;
    document.getElementById("certPercentage").textContent = percent + "%";
    document.getElementById("certGradeBadge").textContent = getGrade(percent);
    
    const today = new Date();
    const dateStr = today.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById("certDate").textContent = dateStr;
    document.getElementById("certYear").textContent = today.getFullYear();
    
    document.getElementById("certificateSection").scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => { speakText(`تهانينا ${studentName}! لقد حصلت على تقدير ${getGrade(percent)}`, 'ar-SA'); }, 600);
    
    setTimeout(() => { generateCertificateBlob(); }, 1000);
  }

  // === توليد صورة الشهادة ===
  async function generateCertificateBlob() {
    try {
      const certElement = document.getElementById("certificateCard");
      const canvas = await html2canvas(certElement, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        logging: false
      });
      
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          certificateBlob = blob;
          resolve(blob);
        }, 'image/png', 1.0);
      });
    } catch (error) {
      console.error("Error generating certificate image:", error);
      return null;
    }
  }

  // === حفظ الشهادة كصورة ===
  async function saveCertificateAsImage() {
    const btn = document.getElementById("saveImgBtn");
    const loading = document.getElementById("loadingOverlay");
    const loadingText = document.getElementById("loadingText");
    
    btn.disabled = true;
    loading.classList.add("show");
    loadingText.textContent = "جاري تحويل الشهادة إلى صورة...";
    
    try {
      let blob = certificateBlob;
      if (!blob) {
        blob = await generateCertificateBlob();
      }
      
      if (!blob) {
        alert("⚠️ حدث خطأ أثناء تحويل الشهادة. حاول مرة أخرى.");
        return;
      }
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = studentName.replace(/[^a-zA-Z0-9\u0600-\u06FF ]/g, '').trim() || 'student';
      a.download = `شهادة_${safeName}_Complete_Quiz.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      loadingText.textContent = "✅ تم حفظ الصورة بنجاح!";
      setTimeout(() => { loading.classList.remove("show"); }, 1500);
      
    } catch (error) {
      console.error("Error saving image:", error);
      alert("⚠️ حدث خطأ أثناء حفظ الصورة.");
      loading.classList.remove("show");
    } finally {
      btn.disabled = false;
    }
  }

  // === إرسال الشهادة عبر واتساب ===
  async function sendToWhatsApp() {
    const btn = document.getElementById("whatsappBtn");
    const loading = document.getElementById("loadingOverlay");
    const loadingText = document.getElementById("loadingText");
    
    btn.disabled = true;
    loading.classList.add("show");
    loadingText.textContent = "جاري تجهيز الشهادة للإرسال...";
    
    try {
      let blob = certificateBlob;
      if (!blob) {
        blob = await generateCertificateBlob();
      }
      
      const percent = totalBlanks > 0 ? Math.round((currentScore / totalBlanks) * 100) : 0;
      const messageText = `السلام عليكم أستاذ محمد كريم 👋\n\n` +
                          `أنا الطالب/ة: *${studentName}*\n` +
                          `لقد أكملت اختبار إكمال الفراغات (Complete Quiz) على منصة Wise Learning\n\n` +
                          `📊 *نتيجتي:*\n` +
                          `✅ الصحيح: ${currentScore}\n` +
                          `❌ الخطأ: ${wrongAnswers}\n` +
                          `📈 النسبة: ${percent}%\n` +
                          `🏆 التقدير: ${getGrade(percent)}\n\n` +
                          `📎 أرجو التكرم باستلام شهادة الإتمام المرفقة.\n\n` +
                          `جزاكم الله خيراً 🌹`;
      
      const whatsappUrl = `https://wa.me/${INSTRUCTOR_WHATSAPP}?text=${encodeURIComponent(messageText)}`;
      
      if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], 'certificate.png', { type: 'image/png' })] })) {
        loadingText.textContent = "📱 جاري فتح قائمة المشاركة...";
        const file = new File([blob], `شهادة_${studentName}.png`, { type: 'image/png' });
        const shareData = {
          title: 'شهادة إتمام - Wise Learning',
          text: messageText,
          files: [file]
        };
        
        try {
          await navigator.share(shareData);
          loading.classList.remove("show");
          btn.disabled = false;
          return;
        } catch (shareError) {
          if (shareError.name === 'AbortError') {
            loading.classList.remove("show");
            btn.disabled = false;
            return;
          }
          console.log("Share API failed, falling back to download + WhatsApp");
        }
      }
      
      loadingText.textContent = "📥 جاري تحميل الصورة...";
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = studentName.replace(/[^a-zA-Z0-9\u0600-\u06FF ]/g, '').trim() || 'student';
      a.download = `شهادة_${safeName}_Complete_Quiz.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      URL.revokeObjectURL(url);
      
      loadingText.textContent = "📱 جاري فتح واتساب...";
      
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
        loading.classList.remove("show");
        btn.disabled = false;
        
        setTimeout(() => {
          alert("✅ تم تحميل صورة الشهادة وفتح واتساب.\n\n📎 الرجاء إرفاق الصورة المحملة في المحادثة مع الأستاذ محمد كريم.");
        }, 500);
      }, 500);
      
    } catch (error) {
      console.error("Error sending to WhatsApp:", error);
      alert("⚠️ حدث خطأ أثناء الإرسال. الرجاء المحاولة مرة أخرى.");
      loading.classList.remove("show");
      btn.disabled = false;
    }
  }

  // === إعادة الاختبار ===
  function restartQuiz() {
    currentQuestionIndex = 0;
    currentScore = 0;
    wrongAnswers = 0;
    quizFinished = false;
    shuffledQuestions = [];
    studentName = "";
    certificateBlob = null;
    
    document.getElementById("quizBox").style.display = "block";
    document.getElementById("certificateWrapper").style.display = "none";
    document.getElementById("nameInputSection").style.display = "block";
    document.getElementById("certificateSection").style.display = "none";
    document.getElementById("studentNameInput").value = "";
    
    updateScoreBoard();
    loadQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleEnterKey(event) {
    if (event.key === 'Enter' || event.keyCode === 13) {
      if (document.activeElement === document.getElementById("studentNameInput")) {
        generateCertificate();
        return;
      }
      
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

  window.onload = function() {
    loadQuestion();
    initSpeechRecognition();
  };