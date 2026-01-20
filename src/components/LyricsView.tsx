import { useRef, useMemo, useEffect } from "react";
import { parseLrc } from "../utils/lrcParser";

type LyricsViewProps = {
    rawLrc: string | null;
    currentTime: number;
    scrollable?: boolean;
    onLineClick?: (time: number) => void;
    style?: 'default' | 'handwriting';
};

export function LyricsView({ rawLrc, currentTime, scrollable = true, onLineClick, style = 'default' }: LyricsViewProps) {
    const lines = useMemo(() => (rawLrc ? parseLrc(rawLrc) : []), [rawLrc]);
    const activeIndex = useMemo(() => {
        if (!lines.length) return -1;
        for (let i = lines.length - 1; i >= 0; i--) {
            if (currentTime >= lines[i].time) {
                return i;
            }
        }
        return -1;
    }, [lines, currentTime]);

    const scrollRef = useRef<HTMLDivElement>(null);
    const activeRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        if (scrollable && activeRef.current && scrollRef.current) {
            activeRef.current.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        }
    }, [activeIndex, scrollable]);

    const getLineClassName = (isActive: boolean) => {
        const baseStyle = 'transform transition-all duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] origin-left';
        if (style === 'handwriting') {
            return `${baseStyle} font-handwriting ${isActive
                ? 'text-4xl md:text-5xl lg:text-6xl font-bold text-black dark:text-white scale-100 opacity-100'
                : 'text-3xl md:text-4xl lg:text-5xl font-normal text-gray-500 dark:text-gray-400 scale-95 opacity-50 hover:opacity-80 cursor-pointer'
                }`;
        }
        // Default style
        return `${baseStyle} ${isActive
            ? 'text-3xl md:text-4xl lg:text-5xl font-black text-black dark:text-white scale-100 opacity-100 blur-none tracking-tight leading-tight'
            : 'text-xl md:text-2xl lg:text-3xl font-bold text-gray-600 dark:text-gray-400 scale-95 opacity-40 blur-[1px] hover:opacity-70 cursor-pointer hover:scale-100 hover:blur-none'
            }`;
    };

    if (!rawLrc) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500/50">
                <p className="text-lg font-bold">No lyrics available</p>
            </div>
        );
    }

    if (!lines.length) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500/50">
                <p className="text-lg font-bold">Unable to parse lyrics</p>
            </div>
        );
    }

    return (
        <div
            className={`w-full h-full ${scrollable ? 'overflow-y-auto custom-scrollbar' : 'overflow-hidden'} transition-colors duration-500`}
            ref={scrollRef}
            onPointerDown={(e) => e.stopPropagation()} // Fix: Prevent drag conflict
        >
            <div className={`py-[50vh] px-6 md:px-10 max-w-3xl mx-auto flex flex-col items-start text-left ${style === 'handwriting' ? 'space-y-4' : 'space-y-6 md:space-y-8'}`}>
                {lines.map((line, i) => {
                    const isActive = i === activeIndex;
                    return (
                        <p
                            key={i}
                            ref={isActive ? activeRef : null}
                            className={getLineClassName(isActive)}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onLineClick) onLineClick(line.time);
                            }}
                        >
                            {line.text}
                        </p>
                    );
                })}
            </div>
        </div>
    );
}
