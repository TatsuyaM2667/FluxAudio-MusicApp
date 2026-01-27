import { useRef, useMemo, useEffect, useState } from "react";
import { parseLrc } from "../utils/lrcParser";

type LyricsViewProps = {
    rawLrc: string | null;
    currentTime: number;
    scrollable?: boolean;
    onLineClick?: (time: number) => void;
    style?: 'default' | 'handwriting' | 'typing';
};

const TypingText = ({ text, isActive }: { text: string, isActive: boolean }) => {
    // If not active, just return text (or keep it fully visible if previously active? Usually current line only)
    // Actually when a line becomes active, we want to type it.
    // When it becomes inactive (past), we want it fully visible.
    // When it is future, we want it fully visible? Or hidden?
    // Standard lyrics view: previous/next lines are visible but dim.
    // So 'Typing' applies only when it BECOMES active.

    // If we want typing effect, we should probably output characters with delays.
    // We can use a CSS animation or React state.

    // Simple React state approach
    const [displayLength, setDisplayLength] = useState(0);

    useEffect(() => {
        if (!isActive) {
            setDisplayLength(text.length); // Show full text if not active (or passed)
            return;
        }

        // Reset and animate
        setDisplayLength(0);
        let current = 0;
        const total = text.length;
        // Adjust speed based on text length, max duration e.g. 1s or 2s?
        // Or fixed speed? e.g. 30ms per char.
        const speed = 20;

        const interval = setInterval(() => {
            current += 1;
            setDisplayLength(current);
            if (current >= total) clearInterval(interval);
        }, speed);

        return () => clearInterval(interval);
    }, [text, isActive]);

    // If we toggle 'typing' style on/off, we need to handle that in parent. 
    // This component assumes it is used when 'typing' style is requested.

    // However, the prompt says "Typing style display".
    // Maybe the user wants a SPECIFIC 'typing' style mode like 'handwriting'.
    // Yes, added 'typing' to style prop.

    return <span>{text.slice(0, displayLength)}</span>;
};


// Handwriting Effect: Characters fade in with a slight delay and scale effect
const HandwritingText = ({ text, isActive }: { text: string, isActive: boolean }) => {
    if (!isActive) return <span>{text}</span>;

    return (
        <span>
            {text.split('').map((char, index) => (
                <span
                    key={index}
                    className="inline-block opacity-0 animate-write-in origin-bottom"
                    style={{ animationDelay: `${index * 0.05}s` }}
                >
                    {char === ' ' ? '\u00A0' : char}
                </span>
            ))}
        </span>
    );
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

        // Use default/typing style base
        // Typing style just affects HOW the text appears, maybe font is same as default?
        // Or monospace? "Typing style" -> Typewriter? 'font-mono'?
        // The user says "Typing style display" (タイピング風の表示). This usually implies the animation, not necessarily the font.
        // But let's use a nice mono font if style is 'typing' ?
        // Actually, user said "lyrics display, typing style EFFECT".
        // Let's stick to the animation logic mainly.

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
            onPointerDown={(e) => e.stopPropagation()}
        >
            <div className={`py-[50vh] px-6 md:px-10 max-w-3xl mx-auto flex flex-col items-start text-left ${style === 'handwriting' ? 'space-y-4' : 'space-y-6 md:space-y-8'}`}>
                {lines.map((line, i) => {
                    const isActive = i === activeIndex;

                    // Determine content based on style
                    let content: React.ReactNode = line.text;

                    if (isActive) {
                        if (style === 'typing') {
                            content = <TypingText text={line.text} isActive={isActive} />;
                        } else if (style === 'handwriting') {
                            content = <HandwritingText text={line.text} isActive={isActive} />;
                        }
                    }

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
                            {content}
                        </p>
                    );
                })}
            </div>
        </div>
    );
}
