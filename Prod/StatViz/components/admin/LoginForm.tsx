'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/hooks/useAuth'
import { cn } from '@/lib/utils'

const LoginSchema = z.object({
  username: z.string().min(1, 'שם משתמש נדרש'),
  password: z.string().min(1, 'סיסמה נדרשת'),
})

type LoginFormData = z.infer<typeof LoginSchema>

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const { login, isLoading } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    await login(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
      <div className="space-y-2">
        <Label htmlFor="username" className="text-sm font-medium text-slate-700">
          שם משתמש
        </Label>
        <Input
          id="username"
          type="text"
          {...register('username')}
          placeholder="הזן שם משתמש"
          className={cn(
            'transition-all',
            errors.username ? 'border-destructive focus-visible:ring-destructive' : ''
          )}
          disabled={isLoading}
          autoComplete="username"
        />
        {errors.username && (
          <p className="text-sm text-destructive flex items-center gap-1">
            {errors.username.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-slate-700">
          סיסמה
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            {...register('password')}
            placeholder="הזן סיסמה"
            className={cn(
              'transition-all pl-10',
              errors.password ? 'border-destructive focus-visible:ring-destructive' : ''
            )}
            disabled={isLoading}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-destructive flex items-center gap-1">
            {errors.password.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        variant="gradient"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            מתחבר...
          </>
        ) : (
          'התחבר'
        )}
      </Button>
    </form>
  )
}
