'use client'

import { BarChart3, Lock, Zap, TrendingUp, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  StatViz
                </h1>
                <p className="text-xs text-slate-600">פלטפורמת דוחות סטטיסטיים</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.location.href = '/admin'}
            >
              <ArrowLeft className="h-4 w-4" />
              כניסת מנהלים
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            פלטפורמה מאובטחת ומקצועית
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 leading-tight">
            ניתוח סטטיסטי
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              פשוט ומקצועי
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-600 mb-12 leading-relaxed max-w-2xl mx-auto">
            צפייה בדוחות סטטיסטיים מתקדמים בצורה מאובטחת, נוחה ומקצועית.
            הפלטפורמה המובילה לניתוח נתונים אקדמיים.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="text-lg h-14 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
            >
              התחל לצפות בדוחות
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg h-14 px-8 border-2"
            >
              למד עוד
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-20 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-slate-900 mb-2">100%</div>
              <div className="text-sm text-slate-600">מאובטח</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-slate-900 mb-2">24/7</div>
              <div className="text-sm text-slate-600">נגישות</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-slate-900 mb-2">∞</div>
              <div className="text-sm text-slate-600">פרויקטים</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              למה לבחור ב-StatViz?
            </h2>
            <p className="text-xl text-slate-600">
              פלטפורמה מתקדמת עם כל מה שצריך לניתוח מקצועי
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-slate-200 hover:border-blue-300">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6">
                <Lock className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                אבטחה מקסימלית
              </h3>
              <p className="text-slate-600 leading-relaxed">
                הגנה מתקדמת על הנתונים שלך עם הצפנה מקצה לקצה וניהול הרשאות חכם
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-slate-200 hover:border-indigo-300">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center mb-6">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                מהיר וקל לשימוש
              </h3>
              <p className="text-slate-600 leading-relaxed">
                ממשק אינטואיטיבי וחוויית משתמש מעולה שמאפשרת גישה מהירה לכל הדוחות
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-slate-200 hover:border-purple-300">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-6">
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                ניתוח מתקדם
              </h3>
              <p className="text-slate-600 leading-relaxed">
                כלים חזקים לניתוח וויזואליזציה של נתונים סטטיסטיים מורכבים
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-12 md:p-16 text-center shadow-2xl">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              מוכנים להתחיל?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              הצטרפו אלינו עכשיו וקבלו גישה מיידית לכל הדוחות הסטטיסטיים שלכם
            </p>
            <Button
              size="lg"
              className="text-lg h-14 px-10 bg-white text-blue-600 hover:bg-blue-50 shadow-lg hover:shadow-xl transition-all"
            >
              צור חשבון חינם
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-slate-600">
            <p className="mb-2">© 2024 StatViz. כל הזכויות שמורות.</p>
            <p className="text-sm">פלטפורמה מקצועית לניתוח נתונים סטטיסטיים</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
