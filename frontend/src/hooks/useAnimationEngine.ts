import { useState, useEffect, useRef, useCallback } from 'react';

export const useAnimationEngine = (initialSpeedMs: number = 25) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [speedMs, setSpeedMs] = useState(initialSpeedMs);
  const [maxSteps, setMaxSteps] = useState(0);

  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);

  const animate = useCallback((time: number) => {
    if (!isPlayingRef.current || maxSteps <= 0) return;

    if (lastTimeRef.current === null) {
      lastTimeRef.current = time;
    } else {
      const deltaTime = time - lastTimeRef.current;
      const frameDuration = Math.max(1, speedMs);

      // Advance by whole frames so slow devices do not make playback drift.
      if (deltaTime >= frameDuration) {
        const stepsToAdvance = Math.max(1, Math.floor(deltaTime / frameDuration));
        lastTimeRef.current = time - (deltaTime % frameDuration);

        setCurrentStep((prevStep) => {
          const nextStep = prevStep + stepsToAdvance;
          if (nextStep >= maxSteps - 1) {
            isPlayingRef.current = false;
            setIsPlaying(false);
            return Math.max(0, maxSteps - 1);
          }
          return nextStep;
        });
      }
    }

    if (isPlayingRef.current) {
      requestRef.current = requestAnimationFrame(animate);
    }
  }, [maxSteps, speedMs]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;

    if (isPlaying && maxSteps > 0) {
      if (currentStep >= maxSteps - 1) {
        isPlayingRef.current = false;
        setIsPlaying(false);
      } else {
        lastTimeRef.current = null;
        requestRef.current = requestAnimationFrame(animate);
      }
    }
    
    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      lastTimeRef.current = null;
    };
  }, [isPlaying, animate, maxSteps]);

  // Controls
  const play = useCallback(() => {
    if (maxSteps === 0) return;
    if (currentStep >= maxSteps - 1) {
      setCurrentStep(0);
    }
    isPlayingRef.current = true;
    setIsPlaying(true);
  }, [currentStep, maxSteps]);
  
  const pause = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    lastTimeRef.current = null;
  }, []);
  
  const togglePlay = useCallback(() => isPlaying ? pause() : play(), [isPlaying, pause, play]);
  
  const stepForward = useCallback(() => {
    pause();
    setCurrentStep(p => Math.min(p + 1, maxSteps > 0 ? maxSteps - 1 : 0));
  }, [maxSteps, pause]);
  
  const stepBackward = useCallback(() => {
    pause();
    setCurrentStep(p => Math.max(p - 1, 0));
  }, [pause]);
  
  const reset = useCallback(() => {
    pause();
    setCurrentStep(0);
  }, [pause]);

  return {
    currentStep,
    isPlaying,
    maxSteps,
    speedMs,
    play,
    pause,
    togglePlay,
    stepForward,
    stepBackward,
    reset,
    setSpeedMs,
    setMaxSteps,
    setCurrentStep
  };
};
