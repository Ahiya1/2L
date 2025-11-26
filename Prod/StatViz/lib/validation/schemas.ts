import { z } from 'zod'

// Admin login
export const AdminLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

// Create project (server-side - English messages)
export const CreateProjectSchema = z.object({
  project_name: z.string().min(1, 'Project name is required').max(500, 'Project name too long'),
  student_name: z.string().min(1, 'Student name is required').max(255, 'Student name too long'),
  student_email: z.string().email('Invalid email format'),
  research_topic: z.string().min(1, 'Research topic is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
})

// Create project form (client-side - Hebrew messages)
// Note: Files are validated separately in the component (React Hook Form doesn't support File validation well)
export const CreateProjectFormSchema = z.object({
  project_name: z.string()
    .min(1, 'שם הפרויקט נדרש')
    .max(500, 'שם הפרויקט ארוך מדי (מקסימום 500 תווים)')
    .regex(/[\u0590-\u05FF]/, 'שם הפרויקט חייב להכיל לפחות תו עברי אחד'),
  student_name: z.string()
    .min(1, 'שם הסטודנט נדרש')
    .max(255, 'שם הסטודנט ארוך מדי (מקסימום 255 תווים)'),
  student_email: z.string()
    .min(1, 'אימייל נדרש')
    .email('כתובת אימייל לא תקינה')
    .max(255, 'אימייל ארוך מדי'),
  research_topic: z.string()
    .min(1, 'נושא המחקר נדרש')
    .max(5000, 'נושא המחקר ארוך מדי (מקסימום 5000 תווים)'),
  password: z.string()
    .min(6, 'הסיסמה חייבת להכיל לפחות 6 תווים')
    .optional()
    .or(z.literal('')), // Allow empty for auto-generation
})

export type CreateProjectFormData = z.infer<typeof CreateProjectFormSchema>

// Verify project password
export const VerifyPasswordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
})
