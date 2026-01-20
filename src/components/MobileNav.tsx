import { IconHome, IconSearch, IconLibrary, IconUser } from "./Icons";

type MobileNavProps = {
    view: string;
    onViewChange: (view: string) => void;
};

export function MobileNav({ view, onViewChange }: MobileNavProps) {
    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-lg border-t border-white/10 z-50 flex justify-around items-center h-16 pb-safe">
            <button
                onClick={() => onViewChange('home')}
                className={`flex flex-col items-center justify-center space-y-1 w-full h-full ${view === 'home' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
            >
                <IconHome />
                <span className="text-[10px]">ホーム</span>
            </button>
            <button
                onClick={() => onViewChange('search')}
                className={`flex flex-col items-center justify-center space-y-1 w-full h-full ${view === 'search' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
            >
                <IconSearch />
                <span className="text-[10px]">検索</span>
            </button>
            <button
                onClick={() => onViewChange('library')}
                className={`flex flex-col items-center justify-center space-y-1 w-full h-full ${view === 'library' || view === 'favorites' || view === 'playlists' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
            >
                <IconLibrary />
                <span className="text-[10px]">ライブラリ</span>
            </button>
            <button
                onClick={() => onViewChange('mypage')}
                className={`flex flex-col items-center justify-center space-y-1 w-full h-full ${view === 'mypage' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
            >
                <IconUser />
                <span className="text-[10px]">マイページ</span>
            </button>
        </div>
    );
}
