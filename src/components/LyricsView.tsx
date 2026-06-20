import { useRef, useMemo, useEffect, memo } from "react";
import { parseLrc, LrcLine } from "../utils/lrcParser";

type LyricsViewProps = {
    rawLrc: string | null;
    currentTime: number;
    scrollable?: boolean;
    onLineClick?: (time: number) => void;
    style?: 'default' | 'handwriting' | 'typing';
};

/**
 * TypingText — Direct DOM manipulation, zero React re-renders.
 * Instead of setState per character, we mutate textContent via ref.
 */
const TypingText = memo(function TypingText({ text, isActive }: { text: string; isActive: boolean }) {
    const spanRef = useRef<HTMLSpanElement>(null);
    const intervalRef = useRef<number>(0);

    useEffect(() => {
        const el = spanRef.current;
        if (!el) return;

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = 0;
        }

        if (!isActive) {
            el.textContent = text;
            return;
        }

        // Reset and animate via direct DOM manipulation
        el.textContent = '';
        let current = 0;
        const total = text.length;
        // Adaptive speed: faster for longer text so animation doesn't lag
        const speed = Math.max(12, Math.min(30, 700 / total));

        intervalRef.current = window.setInterval(() => {
            current++;
            el.textContent = text.slice(0, current);
            if (current >= total) {
                clearInterval(intervalRef.current);
                intervalRef.current = 0;
            }
        }, speed);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = 0;
            }
        };
    }, [text, isActive]);

    return <span ref={spanRef} />;
});

/**
 * HandwritingText — Single GPU-accelerated clip-path animation.
 * Replaces the old per-character <span> approach which created N DOM elements
 * with N separate CSS animations, causing major performance issues.
 */
const HandwritingText = memo(function HandwritingText({ text, isActive }: { text: string; isActive: boolean }) {
    if (!isActive) return <span>{text}</span>;

    return (
        <span
            className="inline-block lyrics-handwriting-reveal"
            key={text} // Force re-mount to restart animation
        >
            {text}
        </span>
    );
});

/**
 * LyricsLine — Memoized individual line component.
 * Only re-renders when isActive or style actually changes, NOT on every currentTime update.
 */
const LyricsLine = memo(function LyricsLine({
    line,
    isActive,
    onClick,
    style,
    lineRef,
}: {
    line: LrcLine;
    isActive: boolean;
    onClick: () => void;
    style: 'default' | 'handwriting' | 'typing';
    lineRef?: React.Ref<HTMLParagraphElement>;
}) {
    const className = style === 'handwriting'
        ? `lyrics-line origin-left font-handwriting ${isActive
            ? 'text-4xl md:text-5xl lg:text-6xl font-bold text-black dark:text-white opacity-100'
            : 'text-3xl md:text-4xl lg:text-5xl font-normal text-gray-500 dark:text-gray-400 opacity-50 hover:opacity-80 cursor-pointer'
        }`
        : `lyrics-line origin-left ${isActive
            ? 'text-3xl md:text-4xl lg:text-5xl font-black text-black dark:text-white opacity-100 tracking-tight leading-tight'
            : 'text-xl md:text-2xl lg:text-3xl font-bold text-gray-600 dark:text-gray-400 opacity-40 hover:opacity-70 cursor-pointer'
        }`;

    let content: React.ReactNode = line.text;
    if (isActive && style === 'typing') {
        content = <TypingText text={line.text} isActive={isActive} />;
    } else if (isActive && style === 'handwriting') {
        content = <HandwritingText text={line.text} isActive={isActive} />;
    }

    return (
        <p
            ref={lineRef}
            className={className}
            style={{
                transform: isActive ? 'scale(1)' : 'scale(0.95)',
                willChange: isActive ? 'transform, opacity' : 'auto',
            }}
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
        >
            {content}
        </p>
    );
});

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
    const lastScrolledIndex = useRef(-1);
    const scrollRafRef = useRef(0);

    // Scroll only when activeIndex actually changes, using RAF for smooth timing
    useEffect(() => {
        if (!scrollable || activeIndex === -1 || activeIndex === lastScrolledIndex.current) return;
        lastScrolledIndex.current = activeIndex;

        if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);

        scrollRafRef.current = requestAnimationFrame(() => {
            const container = scrollRef.current;
            const element = activeRef.current;
            if (!container || !element) return;

            const containerHeight = container.clientHeight;
            const elementTop = element.offsetTop;
            const elementHeight = element.offsetHeight;
            const targetScroll = elementTop - containerHeight / 2 + elementHeight / 2;

            container.scrollTo({
                top: targetScroll,
                behavior: 'smooth',
            });
        });

        return () => {
            if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
        };
    }, [activeIndex, scrollable]);

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
            className={`w-full h-full ${scrollable ? 'overflow-y-auto custom-scrollbar' : 'overflow-hidden'}`}
            ref={scrollRef}
            onPointerDown={(e) => e.stopPropagation()}
        >
            <div className={`py-[50vh] px-6 md:px-10 max-w-3xl mx-auto flex flex-col items-start text-left ${style === 'handwriting' ? 'space-y-4' : 'space-y-6 md:space-y-8'}`}>
                {lines.map((line, i) => (
                    <LyricsLine
                        key={i}
                        line={line}
                        isActive={i === activeIndex}
                        onClick={() => onLineClick?.(line.time)}
                        style={style}
                        lineRef={i === activeIndex ? activeRef : undefined}
                    />
                ))}
            </div>
        </div>
    );
}
