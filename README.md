# 🎵 FluxAudio - Cloud Music Player

FluxAudioは、ReactとViteで構築されたモダンなWebベースの音楽ストリーミングアプリケーションです。**Cloudflare R2** に保存された個人の音楽ライブラリを、**Cloudflare Workers** を介してストリーミング再生し、Webアプリは **Firebase Hosting** 上で動作します。

![FluxAudio Screenshot](public/splash_bg.jpg)
*(ここに実際のアプリのスクリーンショットを配置してください)*

## ✨ 主な機能

- **☁️ クラウドストリーミング**: Cloudflare R2からサーバーレスで楽曲を直接ストリーミング再生。
- **📱 PWA対応**: Android、iOS、PCにアプリとしてインストール可能。
- **📥 オフラインモード**: 楽曲をローカルにキャッシュし、オフラインでも再生可能。
- **🎨 モダンUI**: ダークモードに対応した、美しくレスポンシブなインターフェース。
- **🔥 Firebase連携**: ユーザー認証、プレイリストや「お気に入り」のクラウド同期。

## 🏗️ アーキテクチャ

このプロジェクトは、低コストかつ高性能なサーバーレスアーキテクチャを採用しています。

- **ストレージ**: Cloudflare R2 (MP3, LRC歌詞ファイル, 画像などを保存)
- **API**: Cloudflare Workers (ファイルリストの取得とセキュアなアクセス制御)
- **フロントエンド**: React + Vite (Firebase Hostingでホスティング)
- **データベース**: Firebase Firestore (ユーザーデータ、プレイリスト管理)

## 🚀 始め方

### 前提条件

- Node.js (v18以上)
- Cloudflare アカウント (R2 & Workers)
- Firebase アカウント

### 1. リポジトリのクローン

```bash
git clone https://github.com/TatsuyaM2667/FluxAudio-MusicApp.git
cd FluxAudio-MusicApp
npm install
```

### 2. 環境設定

`.env.example` をコピーして `.env` ファイルを作成します：

```bash
cp .env.example .env
```

ご自身のAPIキーなどを記入してください：

```env
# Cloudflare Workers URL (APIエンドポイント)
VITE_API_BASE=https://your-worker.your-subdomain.workers.dev

# Firebase 設定
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
# ... その他必要なキー
```

### 3. ローカル実行

```bash
npm run dev
```

## 📦 デプロイ

### フロントエンド (Firebase Hosting)

```bash
npm run build
firebase deploy --only hosting
```

### バックエンド設定 (Cloudflare Workers)

R2バケット内のファイルリストをJSON形式で返すWorkerをデプロイする必要があります。
*(セキュリティの観点から、このパブリックリポジトリにはWorkerのコードやR2アップロード用スクリプトは含まれていません。ご自身の環境に合わせて実装してください。)*

## 📱 モバイルアプリ化 (Capacitor)

Capacitorを使用して、簡単にモバイルアプリ（APK/IPA）をビルドできます。

```bash
# ビルドとアセット同期
npm run build
npx cap sync

# Android Studioを開く
npx cap open android
```

## 🔒 セキュリティについて

この公開リポジトリには、以下の機密情報は**含まれていません**：
- ハードコードされたAPIキーやシークレット
- SSL証明書や秘密鍵
- 管理用Pythonスクリプト（R2へのアップロードツールなど）

クローンして利用する際は、ご自身の所有するキーを `.env` で管理し、機密情報をコミットしないようご注意ください。

## 📄 ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。
