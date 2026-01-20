# 🎵 FluxAudio - Cloud Music Player

FluxAudio is a modern, web-based music streaming application built with React/Vite. It streams your personal music library directly from **Cloudflare R2** via **Cloudflare Workers**, hosted on **Firebase Hosting**.

![FluxAudio Screenshot](public/splash_bg.jpg)
*(Replace this with a real screenshot of your app)*

## ✨ Features

- **☁️ Cloud Streaming**: Stream music directly from Cloudflare R2 (Serverless).
- **📱 PWA Ready**: Installable on Android/iOS/Desktop.
- **📥 Offline Mode**: Cache songs locally for offline playback.
- **🎨 Modern UI**: Beautiful, responsive interface with dark mode support.
- **� Firebase Integration**: User authentication and persistent playlists/favorites.

## 🏗️ Architecture

This project uses a serverless architecture to keep costs low and performance high.

- **Storage**: Cloudflare R2 (stores .mp3, .lrc, images)
- **API**: Cloudflare Workers (serves file list and handles secure access)
- **Frontend**: React + Vite (hosted on Firebase Hosting)
- **Database**: Firebase Firestore (User data, playlists)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Cloudflare Account (R2 & Workers)
- Firebase Account

### 1. Clone the Repository

```bash
git clone https://github.com/TatsuyaM2667/FluxAudio-MusicApp.git
cd FluxAudio-MusicApp
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory based on `.env.example`:

```bash
cp .env.example .env
```

Fill in your API keys:

```env
# Cloudflare Workers URL (Your API)
VITE_API_BASE=https://your-worker.your-subdomain.workers.dev

# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
# ... other firebase config
```

### 3. Run Locally

```bash
npm run dev
```

## � Deployment

### Deploy Frontend (Firebase)

```bash
npm run build
firebase deploy --only hosting
```

### Backend Setup (Cloudflare Workers)

You need to deploy a Worker that serves the file list from your R2 bucket.
*(Note: Worker code is not included in this public repo for security. You need a simple Worker that lists R2 bucket contents.)*

## 📱 Mobile App (Capacitor)

FluxAudio is ready for mobile via Capacitor.

```bash
# Sync assets
npm run build
npx cap sync

# Open Android Studio
npx cap open android
```

## � Security Note

This repository does **not** contain:
- Use of hardcoded API keys
- SSL Certificates
- Python management scripts (for R2 uploading)

Please handle your secrets securely.

## 📄 License

This project is licensed under the [MIT License](LICENSE).
