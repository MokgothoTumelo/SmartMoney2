(function () {
  'use strict';
  SMUI.bootPage('safety');
  const view = document.getElementById('view');

  const RULES = [
    { key: 'urgency', label: 'Urgency pressure',
      patterns: [/\burgent(ly)?\b/i, /\bimmediately\b/i, /\bwithin \d+ (hours?|minutes?)\b/i, /\bact now\b/i, /\blast chance\b/i, /\bexpires? (today|soon)\b/i, /\bhurry\b/i],
      explain: 'Scammers create panic so you act before thinking. Real organisations rarely demand instant action by message.' },
    { key: 'threat', label: 'Threats or fear tactics',
      patterns: [/\baccount (will be|has been) (closed|suspended|blocked)\b/i, /\bblocked\b/i, /\bsuspended\b/i, /\blegal action\b/i, /\barrest\b/i, /\bblacklist(ed)?\b/i],
      explain: 'Threats of closure or legal action are common scare tactics. Verify directly using an official contact.' },
    { key: 'link', label: 'Suspicious link',
      patterns: [/https?:\/\/[^\s]+/i, /\bwww\.[^\s]+/i, /\bclick (here|this link)\b/i, /\bbit\.ly\b/i, /\btinyurl\b/i],
      explain: 'Links can hide fake sites that steal your details. Never open an unexpected link. Type the official address yourself.' },
    { key: 'pin', label: 'Request for PIN / OTP / password',
      patterns: [/\b(pin|otp|one[- ]time password|password|passcode|voucher)\b/i, /\bsend (us |me )?(your )?(pin|otp|password)\b/i, /\bconfirm (your )?(pin|otp|password)\b/i],
      explain: 'No bank or retailer will ever ask for your PIN, OTP, or password by message. Never share them.' },
    { key: 'personal', label: 'Requests for personal or banking details',
      patterns: [/\bid number\b/i, /\bidentity number\b/i, /\bbank(ing)? details\b/i, /\bcard number\b/i, /\bcvv\b/i, /\baccount number\b/i, /\bdate of birth\b/i],
      explain: 'Criminals use these details for identity theft. Only share them through a verified, official channel you started.' },
    { key: 'impersonation', label: 'Possible impersonation',
      patterns: [/\bfrom (the )?(bank|sars|sassa|home affairs|capitec|fnb|absa|standard bank|nedbank|telkom|vodacom|mtn)\b/i, /\bofficial (notification|notice)\b/i, /\bsecurity (team|department)\b/i],
      explain: 'Scammers pretend to be your bank, SASSA, or a network. Contact the organisation using a number from their website or your card.' },
    { key: 'payment', label: 'Unusual payment instructions',
      patterns: [/\be-?wallet\b/i, /\bcash send\b/i, /\bpay (to )?(this )?(number|account)\b/i, /\bsend (money|r\d+|cash)\b/i, /\bgift card\b/i, /\bcrypto(currency)?\b/i, /\bbitcoin\b/i],
      explain: 'Payments by e-wallet, gift card, or crypto to a stranger are almost impossible to reverse. Prefer traceable, official channels.' },
    { key: 'returns', label: 'Unrealistic promises',
      patterns: [/\bguaranteed (profit|return|income)\b/i, /\bdouble your (money|investment)\b/i, /\b\d+% (profit|return|interest) (per|a) (day|week|month)\b/i, /\brisk[- ]free\b/i, /\bearn r\d+ (per|a) (day|week)\b/i],
      explain: 'Guaranteed high returns are a major red flag. Legitimate investments carry risk and should be registered with the FSCA.' },
    { key: 'job', label: 'Too-good-to-be-true job offer',
      patterns: [/\bwork from home\b/i, /\bearn r\d+ (daily|weekly)\b/i, /\bno experience\b/i, /\bregistration fee\b/i, /\bpay (a )?fee\b/i],
      explain: 'Real employers do not ask you to pay a fee to get a job. Verify the company independently.' },
  ];

  function render() {
    view.innerHTML = `
      <div class="page-head">
        <div>
          <h1>Safety Centre</h1>
          <p class="subtitle">Learn to recognise common scams and check a suspicious message before you act.</p>
        </div>
      </div>
      <section class="card" style="margin-top:1rem" aria-label="Emergency numbers">
        <h2>Emergency numbers (South Africa)</h2>
        <ul style="margin:.4rem 0 0 1.1rem;line-height:1.7" class="small-text">
          <li><strong>SAPS (police):</strong> <a href="tel:10111">10111</a></li>
          <li><strong>Ambulance / medical:</strong> <a href="tel:10177">10177</a></li>
          <li><strong>Gender-based violence command centre:</strong> <a href="tel:0800428428">0800 428 428</a></li>
          <li><strong>Your bank fraud line:</strong> use the number on the back of your card or the official bank app/website — never a number from a message.</li>
          <li><strong>National Consumer Commission:</strong> for consumer complaints about unfair lending</li>
        </ul>
        <p class="small-text muted" style="margin-top:.5rem">Save these in your phone. Verify bank numbers independently.</p>
      </section>


      <section class="card" aria-label="Scam checker">
        <h2>Check a suspicious message</h2>
        <p class="small-text">Paste an SMS, WhatsApp message, or email. Do not paste your PIN, OTP, password, or bank details.</p>
        <label for="scamInput" class="sr-only">Suspicious message</label>
        <textarea id="scamInput" rows="6" placeholder="Paste the message here"></textarea>
        <div class="form-actions">
          <button class="primary" id="runBtn">${SMUI.ICONS.search} Check message</button>
          <button class="ghost" id="exampleBtn">Try an example</button>
          <button class="ghost" id="clearBtn">Clear</button>
        </div>
        <div id="scamResult" style="margin-top:1rem" aria-live="polite"></div>
      </section>

      <section class="card" style="margin-top:1rem">
        <h2>Common scams in South Africa</h2>
        <div class="stack" style="margin-top:.6rem">
          ${lesson('Phishing messages', 'Fake SMS or email pretending to be your bank, SASSA, or a delivery service. They link to fake login pages. Never click a link from an unexpected message; open your bank app or type the address yourself.')}
          ${lesson('Fake job offers', 'Real employers never ask you to pay a fee to get a job. Be careful of "earn R3 500 weekly, no experience" messages.')}
          ${lesson('Investment scams', 'Promises of guaranteed high returns are a major red flag. Legitimate investments carry risk. Check if the provider is registered with the FSCA.')}
          ${lesson('Impersonation of banks or government', 'Scammers pretend to be Capitec, FNB, ABSA, Standard Bank, Nedbank, SASSA, SARS, or Home Affairs. Always use a number from the official website or your card.')}
          ${lesson('Requests for PIN or OTP', 'No bank, retailer, or government office will ask for your PIN, OTP, or password by message or call. Never share them.')}
          ${lesson('Suspicious payment requests', 'Requests to pay to an e-wallet, gift card, or crypto address are almost impossible to reverse. Prefer traceable channels.')}
          ${lesson('Fake proof of payment', 'A screenshot of a payment is not proof that money reached your account. Check your own bank balance or app before releasing goods.')}
          ${lesson('Unexpected transaction fees', 'Before approving a payment, check the disclosed fee and the total cost. Compare the fee to the amount being sent.')}
        </div>
      </section>

      <section class="card" style="margin-top:1rem">
        <h2>Review a transaction (planning tool)</h2>
        <p class="small-text">This is a demonstration and planning tool. It does not perform real payments.</p>
        <form id="txReviewForm" class="form-grid" style="margin-top:.6rem">
          <div><label for="trRecipient">Recipient</label><input id="trRecipient" name="recipient" type="text" maxlength="80" placeholder="e.g. Thabo" /></div>
          <div><label for="trAmount">Amount (R)</label><input id="trAmount" name="amount" type="number" min="0" step="0.01" placeholder="e.g. 250" /></div>
          <div><label for="trFee">Disclosed fee (R)</label><input id="trFee" name="fee" type="number" min="0" step="0.01" placeholder="e.g. 5" /></div>
          <div><label for="trChannel">Channel</label>
            <select id="trChannel" name="channel">
              <option value="ewallet">E-wallet</option>
              <option value="bank">Bank transfer</option>
              <option value="cash">Cash in person</option>
              <option value="unknown">Unknown</option>
            </select></div>
          <div style="display:flex;align-items:flex-end"><button class="primary" type="submit">Review</button></div>
        </form>
        <div id="txReviewResult" style="margin-top:1rem" aria-live="polite"></div>
      </section>

      <section class="card" style="margin-top:1rem">
        <h2>If you think you have been scammed</h2>
        <ul style="margin:.5rem 0 0 1.1rem;line-height:1.7" class="small-text">
          <li>Call your bank immediately using the number on the back of your card or in the official app.</li>
          <li>Report to SAPS. Keep screenshots and reference numbers.</li>
          <li>Do not send more money to "fix" the first payment.</li>
          <li>Change your banking app passwords if you shared them.</li>
        </ul>
        <div class="msg info" style="margin-top:.8rem">SmartMoney cannot verify, reverse, or protect any payment. Contact your bank through independently verified channels.</div>
      </section>`;

    document.getElementById('runBtn').addEventListener('click', () => runCheck(document.getElementById('scamInput').value));
    document.getElementById('exampleBtn').addEventListener('click', () => {
      const t = document.getElementById('scamInput');
      t.value = 'URGENT: Your bank account has been suspended. Click http://secure-verify.example to confirm your PIN and OTP within 24 hours or your account will be blocked.';
      runCheck(t.value);
    });
    document.getElementById('clearBtn').addEventListener('click', () => {
      document.getElementById('scamInput').value = '';
      document.getElementById('scamResult').innerHTML = '';
    });
    document.getElementById('txReviewForm').addEventListener('submit', onTxReview);
  }

  function lesson(title, text) {
    return `<details class="lesson"><summary><span>${SMStore.esc(title)}</span><span class="muted small-text">Read</span></summary>
      <div class="lesson-body"><p>${SMStore.esc(text)}</p></div></details>`;
  }

  function runCheck(text) {
    const clean = String(text || '').trim();
    const out = document.getElementById('scamResult');
    if (clean.length < 8) {
      out.innerHTML = `<div class="msg warn">Please paste a slightly longer message so the check can look for warning signs.</div>`;
      return;
    }
    const found = [];
    for (const r of RULES) if (r.patterns.some(rx => rx.test(clean))) found.push(r);
    let risk = 'Low';
    if (found.length >= 2) risk = 'Medium';
    if (found.length >= 4 || found.some(f => f.key === 'pin')) risk = 'High';
    if (found.some(f => f.key === 'pin') && found.some(f => f.key === 'urgency')) risk = 'High';
    const cls = risk.toLowerCase();
    out.innerHTML = `
      <div class="row between" style="flex-wrap:wrap;gap:.5rem">
        <h3>Risk assessment: <span class="badge ${cls}">${risk}</span></h3>
        <span class="muted small-text">${found.length} warning sign(s) found</span>
      </div>
      <p class="small-text" style="margin-top:.5rem">${risk === 'High'
        ? 'Several serious warning signs. Treat as dangerous. Do not reply, click links, or send money or details.'
        : risk === 'Medium'
          ? 'Some warning signs found. Pause and verify the sender using an official number or website.'
          : found.length === 1
            ? 'One warning sign found. Be cautious, but one pattern is not proof of a scam.'
            : 'No common warning signs found. This does not guarantee safety. Verify unexpected messages independently.'}</p>
      ${found.length ? `<h3 style="margin-top:.8rem">Warning signs</h3>
        <ul style="margin:.4rem 0 0 1.1rem;line-height:1.7" class="small-text">
          ${found.map(f => `<li><strong>${SMStore.esc(f.label)}</strong> — ${SMStore.esc(f.explain)}</li>`).join('')}
        </ul>` : ''}
      <h3 style="margin-top:.8rem">Safe next steps</h3>
      <ol style="margin:.4rem 0 0 1.1rem;line-height:1.7" class="small-text">
        <li>Stop. Do not reply or click links.</li>
        <li>Verify the sender using an official number or website you find yourself.</li>
        <li>Never share your PIN, OTP, password, or card CVV.</li>
        <li>If you already shared details, call your bank immediately.</li>
        <li>Report scams to your bank and to SAPS.</li>
      </ol>
      <div class="msg info" style="margin-top:.8rem">This is a simple word-pattern check — not AI. It can miss new wording and is English-only. It is not a guarantee that a message is safe or fraudulent.</div>`;
  }

  function onTxReview(e) {
    e.preventDefault();
    const f = e.target;
    const recipient = f.recipient.value.trim() || 'Unknown';
    const amount = SMStore.num(f.amount.value);
    const fee = SMStore.num(f.fee.value);
    const channel = f.channel.value;
    const out = document.getElementById('txReviewResult');
    if (!(amount > 0)) { out.innerHTML = `<div class="msg err">Enter an amount greater than zero.</div>`; return; }
    const total = SMStore.round2(amount + fee);
    const feePct = amount > 0 ? (fee / amount) * 100 : 0;
    const warnings = [];
    let channelNote = '';
    if (channel === 'ewallet') { channelNote = 'E-wallet payments can be difficult to reverse.'; warnings.push('E-wallet transfers may not be recoverable if something goes wrong.'); }
    if (channel === 'unknown') { channelNote = 'Unknown channel is risky.'; warnings.push('Verify the recipient and payment method independently.'); }
    if (feePct > 5) warnings.push(`The disclosed fee is ${feePct.toFixed(1)}% of the amount. That is high — compare with other options.`);
    if (amount > 500) warnings.push('Large amounts deserve a call-back to a known number to confirm.');
    out.innerHTML = `
      <div class="msg info"><strong>Planning summary</strong>
        <ul style="margin:.4rem 0 0 1.1rem;line-height:1.7" class="small-text">
          <li>Recipient: <strong>${SMStore.esc(recipient)}</strong></li>
          <li>Amount: <strong>${SMStore.ZAR(amount)}</strong></li>
          <li>Disclosed fee: <strong>${SMStore.ZAR(fee)}</strong></li>
          <li>Total expected cost: <strong>${SMStore.ZAR(total)}</strong></li>
          <li>Channel: ${SMStore.esc(channel)} — ${SMStore.esc(channelNote)}</li>
        </ul></div>
      ${warnings.length ? `<div class="msg warn" style="margin-top:.6rem"><strong>Things to check before paying</strong>
        <ul style="margin:.4rem 0 0 1.1rem;line-height:1.7" class="small-text">${warnings.map(w => `<li>${SMStore.esc(w)}</li>`).join('')}</ul></div>`
        : `<div class="msg ok" style="margin-top:.6rem">No specific warnings were triggered for this planning review.</div>`}
      <div class="msg info" style="margin-top:.6rem">This is a planning and educational review only. No real payment has been made, checked, reversed, or protected.</div>`;
  }

  render();
})();
