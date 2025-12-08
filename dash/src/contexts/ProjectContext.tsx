'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Project, User } from '@/types/project';
import { UserStorage, ProjectStorage, ProjectIntegrationStorage } from '@/lib/storage';

interface ProjectState {
  user: User | null;
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
}

interface ProjectContextType extends ProjectState {
  // User actions
  initializeUser: (name?: string, email?: string) => User;
  updateUser: (updates: Partial<Omit<User, 'id' | 'createdAt'>>) => void;
  
  // Project actions
  createProject: (name: string, description?: string) => Project;
  updateProject: (projectId: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>) => void;
  deleteProject: (projectId: string) => void;
  setCurrentProject: (project: Project | null) => void;
  switchProject: (projectId: string) => void;
  
  // Integration actions
  addIntegrationToProject: (projectId: string, integrationId: string, connectionId: string) => void;
  removeIntegrationFromProject: (projectId: string, integrationId: string) => void;
  isIntegrationConnectedToProject: (projectId: string, integrationId: string) => boolean;
  
  // Utility
  refreshData: () => void;
  exportData: () => any;
  importData: (data: any) => void;
  clearAllData: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

interface ProjectProviderProps {
  children: React.ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const [state, setState] = useState<ProjectState>({
    user: null,
    projects: [],
    currentProject: null,
    isLoading: true,
  });

  // Initialize data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(() => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const user = UserStorage.getOrCreateUser();
      const projects = ProjectStorage.getProjects();
      const currentProject = ProjectStorage.getCurrentProject();
      
      setState({
        user,
        projects,
        currentProject,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load project data:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const refreshData = useCallback(() => {
    loadData();
  }, [loadData]);

  // User actions
  const initializeUser = useCallback((name?: string, email?: string) => {
    const user = UserStorage.createUser(name, email);
    setState(prev => ({ ...prev, user }));
    return user;
  }, []);

  const updateUser = useCallback((updates: Partial<Omit<User, 'id' | 'createdAt'>>) => {
    if (!state.user) return;
    
    const updatedUser = { ...state.user, ...updates };
    UserStorage.setUser(updatedUser);
    setState(prev => ({ ...prev, user: updatedUser }));
  }, [state.user]);

  // Project actions
  const createProject = useCallback((name: string, description?: string) => {
    const project = ProjectStorage.createProject(name, description);
    setState(prev => ({
      ...prev,
      projects: [...prev.projects, project],
      user: prev.user ? {
        ...prev.user,
        projects: [...prev.user.projects, project.id]
      } : prev.user
    }));
    return project;
  }, []);

  const updateProject = useCallback((projectId: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>) => {
    const updatedProject = ProjectStorage.updateProject(projectId, updates);
    if (!updatedProject) return;

    setState(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === projectId ? updatedProject : p),
      currentProject: prev.currentProject?.id === projectId ? updatedProject : prev.currentProject
    }));
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    const success = ProjectStorage.deleteProject(projectId);
    if (!success) return;

    setState(prev => ({
      ...prev,
      projects: prev.projects.filter(p => p.id !== projectId),
      currentProject: prev.currentProject?.id === projectId ? null : prev.currentProject,
      user: prev.user ? {
        ...prev.user,
        projects: prev.user.projects.filter(pid => pid !== projectId)
      } : prev.user
    }));
  }, []);

  const setCurrentProject = useCallback((project: Project | null) => {
    ProjectStorage.setCurrentProject(project?.id || null);
    setState(prev => ({ ...prev, currentProject: project }));
  }, []);

  const switchProject = useCallback((projectId: string) => {
    const project = state.projects.find(p => p.id === projectId);
    if (project) {
      setCurrentProject(project);
    }
  }, [state.projects, setCurrentProject]);

  // Integration actions
  const addIntegrationToProject = useCallback((projectId: string, integrationId: string, connectionId: string) => {
    ProjectIntegrationStorage.addIntegrationToProject(projectId, integrationId, connectionId);
    
    // Update the project in state
    setState(prev => ({
      ...prev,
      projects: prev.projects.map(p => 
        p.id === projectId 
          ? { ...p, integrations: [...(p.integrations.includes(integrationId) ? p.integrations : [...p.integrations, integrationId])] }
          : p
      ),
      currentProject: prev.currentProject?.id === projectId 
        ? { 
            ...prev.currentProject, 
            integrations: [...(prev.currentProject.integrations.includes(integrationId) ? prev.currentProject.integrations : [...prev.currentProject.integrations, integrationId])]
          }
        : prev.currentProject
    }));
  }, []);

  const removeIntegrationFromProject = useCallback((projectId: string, integrationId: string) => {
    const success = ProjectIntegrationStorage.removeIntegrationFromProject(projectId, integrationId);
    if (!success) return;

    setState(prev => ({
      ...prev,
      projects: prev.projects.map(p => 
        p.id === projectId 
          ? { ...p, integrations: p.integrations.filter(id => id !== integrationId) }
          : p
      ),
      currentProject: prev.currentProject?.id === projectId 
        ? { 
            ...prev.currentProject, 
            integrations: prev.currentProject.integrations.filter(id => id !== integrationId)
          }
        : prev.currentProject
    }));
  }, []);

  const isIntegrationConnectedToProject = useCallback((projectId: string, integrationId: string) => {
    const integration = ProjectIntegrationStorage.getIntegrationForProject(projectId, integrationId);
    return !!integration;
  }, []);

  // Utility functions
  const exportData = useCallback(() => {
    return {
      timestamp: new Date().toISOString(),
      data: {
        user: state.user,
        projects: state.projects,
        currentProject: state.currentProject?.id || null,
        projectIntegrations: ProjectIntegrationStorage.getProjectIntegrations(),
      }
    };
  }, [state]);

  const importData = useCallback((data: any) => {
    try {
      if (data.user) UserStorage.setUser(data.user);
      if (data.projects) ProjectStorage.setProjects(data.projects);
      if (data.projectIntegrations) ProjectIntegrationStorage.setProjectIntegrations(data.projectIntegrations);
      if (data.currentProject) ProjectStorage.setCurrentProject(data.currentProject);
      
      loadData();
    } catch (error) {
      console.error('Failed to import data:', error);
    }
  }, [loadData]);

  const clearAllData = useCallback(() => {
    try {
      UserStorage.setUser(UserStorage.createUser('Demo User'));
      ProjectStorage.setProjects([]);
      ProjectIntegrationStorage.setProjectIntegrations([]);
      ProjectStorage.setCurrentProject(null);
      
      loadData();
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  }, [loadData]);

  const contextValue: ProjectContextType = {
    ...state,
    initializeUser,
    updateUser,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
    switchProject,
    addIntegrationToProject,
    removeIntegrationFromProject,
    isIntegrationConnectedToProject,
    refreshData,
    exportData,
    importData,
    clearAllData,
  };

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextType {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}