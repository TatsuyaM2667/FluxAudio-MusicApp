import { APP_TITLE } from "../config";
import { useAuth } from "../contexts/AuthContext";
import { IconHome, IconSearch, IconLibrary, IconMusic, IconHeartFilled, IconPlus, IconUser, IconLogout } from "./Icons";

type SidebarProps = {
    view: string;
    onViewChange: (view: string) => void;
};

export function Sidebar({ view, onViewChange }: SidebarProps) {
    const { logout } = useAuth();

    return (
        <aside className="w-64 flex-col bg-black/40 border-r border-white/5 z-10 hidden md:flex backdrop-blur-xl h-full">
            <div className="p-6">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center gap-2">
                    <IconMusic /> {APP_TITLE}
                </h1>
            </div>
            <nav className="flex-1 px-4 space-y-2">
                <button
                    onClick={() => onViewChange('home')}
                    className={`flex items-center gap-4 w-full p-3 rounded-md transition-all font-medium cursor-pointer text-base ${view === 'home' ? 'text-white bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                >
                    <IconHome size={24} /> ホーム
                </button>
                <button
                    onClick={() => onViewChange('search')}
                    className={`flex items-center gap-4 w-full p-3 rounded-md transition-all font-medium cursor-pointer text-base ${view === 'search' ? 'text-white bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                >
                    <IconSearch size={24} /> 検索
                </button>
                <button
                    onClick={() => onViewChange('library')}
                    className={`flex items-center gap-4 w-full p-3 rounded-md transition-all font-medium cursor-pointer text-base ${view === 'library' ? 'text-white bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                >
                    <IconLibrary size={24} /> ライブラリ
                </button>
                <button
                    onClick={() => onViewChange('mypage')}
                    className={`flex items-center gap-4 w-full p-3 rounded-md transition-all font-medium cursor-pointer text-base ${view === 'mypage' ? 'text-white bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                >
                    <IconUser size={24} /> マイページ
                </button>
            </nav>

            <div className="p-6 border-t border-white/5">
                <div className="flex items-center justify-between group mb-4">
                    <div className="text-sm text-gray-500 font-semibold uppercase tracking-wider">プレイリスト</div>
                    <button className="text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition">
                        <IconPlus />
                    </button>
                </div>
                <div className="space-y-3 text-base text-gray-400 mb-6">
                    <div
                        onClick={() => onViewChange('favorites')}
                        className={`flex items-center gap-2 hover:text-white cursor-pointer transition ${view === 'favorites' ? 'text-green-500' : ''}`}
                    >
                        <div className="bg-gradient-to-br from-indigo-700 to-blue-300 w-6 h-6 flex items-center justify-center rounded-sm">
                            <IconHeartFilled size={16} />
                        </div>
                        お気に入り
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition text-base font-medium w-full"
                >
                    <IconLogout size={20} />
                    ログアウト
                </button>
            </div>
        </aside>
    );
}
