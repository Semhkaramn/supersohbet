'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LogIn, Mail, Lock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'

export default function LoginModal() {
  const router = useRouter()
  const { showLoginModal, setShowLoginModal, setShowRegisterModal, setShowChannelModal, refreshUser, returnUrl, setReturnUrl } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.emailOrUsername || !formData.password) {
      toast.error('Lütfen tüm alanları doldurun')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message || 'Giriş başarılı!')
        await refreshUser()
        setShowLoginModal(false)

        // Telegram bağlı mı kontrol et
        if (!data.user?.telegramId) {
          // Telegram bağlı değil, kanal modal'ını aç
          setShowChannelModal(true)
        }

        // Return URL varsa oraya yönlendir
        if (returnUrl) {
          router.push(returnUrl)
          setReturnUrl(null)
        }

        // Form'u temizle
        setFormData({ emailOrUsername: '', password: '' })
      } else {
        toast.error(data.error || 'Giriş başarısız')
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const switchToRegister = () => {
    setShowLoginModal(false)
    setShowRegisterModal(true)
  }

  return (
    <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-500/10 rounded-full">
              <LogIn className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold text-center">Giriş Yap</DialogTitle>
          <DialogDescription className="text-gray-400 text-center">
            Hesabınıza giriş yapın
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="emailOrUsername" className="text-gray-300">
                Email veya Kullanıcı Adı
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="emailOrUsername"
                  type="text"
                  placeholder="email@example.com veya kullaniciadi"
                  value={formData.emailOrUsername}
                  onChange={(e) => setFormData({ ...formData, emailOrUsername: e.target.value })}
                  className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">
                Şifre
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Giriş Yap
                </>
              )}
            </Button>

            <div className="text-center text-sm text-gray-400">
              Hesabınız yok mu?{' '}
              <button
                type="button"
                onClick={switchToRegister}
                className="text-blue-500 hover:text-blue-400 font-medium"
              >
                Kayıt Ol
              </button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
