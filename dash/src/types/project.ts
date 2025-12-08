export interface Project {
  id: string;
  name: string;
  description?: string;
  integrations: string[]; // Array of integration IDs that are connected to this project
  createdAt: string;
  updatedAt: string;
}

export interface ProjectIntegration {
  projectId: string;
  integrationId: string;
  connectionId: string;
  connectedAt: string;
}

export interface User {
  id: string;
  name?: string;
  email?: string;
  projects: string[]; // Array of project IDs
  createdAt: string;
}