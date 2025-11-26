import { z } from 'zod'

// Admin login
export const AdminLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

// Create project
export const CreateProjectSchema = z.object({
  project_name: z.string().min(1, 'Project name is required').max(500, 'Project name too long'),
  student_name: z.string().min(1, 'Student name is required').max(255, 'Student name too long'),
  student_email: z.string().email('Invalid email format'),
  research_topic: z.string().min(1, 'Research topic is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
})

// Verify project password
export const VerifyPasswordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
})
