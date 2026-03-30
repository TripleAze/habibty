# 💌 For You - Romantic Message App

A beautiful, intimate message app built with Next.js and Firebase.

## ✨ Features

- **Splash Screen** - Beautiful animated entrance with floating petals
- **Inbox** - View available and locked messages
- **Create** - Send text messages with scheduled delivery
- **Scheduled Timeline** - Track message status (Scheduled, Delivered, Opened)
- **Auto-unlock** - Messages automatically unlock at scheduled times

## 🚀 Deploy to Vercel

### 1. One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### 2. Manual Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel
```

### 3. Set Environment Variables

After deploying, add your Firebase config in Vercel Dashboard:

1. Go to **Project Settings** → **Environment Variables**
2. Add these variables:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`

3. **Redeploy** after adding variables

## 🔥 Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Click **Add app** → **Web**
4. Copy the config values
5. Create a **Cloud Firestore** database
6. Set security rules (for MVP):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /messages/{messageId} {
      allow read, write: if true;  // Change for production
    }
  }
}
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Build
npm run build
```

The app works without Firebase (uses mock data) - just don't add the env variables.

## 📱 Tech Stack

- Next.js 14 (App Router)
- TypeScript
- CSS (no Tailwind)
- Firebase Firestore
- Vercel Hosting

## 💡 Tips

- Works offline in development mode
- Messages unlock automatically every minute
- Visit `/create` to send a new message
- Check `/scheduled` to see your sent messages
