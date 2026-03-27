/* ===================================================
   Sanskriti Voice Assistant — Core Engine
   Speech Recognition + TTS + Command Processing
   Supports: en-US, hi-IN, mr-IN
   =================================================== */

const SanskritiAssistant = (() => {
  // ===== STATE =====
  let currentLang = 'en-US';
  let speechRate = 1.0;
  let speechPitch = 1.0;
  let recognition = null;
  let isListening = false;
  let isSpeaking = false;

  // ===== TRANSLATIONS =====
  const translations = {
    'en-US': {
      greeting_morning: 'Good Morning! How can I help you today?',
      greeting_afternoon: 'Good Afternoon! What would you like to do?',
      greeting_evening: 'Good Evening! How may I assist you?',
      greeting_night: 'Hello! Working late? I\'m here to help.',
      opening_calculator: 'Opening Calculator for you.',
      opening_notes: 'Opening Notes for you.',
      opening_exercise: 'Opening Exercise Guide.',
      opening_blind: 'Starting Blind Navigation Guide.',
      opening_settings: 'Opening Settings.',
      going_home: 'Going back to Home.',
      language_switched: 'Language switched to English.',
      time_response: 'The current time is',
      date_response: 'Today\'s date is',
      note_added: 'Note added successfully.',
      not_understood: 'I didn\'t understand that. Try saying "Open Calculator" or "What time is it?"',
      exercise_squats: 'Starting squat tracking. Get into position!',
      exercise_pushups: 'Starting push-up tracking. Get into position!',
      exercise_yoga: 'Starting yoga pose tracking. Get ready!',
      keep_back_straight: 'Keep your back straight!',
      good_form: 'Great form! Keep going!',
      rep_counted: 'Rep counted!',
      object_detected: 'Object ahead:',
      meters: 'meters',
      welcome: 'Welcome to Sanskriti! I am your voice assistant. How can I help you?',
    },
    'hi-IN': {
      greeting_morning: 'सुप्रभात! मैं आपकी कैसे मदद कर सकता हूँ?',
      greeting_afternoon: 'नमस्कार! आप क्या करना चाहेंगे?',
      greeting_evening: 'शुभ संध्या! मैं आपकी कैसे सहायता करूँ?',
      greeting_night: 'नमस्ते! देर हो गई है, मैं यहाँ मदद के लिए हूँ।',
      opening_calculator: 'कैलकुलेटर खोल रहा हूँ।',
      opening_notes: 'नोट्स खोल रहा हूँ।',
      opening_exercise: 'व्यायाम गाइड खोल रहा हूँ।',
      opening_blind: 'ब्लाइंड नेविगेशन शुरू कर रहा हूँ।',
      opening_settings: 'सेटिंग्स खोल रहा हूँ।',
      going_home: 'होम पेज पर जा रहा हूँ।',
      language_switched: 'भाषा हिन्दी में बदल दी गई।',
      time_response: 'अभी का समय है',
      date_response: 'आज की तारीख है',
      note_added: 'नोट सफलतापूर्वक जोड़ा गया।',
      not_understood: 'मैं समझ नहीं पाया। कहें "कैलकुलेटर खोलो" या "समय क्या है?"',
      exercise_squats: 'स्क्वाट ट्रैकिंग शुरू। पोज़िशन में आइए!',
      exercise_pushups: 'पुश-अप ट्रैकिंग शुरू। तैयार हो जाइए!',
      exercise_yoga: 'योग ट्रैकिंग शुरू। तैयार रहें!',
      keep_back_straight: 'अपनी पीठ सीधी रखें!',
      good_form: 'बहुत अच्छा! ऐसे ही जारी रखें!',
      rep_counted: 'रेप गिना गया!',
      object_detected: 'आगे वस्तु है:',
      meters: 'मीटर',
      welcome: 'संस्कृति में आपका स्वागत है! मैं आपका वॉइस असिस्टेंट हूँ।',
    },
    'mr-IN': {
      greeting_morning: 'सुप्रभात! मी आपल्याला कशी मदत करू शकतो?',
      greeting_afternoon: 'नमस्कार! तुम्हाला काय करायचं आहे?',
      greeting_evening: 'शुभ संध्याकाळ! मी कशी मदत करू?',
      greeting_night: 'नमस्कार! उशीर झालाय, मी मदतीला आहे.',
      opening_calculator: 'कॅल्क्युलेटर उघडत आहे.',
      opening_notes: 'नोट्स उघडत आहे.',
      opening_exercise: 'व्यायाम मार्गदर्शक उघडत आहे.',
      opening_blind: 'ब्लाइंड नेव्हिगेशन सुरू करत आहे.',
      opening_settings: 'सेटिंग्ज उघडत आहे.',
      going_home: 'होम पेजवर जात आहे.',
      language_switched: 'भाषा मराठी मध्ये बदलली.',
      time_response: 'सध्याची वेळ आहे',
      date_response: 'आजची तारीख आहे',
      note_added: 'नोट यशस्वीरित्या जोडली.',
      not_understood: 'मला समजले नाही. "कॅल्क्युलेटर उघडा" किंवा "वेळ काय आहे?" असे म्हणा.',
      exercise_squats: 'स्क्वॅट ट्रॅकिंग सुरू. पोझिशनमध्ये या!',
      exercise_pushups: 'पुश-अप ट्रॅकिंग सुरू. तयार व्हा!',
      exercise_yoga: 'योगा ट्रॅकिंग सुरू. तयार राहा!',
      keep_back_straight: 'तुमची पाठ सरळ ठेवा!',
      good_form: 'उत्तम! असेच चालू ठेवा!',
      rep_counted: 'रेप मोजला!',
      object_detected: 'समोर वस्तू आहे:',
      meters: 'मीटर',
      welcome: 'संस्कृतीमध्ये आपले स्वागत! मी तुमचा व्हॉइस असिस्टंट आहे.',
    }
  };

  // ===== OBJECT NAMES (for blind nav) =====
  const objectNames = {
    'en-US': {
      person: 'Person', chair: 'Chair', table: 'Table', bottle: 'Bottle',
      phone: 'Phone', laptop: 'Laptop', cup: 'Cup', book: 'Book',
      bag: 'Bag', door: 'Door', wall: 'Wall', car: 'Car',
      dog: 'Dog', cat: 'Cat', bicycle: 'Bicycle',
    },
    'hi-IN': {
      person: 'व्यक्ति', chair: 'कुर्सी', table: 'मेज़', bottle: 'बोतल',
      phone: 'फ़ोन', laptop: 'लैपटॉप', cup: 'कप', book: 'किताब',
      bag: 'बैग', door: 'दरवाज़ा', wall: 'दीवार', car: 'कार',
      dog: 'कुत्ता', cat: 'बिल्ली', bicycle: 'साइकिल',
    },
    'mr-IN': {
      person: 'व्यक्ती', chair: 'खुर्ची', table: 'टेबल', bottle: 'बाटली',
      phone: 'फोन', laptop: 'लॅपटॉप', cup: 'कप', book: 'पुस्तक',
      bag: 'बॅग', door: 'दार', wall: 'भिंत', car: 'कार',
      dog: 'कुत्रा', cat: 'मांजर', bicycle: 'सायकल',
    }
  };

  // ===== INIT SPEECH RECOGNITION =====
  function initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported');
      showNotification('warning', '⚠️', 'Speech Recognition', 'Not supported in this browser. Try Chrome or Edge.');
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = currentLang;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      console.log('Heard:', transcript);
      processCommand(transcript);
    };

    recognition.onend = () => {
      isListening = false;
      updateVoiceUI(false);
    };

    recognition.onerror = (event) => {
      console.warn('Recognition error:', event.error);
      isListening = false;
      updateVoiceUI(false);
      if (event.error === 'not-allowed') {
        showNotification('error', '🎤', 'Microphone Access', 'Please allow microphone access to use voice commands.');
      }
    };
  }

  // ===== START / STOP LISTENING =====
  function startListening() {
    if (isSpeaking) return;
    if (!recognition) initRecognition();
    if (!recognition) return;

    recognition.lang = currentLang;
    try {
      recognition.start();
      isListening = true;
      updateVoiceUI(true);
    } catch (e) {
      console.warn('Recognition already started');
    }
  }

  function stopListening() {
    if (recognition && isListening) {
      recognition.stop();
      isListening = false;
      updateVoiceUI(false);
    }
  }

  function toggleListening() {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }

  // ===== TEXT-TO-SPEECH =====
  function speak(text, callback) {
    if (!window.speechSynthesis) {
      console.warn('SpeechSynthesis not supported');
      if (callback) callback();
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = currentLang;
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    utterance.volume = 1;

    // Try to get a matching voice
    const voices = window.speechSynthesis.getVoices();
    const langCode = currentLang.split('-')[0];
    const matchingVoice = voices.find(v => v.lang === currentLang) ||
                          voices.find(v => v.lang.startsWith(langCode));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    isSpeaking = true;
    utterance.onend = () => {
      isSpeaking = false;
      if (callback) callback();
    };
    utterance.onerror = () => {
      isSpeaking = false;
      if (callback) callback();
    };

    window.speechSynthesis.speak(utterance);
  }

  // ===== COMMAND PROCESSING =====
  function processCommand(transcript) {
    const lower = transcript.toLowerCase();
    const t = translations[currentLang];

    // Show transcript in UI
    showAssistantCard(transcript, '');

    // Navigation commands
    if (matchCommand(lower, ['open calculator', 'calculator', 'कैलकुलेटर', 'कॅल्क्युलेटर'])) {
      respondAndNavigate(t.opening_calculator, 'calculator');
    }
    else if (matchCommand(lower, ['open notes', 'notes', 'todo', 'नोट्स', 'नोट'])) {
      respondAndNavigate(t.opening_notes, 'notes');
    }
    else if (matchCommand(lower, ['exercise', 'start exercise', 'exercise guide', 'व्यायाम'])) {
      respondAndNavigate(t.opening_exercise, 'exercise');
    }
    else if (matchCommand(lower, ['blind', 'blind navigation', 'navigation', 'start blind', 'ब्लाइंड', 'नेव्हिगेशन'])) {
      respondAndNavigate(t.opening_blind, 'blind');
    }
    else if (matchCommand(lower, ['settings', 'setting', 'सेटिंग'])) {
      respondAndNavigate(t.opening_settings, 'settings');
    }
    else if (matchCommand(lower, ['home', 'go home', 'go back', 'होम', 'घर'])) {
      respondAndNavigate(t.going_home, 'home');
    }
    // Exercise-specific
    else if (matchCommand(lower, ['squats', 'squat', 'guide me in squats', 'स्क्वाट'])) {
      respond(t.exercise_squats);
      navigateTo('exercise');
      setTimeout(() => startExercise('squats'), 800);
    }
    else if (matchCommand(lower, ['push-ups', 'pushups', 'push up', 'पुश-अप', 'पुश अप'])) {
      respond(t.exercise_pushups);
      navigateTo('exercise');
      setTimeout(() => startExercise('pushups'), 800);
    }
    else if (matchCommand(lower, ['yoga', 'yoga pose', 'योगा', 'योग'])) {
      respond(t.exercise_yoga);
      navigateTo('exercise');
      setTimeout(() => startExercise('yoga'), 800);
    }
    // Language switch
    else if (matchCommand(lower, ['switch to hindi', 'hindi', 'हिन्दी'])) {
      changeLanguage('hi-IN');
      respond(translations['hi-IN'].language_switched);
    }
    else if (matchCommand(lower, ['switch to marathi', 'marathi', 'मराठी'])) {
      changeLanguage('mr-IN');
      respond(translations['mr-IN'].language_switched);
    }
    else if (matchCommand(lower, ['switch to english', 'english', 'अंग्रेज़ी', 'इंग्रजी'])) {
      changeLanguage('en-US');
      respond(translations['en-US'].language_switched);
    }
    // Time
    else if (matchCommand(lower, ['time', 'what time', 'current time', 'समय', 'वेळ', 'टाइम'])) {
      const time = new Date().toLocaleTimeString(currentLang, { hour: '2-digit', minute: '2-digit' });
      respond(`${t.time_response} ${time}`);
    }
    // Date
    else if (matchCommand(lower, ['date', 'today', 'what date', 'तारीख', 'आज'])) {
      const date = new Date().toLocaleDateString(currentLang, { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      });
      respond(`${t.date_response} ${date}`);
    }
    // Add note
    else if (matchCommand(lower, ['add note', 'note:', 'नोट जोड़', 'नोट लिहा'])) {
      const noteText = transcript.replace(/^(add note:?|note:?|नोट जोड़ो:?|नोट लिहा:?)\s*/i, '').trim();
      if (noteText) {
        addNoteFromVoice(noteText);
        respond(t.note_added);
      }
    }
    // Fallback
    else {
      respond(t.not_understood);
    }
  }

  function matchCommand(input, keywords) {
    return keywords.some(kw => input.includes(kw));
  }

  function respond(text) {
    updateAssistantResponse(text);
    speak(text);
    showNotification('info', '🙏', 'Sanskriti', text);
  }

  function respondAndNavigate(text, page) {
    respond(text);
    setTimeout(() => navigateTo(page), 500);
  }

  // ===== UI UPDATES =====
  function updateVoiceUI(listening) {
    const fab = document.getElementById('voiceFab');
    if (fab) {
      fab.classList.toggle('listening', listening);
    }
  }

  function showAssistantCard(transcript, response) {
    const card = document.getElementById('assistantCard');
    const transcriptEl = document.getElementById('transcriptText');
    if (card && transcriptEl) {
      transcriptEl.textContent = transcript;
      card.style.display = 'block';
    }
  }

  function updateAssistantResponse(text) {
    const responseEl = document.getElementById('assistantResponse');
    if (responseEl) {
      responseEl.textContent = text;
    }
  }

  // ===== LANGUAGE =====
  function setLanguage(lang) {
    currentLang = lang;
    if (recognition) {
      recognition.lang = lang;
    }
  }

  function getLanguage() {
    return currentLang;
  }

  function getTranslation(key) {
    return translations[currentLang]?.[key] || translations['en-US']?.[key] || key;
  }

  function getObjectName(objectKey) {
    return objectNames[currentLang]?.[objectKey] || objectNames['en-US']?.[objectKey] || objectKey;
  }

  // ===== SETTINGS =====
  function setRate(rate) {
    speechRate = parseFloat(rate);
  }

  function setPitch(pitch) {
    speechPitch = parseFloat(pitch);
  }

  // ===== GREETING =====
  function getGreeting() {
    const hour = new Date().getHours();
    const t = translations[currentLang];
    if (hour < 12) return t.greeting_morning;
    if (hour < 17) return t.greeting_afternoon;
    if (hour < 20) return t.greeting_evening;
    return t.greeting_night;
  }

  // ===== PUBLIC API =====
  return {
    init: initRecognition,
    startListening,
    stopListening,
    toggleListening,
    speak,
    processCommand,
    setLanguage,
    getLanguage,
    getTranslation,
    getObjectName,
    getGreeting,
    setRate,
    setPitch,
    isListening: () => isListening,
    isSpeaking: () => isSpeaking,
    translations,
  };
})();
