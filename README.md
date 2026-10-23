# SmartMoney

Offline-first educational money app for South Africans (English-only).

## Structure

```
smartmoney/
├── index.html, money.html, budget.html, goals.html, safety.html, settings.html, auth.html
├── manifest.json, service-worker.js
├── icons/ (PWA icons)
├── css/styles.css
└── js/ (store, ui, page-*)
```

## Features (post-fix)

- Available money accounts for savings contributions/withdrawals
- Local dates (no UTC midnight shift)
- Installable PWA with offline cache
- Export **and import** JSON backups
- Loan cost checker, optional PIN lock
- Stokvel / group savings goal tags
- Recurring planned expenses, transaction search
- Emergency numbers in Safety Centre
- Accessibility: linked labels, tab keyboard support, ≥44px touch targets

## Run

```
npm install
cp .env.example .env     # then put your OpenAI key in .env
npm start                # http://localhost:3000
```

    OR 

cd "C:\Users\User\Documents\Hackathons\FNB AOTY\SmartMoney-with-chatbot"
dir
npm install
copy .env.example .env
notepad .env
npm start 

The site files live in `public/`. Without an API key the site still works and the chatbot answers basic questions offline. Opening `public/index.html` directly also works, but the AI chatbot needs the Node server.

## Chatbot

`public/js/chatbot.js` adds a floating "SmartMoney Helper" to every page. Budget and savings sums, plus scam/PIN safety answers, are calculated instantly on the device. Other questions go to `/api/chat` (server.js → OpenAI). If offline or the server fails, it falls back to built-in answers. Chat history is stored in `localStorage`.

## Firebase (login + cloud backup)

Login, sign-up and cloud backup use Firebase Authentication and Firestore.

1. Create a Firebase project, enable **Authentication → Email/Password** and create a **Firestore Database**.
2. Register a Web app and paste its config into `public/js/firebase-config.js`.
3. Paste `firestore.rules` into **Firestore → Rules → Publish** (each user can only read their own data).
4. `npm start`, open http://localhost:3000 and sign up.

Notes:
- The Firebase SDK is downloaded only when someone logs in, signs up or syncs. Guest mode never loads it and never uploads data.
- If the config is missing, login is refused (it never lets anyone through).
- Cloud layout: `users/{uid}` (profile) and `users/{uid}/transactions|planned|goals/{id}`.
- First sync after login merges cloud and device data; later syncs make the cloud match this device.
- The Node server (`server.js`) is now only needed for the AI chatbot and to serve the files.

### Automatic backup, logout and forgot password
- **Auto-backup:** while logged in, any change (add / edit / delete) is backed up about 3 seconds later. Changes made offline are backed up when the connection returns, or the next time the app opens. Guests are never uploaded.
- **Logout:** backs up first, then removes the account's records, profile, PIN and chat history from the device. If the backup fails (e.g. offline) the user is warned and can cancel.
- **Different account on the same device:** the previous account's data is wiped before the new one loads. Guest data still merges into the account that signs up/logs in.
- **Forgot password:** "Forgot password?" on the login page sends Firebase's reset email. The message is the same whether or not the email is registered.
- **Clear all data / import / sample data** while logged in also change the cloud copy (the device is the master copy) and the confirmation says so.
