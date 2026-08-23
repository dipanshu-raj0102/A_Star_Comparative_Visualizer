import { useState, useEffect, useRef, useCallback } from 'react';

export const useAnimationEngine = (initialSpeedMs: number = 25) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [speedMs, setSpeedMs] = useState(initialSpeedMs);
  const [maxSteps, setMaxSteps] = useState(0);

  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  const animate = useCallback((time: number) => {
    if (lastTimeRef.current !== undefined) {
      const deltaTime = time - lastTimeRef.current;
      
      // Calculate how many frames to advance based on deltaTime and speedMs
      // This ensures smooth playback even if the browser drops frames
      if (deltaTime >= speedMs) {
        // If speed is extremely fast (e.g., 1ms), we might need to jump multiple steps
        const stepsToAdvance = Math.max(1, Math.floor(deltaTime / Math.max(1, speedMs)));
        
        setCurrentStep(prevStep => {
          const nextStep = prevStep + stepsToAdvance;
          if (nextStep >= maxSteps - 1) {
            setIsPlaying(false);
            return Math.max(0, maxSteps - 1);
          }
          return nextStep;
        });
        
        // Update last time by the exact chunk of time consumed
        lastTimeRef.current = time - (deltaTime % Math.max(1, speedMs));
      }
    } else {
      lastTimeRef.current = time;
    }
    
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    }
  }, [maxSteps, speedMs, isPlaying]);

  useEffect(() => {
    if (isPlaying && maxSteps > 0) {
      if (currentStep >= maxSteps - 1) {
        setIsPlaying(false);
      } else {
        requestRef.current = requestAnimationFrame(animate);
      }
    }
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      lastTimeRef.current = undefined;
    };
  }, [isPlaying, animate, currentStep, maxSteps]);

  // Controls
  const play = () => {
    if (maxSteps === 0) return;
    if (currentStep >= maxSteps - 1) {
      setCurrentStep(0);
    }
    setIsPlaying(true);
  };
  
  const pause = () => {
    setIsPlaying(false);
    lastTimeRef.current = undefined;
  };
  
  const togglePlay = () => isPlaying ? pause() : play();
  
  const stepForward = () => {
    pause();
    setCurrentStep(p => Math.min(p + 1, maxSteps > 0 ? maxSteps - 1 : 0));
  };
  
  const stepBackward = () => {
    pause();
    setCurrentStep(p => Math.max(p - 1, 0));
  };
  
  const reset = () => {
    pause();
    setCurrentStep(0);
  };

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
