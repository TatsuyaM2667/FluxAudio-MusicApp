import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { IconBrandGoogle, IconMail, IconLock, IconUser, IconMusic } from '@tabler/icons-react';

interface AuthPageProps {
    onClose?: () => void;
}

export function AuthPage({ onClose }: AuthPageProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, signup, loginWithGoogle } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await login(email, password);
            } else {
                await signup(email, password, displayName);
            }
            onClose?.();
        } catch (err: any) {
            console.error('Auth error:', err);
            // Translate Firebase error codes to user-friendly messages
            switch (err.code) {
                case 'auth/invalid-email':
                    setError('メールアドレスの形式が正しくありません');
                    break;
                case 'auth/user-disabled':
                    setError('このアカウントは無効になっています');
                    break;
                case 'auth/user-not-found':
                    setError('アカウントが見つかりません');
                    break;
                case 'auth/wrong-password':
                    setError('パスワードが正しくありません');
                    break;
                case 'auth/email-already-in-use':
                    setError('このメールアドレスは既に使用されています');
                    break;
                case 'auth/weak-password':
                    setError('パスワードは6文字以上にしてください');
                    break;
                case 'auth/invalid-credential':
                    setError('メールアドレスまたはパスワードが正しくありません');
                    break;
                default:
                    setError('認証に失敗しました。もう一度お試しください');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            await loginWithGoogle();
            onClose?.();
        } catch (err: any) {
            console.error('Google auth error:', err);
            if (err.code === 'auth/popup-closed-by-user') {
                setError('ログインがキャンセルされました');
            } else {
                setError('Googleログインに失敗しました');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-black overflow-y-auto">
            <div className="min-h-full flex items-center justify-center p-4 py-8">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-4 shadow-xl shadow-purple-500/30">
                            <IconMusic size={40} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">FluxAudio</h1>
                        <p className="text-gray-400">
                            {isLogin ? 'アカウントにログイン' : '新規アカウント作成'}
                        </p>
                    </div>

                    {/* Auth Card */}
                    <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
                        {/* Toggle Tabs */}
                        <div className="flex mb-6 bg-black/20 rounded-xl p-1">
                            <button
                                type="button"
                                onClick={() => setIsLogin(true)}
                                className={`flex-1 py-3 rounded-lg font-medium transition-all ${isLogin
                                    ? 'bg-white text-black shadow-lg'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                ログイン
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsLogin(false)}
                                className={`flex-1 py-3 rounded-lg font-medium transition-all ${!isLogin
                                    ? 'bg-white text-black shadow-lg'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                新規登録
                            </button>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Display Name (only for signup) */}
                            {!isLogin && (
                                <div className="relative">
                                    <IconUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        placeholder="表示名"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                                    />
                                </div>
                            )}

                            {/* Email */}
                            <div className="relative">
                                <IconMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="email"
                                    placeholder="メールアドレス"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full pl-12 pr-4 py-4 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                                />
                            </div>

                            {/* Password */}
                            <div className="relative">
                                <IconLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="password"
                                    placeholder="パスワード"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="w-full pl-12 pr-4 py-4 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        処理中...
                                    </span>
                                ) : (
                                    isLogin ? 'ログイン' : '新規登録'
                                )}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="flex items-center my-6">
                            <div className="flex-1 border-t border-white/10"></div>
                            <span className="px-4 text-gray-500 text-sm">または</span>
                            <div className="flex-1 border-t border-white/10"></div>
                        </div>

                        {/* Google Login */}
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full py-4 bg-white hover:bg-gray-100 text-gray-800 font-medium rounded-xl flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <IconBrandGoogle size={20} />
                            Googleでログイン
                        </button>

                        {/* Skip Login */}
                        {onClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full mt-4 py-3 text-gray-400 hover:text-white transition-colors text-sm"
                            >
                                ログインせずに続ける（一部機能が制限されます）
                            </button>
                        )}
                    </div>

                    {/* Footer */}
                    <p className="text-center text-gray-500 text-sm mt-6">
                        ログインすると、プレイリストや再生履歴が保存されます
                    </p>
                </div>
            </div>
        </div>
    );
}
