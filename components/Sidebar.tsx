
import React, { useRef, useState } from 'react';
import { 
  Type, 
  Palette, 
  Layout, 
  Image as ImageIcon, 
  Settings, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Bold,
  Music,
  Upload,
  Trash2,
  Volume2,
  Zap,
  Megaphone,
  Stamp,
  Move,
  Layers,
  Aperture,
  VolumeX,
  Smartphone,
  Monitor,
  ArrowRight,
  ArrowDown,
  Plus,
  Folder,
  X,
  Edit2
} from 'lucide-react';
import { VideoConfig, FONTS, Project } from '../types';

interface SidebarProps {
  config: VideoConfig;
  onChange: (newConfig: VideoConfig) => void;
  
  // Project Props
  projects: Project[];
  activeProjectId: string;
  onProjectSwitch: (id: string) => void;
  onCreateProject: () => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, newName: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
    config, 
    onChange,
    projects,
    activeProjectId,
    onProjectSwitch,
    onCreateProject,
    onDeleteProject,
    onRenameProject
}) => {
  // Refs for file inputs to trigger them programmatically
  const bgInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const bgMusicInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [editingNameId, setEditingNameId] = useState<string | null>(null);

  const handleChange = <K extends keyof VideoConfig>(key: K, value: VideoConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  const isBengali = (text: string) => {
    return /[\u0980-\u09FF]/.test(text);
  };

  const handleScriptChange = (text: string) => {
      let newConfig = { ...config, script: text };
      
      // Auto-switch to Bengali font if Bengali chars detected
      if (isBengali(text) && !config.fontFamily.includes('Hind Siliguri')) {
          const bengaliFont = FONTS.find(f => f.name.includes('Bengali'));
          if (bengaliFont) {
              newConfig.fontFamily = bengaliFont.value;
          }
      }
      onChange(newConfig);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      handleChange('backgroundImage', url);
    }
    e.target.value = '';
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onChange({
        ...config,
        audioUrl: url,
        audioName: file.name
      });
    }
    e.target.value = '';
  };

  const removeAudio = () => {
    onChange({
        ...config,
        audioUrl: null,
        audioName: null
    });
  };

  const handleBgMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onChange({
        ...config,
        bgMusicUrl: url,
        bgMusicName: file.name
      });
    }
    e.target.value = '';
  };

  const removeBgMusic = () => {
    onChange({
        ...config,
        bgMusicUrl: null,
        bgMusicName: null
    });
  };

  const handleWatermarkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onChange({
        ...config,
        watermarkUrl: url,
        watermarkScale: 0.5,
        watermarkOpacity: 0.3,
        watermarkX: 300,
        watermarkY: 300
      });
    }
    e.target.value = '';
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onChange({
        ...config,
        logoUrl: url,
        logoScale: 0.2, 
        logoOpacity: 1,
        logoX: 50,
        logoY: 50
      });
    }
    e.target.value = '';
  };

  return (
    <div className="w-80 bg-[#0f172a] border-r border-slate-700 flex flex-col h-full text-sm">
      
      {/* Project Management Header */}
      <div className="bg-[#1e293b] border-b border-slate-700 p-2 shrink-0">
         <div className="flex items-center justify-between mb-2 px-1">
             <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase flex items-center gap-1">
                <Folder className="w-3 h-3" /> Projects
             </span>
             <button 
                onClick={onCreateProject}
                className="text-[10px] bg-purple-600 hover:bg-purple-500 text-white px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
             >
                <Plus className="w-3 h-3" /> New
             </button>
         </div>
         
         {/* Horizontal Scrollable Project Tabs */}
         <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
            {projects.map(project => (
                <div 
                    key={project.id}
                    onClick={() => onProjectSwitch(project.id)}
                    className={`shrink-0 group relative flex items-center gap-1 px-3 py-1.5 rounded-t-lg cursor-pointer transition-colors border-t border-x border-transparent ${project.id === activeProjectId ? 'bg-[#0f172a] border-slate-700 text-white' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'}`}
                >
                    {editingNameId === project.id ? (
                        <input 
                            autoFocus
                            type="text"
                            defaultValue={project.name}
                            onBlur={(e) => {
                                onRenameProject(project.id, e.target.value || "Untitled");
                                setEditingNameId(null);
                            }}
                            onKeyDown={(e) => {
                                if(e.key === 'Enter') {
                                    onRenameProject(project.id, (e.target as any).value || "Untitled");
                                    setEditingNameId(null);
                                }
                            }}
                            className="bg-slate-900 text-white text-xs px-1 rounded outline-none w-20"
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span className="text-xs font-medium max-w-[80px] truncate" onDoubleClick={() => setEditingNameId(project.id)}>{project.name}</span>
                    )}
                    
                    {/* Delete Button (Only visible on hover/active and if not only project) */}
                    {projects.length > 1 && (
                         <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteProject(project.id);
                            }}
                            className={`ml-1 p-0.5 rounded-full hover:bg-red-500/20 hover:text-red-400 transition-opacity ${project.id === activeProjectId ? 'opacity-100 text-slate-400' : 'opacity-0 group-hover:opacity-100 text-slate-500'}`}
                            title="Close Project"
                         >
                            <X className="w-3 h-3" />
                         </button>
                    )}
                </div>
            ))}
         </div>
      </div>

      {/* Main Content Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Script Content Section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-slate-400 font-semibold flex items-center gap-2">
              <Type className="w-4 h-4" /> SCRIPT CONTENT
            </label>
          </div>

          <textarea
            value={config.script}
            onChange={(e) => handleScriptChange(e.target.value)}
            className="w-full h-40 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-purple-500 outline-none resize-none font-mono text-xs"
            placeholder="Enter your script here..."
          />
          
           {/* Scroll Speed Control */}
           <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 mt-2">
            <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-yellow-500" />
                    Scroll Speed
                </label>
                <div className="flex items-center gap-2">
                    {config.autoScrollSpeed && <span className="text-[10px] text-green-400 font-bold">AUTO</span>}
                    <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300 font-mono">
                        {config.autoScrollSpeed ? 'Synced' : `${config.scrollSpeed} px/s`}
                    </span>
                </div>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
                 <input 
                    type="checkbox"
                    checked={config.autoScrollSpeed}
                    onChange={(e) => handleChange('autoScrollSpeed', e.target.checked)}
                    id="autoSpeed"
                    className="accent-purple-500"
                />
                <label htmlFor="autoSpeed" className="text-[10px] text-slate-400 cursor-pointer">
                    Fit to Audio Duration
                </label>
            </div>

            {!config.autoScrollSpeed && (
                <>
                    <input 
                        type="range" 
                        min="10" 
                        max="400" 
                        step="5"
                        value={config.scrollSpeed}
                        onChange={(e) => handleChange('scrollSpeed', parseInt(e.target.value))}
                        className="w-full accent-yellow-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-mono">
                        <span>Slow</span>
                        <span>Fast</span>
                    </div>
                </>
            )}
          </div>
        </div>

        <hr className="border-slate-800" />

        {/* Text Styling */}
        <div className="space-y-4">
          <label className="text-slate-400 font-semibold flex items-center gap-2">
            <Palette className="w-4 h-4" /> TEXT STYLING
          </label>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Font Size ({config.fontSize}px)</label>
              <input 
                type="range" 
                min="12" 
                max="120" 
                value={config.fontSize}
                onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
                className="w-full accent-purple-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Line Height ({config.lineHeight})</label>
              <input 
                type="range" 
                min="1" 
                max="3" 
                step="0.1"
                value={config.lineHeight}
                onChange={(e) => handleChange('lineHeight', parseFloat(e.target.value))}
                className="w-full accent-purple-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div>
             <label className="text-xs text-slate-500 mb-1 block">Main Color</label>
             <div className="flex items-center gap-2 bg-slate-800 p-1 rounded border border-slate-700">
               <input 
                 type="color" 
                 value={config.textColor}
                 onChange={(e) => handleChange('textColor', e.target.value)}
                 className="w-full h-6 bg-transparent border-none cursor-pointer rounded overflow-hidden" 
               />
               <span className="text-xs text-slate-300 font-mono flex-1 text-center">{config.textColor}</span>
             </div>
           </div>

          <div>
            <label className="text-xs text-slate-500 mb-1 block">Font Family</label>
            <select 
              value={config.fontFamily}
              onChange={(e) => handleChange('fontFamily', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-purple-500"
            >
              {FONTS.map(f => (
                <option key={f.name} value={f.value}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
             <button 
                onClick={() => handleChange('isBold', !config.isBold)}
                className={`p-2 rounded flex-1 flex justify-center border ${config.isBold ? 'bg-purple-600 border-purple-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
             >
               <Bold className="w-4 h-4" />
             </button>
             <div className="flex bg-slate-800 rounded border border-slate-700 p-0.5 flex-[2]">
                <button 
                  onClick={() => handleChange('textAlign', 'left')}
                  className={`flex-1 flex justify-center items-center py-1.5 rounded ${config.textAlign === 'left' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleChange('textAlign', 'center')}
                  className={`flex-1 flex justify-center items-center py-1.5 rounded ${config.textAlign === 'center' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleChange('textAlign', 'right')}
                  className={`flex-1 flex justify-center items-center py-1.5 rounded ${config.textAlign === 'right' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}
                >
                  <AlignRight className="w-4 h-4" />
                </button>
             </div>
          </div>
        </div>

        <hr className="border-slate-800" />
        
        {/* LOGO Section */}
        <div className="space-y-4">
            <label className="text-slate-400 font-semibold flex items-center gap-2">
              <Aperture className="w-4 h-4" /> LOGO (OVERLAY)
            </label>
            <div className="space-y-3">
                 <input 
                    ref={logoInputRef}
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleLogoUpload} 
                 />
                 
                 {!config.logoUrl ? (
                    <button 
                        onClick={() => logoInputRef.current?.click()}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 border-dashed rounded text-xs text-slate-300 flex items-center justify-center gap-2"
                    >
                        <Upload className="w-3 h-3" /> Upload Logo
                    </button>
                 ) : (
                     <div className="space-y-3 bg-slate-800/50 p-2 rounded border border-slate-700">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-green-400 flex items-center gap-1">
                                <Move className="w-3 h-3" /> Drag to move
                            </span>
                            <button onClick={() => handleChange('logoUrl', null)} className="text-red-400 hover:text-red-300">
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>

                        <div>
                            <label className="text-[10px] text-slate-500 mb-1 block">Size ({config.logoScale.toFixed(2)}x)</label>
                            <input 
                                type="range" 
                                min="0.05" 
                                max="1.0" 
                                step="0.05"
                                value={config.logoScale}
                                onChange={(e) => handleChange('logoScale', parseFloat(e.target.value))}
                                className="w-full accent-blue-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 mb-1 block">Opacity ({Math.round(config.logoOpacity * 100)}%)</label>
                            <input 
                                type="range" 
                                min="0.1" 
                                max="1.0" 
                                step="0.1"
                                value={config.logoOpacity}
                                onChange={(e) => handleChange('logoOpacity', parseFloat(e.target.value))}
                                className="w-full accent-blue-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                     </div>
                 )}
            </div>
        </div>

        <hr className="border-slate-800" />
        
        {/* Watermark Section */}
        <div className="space-y-4">
            <label className="text-slate-400 font-semibold flex items-center gap-2">
              <Stamp className="w-4 h-4" /> WATERMARK
            </label>

            {/* Image Watermark Sub-section */}
            <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-700/50">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Image Watermark</div>
                 <input 
                    ref={watermarkInputRef}
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleWatermarkUpload} 
                 />
                 
                 {!config.watermarkUrl ? (
                    <button 
                        onClick={() => watermarkInputRef.current?.click()}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 border-dashed rounded text-xs text-slate-300 flex items-center justify-center gap-2"
                    >
                        <Upload className="w-3 h-3" /> Upload Image
                    </button>
                 ) : (
                     <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-green-400 flex items-center gap-1">
                                <Move className="w-3 h-3" /> Drag / Use Controls
                            </span>
                            <button onClick={() => handleChange('watermarkUrl', null)} className="text-red-400 hover:text-red-300">
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                        
                        {/* Layer Toggle */}
                        <div className="flex gap-2 bg-slate-900 p-1 rounded">
                             <button 
                                onClick={() => handleChange('watermarkLayer', 'back')}
                                className={`flex-1 text-[10px] py-1 rounded flex items-center justify-center gap-1 ${config.watermarkLayer === 'back' ? 'bg-slate-700 text-white ring-1 ring-purple-500' : 'text-slate-500 hover:text-slate-300'}`}
                             >
                                <Layers className="w-3 h-3" /> Behind Text
                             </button>
                             <button 
                                onClick={() => handleChange('watermarkLayer', 'front')}
                                className={`flex-1 text-[10px] py-1 rounded flex items-center justify-center gap-1 ${config.watermarkLayer === 'front' ? 'bg-slate-700 text-white ring-1 ring-purple-500' : 'text-slate-500 hover:text-slate-300'}`}
                             >
                                <Layers className="w-3 h-3" /> In Front
                             </button>
                        </div>

                        <div>
                            <label className="text-[10px] text-slate-500 mb-1 block">Size ({config.watermarkScale.toFixed(1)}x)</label>
                            <input 
                                type="range" 
                                min="0.1" 
                                max="2.0" 
                                step="0.1"
                                value={config.watermarkScale}
                                onChange={(e) => handleChange('watermarkScale', parseFloat(e.target.value))}
                                className="w-full accent-pink-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 mb-1 block">Opacity ({Math.round(config.watermarkOpacity * 100)}%)</label>
                            <input 
                                type="range" 
                                min="0.1" 
                                max="1.0" 
                                step="0.1"
                                value={config.watermarkOpacity}
                                onChange={(e) => handleChange('watermarkOpacity', parseFloat(e.target.value))}
                                className="w-full accent-pink-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                     </div>
                 )}
            </div>

            {/* Text Watermark Sub-section */}
            <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-700/50">
                 <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Text Watermark</div>
                 <input
                    type="text"
                    value={config.watermarkText}
                    onChange={(e) => handleChange('watermarkText', e.target.value)}
                    placeholder="Enter Watermark Text"
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-purple-500"
                  />
                  
                  {config.watermarkText && (
                    <div className="space-y-3 mt-2">
                         {/* Text Layer Toggle */}
                        <div className="flex gap-2 bg-slate-900 p-1 rounded">
                             <button 
                                onClick={() => handleChange('watermarkTextLayer', 'back')}
                                className={`flex-1 text-[10px] py-1 rounded flex items-center justify-center gap-1 ${config.watermarkTextLayer === 'back' ? 'bg-slate-700 text-white ring-1 ring-purple-500' : 'text-slate-500 hover:text-slate-300'}`}
                                title="Place watermark behind scrolling text"
                             >
                                <Layers className="w-3 h-3" /> Behind Text
                             </button>
                             <button 
                                onClick={() => handleChange('watermarkTextLayer', 'front')}
                                className={`flex-1 text-[10px] py-1 rounded flex items-center justify-center gap-1 ${config.watermarkTextLayer === 'front' ? 'bg-slate-700 text-white ring-1 ring-purple-500' : 'text-slate-500 hover:text-slate-300'}`}
                                title="Place watermark on top of scrolling text"
                             >
                                <Layers className="w-3 h-3" /> In Front
                             </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] text-slate-500 mb-1 block">Size ({config.watermarkTextFontSize}px)</label>
                                <input 
                                    type="range" 
                                    min="20" 
                                    max="200" 
                                    value={config.watermarkTextFontSize}
                                    onChange={(e) => handleChange('watermarkTextFontSize', parseInt(e.target.value))}
                                    className="w-full accent-cyan-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 mb-1 block">Opacity ({Math.round(config.watermarkTextOpacity * 100)}%)</label>
                                <input 
                                    type="range" 
                                    min="0.1" 
                                    max="1.0" 
                                    step="0.1"
                                    value={config.watermarkTextOpacity}
                                    onChange={(e) => handleChange('watermarkTextOpacity', parseFloat(e.target.value))}
                                    className="w-full accent-cyan-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>

                         <div>
                            <label className="text-[10px] text-slate-500 mb-1 block">Color</label>
                            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded border border-slate-700">
                                <input 
                                    type="color" 
                                    value={config.watermarkTextColor}
                                    onChange={(e) => handleChange('watermarkTextColor', e.target.value)}
                                    className="w-full h-6 bg-transparent border-none cursor-pointer rounded overflow-hidden" 
                                />
                                <span className="text-xs text-slate-300 font-mono flex-1 text-center">{config.watermarkTextColor}</span>
                            </div>
                        </div>

                        {/* Explicit Position Controllers */}
                        <div className="space-y-2 pt-2 border-t border-slate-700/50">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] text-slate-400 font-semibold">Position Control</label>
                                <span className="text-[9px] text-green-400 flex items-center gap-1"><Move className="w-3 h-3"/> or Drag on Screen</span>
                            </div>
                            <div>
                                <label className="text-[9px] text-slate-500 flex items-center gap-1"><ArrowRight className="w-3 h-3"/> Horizontal (X)</label>
                                <input 
                                    type="range" 
                                    min="-200" 
                                    max="1200" 
                                    value={config.watermarkTextX}
                                    onChange={(e) => handleChange('watermarkTextX', parseInt(e.target.value))}
                                    className="w-full accent-slate-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] text-slate-500 flex items-center gap-1"><ArrowDown className="w-3 h-3"/> Vertical (Y)</label>
                                <input 
                                    type="range" 
                                    min="-200" 
                                    max="2000" 
                                    value={config.watermarkTextY}
                                    onChange={(e) => handleChange('watermarkTextY', parseInt(e.target.value))}
                                    className="w-full accent-slate-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                  )}
            </div>
        </div>

        <hr className="border-slate-800" />

        {/* Bottom Ticker Section */}
        <div className="space-y-4">
            <label className="text-slate-400 font-semibold flex items-center gap-2">
              <Megaphone className="w-4 h-4" /> BOTTOM TICKER / HEADLINE
            </label>
            <div className="space-y-3">
              <input
                type="text"
                value={config.tickerText}
                onChange={(e) => handleChange('tickerText', e.target.value)}
                placeholder="e.g. Please Subscribe & Like!"
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-xs outline-none focus:border-purple-500"
              />
              
              <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">Text Color</label>
                    <div className="flex items-center gap-1 bg-slate-800 p-1 rounded border border-slate-700">
                      <input 
                        type="color" 
                        value={config.tickerColor}
                        onChange={(e) => handleChange('tickerColor', e.target.value)}
                        className="w-6 h-6 bg-transparent border-none cursor-pointer rounded overflow-hidden p-0" 
                      />
                       <span className="text-[10px] text-slate-400 font-mono">{config.tickerColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">Background</label>
                     <div className="flex items-center gap-1 bg-slate-800 p-1 rounded border border-slate-700">
                      <input 
                        type="color" 
                        value={config.tickerBgColor}
                        onChange={(e) => handleChange('tickerBgColor', e.target.value)}
                        className="w-6 h-6 bg-transparent border-none cursor-pointer rounded overflow-hidden p-0" 
                      />
                      <span className="text-[10px] text-slate-400 font-mono">{config.tickerBgColor}</span>
                    </div>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">Size ({config.tickerFontSize}px)</label>
                    <input 
                        type="range" 
                        min="20" 
                        max="100" 
                        value={config.tickerFontSize}
                        onChange={(e) => handleChange('tickerFontSize', parseInt(e.target.value))}
                        className="w-full accent-blue-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">Speed ({config.tickerSpeed})</label>
                    <input 
                        type="range" 
                        min="50" 
                        max="500" 
                        step="10"
                        value={config.tickerSpeed}
                        onChange={(e) => handleChange('tickerSpeed', parseInt(e.target.value))}
                        className="w-full accent-yellow-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                 </div>
              </div>

            </div>
        </div>

        <hr className="border-slate-800" />

        {/* Background */}
        <div className="space-y-4">
           <label className="text-slate-400 font-semibold flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> BACKGROUND
          </label>

          <div className="space-y-3">
             
             {/* Mode Selection */}
             <div className="flex items-center gap-2 mb-2">
                 <span className="text-xs text-slate-500">Mode:</span>
                 <span className={`text-xs px-2 py-0.5 rounded ${config.backgroundImage ? 'bg-purple-900/50 text-purple-300' : 'bg-slate-800 text-slate-400'}`}>
                    {config.backgroundImage ? 'Image' : 'Solid Color'}
                 </span>
             </div>

             {/* Solid Color Picker - Always available as base */}
             <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Background Color</label>
                <div className="flex items-center gap-2 bg-slate-800 p-1 rounded border border-slate-700">
                    <input 
                        type="color" 
                        value={config.backgroundColor}
                        onChange={(e) => handleChange('backgroundColor', e.target.value)}
                        className="w-full h-8 bg-transparent border-none cursor-pointer rounded overflow-hidden" 
                    />
                    <span className="text-xs text-slate-300 font-mono flex-1 text-center">{config.backgroundColor}</span>
                </div>
             </div>

             {/* Image Upload */}
             <div>
               <button 
                 onClick={() => bgInputRef.current?.click()}
                 className={`block w-full text-xs py-2 px-3 rounded cursor-pointer transition-colors text-center border ${config.backgroundImage ? 'bg-slate-800 border-purple-500 text-purple-300' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'}`}
               >
                 {config.backgroundImage ? 'Replace Image' : 'Upload Image (Optional)'}
               </button>
               <input 
                  ref={bgInputRef}
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
               />
               
               {config.backgroundImage && (
                 <div className="mt-2 relative group">
                   <img src={config.backgroundImage} alt="bg" className="w-full h-20 object-cover rounded border border-slate-700" />
                   <button 
                    onClick={() => handleChange('backgroundImage', null)}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                    title="Remove Image (Use Color)"
                   >
                     <Trash2 className="w-3 h-3" />
                   </button>
                 </div>
               )}
             </div>
          </div>
        </div>

         <hr className="border-slate-800" />

         {/* Audio Section */}
         <div className="space-y-4">
            <label className="text-slate-400 font-semibold flex items-center gap-2">
              <Music className="w-4 h-4" /> MAIN AUDIO / VOICE
            </label>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                {/* Audio Input - Always rendered but hidden */}
                <input 
                    key={config.audioName || 'audio-input'}
                    ref={audioInputRef}
                    type="file" 
                    style={{ display: 'none' }} 
                    accept="audio/*"
                    onChange={handleAudioUpload} 
                />

                {!config.audioUrl ? (
                    <button 
                    onClick={() => audioInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-2 cursor-pointer py-4 hover:bg-slate-700 transition-colors rounded border border-dashed border-slate-600"
                    >
                        <Upload className="w-6 h-6 text-slate-400" />
                        <span className="text-xs text-slate-300">Upload Voiceover (MP3, WAV)</span>
                    </button>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <Music className="w-4 h-4 text-purple-400 shrink-0" />
                                <span className="text-xs text-white truncate max-w-[150px]">{config.audioName || 'Audio File'}</span>
                            </div>
                            <button onClick={removeAudio} className="text-slate-400 hover:text-red-400 p-1 transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        {/* Volume Control */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <Volume2 className="w-3 h-3" /> Volume
                                </label>
                                <span className="text-[10px] text-slate-400">{Math.round((config.mainAudioVolume ?? 1.0) * 100)}%</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="2" 
                                step="0.05"
                                value={config.mainAudioVolume ?? 1.0}
                                onChange={(e) => handleChange('mainAudioVolume', parseFloat(e.target.value))}
                                className="w-full accent-purple-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                )}
            </div>
         </div>

         {/* Background Music Section */}
         <div className="space-y-4">
            <label className="text-slate-400 font-semibold flex items-center gap-2">
              <Music className="w-4 h-4" /> BACKGROUND MUSIC
            </label>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                <input 
                    key={config.bgMusicName || 'bg-music-input'}
                    ref={bgMusicInputRef}
                    type="file" 
                    style={{ display: 'none' }} 
                    accept="audio/*"
                    onChange={handleBgMusicUpload} 
                />

                {!config.bgMusicUrl ? (
                    <button 
                    onClick={() => bgMusicInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-2 cursor-pointer py-4 hover:bg-slate-700 transition-colors rounded border border-dashed border-slate-600"
                    >
                        <Upload className="w-6 h-6 text-slate-400" />
                        <span className="text-xs text-slate-300">Upload Background Music</span>
                    </button>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <Music className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span className="text-xs text-white truncate max-w-[150px]">{config.bgMusicName || 'Music File'}</span>
                            </div>
                            <button onClick={removeBgMusic} className="text-slate-400 hover:text-red-400 p-1 transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        
                        {/* Volume Control */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <Volume2 className="w-3 h-3" /> Volume
                                </label>
                                <span className="text-[10px] text-slate-400">{Math.round(config.bgMusicVolume * 100)}%</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.05"
                                value={config.bgMusicVolume}
                                onChange={(e) => handleChange('bgMusicVolume', parseFloat(e.target.value))}
                                className="w-full accent-emerald-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                )}
            </div>
         </div>

         <hr className="border-slate-800" />

         {/* Video Config */}
         <div className="space-y-4">
           <label className="text-slate-400 font-semibold flex items-center gap-2">
            <Layout className="w-4 h-4" /> VIDEO CONFIG
          </label>

          <div className="space-y-3">
             {/* Aspect Ratio */}
             <div>
                <label className="text-xs text-slate-500 mb-1 block">Video Size / Platform</label>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { val: '16:9', label: 'YouTube (16:9)', icon: Monitor },
                        { val: '9:16', label: 'TikTok/Reels (9:16)', icon: Smartphone },
                        { val: '1:1', label: 'Instagram (1:1)', icon: Layout },
                        { val: '4:5', label: 'Facebook (4:5)', icon: Layout }
                    ].map(opt => (
                        <button
                            key={opt.val}
                            onClick={() => handleChange('aspectRatio', opt.val as any)}
                            className={`flex flex-col items-center justify-center p-2 rounded border transition-all ${config.aspectRatio === opt.val ? 'bg-purple-900/40 border-purple-500 text-purple-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                        >
                            <opt.icon className="w-4 h-4 mb-1" />
                            <span className="text-[10px]">{opt.label}</span>
                        </button>
                    ))}
                </div>
             </div>

             <div className="grid grid-cols-2 gap-3">
                <div>
                <label className="text-xs text-slate-500 mb-1 block">FPS</label>
                <select 
                    value={config.fps}
                    onChange={(e) => handleChange('fps', parseInt(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-xs outline-none"
                    >
                    <option value={24}>24</option>
                    <option value={30}>30</option>
                    <option value={60}>60</option>
                    </select>
                </div>
                <div>
                <label className="text-xs text-slate-500 mb-1 block">Resolution</label>
                <select 
                    value={config.resolution}
                    onChange={(e) => handleChange('resolution', e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-xs outline-none"
                    >
                    <option value="720p">HD (720p)</option>
                    <option value="1080p">FHD (1080p)</option>
                    <option value="4k">4K (2160p)</option>
                    </select>
                </div>
             </div>

             {/* Mute on Export */}
             <div className="flex items-center gap-2 bg-slate-800/50 p-2 rounded border border-slate-700/50">
                 <input 
                    type="checkbox"
                    id="muteExport"
                    checked={config.muteOnExport}
                    onChange={(e) => handleChange('muteOnExport', e.target.checked)}
                    className="accent-purple-500"
                 />
                 <label htmlFor="muteExport" className="text-xs text-slate-300 cursor-pointer flex items-center gap-1.5">
                     <VolumeX className="w-3.5 h-3.5" />
                     Mute sound while exporting
                 </label>
             </div>
          </div>
         </div>
         
         <div className="h-10"></div> {/* Spacer */}
      </div>
    </div>
  );
};
