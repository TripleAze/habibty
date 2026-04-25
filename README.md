# Habibty

A premium, romantic micro-social network and multimedia messaging platform designed specifically for couples. Built with Next.js and Firebase, Habibty offers a deeply intimate digital space for two, featuring secure pairing, real-time activity timelines, interactive mini-games, and sophisticated message delivery systems.

## Core Features

### Premium Letter Delivery
- **Multimedia Messaging:** Send text, rich voice notes (with interactive waveforms), and video messages.
- **Scheduled Delivery:** Write letters now and schedule them to unlock on anniversaries.
- **Location-Locked Letters:** Secret messages that only unlock when your partner visits a specific geographic location (e.g., the café where you first met).

### Interactive Connection Games
A suite of realtime multiplayer games built directly into the app for shared moments:
- **Whot!** – The classic African card game with real-time state synchronization.
- **Tic-Tac-Toe** – Quick, engaging classic match.
- **Wordle (Couples Edition)** – Guess the secret word together.
- **Truth or Dare** & **Would You Rather** – Intimate question games to deepen connection.
- **Rapid Fire** – Quick-thinking conversational mini-games.

### Shared Memories & Timeline
- **Moments Timeline:** Every opened letter, reaction, reply, and game played is automatically chronicled into an aesthetic "Journey" timeline.
- **In-App Notifications & Activity:** Stay updated with a beautiful drop-down bell, alerting you when your partner reacts, replies, reads, or takes a turn in a game.
- **Reactions & Threads:** React to letters with emojis or dive into deep narrative reply threads within a unified, seamless Reveal Modal.

### Privacy First (Secure Pairing)
- **Unique Partner Pairing:** Secure user-to-user pairing via a unique invite code limit. Once paired, the app becomes an exclusive 1-on-1 space.

## Technology Stack

- **Framework:** Next.js 14+ (App Router, React Suspense)
- **Language:** TypeScript
- **Backend & Database:** Firebase (Firestore, Auth)
- **Asset Management:** Cloudinary / ImageKit (for audio & video persistence)
- **Styling:** Custom Vanilla CSS (Dark mode optimized, glassmorphism, fluid micro-animations)
- **Hosting:** Vercel

## Deployment & Setup

### 1. Prerequisites
- Node.js (v20+)
- Firebase Project
- Cloudinary / ImageKit account (for media processing)

### 2. Environment Variables
Create a `.env.local` file with the following:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Firebase Firestore Rules
This app enforces strict 1-on-1 privacy. Be sure to deploy the included `firestore.rules` which protects user data ensuring only paired users can interact with mutual threads and memories:
```bash
firebase deploy --only firestore:rules
```

### 4. Running Locally
```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

## Architecture Highlights
- **Optimistic UI:** Fluid state transitions utilizing React real-time snapshot listeners.
- **No-Index Composite Avoidance:** Advanced client-side merge/sort techniques to minimize Firestore composite index limits when querying complex paired-timelines.
- **Dynamic Layout Reflow:** The Reveal Modal engine dynamically scales its layout hierarchy based on whether a letter contains text, voice, or video.
