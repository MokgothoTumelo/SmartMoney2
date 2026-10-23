/* SmartMoney Helper — floating chatbot widget
 * - Budget / savings maths and common topics are answered on the device (works offline).
 * - Everything else is sent to /api/chat (AI) when online; falls back to local help if unavailable.
 * - Injects its own markup, so pages only need: <script src="js/chatbot.js"></script>
 */
(function () {
  'use strict';

  var HISTORY_KEY = 'smartmoney_chat_history_v1';
  var MAX_HISTORY = 40;

  // ---------- Build the widget ----------
  var root = document.createElement('div');
  root.className = 'chatbot';
  root.innerHTML =
    '<button type="button" id="chatbot-toggle" class="chatbot-toggle" aria-label="Open SmartMoney Helper chat" aria-expanded="false" aria-controls="chatbot-window">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>' +
    '</button>' +
    '<section id="chatbot-window" class="chatbot-window" role="dialog" aria-label="SmartMoney Helper" hidden>' +
      '<header class="chatbot-header">' +
        '<div><strong>SmartMoney Helper</strong><span>Educational only — not financial advice</span></div>' +
        '<button type="button" id="chatbot-close" class="chatbot-close" aria-label="Close chat">&times;</button>' +
      '</header>' +
      '<div id="chatbot-messages" class="chatbot-messages" role="log" aria-live="polite"></div>' +
      '<div class="chatbot-chips" id="chatbot-chips"></div>' +
      '<form id="chatbot-form" class="chatbot-form" autocomplete="off">' +
        '<label for="chatbot-input" class="sr-only">Ask a money question</label>' +
        '<input id="chatbot-input" type="text" maxlength="500" placeholder="Ask a money question…" />' +
        '<button type="submit" id="chatbot-send">Send</button>' +
      '</form>' +
    '</section>';
  document.body.appendChild(root);

  var toggle = root.querySelector('#chatbot-toggle');
  var win = root.querySelector('#chatbot-window');
  var closeBtn = root.querySelector('#chatbot-close');
  var form = root.querySelector('#chatbot-form');
  var input = root.querySelector('#chatbot-input');
  var sendBtn = root.querySelector('#chatbot-send');
  var messages = root.querySelector('#chatbot-messages');
  var chips = root.querySelector('#chatbot-chips');

  var history = [];
  var busy = false;

  // ---------- Open / close ----------
  function openChat() {
    win.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.hidden = true;
    input.focus();
    messages.scrollTop = messages.scrollHeight;
  }
  function closeChat() {
    win.hidden = true;
    toggle.hidden = false;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  }
  toggle.addEventListener('click', openChat);
  closeBtn.addEventListener('click', closeChat);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !win.hidden) closeChat();
  });

  // ---------- Messages ----------
  function addMessage(text, sender, skipSave) {
    var p = document.createElement('p');
    p.className = sender + '-message';
    p.textContent = text; // textContent: safe against HTML injection
    messages.appendChild(p);
    messages.scrollTop = messages.scrollHeight;
    if (!skipSave && sender !== 'typing') {
      history.push({ role: sender === 'user' ? 'user' : 'assistant', text: text });
      if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
      saveHistory();
    }
    return p;
  }

  function saveHistory() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch (e) { /* storage unavailable */ }
  }
  function loadHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) history = parsed.filter(function (m) { return m && typeof m.text === 'string'; });
    } catch (e) { history = []; }
  }

  // ---------- Local maths ----------
  function formatMoney(amount) {
    return amount.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 2 });
  }
  function findAmounts(message) {
    var found = message.match(/R\s*\d[\d,\s]*(?:\.\d{1,2})?/gi) || [];
    return found.map(function (a) {
      return Number(a.replace(/R/gi, '').replace(/[,\s]/g, ''));
    }).filter(function (n) { return Number.isFinite(n); });
  }

  function calculateBudget(message) {
    var nums = findAmounts(message);
    if (nums.length < 2) return null;
    var income = nums[0], expenses = 0;
    for (var i = 1; i < nums.length; i++) expenses += nums[i];
    var left = income - expenses;
    return 'Here is your budget calculation:\n\n' +
      'Income: ' + formatMoney(income) + '\n' +
      'Total expenses: ' + formatMoney(expenses) + '\n' +
      'Money remaining: ' + formatMoney(left) + '\n\n' +
      (left >= 0
        ? 'You have money remaining after these expenses. Consider saving some of it.'
        : 'Your expenses are higher than your income. Review your spending and look for costs you can reduce.');
  }

  function calculateSavings(message) {
    var nums = findAmounts(message);
    if (!nums.length || nums[0] <= 0) return null;
    var m = nums[0];
    return "Let's create your savings plan!\n\n" +
      'Monthly savings: ' + formatMoney(m) + '\n' +
      'After 6 months: ' + formatMoney(m * 6) + '\n' +
      'After 12 months: ' + formatMoney(m * 12) + '\n\n' +
      'Tip: save as soon as you get paid. These figures assume every payment is made and exclude interest, fees and withdrawals.';
  }

  function has(q, words) {
    return words.some(function (w) { return q.indexOf(w) !== -1; });
  }
  function hasWord(q, words) {
    return words.some(function (w) { return new RegExp('\\b' + w + '\\b').test(q); });
  }

  // Returns an answer string, or null if the question should go to the AI.
  // mode 'calc' = only calculations and safety-critical answers; mode 'all' = every topic (offline fallback).
  function localAnswer(message, mode) {
    var q = message.toLowerCase();

    if (has(q, ['budget', 'expense', 'money left', 'left over', 'what is left', 'remaining', 'afford', 'income', 'salary'])) {
      var b = calculateBudget(message);
      if (b) return b;
      if (mode === 'all') {
        return 'A budget compares your income with your expenses.\n\nTry: "My income is R2000, transport costs R500 and food costs R600. How much will I have left?"\n\nI will calculate it from the amounts you give me.';
      }
    }

    if (has(q, ['save', 'saving', 'savings'])) {
      var s = calculateSavings(message);
      if (s) return s;
      if (mode === 'all') {
        return 'Start with a realistic savings goal, track your spending, and save a manageable amount regularly.\n\nTry: "How much will I save if I put away R300 every month?"';
      }
    }

    // Safety-critical: never rely on the AI for these basics
    if (hasWord(q, ['scam', 'fraud', 'phishing', 'pin', 'otp', 'password', 'passwords'])) {
      return 'Protect your money:\n\n1. Never share your banking PIN, password or one-time PIN (OTP).\n2. Be cautious of messages promising guaranteed money.\n3. Verify payment requests using trusted contact details.\n4. If you suspect fraud, contact your bank through its official channels straight away.\n\nSee the Safety Centre for more.';
    }

    if (mode !== 'all') return null;

    if (hasWord(q, ['hello', 'hi', 'hey']) || has(q, ['good morning', 'good afternoon'])) {
      return 'Hello! Welcome to SmartMoney. I can help with budgets, savings, debt, student funding and financial safety. What would you like to know?';
    }
    if (has(q, ['nsfas', 'bursary', 'student funding', 'financial aid'])) {
      return 'NSFAS funds qualifying students under its rules, and bursaries come from universities, government departments, companies and other organisations.\n\nCheck official eligibility rules, closing dates and required documents before applying. Never pay anyone who promises guaranteed funding.';
    }
    if (has(q, ['debt', 'owe money', 'credit card', 'loan'])) {
      return 'Debt tips:\n\n1. List every debt, balance and interest rate.\n2. Always make at least the required payments on time.\n3. Pay extra towards the highest-interest debt if you can.\n4. Avoid borrowing more than you can repay.\n5. Contact your lender early if you are struggling.\n\nBefore taking a loan, check the interest rate, fees and total repayment amount.';
    }
    if (has(q, ['goal', 'target'])) {
      return 'Divide the target amount by the number of months you have. For example, R1200 over 6 months needs R200 a month (excluding interest and fees).';
    }
    if (has(q, ['thank'])) {
      return "You're welcome! I'm here to help you make more informed money decisions.";
    }
    return "I'm offline right now, so I can only help with basics. I can do:\n\n• Budget calculations\n• Savings plans\n• Student funding and bursaries\n• Debt tips\n• Financial safety\n\nTry one of those, or ask again when you're back online.";
  }

  // ---------- AI request ----------
  function askServer(message) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 25000);
    return fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message }),
      signal: controller.signal
    }).then(function (res) {
      clearTimeout(timer);
      if (!res.ok) throw new Error('Server error ' + res.status);
      return res.json();
    }).then(function (data) {
      if (!data || typeof data.reply !== 'string' || !data.reply) throw new Error('Empty reply');
      return data.reply;
    }).catch(function (err) {
      clearTimeout(timer);
      throw err;
    });
  }

  function respond(message) {
    // 1. Calculations / safety answered instantly on-device
    var quick = localAnswer(message, 'calc');
    if (quick) { addMessage(quick, 'bot'); return Promise.resolve(); }

    // 2. Offline → local fallback
    if (!navigator.onLine) { addMessage(localAnswer(message, 'all'), 'bot'); return Promise.resolve(); }

    // 3. AI
    var typing = addMessage('Thinking…', 'typing', true);
    return askServer(message).then(function (reply) {
      typing.remove();
      addMessage(reply, 'bot');
    }).catch(function () {
      typing.remove();
      addMessage(localAnswer(message, 'all'), 'bot');
    });
  }

  // ---------- Events ----------
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    var message = input.value.trim();
    if (!message) return;

    busy = true;
    sendBtn.disabled = true;
    addMessage(message, 'user');
    input.value = '';

    respond(message).then(function () {
      busy = false;
      sendBtn.disabled = false;
      input.focus();
    });
  });

  var SUGGESTIONS = [
    'My income is R5000, rent is R2000 and food is R1000. What is left?',
    'How much will I save if I put away R300 every month?',
    'What is NSFAS?',
    'How do I spot a scam?'
  ];
  SUGGESTIONS.forEach(function (text) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.addEventListener('click', function () {
      input.value = text;
      form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
    });
    chips.appendChild(b);
  });

  // ---------- Init ----------
  loadHistory();
  if (history.length) {
    history.forEach(function (m) { addMessage(m.text, m.role === 'user' ? 'user' : 'bot', true); });
    chips.hidden = true;
  } else {
    addMessage('Hi! I\'m SmartMoney Helper. Ask me about budgets, savings, debt, student funding or staying safe from scams. Never share your PIN or passwords with me.', 'bot', true);
  }
  input.addEventListener('input', function () { chips.hidden = true; });
})();
