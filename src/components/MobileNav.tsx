import { IconHome, IconSearch, IconLibrary, IconUser } from "./Icons";

type MobileNavProps = {
    view: string;
    onViewChange: (view: string) => void;
};

export function MobileNav({ view, onViewChange }: MobileNavProps) {
    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-lg border-t border-white/10 z-50 flex justify-around items-center min-h-20 h-auto pb-safe android-safe-bottom">
            <button
                onClick={() => onViewChange('home')}
                className={`flex flex-col items-center justify-center gap-1 w-full h-full py-1 ${view === 'home' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
            >
                <div className="flex items-center justify-center">
                    <IconHome size={24} />
                </div>
                <span className="text-xs font-medium">ホーム</span>
            </button>
            <button
                onClick={() => onViewChange('search')}
                className={`flex flex-col items-center justify-center gap-1 w-full h-full py-1 ${view === 'search' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
            >
                <div className="flex items-center justify-center">
                    <IconSearch size={24} />
                </div>
                <span className="text-xs font-medium">検索</span>
            </button>
            <button
                onClick={() => onViewChange('library')}
                className={`flex flex-col items-center justify-center gap-1 w-full h-full py-1 ${view === 'library' || view === 'favorites' || view === 'playlists' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
            >
                <div className="flex items-center justify-center">
                    <IconLibrary size={24} />
                </div>
                <span className="text-xs font-medium">ライブラリ</span>
            </button>
            <button
                onClick={() => onViewChange('mypage')}
                className={`flex flex-col items-center justify-center gap-1 w-full h-full py-1 ${view === 'mypage' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
            >
                <div className="flex items-center justify-center">
                    <IconUser size={24} />
                </div>
                <span className="text-xs font-medium">マイページ</span>
            </button>
        </div>
    );
}
