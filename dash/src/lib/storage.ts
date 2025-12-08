import { Project, ProjectIntegration, User } from '@/types/project';

// Local Storage Keys
const KEYS = {
  USER: 'teamai_user',
  PROJECTS: 'teamai_projects',
  PROJECT_INTEGRATIONS: 'teamai_project_integrations',
  CURRENT_PROJECT: 'teamai_current_project',
} as const;

// User Management
export class UserStorage {
  static getUser(): User | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const user = localStorage.getItem(KEYS.USER);
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  }

  static setUser(user: User): void {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
  }

  static createUser(name?: string, email?: string): User {
    const user: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      email,
      projects: [],
      createdAt: new Date().toISOString(),
    };
    
    this.setUser(user);
    return user;
  }

  static getOrCreateUser(): User {
    return this.getUser() || this.createUser('Demo User');
  }
}

// Project Management
export class ProjectStorage {
  static getProjects(): Project[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const projects = localStorage.getItem(KEYS.PROJECTS);
      return projects ? JSON.parse(projects) : [];
    } catch {
      return [];
    }
  }

  static setProjects(projects: Project[]): void {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects));
  }

  static createProject(name: string, description?: string): Project {
    const project: Project = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      integrations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const projects = this.getProjects();
    projects.push(project);
    this.setProjects(projects);

    // Add to user's projects
    const user = UserStorage.getOrCreateUser();
    user.projects.push(project.id);
    UserStorage.setUser(user);

    return project;
  }

  static getProject(projectId: string): Project | null {
    const projects = this.getProjects();
    return projects.find(p => p.id === projectId) || null;
  }

  static updateProject(projectId: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Project | null {
    const projects = this.getProjects();
    const index = projects.findIndex(p => p.id === projectId);
    
    if (index === -1) return null;

    projects[index] = {
      ...projects[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.setProjects(projects);
    return projects[index];
  }

  static deleteProject(projectId: string): boolean {
    const projects = this.getProjects();
    const filtered = projects.filter(p => p.id !== projectId);
    
    if (filtered.length === projects.length) return false;

    this.setProjects(filtered);
    
    // Remove from user's projects
    const user = UserStorage.getUser();
    if (user) {
      user.projects = user.projects.filter(pid => pid !== projectId);
      UserStorage.setUser(user);
    }

    // Clean up project integrations
    ProjectIntegrationStorage.removeProjectIntegrations(projectId);
    
    return true;
  }

  static getCurrentProject(): Project | null {
    if (typeof window === 'undefined') return null;
    
    const currentProjectId = localStorage.getItem(KEYS.CURRENT_PROJECT);
    return currentProjectId ? this.getProject(currentProjectId) : null;
  }

  static setCurrentProject(projectId: string | null): void {
    if (typeof window === 'undefined') return;
    
    if (projectId) {
      localStorage.setItem(KEYS.CURRENT_PROJECT, projectId);
    } else {
      localStorage.removeItem(KEYS.CURRENT_PROJECT);
    }
  }
}

// Project Integration Management
export class ProjectIntegrationStorage {
  static getProjectIntegrations(): ProjectIntegration[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const integrations = localStorage.getItem(KEYS.PROJECT_INTEGRATIONS);
      return integrations ? JSON.parse(integrations) : [];
    } catch {
      return [];
    }
  }

  static setProjectIntegrations(integrations: ProjectIntegration[]): void {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(KEYS.PROJECT_INTEGRATIONS, JSON.stringify(integrations));
  }

  static addIntegrationToProject(projectId: string, integrationId: string, connectionId: string): ProjectIntegration {
    const integration: ProjectIntegration = {
      projectId,
      integrationId,
      connectionId,
      connectedAt: new Date().toISOString(),
    };

    const integrations = this.getProjectIntegrations();
    
    // Remove existing integration for this project+integration combo
    const filtered = integrations.filter(
      i => !(i.projectId === projectId && i.integrationId === integrationId)
    );
    
    filtered.push(integration);
    this.setProjectIntegrations(filtered);

    // Update project's integrations array
    const project = ProjectStorage.getProject(projectId);
    if (project && !project.integrations.includes(integrationId)) {
      ProjectStorage.updateProject(projectId, {
        integrations: [...project.integrations, integrationId]
      });
    }

    return integration;
  }

  static removeIntegrationFromProject(projectId: string, integrationId: string): boolean {
    const integrations = this.getProjectIntegrations();
    const filtered = integrations.filter(
      i => !(i.projectId === projectId && i.integrationId === integrationId)
    );
    
    if (filtered.length === integrations.length) return false;

    this.setProjectIntegrations(filtered);

    // Update project's integrations array
    const project = ProjectStorage.getProject(projectId);
    if (project) {
      ProjectStorage.updateProject(projectId, {
        integrations: project.integrations.filter(id => id !== integrationId)
      });
    }

    return true;
  }

  static getProjectIntegrationsForProject(projectId: string): ProjectIntegration[] {
    return this.getProjectIntegrations().filter(i => i.projectId === projectId);
  }

  static removeProjectIntegrations(projectId: string): void {
    const integrations = this.getProjectIntegrations();
    const filtered = integrations.filter(i => i.projectId !== projectId);
    this.setProjectIntegrations(filtered);
  }

  static getIntegrationForProject(projectId: string, integrationId: string): ProjectIntegration | null {
    const integrations = this.getProjectIntegrations();
    return integrations.find(i => i.projectId === projectId && i.integrationId === integrationId) || null;
  }
}

// Utility functions
export class StorageUtils {
  static clearAll(): void {
    if (typeof window === 'undefined') return;
    
    Object.values(KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  static exportData() {
    return {
      user: UserStorage.getUser(),
      projects: ProjectStorage.getProjects(),
      projectIntegrations: ProjectIntegrationStorage.getProjectIntegrations(),
      currentProject: ProjectStorage.getCurrentProject()?.id || null,
    };
  }

  static importData(data: any): void {
    if (data.user) UserStorage.setUser(data.user);
    if (data.projects) ProjectStorage.setProjects(data.projects);
    if (data.projectIntegrations) ProjectIntegrationStorage.setProjectIntegrations(data.projectIntegrations);
    if (data.currentProject) ProjectStorage.setCurrentProject(data.currentProject);
  }
}