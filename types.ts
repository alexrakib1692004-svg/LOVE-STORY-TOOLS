
export interface VideoConfig {
  script: string;
  fontSize: number;
  lineHeight: number;
  textColor: string;
  // highlightColor removed
  fontFamily: string;
  isBold: boolean;
  textAlign: 'left' | 'center' | 'right';
  scrollSpeed: number; // pixels per second roughly
  autoScrollSpeed: boolean; // If true, calculates speed based on duration
  duration: number; // seconds
  
  backgroundColor: string;
  backgroundImage: string | null;
  
  resolution: '720p' | '1080p' | '4k';
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:5'; // Social Media Sizes
  fps: number;
  muteOnExport: boolean;
  exportFileName: string; // New field for custom filename

  audioUrl: string | null;
  audioName: string | null;
  mainAudioVolume: number; // 0 to 1
  
  bgMusicUrl: string | null;
  bgMusicName: string | null;
  bgMusicVolume: number; // 0 to 1
  
  // Ticker / Headline
  tickerText: string;
  tickerColor: string;
  tickerBgColor: string;
  tickerFontSize: number;
  tickerSpeed: number;

  // Watermark Image (Flexible Layer)
  watermarkUrl: string | null;
  watermarkOpacity: number; // 0 to 1
  watermarkScale: number; // 0.1 to 2.0
  watermarkX: number;
  watermarkY: number;
  watermarkLayer: 'front' | 'back';

  // Watermark Text (Flexible Layer)
  watermarkText: string;
  watermarkTextFontSize: number;
  watermarkTextColor: string;
  watermarkTextOpacity: number;
  watermarkTextX: number;
  watermarkTextY: number;
  watermarkTextLayer: 'front' | 'back';

  // Logo (Brand Overlay)
  logoUrl: string | null;
  logoOpacity: number;
  logoScale: number;
  logoX: number;
  logoY: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  config: VideoConfig;
}

export const FONTS = [
  { name: 'Inter', value: "'Inter', sans-serif" },
  { name: 'Roboto', value: "'Roboto', sans-serif" },
  { name: 'Open Sans', value: "'Open Sans', sans-serif" },
  { name: 'Lato', value: "'Lato', sans-serif" },
  { name: 'Serif', value: "'Times New Roman', serif" },
  { name: 'Monospace', value: "'Courier New', monospace" },
  { name: 'Hind Siliguri (Bengali)', value: "'Hind Siliguri', sans-serif" },
];

export const INITIAL_CONFIG: VideoConfig = {
  script: "",
  fontSize: 48,
  lineHeight: 1.5,
  textColor: '#ffffff',
  // highlightColor removed
  fontFamily: "'Inter', sans-serif",
  isBold: true,
  textAlign: 'left',
  scrollSpeed: 50,
  autoScrollSpeed: false,
  duration: 60,
  backgroundColor: '#000000', // Default black
  backgroundImage: null,
  resolution: '1080p',
  aspectRatio: '16:9',
  fps: 30,
  muteOnExport: false,
  exportFileName: "", // Default empty so input is blank

  audioUrl: null,
  audioName: null,
  mainAudioVolume: 1.0,
  bgMusicUrl: null,
  bgMusicName: null,
  bgMusicVolume: 0.5,
  
  // Ticker defaults
  tickerText: "",
  tickerColor: "#FFFFFF",
  tickerBgColor: "#0f172a", // Slate 900
  tickerFontSize: 40,
  tickerSpeed: 200,

  // Watermark Image defaults
  watermarkUrl: null,
  watermarkOpacity: 0.3,
  watermarkScale: 1.0,
  watermarkX: 400,
  watermarkY: 300,
  watermarkLayer: 'back', // Default behind text

  // Watermark Text defaults
  watermarkText: "",
  watermarkTextFontSize: 60,
  watermarkTextColor: "#FFFFFF",
  watermarkTextOpacity: 0.5,
  watermarkTextX: 960, // Center
  watermarkTextY: 540, // Center
  watermarkTextLayer: 'front',

  // Logo defaults
  logoUrl: null,
  logoOpacity: 1.0,
  logoScale: 0.2,
  logoX: 50,
  logoY: 50,
};
