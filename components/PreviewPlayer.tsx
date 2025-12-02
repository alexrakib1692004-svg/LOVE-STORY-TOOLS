
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, RotateCcw, Download, Loader2, Volume2, AlertCircle, MessageCircle, FileVideo, Edit3 } from 'lucide-react';
import { VideoConfig } from '../types';

interface PreviewPlayerProps {
  config: VideoConfig;
  onChange?: (newConfig: VideoConfig) => void;
}

// Background Worker Code to prevent throttling when tab is inactive
const WORKER_CODE = `
  let intervalId;
  self.onmessage = function(e) {
    if (e.data.action === 'start') {
      const interval = 1000 / e.data.fps;
      intervalId = setInterval(() => {
        postMessage('tick');
      }, interval);
    } else if (e.data.action === 'stop') {
      clearInterval(intervalId);
    }
  };
`;

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({ config, onChange }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const bgMusicRef = useRef<HTMLAudioElement>(null);
  const lastTimeRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const watermarkImageRef = useRef<HTMLImageElement | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  
  // Time tracking ref for sync access in loops
  const currentTimeRef = useRef(0);
  const workerRef = useRef<Worker | null>(null);

  // Dragging State
  const isDraggingRef = useRef(false);
  const draggingTargetRef = useRef<'logo' | 'watermarkImage' | 'watermarkText' | null>(null);
  const dragStartRef = useRef<{x: number, y: number}>({ x: 0, y: 0 });
  const initialPosRef = useRef<{x: number, y: number}>({ x: 0, y: 0 });

  // Audio Engine Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const mainAudioGainNodeRef = useRef<GainNode | null>(null);
  const monitorGainNodeRef = useRef<GainNode | null>(null);
  const bgMusicSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const bgMusicGainNodeRef = useRef<GainNode | null>(null);
  const bgMusicMonitorGainNodeRef = useRef<GainNode | null>(null);
  const destNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // --- Dynamic Aspect Ratio ---
  const getCanvasDimensions = () => {
    switch (config.aspectRatio) {
        case '9:16': return { w: 1080, h: 1920 };
        case '1:1': return { w: 1080, h: 1080 };
        case '4:5': return { w: 1080, h: 1350 };
        case '16:9': default: return { w: 1920, h: 1080 };
    }
  };
  const { w: CANVAS_WIDTH, h: CANVAS_HEIGHT } = getCanvasDimensions();
  const PADDING_X = CANVAS_WIDTH * 0.05; 

  // --- Prevent Tab Close Warning ---
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (isExporting) {
            e.preventDefault();
            e.returnValue = ''; // Chrome requires this
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isExporting]);

  // --- Font Loading ---
  useEffect(() => {
    document.fonts.ready.then(() => {
      setFontsLoaded(true);
    });
  }, []);

  // --- Text Layout Engine ---
  const lines = useMemo(() => {
    if (!fontsLoaded && document.fonts.status !== 'loaded') {}

    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return [];

    const fontName = config.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
    ctx.font = `${config.isBold ? 'bold' : 'normal'} ${config.fontSize}px "${fontName}"`;
    
    const sanitizedScript = config.script.replace(/\*+/g, '');
    const rawLines = sanitizedScript.split('\n');
    const finalLines: { segments: { text: string; width: number }[]; width: number }[] = [];
    const maxWidth = CANVAS_WIDTH - (PADDING_X * 2);

    rawLines.forEach((line) => {
      if (line === '') {
        finalLines.push({ segments: [], width: 0 });
        return;
      }
      
      const lineSegments: { text: string; width: number }[] = [];
      const parts = line.split(/(\s+)/);
      
      parts.forEach(part => {
        if (part === '') return;
        const width = ctx.measureText(part).width;
        lineSegments.push({ text: part, width });
      });

      let currentLine: { text: string; width: number }[] = [];
      let currentWidth = 0;

      lineSegments.forEach((seg) => {
        if (seg.text === '\n') return;

        if (currentWidth + seg.width > maxWidth && seg.text.trim().length > 0) {
            finalLines.push({ segments: currentLine, width: currentWidth });
            currentLine = [];
            currentWidth = 0;
        }

        currentLine.push(seg);
        currentWidth += seg.width;
      });

      if (currentLine.length > 0) {
          finalLines.push({ segments: currentLine, width: currentWidth });
      }
    });

    return finalLines;
  }, [config.script, config.fontSize, config.fontFamily, config.isBold, fontsLoaded, CANVAS_WIDTH, PADDING_X]);

  const totalTextHeight = lines.length * (config.fontSize * config.lineHeight);

  // --- Auto Scroll Speed Calculation ---
  const calculatedAutoSpeed = useMemo(() => {
      if (config.autoScrollSpeed && audioDuration > 0) {
          const totalDistance = totalTextHeight + CANVAS_HEIGHT;
          const speed = totalDistance / audioDuration;
          return Math.max(speed, 10);
      }
      return config.scrollSpeed;
  }, [config.autoScrollSpeed, audioDuration, totalTextHeight, CANVAS_HEIGHT, config.scrollSpeed]);

  const effectiveScrollSpeed = config.autoScrollSpeed ? calculatedAutoSpeed : config.scrollSpeed;
  
  // Calculate Max Duration
  const totalDistance = totalTextHeight + CANVAS_HEIGHT; 
  const visualDuration = totalDistance / (effectiveScrollSpeed || 50);
  const maxDuration = config.audioUrl && audioDuration > 0 ? audioDuration : visualDuration;

  // --- Image Loaders ---
  useEffect(() => {
    if (config.backgroundImage) {
      const img = new Image();
      img.src = config.backgroundImage;
      img.onload = () => { bgImageRef.current = img; renderFrame(currentTime); };
    } else {
      bgImageRef.current = null;
      renderFrame(currentTime);
    }
  }, [config.backgroundImage]);

   useEffect(() => {
    if (config.watermarkUrl) {
      const img = new Image();
      img.src = config.watermarkUrl;
      img.onload = () => { watermarkImageRef.current = img; renderFrame(currentTime); };
    } else {
      watermarkImageRef.current = null;
      renderFrame(currentTime);
    }
  }, [config.watermarkUrl]);

  useEffect(() => {
    if (config.logoUrl) {
      const img = new Image();
      img.src = config.logoUrl;
      img.onload = () => { logoImageRef.current = img; renderFrame(currentTime); };
    } else {
      logoImageRef.current = null;
      renderFrame(currentTime);
    }
  }, [config.logoUrl]);

  // --- Audio Engine Setup ---
  useEffect(() => {
    if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContext();
    }

    const ctx = audioContextRef.current;
    if (!ctx) return;

    if (!destNodeRef.current) {
        destNodeRef.current = ctx.createMediaStreamDestination();
    }
    
    if (!monitorGainNodeRef.current) {
        monitorGainNodeRef.current = ctx.createGain();
        monitorGainNodeRef.current.gain.value = 0.95; 
        monitorGainNodeRef.current.connect(ctx.destination);
    }

    if (!mainAudioGainNodeRef.current) {
        mainAudioGainNodeRef.current = ctx.createGain();
        mainAudioGainNodeRef.current.gain.value = config.mainAudioVolume ?? 1.0;
    }

    // Main Audio Route
    const mainAudio = audioRef.current;
    if (config.audioUrl && mainAudio) {
        if (!sourceNodeRef.current) {
            try { sourceNodeRef.current = ctx.createMediaElementSource(mainAudio); } catch (e) {}
        }
        
        if (sourceNodeRef.current && mainAudioGainNodeRef.current) {
            try { sourceNodeRef.current.disconnect(); } catch (e) {}
            try { mainAudioGainNodeRef.current.disconnect(); } catch (e) {}

            sourceNodeRef.current.connect(mainAudioGainNodeRef.current);

            if (monitorGainNodeRef.current) {
                mainAudioGainNodeRef.current.connect(monitorGainNodeRef.current);
            }
            if (destNodeRef.current) {
                mainAudioGainNodeRef.current.connect(destNodeRef.current);
            }
        }
    }

    // Background Music Route
    const bgMusic = bgMusicRef.current;
    if (config.bgMusicUrl && bgMusic) {
        if (!bgMusicSourceNodeRef.current) {
             try { bgMusicSourceNodeRef.current = ctx.createMediaElementSource(bgMusic); } catch(e) {}
        }
        if (!bgMusicGainNodeRef.current) {
             bgMusicGainNodeRef.current = ctx.createGain();
        }
        if (!bgMusicMonitorGainNodeRef.current) {
            bgMusicMonitorGainNodeRef.current = ctx.createGain();
            bgMusicMonitorGainNodeRef.current.connect(ctx.destination);
        }

        if (bgMusicGainNodeRef.current) {
            bgMusicGainNodeRef.current.gain.value = config.bgMusicVolume;
        }
        if (bgMusicMonitorGainNodeRef.current) {
             bgMusicMonitorGainNodeRef.current.gain.value = config.bgMusicVolume;
        }

        if (bgMusicSourceNodeRef.current && bgMusicGainNodeRef.current) {
             try { bgMusicSourceNodeRef.current.disconnect(); } catch(e) {}
             
             bgMusicSourceNodeRef.current.connect(bgMusicGainNodeRef.current);
             if (destNodeRef.current) bgMusicGainNodeRef.current.connect(destNodeRef.current);

             if (bgMusicMonitorGainNodeRef.current) {
                 bgMusicSourceNodeRef.current.connect(bgMusicMonitorGainNodeRef.current);
             }
        }
    }
  }, [config.audioUrl, config.bgMusicUrl]);

  // --- Volume Control Effect ---
  useEffect(() => {
     if (bgMusicGainNodeRef.current) {
         bgMusicGainNodeRef.current.gain.value = config.bgMusicVolume;
     }
     if (bgMusicMonitorGainNodeRef.current) {
         bgMusicMonitorGainNodeRef.current.gain.value = config.bgMusicVolume;
     }
     if (mainAudioGainNodeRef.current) {
         mainAudioGainNodeRef.current.gain.value = config.mainAudioVolume ?? 1.0;
     }
  }, [config.bgMusicVolume, config.mainAudioVolume]);

  // --- Mute Monitor During Export Effect ---
  useEffect(() => {
      const ctx = audioContextRef.current;
      if (!ctx) return;

      const shouldMute = isExporting && config.muteOnExport;
      const targetGain = shouldMute ? 0 : 0.95; 
      const rampTime = 0.1;

      if (monitorGainNodeRef.current) {
          monitorGainNodeRef.current.gain.setTargetAtTime(targetGain, ctx.currentTime, rampTime);
      }
      if (bgMusicMonitorGainNodeRef.current) {
          const bgTarget = shouldMute ? 0 : config.bgMusicVolume;
          bgMusicMonitorGainNodeRef.current.gain.setTargetAtTime(bgTarget, ctx.currentTime, rampTime);
      }
      
  }, [isExporting, config.muteOnExport, config.bgMusicVolume]);

  // --- Sync Audio Elements ---
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (config.audioUrl) {
        audio.src = config.audioUrl;
        audio.load();
        setAudioError(false);
        setIsAudioReady(false); 
    } else {
        audio.removeAttribute('src');
        audio.load();
        setAudioDuration(0);
        setIsAudioReady(false);
        setAudioError(false);
        setCurrentTime(0);
        setIsPlaying(false);
    }
  }, [config.audioUrl]);

  useEffect(() => {
      const bgAudio = bgMusicRef.current;
      if (!bgAudio) return;
      if (config.bgMusicUrl) {
          bgAudio.src = config.bgMusicUrl;
          bgAudio.loop = true;
          bgAudio.load();
      } else {
          bgAudio.removeAttribute('src');
          bgAudio.load();
      }
  }, [config.bgMusicUrl]);

  // --- Render Frame Function ---
  const renderFrame = (time: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.globalCompositeOperation = 'source-over';
    
    // 1. Background
    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (config.backgroundImage && bgImageRef.current) {
       const img = bgImageRef.current;
       const scale = Math.max(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height);
       const x = (CANVAS_WIDTH / 2) - (img.width / 2) * scale;
       const y = (CANVAS_HEIGHT / 2) - (img.height / 2) * scale;
       ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    }

    const drawImageElement = (img: HTMLImageElement, x: number, y: number, scale: number, opacity: number) => {
        const wWidth = img.width * scale;
        const wHeight = img.height * scale;
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.shadowColor = 'transparent';
        ctx.drawImage(img, x, y, wWidth, wHeight);
        ctx.restore();
    };

    const drawTextWatermark = () => {
        if (!config.watermarkText) return;
        ctx.save();
        ctx.globalAlpha = config.watermarkTextOpacity;
        ctx.fillStyle = config.watermarkTextColor;
        ctx.font = `bold ${config.watermarkTextFontSize}px 'Inter', sans-serif`;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        ctx.shadowColor = 'transparent';
        ctx.fillText(config.watermarkText, config.watermarkTextX, config.watermarkTextY);
        ctx.restore();
    };

    // 2. Back Watermarks
    if (config.watermarkUrl && watermarkImageRef.current && config.watermarkLayer === 'back') {
        drawImageElement(watermarkImageRef.current, config.watermarkX, config.watermarkY, config.watermarkScale, config.watermarkOpacity);
    }
    if (config.watermarkText && config.watermarkTextLayer === 'back') {
        drawTextWatermark();
    }

    // 3. Main Text
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.textAlign = 'left'; 
    ctx.textBaseline = 'top';
    const fontName = config.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
    ctx.font = `${config.isBold ? 'bold' : 'normal'} ${config.fontSize}px "${fontName}"`;
    
    const scrollY = CANVAS_HEIGHT - (time * effectiveScrollSpeed);
    let yPos = scrollY;
    const lineHeight = config.fontSize * config.lineHeight;
    const centerX = CANVAS_WIDTH / 2;
    
    lines.forEach((line) => {
      if (yPos + lineHeight > 0 && yPos <= CANVAS_HEIGHT) {
        let xPos = PADDING_X; 
        if (config.textAlign === 'center') {
            xPos = centerX - (line.width / 2);
        } else if (config.textAlign === 'right') {
            xPos = (CANVAS_WIDTH - PADDING_X) - line.width;
        }

        line.segments.forEach(seg => {
          ctx.fillStyle = config.textColor;
          ctx.fillText(seg.text, xPos, yPos);
          xPos += seg.width;
        });
      }
      yPos += lineHeight;
    });

    // 4. Front Watermarks
    if (config.watermarkUrl && watermarkImageRef.current && config.watermarkLayer === 'front') {
        drawImageElement(watermarkImageRef.current, config.watermarkX, config.watermarkY, config.watermarkScale, config.watermarkOpacity);
    }
    if (config.watermarkText && config.watermarkTextLayer === 'front') {
        drawTextWatermark();
    }

    // 5. Logo
    if (config.logoUrl && logoImageRef.current) {
        drawImageElement(logoImageRef.current, config.logoX, config.logoY, config.logoScale, config.logoOpacity);
    }

    // 6. Ticker
    if (config.tickerText) {
        const tickerFontSize = config.tickerFontSize || 40;
        const tickerPadding = 20;
        const tickerHeight = tickerFontSize + (tickerPadding * 2);
        const tickerY = CANVAS_HEIGHT - tickerHeight;

        ctx.fillStyle = config.tickerBgColor;
        ctx.shadowColor = 'transparent'; 
        ctx.fillRect(0, tickerY, CANVAS_WIDTH, tickerHeight);
        ctx.fillStyle = config.tickerColor; 
        ctx.fillRect(0, tickerY, CANVAS_WIDTH, 4);

        ctx.fillStyle = config.tickerColor;
        ctx.font = `bold ${tickerFontSize}px "Hind Siliguri", sans-serif`; 
        ctx.textBaseline = 'middle';
        
        const textMetrics = ctx.measureText(config.tickerText);
        const textWidth = textMetrics.width;
        const gap = 300; 
        const loopWidth = textWidth + gap;
        const tickerSpeed = config.tickerSpeed;
        
        const shift = (time * tickerSpeed) % loopWidth;
        const startX = CANVAS_WIDTH - shift;

        ctx.fillText(config.tickerText, startX, tickerY + (tickerHeight / 2));
        ctx.fillText(config.tickerText, startX + loopWidth, tickerY + (tickerHeight / 2));
        ctx.fillText(config.tickerText, startX - loopWidth, tickerY + (tickerHeight / 2));
    }

    ctx.shadowColor = 'transparent';
  };

  // --- Sync Ref with State ---
  useEffect(() => {
     if (!isExporting) {
         currentTimeRef.current = currentTime;
     }
  }, [currentTime, isExporting]);

  // --- Animation Clock Loop ---
  useEffect(() => {
    let animationFrameId: number;
    
    // Cleanup previous worker if any
    if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
    }

    if (isExporting) {
        // --- BACKGROUND FRIENDLY EXPORT LOOP (Web Worker) ---
        const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));
        workerRef.current = worker;

        worker.onmessage = () => {
             // CRITICAL FIX: Always rely on system time delta for export.
             // Browsers throttle 'audio.currentTime' in background tabs, causing stutter.
             const now = performance.now();
             const delta = (now - lastTimeRef.current) / 1000;
             lastTimeRef.current = now;
             
             // Increment internal time based on elapsed real-world time
             // This ensures visual smoothness even if audio element lags in background.
             currentTimeRef.current += delta;
             
             renderFrame(currentTimeRef.current);
             setCurrentTime(currentTimeRef.current);

             // Check End Condition
             // We add a small buffer (+1s) to ensure audio finishes if it's slightly desynced
             const isEnded = (config.audioUrl && audioRef.current?.ended) || 
                             (currentTimeRef.current >= maxDuration + 0.5); 
             
             if (isEnded) {
                 finishExport(); 
             }
        };

        lastTimeRef.current = performance.now();
        // Start worker ticking at requested FPS
        worker.postMessage({ action: 'start', fps: config.fps });

    } else if (isPlaying) {
        // --- STANDARD FOREGROUND LOOP (requestAnimationFrame) ---
        const loop = () => {
            if (config.audioUrl && audioRef.current && isAudioReady && !audioError) {
                // In foreground, we can trust audio time for perfect lipsync
                const t = audioRef.current.currentTime;
                currentTimeRef.current = t;
                setCurrentTime(t);
            } else {
                const now = performance.now();
                const delta = (now - lastTimeRef.current) / 1000;
                lastTimeRef.current = now;
                currentTimeRef.current += delta;
                setCurrentTime(currentTimeRef.current);
            }

            if (config.audioUrl && audioRef.current?.ended) {
                setIsPlaying(false);
            } else if (maxDuration > 0 && currentTimeRef.current >= maxDuration && !config.audioUrl) {
                setIsPlaying(false);
            } else {
                animationFrameId = requestAnimationFrame(loop);
            }
        };
        lastTimeRef.current = performance.now();
        loop();
    }

    return () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
        }
    };
  }, [isPlaying, isExporting, config.fps, config.audioUrl, isAudioReady, audioError, maxDuration]);


  // --- Paint Effect (For Dragging/Scrubbing) ---
  useEffect(() => {
    // We only rely on this for non-playing updates (scrubbing/dragging)
    // Or if rendering falls behind via state updates
    renderFrame(currentTime);
  }, [currentTime, config, lines, effectiveScrollSpeed, CANVAS_WIDTH, CANVAS_HEIGHT]);


  // Start/Stop Audio Logic
  useEffect(() => {
    if (isExporting) return;

    if (isPlaying) {
        lastTimeRef.current = performance.now();
        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }
        
        if (config.audioUrl && audioRef.current && isAudioReady && !audioError) {
            audioRef.current.play().catch(e => {
                console.error("Playback failed:", e);
                setIsPlaying(false);
            });
        }
        if (config.bgMusicUrl && bgMusicRef.current) {
            if (Number.isFinite(bgMusicRef.current.duration) && bgMusicRef.current.duration > 0) {
                 bgMusicRef.current.currentTime = currentTime % bgMusicRef.current.duration;
            }
            bgMusicRef.current.play().catch(() => {});
        }

    } else {
        if (config.audioUrl && audioRef.current) {
            audioRef.current.pause();
        }
        if (config.bgMusicUrl && bgMusicRef.current) {
            bgMusicRef.current.pause();
        }
    }
  }, [isPlaying, config.audioUrl, config.bgMusicUrl, isAudioReady, isExporting, audioError]);

  // --- Export Logic ---
  const getSupportedMimeType = () => {
      const types = [
        'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
        'video/mp4',
        'video/webm;codecs=h264',
        'video/webm;codecs=vp9,opus',
        'video/webm'
      ];
      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) return type;
      }
      return 'video/webm'; 
  };

  const handleExport = async () => {
    if (isExporting) return;
    
    if (audioContextRef.current?.state === 'suspended') {
        try { await audioContextRef.current.resume(); } catch(e) { console.error("Ctx Resume Fail", e); }
    }

    setIsExporting(true);
    setCurrentTime(0);
    currentTimeRef.current = 0; // Sync Ref
    
    if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.pause();
    }
    if (bgMusicRef.current) {
        bgMusicRef.current.currentTime = 0;
        bgMusicRef.current.pause();
    }
    
    setTimeout(() => startRecording(), 300);
  };

  const startRecording = async () => {
    // Play audio for recording stream
    const promises = [];
    if (config.audioUrl && audioRef.current && !audioError) {
        promises.push(audioRef.current.play());
    }
    if (config.bgMusicUrl && bgMusicRef.current) {
        promises.push(bgMusicRef.current.play());
    }

    try { await Promise.all(promises); } catch (e) {}
    
    setIsPlaying(true);
    lastTimeRef.current = performance.now();

    await new Promise(resolve => setTimeout(resolve, 300));

    const canvas = canvasRef.current;
    if (!canvas) return;

    const stream = canvas.captureStream(config.fps);
    
    if (destNodeRef.current) {
        const audioTracks = destNodeRef.current.stream.getAudioTracks();
        if (audioTracks.length > 0) {
            stream.addTrack(audioTracks[0]);
        }
    }

    const mimeType = getSupportedMimeType();

    let recorder;
    try {
        recorder = new MediaRecorder(stream, { 
            mimeType,
            videoBitsPerSecond: 12000000, 
            audioBitsPerSecond: 320000    
        });
    } catch (e) {
        alert("Recording failed. Try Chrome or Edge.");
        setIsExporting(false);
        setIsPlaying(false);
        return;
    }
    
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
    };
    
    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        
        const baseName = (config.exportFileName && config.exportFileName.trim() !== "") 
                         ? config.exportFileName 
                         : "rakib";
        a.download = `${baseName}.${ext}`;
        a.click();
        
        setIsExporting(false);
        setIsPlaying(false);
        setCurrentTime(0);
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
        if (bgMusicRef.current) { bgMusicRef.current.pause(); bgMusicRef.current.currentTime = 0; }
    };

    mediaRecorderRef.current = recorder;
    recorder.start();

    // Fallback safety timeout
    if (!config.audioUrl || audioError) {
        setTimeout(() => finishExport(), (maxDuration + 2) * 1000);
    }
  };

  const finishExport = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
      }
      // Audio stops in onstop handler of recorder usually, but good to be safe
  };

  // --- Interaction Handlers ---
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    const ctx = canvasRef.current.getContext('2d');

    if (config.logoUrl && logoImageRef.current) {
        const lWidth = logoImageRef.current.width * config.logoScale;
        const lHeight = logoImageRef.current.height * config.logoScale;
        if (mouseX >= config.logoX && mouseX <= config.logoX + lWidth &&
            mouseY >= config.logoY && mouseY <= config.logoY + lHeight) {
            isDraggingRef.current = true;
            draggingTargetRef.current = 'logo';
            dragStartRef.current = { x: mouseX, y: mouseY };
            initialPosRef.current = { x: config.logoX, y: config.logoY };
            return;
        }
    }
    if (config.watermarkUrl && watermarkImageRef.current) {
        const wWidth = watermarkImageRef.current.width * config.watermarkScale;
        const wHeight = watermarkImageRef.current.height * config.watermarkScale;
        if (mouseX >= config.watermarkX && mouseX <= config.watermarkX + wWidth &&
            mouseY >= config.watermarkY && mouseY <= config.watermarkY + wHeight) {
            isDraggingRef.current = true;
            draggingTargetRef.current = 'watermarkImage';
            dragStartRef.current = { x: mouseX, y: mouseY };
            initialPosRef.current = { x: config.watermarkX, y: config.watermarkY };
            return; 
        }
    }
    if (config.watermarkText && ctx) {
        ctx.font = `bold ${config.watermarkTextFontSize}px 'Inter', sans-serif`;
        const metrics = ctx.measureText(config.watermarkText);
        const wWidth = metrics.width;
        const wHeight = config.watermarkTextFontSize;
        if (mouseX >= config.watermarkTextX && mouseX <= config.watermarkTextX + wWidth &&
            mouseY >= config.watermarkTextY && mouseY <= config.watermarkTextY + wHeight) {
             isDraggingRef.current = true;
             draggingTargetRef.current = 'watermarkText';
             dragStartRef.current = { x: mouseX, y: mouseY };
             initialPosRef.current = { x: config.watermarkTextX, y: config.watermarkTextY };
        }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDraggingRef.current || !canvasRef.current || !onChange) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;
      
      const dx = mouseX - dragStartRef.current.x;
      const dy = mouseY - dragStartRef.current.y;
      
      const newX = initialPosRef.current.x + dx;
      const newY = initialPosRef.current.y + dy;

      if (draggingTargetRef.current === 'logo') {
          onChange({ ...config, logoX: newX, logoY: newY });
      } else if (draggingTargetRef.current === 'watermarkImage') {
          onChange({ ...config, watermarkX: newX, watermarkY: newY });
      } else if (draggingTargetRef.current === 'watermarkText') {
          onChange({ ...config, watermarkTextX: newX, watermarkTextY: newY });
      }
  };

  const handleMouseUp = () => {
      isDraggingRef.current = false;
      draggingTargetRef.current = null;
  };

  return (
    <div className="flex-1 bg-black p-6 flex flex-col relative overflow-hidden">
      
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>

      <div className="w-full flex justify-between items-start shrink-0 relative z-50 mb-4 pointer-events-none">
         <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-xl p-3 shadow-2xl flex flex-col gap-1 opacity-80 hover:opacity-100 transition-opacity">
             <label className="text-[10px] text-slate-500 font-bold tracking-wider uppercase flex items-center gap-1">
                <FileVideo className="w-3 h-3" /> Output Filename
             </label>
             <div className="flex items-center gap-1 group">
                <input 
                    type="text" 
                    value={config.exportFileName || ''}
                    placeholder=""
                    onChange={(e) => onChange && onChange({...config, exportFileName: e.target.value})}
                    className="bg-transparent text-sm font-bold text-white outline-none border-b border-transparent focus:border-purple-500 placeholder-slate-600 px-1 w-40 transition-all"
                />
                <span className="text-xs text-slate-500 font-mono">.mp4</span>
                <Edit3 className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
             </div>
        </div>

        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-xl px-4 py-2.5 shadow-2xl flex flex-col items-end opacity-80 hover:opacity-100 transition-opacity duration-300 select-none cursor-default">
           <p className="text-xs text-emerald-500 font-bold tracking-widest uppercase mb-0.5">LOVE STORY TOOLS</p>
           <h3 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400">
             I AM RAKIB
           </h3>
           <div className="flex items-center gap-1.5 mt-1 bg-slate-800/50 px-2 py-0.5 rounded-full border border-slate-700/50">
             <MessageCircle className="w-3 h-3 text-emerald-400" />
             <span className="text-[11px] text-emerald-400/90 font-mono tracking-wide">WhatsApp: 01733263106</span>
           </div>
        </div>
      </div>

      <audio ref={audioRef} onLoadedMetadata={(e) => { setAudioDuration(e.currentTarget.duration); setIsAudioReady(true); setAudioError(false); }} onError={() => { setAudioError(true); setIsAudioReady(false); }} crossOrigin="anonymous" className="hidden" />
      <audio ref={bgMusicRef} crossOrigin="anonymous" className="hidden" />

      <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 z-10">
        <div 
            ref={containerRef}
            className="relative shadow-2xl shadow-purple-900/20 border-4 border-slate-800 rounded-lg overflow-hidden bg-black shrink-0 transition-all duration-300"
            style={{
            aspectRatio: config.aspectRatio.replace(':', '/'),
            width: 'auto',
            height: 'auto',
            maxWidth: '100%',
            maxHeight: '65vh'
            }}
        >
            <canvas 
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className={`w-full h-full object-contain ${config.watermarkUrl || config.logoUrl || config.watermarkText ? 'cursor-move' : ''}`}
            />

            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded border border-white/10 text-[10px] text-white/80 font-mono z-20 pointer-events-none flex items-center gap-3">
                <span>{Math.round(currentTime)}s / {Math.round(maxDuration)}s</span>
                {config.audioUrl && (
                    <span className={`flex items-center gap-1 ${audioError ? 'text-red-400' : (isAudioReady ? 'text-green-400' : 'text-yellow-400')}`}>
                        {audioError ? <AlertCircle className="w-3 h-3" /> : (isAudioReady ? <Volume2 className="w-3 h-3" /> : <Loader2 className="w-3 h-3 animate-spin" />)}
                        {audioError ? 'Audio Error' : (isAudioReady ? 'Voice Ready' : 'Loading Voice...')}
                    </span>
                )}
            </div>

            {isExporting && (
                <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                    <div className="relative">
                        <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 animate-pulse"></div>
                        <Loader2 className="w-16 h-16 text-purple-500 animate-spin mb-4 relative z-10" />
                    </div>
                    <h3 className="text-xl font-bold">Rendering Video...</h3>
                    <p className="text-slate-400 text-sm mt-2">Recording Realtime Playback (MP4/WebM)...</p>
                    <p className="text-xs text-slate-500 mt-1 italic">Please wait, do not close this tab.</p>
                    <div className="mt-4 w-64 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-purple-500 transition-all duration-300 ease-linear"
                            style={{ width: `${Math.min((currentTime / maxDuration) * 100, 100)}%` }}
                        />
                    </div>
                    <button onClick={finishExport} className="mt-6 px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded border border-red-500/50 text-xs transition-colors">Cancel Export</button>
                </div>
            )}
        </div>

        <div className="mt-6 w-full max-w-[1000px] bg-[#1e293b] rounded-xl border border-slate-700 p-4 flex flex-col gap-3 shadow-xl z-10 shrink-0">
            <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-slate-400 w-12">{currentTime.toFixed(1)}s</span>
            <input 
                type="range"
                min="0"
                max={maxDuration || 60}
                step="0.1"
                value={currentTime}
                onChange={(e) => {
                    const t = parseFloat(e.target.value);
                    setCurrentTime(t);
                    if (audioRef.current && isAudioReady && !audioError) {
                        audioRef.current.currentTime = t;
                    }
                    if (bgMusicRef.current) {
                        if (Number.isFinite(bgMusicRef.current.duration) && bgMusicRef.current.duration > 0) {
                            bgMusicRef.current.currentTime = t % bgMusicRef.current.duration;
                        }
                    }
                }}
                disabled={isExporting}
                className="flex-1 accent-purple-500 h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer disabled:opacity-50"
            />
            <span className="text-xs font-mono text-slate-400 w-12">{maxDuration.toFixed(1)}s</span>
            </div>

            <div className="flex items-center justify-center gap-4 relative">
            <button 
                onClick={() => {
                    setIsPlaying(false);
                    setCurrentTime(0);
                    if (audioRef.current) { 
                        audioRef.current.pause(); 
                        audioRef.current.currentTime = 0; 
                    }
                    if (bgMusicRef.current) {
                        bgMusicRef.current.pause();
                        bgMusicRef.current.currentTime = 0;
                    }
                }}
                disabled={isExporting}
                className="p-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50 hover:bg-slate-700 rounded-full"
                title="Reset"
            >
                <RotateCcw className="w-5 h-5" />
            </button>

            <button 
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={isExporting || (!!config.audioUrl && !isAudioReady && !audioError)}
                className="w-14 h-14 bg-purple-600 hover:bg-purple-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-purple-600/30 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
            </button>

            <button 
                onClick={handleExport}
                disabled={isExporting}
                className="absolute right-0 flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 hover:shadow-lg hover:shadow-emerald-900/20"
            >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {isExporting ? 'Recording...' : 'Export Video'}
            </button>
            </div>
        </div>
      </div>
    </div>
  );
};
