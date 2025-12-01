
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { PreviewPlayer } from './components/PreviewPlayer';
import { INITIAL_CONFIG, VideoConfig, Project } from './types';

export default function App() {
  // Initialize with one default project
  const [projects, setProjects] = useState<Project[]>(() => {
    // Try to load from localStorage (Optional persistence for non-file data)
    try {
        const saved = localStorage.getItem('scrollvision_projects');
        if (saved) {
            return JSON.parse(saved);
        }
    } catch(e) {
        console.error("Failed to load projects", e);
    }
    return [{
        id: 'default-1',
        name: 'Project 1',
        createdAt: Date.now(),
        config: INITIAL_CONFIG
    }];
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(projects[0].id);

  // Save basic metadata to local storage (files/blobs won't persist well in LS, but structure will)
  useEffect(() => {
     try {
         // Create a sanitized version without huge base64 strings if necessary, 
         // but for now we attempt to save. Note: ObjectURLs don't persist sessions.
         const projectsToSave = projects.map(p => ({
             ...p,
             config: {
                 ...p.config,
                 // We don't save ephemeral blob URLs to local storage as they expire
                 audioUrl: null,
                 bgMusicUrl: null,
                 backgroundImage: null,
                 watermarkUrl: null,
                 logoUrl: null
             }
         }));
         localStorage.setItem('scrollvision_projects', JSON.stringify(projectsToSave));
     } catch(e) {
         console.warn("Storage quota exceeded or error", e);
     }
  }, [projects]);

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  const updateConfig = (newConfig: VideoConfig) => {
    setProjects(prev => prev.map(p => 
        p.id === activeProjectId ? { ...p, config: newConfig } : p
    ));
  };

  // Helper to update a specific project's config (used by the background players)
  const updateProjectConfig = (id: string, newConfig: VideoConfig) => {
    setProjects(prev => prev.map(p => 
        p.id === id ? { ...p, config: newConfig } : p
    ));
  };

  const handleCreateProject = () => {
      const newId = `proj-${Date.now()}`;
      const newProject: Project = {
          id: newId,
          name: `Project ${projects.length + 1}`,
          createdAt: Date.now(),
          config: { ...INITIAL_CONFIG }
      };
      setProjects([...projects, newProject]);
      setActiveProjectId(newId);
  };

  const handleDeleteProject = (id: string) => {
      if (projects.length <= 1) return; // Prevent deleting last project
      
      const newProjects = projects.filter(p => p.id !== id);
      setProjects(newProjects);
      
      if (activeProjectId === id) {
          setActiveProjectId(newProjects[0].id);
      }
  };

  const handleRenameProject = (id: string, newName: string) => {
      setProjects(prev => prev.map(p => 
        p.id === id ? { ...p, name: newName } : p
      ));
  };

  return (
    <div className="flex h-screen w-screen bg-[#0f172a] overflow-hidden">
      {/* Left Configuration Panel */}
      {/* Sidebar always controls the ACTIVE project */}
      <Sidebar 
        config={activeProject.config} 
        onChange={updateConfig}
        
        // Project Props
        projects={projects}
        activeProjectId={activeProjectId}
        onProjectSwitch={setActiveProjectId}
        onCreateProject={handleCreateProject}
        onDeleteProject={handleDeleteProject}
        onRenameProject={handleRenameProject}
      />
      
      {/* Right Preview Panel Container */}
      <div className="flex-1 relative overflow-hidden bg-black">
        {/* 
            CRITICAL: We map and render ALL projects.
            We use absolute positioning to stack them.
            The ACTIVE project has z-index 10.
            Inactive projects have z-index 0.
            
            IMPORTANT: We keep opacity at 100 for all of them. 
            Since the active project covers the screen (it has a background), 
            we don't need to hide the others. This ensures the browser 
            doesn't 'optimize away' the rendering loop of the background projects,
            keeping the export running.
        */}
        {projects.map((project) => (
            <div 
                key={project.id}
                className={`absolute inset-0 w-full h-full transition-all duration-300 ${
                    project.id === activeProjectId 
                        ? 'z-10 pointer-events-auto' 
                        : 'z-0 pointer-events-none'
                }`}
            >
                <PreviewPlayer 
                    config={project.config} 
                    onChange={(newCfg) => updateProjectConfig(project.id, newCfg)} 
                />
            </div>
        ))}
      </div>
    </div>
  );
}
