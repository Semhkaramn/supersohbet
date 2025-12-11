'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserPlus, Mail, Lock, User, Gift, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function RegisterModal() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const referralCodeParam = searchParams?.get('ref') || ''

  const { showRegisterModal, setShowRegisterModal, setShowLoginModal, setShowChannelModal, refreshUser, returnUrl, setReturnUrl } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    siteUsername: '',
    password: '',
    confirmPassword: '',
    referralCode: referralCodeParam
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.email || !formData.siteUsername || !formData.password) {
      toast.error('Lütfen zorunlu alanları doldurun')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Şifreler eşleşmiyor')
      return
    }

    if (formData.password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          siteUsername: formData.siteUsername,
          password: formData.password,
          referralCode: formData.referralCode || undefined
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message || 'Kayıt başarılı!')
        await refreshUser()
        setShowRegisterModal(false)

        // Telegram bağlama/kanal modal'ını aç
        setShowChannelModal(true)

        // Form'u temizle
        setFormData({
          email: '',
          siteUsername: '',
          password: '',
          confirmPassword: '',
          referralCode: ''
        })
      } else {
        toast.error(data.error || 'Kayıt başarısız')
      }
    } catch (error) {
      console.error('Register error:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const switchToLogin = () => {
    setShowRegisterModal(false)
    setShowLoginModal(true)
  }

  return (
    <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700 text-white max-h-[90vh]">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-green-500/10 rounded-full">
              <UserPlus className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold text-center">Kayıt Ol</DialogTitle>
          <DialogDescription className="text-gray-400 text-center">
            Yeni bir hesap oluşturun
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">
                  Email <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteUsername" className="text-gray-300">
                  Kullanıcı Adı <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="siteUsername"
                    type="text"
                    placeholder="kullaniciadi"
                    value={formData.siteUsername}
                    onChange={(e) => setFormData({ ...formData, siteUsername: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400"
                    disabled={loading}
                    required
                    minLength={3}
                    maxLength={20}
                  />
                </div>
                <p className="text-xs text-gray-500">Sadece küçük harf, rakam ve alt çizgi kullanılabilir</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">
                  Şifre <span className="text-red-500">*</span>
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
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-300">
                  Şifre Tekrar <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {referralCodeParam && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm text-green-400 flex items-center gap-2">
                    <Gift className="w-4 h-4" />
                    Bir referans kodu kullanıyorsunuz!
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="referralCode" className="text-gray-300">
                  Referans Kodu (İsteğe bağlı)
                </Label>
                <div className="relative">
                  <Gift className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="referralCode"
                    type="text"
                    placeholder="Referans kodu (varsa)"
                    value={formData.referralCode}
                    onChange={(e) => setFormData({ ...formData, referralCode: e.target.value })}
                    className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400"
                    disabled={loading || !!referralCodeParam}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col space-y-4 mt-4">
              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Kayıt yapılıyor...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Kayıt Ol
                  </>
                )}
              </Button>

              <div className="text-center text-sm text-gray-400">
                Zaten hesabınız var mı?{' '}
                <button
                  type="button"
                  onClick={switchToLogin}
                  className="text-blue-500 hover:text-blue-400 font-medium"
                >
                  Giriş Yap
                </button>
              </div>
            </DialogFooter>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
