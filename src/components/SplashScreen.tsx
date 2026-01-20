import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
    finishLoading: boolean;
    onAnimationComplete: () => void;
}

export function SplashScreen({ finishLoading, onAnimationComplete }: SplashScreenProps) {
    const [step, setStep] = useState<'loading' | 'exiting'>('loading');

    useEffect(() => {
        if (finishLoading && step === 'loading') {
            setStep('exiting');
        }
    }, [finishLoading, step]);

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden"
                initial={{ opacity: 1 }}
                animate={{
                    opacity: step === 'exiting' ? 0 : 1,
                    pointerEvents: step === 'exiting' ? 'none' : 'auto'
                }}
                transition={{ duration: 0.8, delay: 0.6 }} 
                onAnimationComplete={() => {
                    if (step === 'exiting') {
                        onAnimationComplete();
                    }
                }}
            >
                {/* Background Image */}
                <motion.div
                    className="absolute inset-0 z-0"
                    animate={{
                        scale: step === 'exiting' ? 1.1 : 1, 
                        filter: step === 'exiting' ? 'brightness(1.5)' : 'brightness(1)' 
                    }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                >
                    <img
                        src="/splash_bg.jpg"
                        className="w-full h-full object-cover object-center"
                        alt="Splash Background"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black via-black to-transparent" />
                </motion.div>

                {/* Spinner - Fade out immediately when loading finishes */}
                <AnimatePresence>
                    {step === 'loading' && (
                        <motion.div
                            className="absolute z-10 flex flex-col items-center gap-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.3 } }}
                            style={{ top: '60%' }}
                        >
                            <div className="w-8 h-8 border-4 border-white/20 border-t-white/80 rounded-full animate-spin" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Icon & Text Group */}
                <motion.div
                    className="absolute z-20 flex flex-col items-center gap-3"
                    initial={{
                        bottom: '3rem',
                        top: 'auto',
                        y: 0,
                        scale: 1,
                        opacity: 1,
                        filter: 'brightness(1)'
                    }}
                    animate={step === 'exiting' ? {
                        bottom: 'auto',
                        top: '20%', // 画面より上へ移動
                        y: '-50%',
                        scale: 1.5, // 拡大を強調
                        opacity: 0,
                        filter: 'brightness(20) blur(4px)' 
                    } : {}}
                    transition={{
                        duration: 1.0,
                        ease: [0.22, 1, 0.36, 1] // Custom ease for smooth "launch"
                    }}
                >
                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 overflow-hidden shadow-lg p-0.5">
                        <img src="/creator_icon.jpg" className="w-full h-full object-cover rounded-full" alt="Creator" />
                    </div>
                    <motion.span
                        className="text-white/80 text-xs font-light tracking-widest uppercase"
                        animate={step === 'exiting' ? { opacity: 0, y: 20 } : { opacity: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        Created by Tatsuya.M
                    </motion.span>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
