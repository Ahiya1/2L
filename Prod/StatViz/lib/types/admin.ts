// Admin Panel Types

export interface Project {
  projectId: string
  projectName: string
  studentName: string
  studentEmail: string
  createdAt: Date
  viewCount: number
  lastAccessed: Date | null
}

export interface LoginFormData {
  username: string
  password: string
}

export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

export interface ProjectsListResponse {
  projects: Project[]
}

export interface LoginResponse {
  message: string
}

// Project creation types
export interface CreateProjectResponse {
  projectId: string
  projectUrl: string
  password: string
  htmlWarnings?: string[]
}

export interface UploadProgress {
  filename: string
  progress: number // 0-100
  loaded: number // bytes
  total: number // bytes
  eta: number // seconds
}
