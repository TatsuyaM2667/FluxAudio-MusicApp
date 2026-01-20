# FluxAudio 🎵

モダンな音楽ストリーミングアプリ。ウェブブラウザとAndroidアプリの両方で動作します。

![FluxAudio](https://img.shields.io/badge/FluxAudio-Music%20Player-purple?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)
![Capacitor](https://img.shields.io/badge/Capacitor-7-119EFF?style=flat-square&logo=capacitor)

## ✨ 機能

- 🎵 **ストリーミング再生** - Cloudflare R2からの高品質音楽ストリーミング
- 📱 **クロスプラットフォーム** - Web / Android対応
- 📥 **オフライン再生** - 曲をダウンロードしてオフラインで再生
- 🎤 **歌詞表示** - LRCファイルによる同期歌詞
- ❤️ **お気に入り** - 曲・アーティスト・アルバムをお気に入り登録
- 📝 **プレイリスト** - カスタムプレイリスト作成
- 🔔 **通知** - 新曲追加時の通知
- 🎨 **ダークモード** - ダークモード対応
- 🔐 **Firebase認証** - ユーザーログイン機能

## 🛠️ 技術スタック

| カテゴリ | 技術 |
|---------|------|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Mobile | Capacitor (Android) |
| Auth | Firebase Authentication |
| Database | Firebase Firestore |
| Storage | Cloudflare R2 |
| CDN | Cloudflare Workers |

## 📋 必要条件

- **Node.js** 18+ 
- **npm** 9+
- **Android Studio** (Android APKビルド用)
- **JDK 17+** (Android APKビルド用)

## 🚀 セットアップ

### 1. リポジトリをクローン

```bash
git clone https://github.com/yourusername/esp32-music-web.git
cd esp32-music-web
```

### 2. 依存関係をインストール

```bash
npm install
```

### 3. 環境変数を設定

`.env.example`を`.env`にコピーして、各値を設定します：

```bash
cp .env.example .env
```

`.env`ファイルの内容：

```env
# API Base URL (Cloudflare Workers URL)
VITE_API_BASE=https://your-worker.your-subdomain.workers.dev

# Firebase Configuration
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
```

#### Firebase設定の取得方法

1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. プロジェクトを作成または選択
3. プロジェクト設定 > 全般 > マイアプリ からウェブアプリを追加
4. 表示される設定値を`.env`にコピー

### 4. 開発サーバーを起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開きます。

## 📱 Android APK ビルド

### 必要な環境

1. **Android Studio** をインストール
2. **Android SDK** をセットアップ (Android Studio経由)
3. **JDK 17+** をインストール

### APKビルド手順

```bash
# 1. ウェブアプリをビルドしてCapacitorと同期
npm run build
npx cap sync android

# 2. Android Studioでプロジェクトを開く
npx cap open android

# 3. Android Studioで以下の手順を実行:
#    - Build > Build Bundle(s) / APK(s) > Build APK(s)
#    - または Build > Generate Signed Bundle / APK でリリース用APKを生成
```

### デバッグ用APKの場所

ビルド後、APKは以下の場所に生成されます：
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### エミュレータまたは実機で実行

```bash
npx cap run android
```

## 📁 プロジェクト構造

```
esp32-music-web/
├── src/
│   ├── components/     # UIコンポーネント
│   ├── hooks/          # カスタムフック
│   ├── services/       # サービス（DownloadService等）
│   ├── contexts/       # React Context
│   ├── pages/          # ページコンポーネント
│   ├── types/          # TypeScript型定義
│   ├── utils/          # ユーティリティ関数
│   └── App.tsx         # メインアプリ
├── android/            # Androidプロジェクト
├── public/             # 静的ファイル
├── server.py           # ローカル開発用サーバー
└── worker_fix.js       # Cloudflare Worker
```

## 🔧 スクリプト

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | プロダクションビルド |
| `npm run preview` | ビルドプレビュー |
| `npm run lint` | ESLintチェック |

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 👤 作者

**TatsuyaM**

---

⭐ このプロジェクトが気に入ったらスターをお願いします！
