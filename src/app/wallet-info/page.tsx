'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import BottomNav from '@/components/BottomNav'
import {
  Wallet,
  Building2,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Search
} from 'lucide-react'
import { toast } from 'sonner'

interface Sponsor {
  id: string
  name: string
  identifierType: string
  logoUrl?: string
}

interface UserSponsorInfo {
  id: string
  identifier: string
  sponsor: Sponsor
}

function WalletInfoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')

  const [loading, setLoading] = useState(true)
  const [walletAddress, setWalletAddress] = useState('')
  const [editingWallet, setEditingWallet] = useState(false)
  const [walletInput, setWalletInput] = useState('')

  const [sponsorInfos, setSponsorInfos] = useState<UserSponsorInfo[]>([])
  const [allSponsors, setAllSponsors] = useState<Sponsor[]>([])
  const [editingSponsor, setEditingSponsor] = useState<string | null>(null)
  const [sponsorInput, setSponsorInput] = useState('')
  const [selectedSponsor, setSelectedSponsor] = useState<string | null>(null)
  const [sponsorSearch, setSponsorSearch] = useState('')

  useEffect(() => {
    if (!userId) {
      router.push('/')
      return
    }
    loadData()
  }, [userId])

  async function loadData() {
    try {
      const [walletRes, sponsorInfoRes, sponsorsRes] = await Promise.all([
        fetch('/api/user/wallet', {
          headers: { 'x-telegram-id': userId || '' }
        }),
        fetch('/api/user/sponsor-info', {
          headers: { 'x-telegram-id': userId || '' }
        }),
        fetch('/api/sponsors')
      ])

      if (walletRes.ok) {
        const walletData = await walletRes.json()
        setWalletAddress(walletData.walletAddress || '')
        setWalletInput(walletData.walletAddress || '')
      }

      if (sponsorInfoRes.ok) {
        const sponsorData = await sponsorInfoRes.json()
        setSponsorInfos(sponsorData.sponsorInfos || [])
      }

      if (sponsorsRes.ok) {
        const sponsorsData = await sponsorsRes.json()
        setAllSponsors(sponsorsData.sponsors || [])
      }
    } catch (error) {
      console.error('Veri yükleme hatası:', error)
      toast.error('Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  async function saveWallet() {
    if (!walletInput.trim()) {
      toast.error('Cüzdan adresi boş olamaz')
      return
    }

    if (!walletInput.startsWith('T') || walletInput.length !== 34) {
      toast.error('Geçersiz TRC20 cüzdan adresi. T ile başlamalı ve 34 karakter olmalıdır.')
      return
    }

    try {
      const response = await fetch('/api/user/wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': userId || ''
        },
        body: JSON.stringify({ walletAddress: walletInput })
      })

      if (response.ok) {
        const data = await response.json()
        setWalletAddress(data.walletAddress)
        setEditingWallet(false)
        toast.success('Cüzdan adresi kaydedildi')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Kaydetme başarısız')
      }
    } catch (error) {
      console.error('Cüzdan kaydetme hatası:', error)
      toast.error('Bir hata oluştu')
    }
  }

  async function deleteWallet() {
    try {
      const response = await fetch('/api/user/wallet', {
        method: 'DELETE',
        headers: { 'x-telegram-id': userId || '' }
      })

      if (response.ok) {
        setWalletAddress('')
        setWalletInput('')
        setEditingWallet(false)
        toast.success('Cüzdan adresi silindi')
      } else {
        toast.error('Silme başarısız')
      }
    } catch (error) {
      console.error('Cüzdan silme hatası:', error)
      toast.error('Bir hata oluştu')
    }
  }

  async function saveSponsorInfo(sponsorId: string) {
    if (!sponsorInput.trim()) {
      toast.error('Bilgi boş olamaz')
      return
    }

    // Sponsor tipini bul
    const sponsor = allSponsors.find(s => s.id === sponsorId)
    if (!sponsor) {
      toast.error('Sponsor bulunamadı')
      return
    }

    // Identifier tipine göre validasyon
    if (sponsor.identifierType === 'id') {
      // ID ise sadece sayı kabul et
      if (!/^\d+$/.test(sponsorInput.trim())) {
        toast.error('ID sadece sayılardan oluşmalıdır')
        return
      }
    } else if (sponsor.identifierType === 'email') {
      // Email ise email formatı kontrol et
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(sponsorInput.trim())) {
        toast.error('Geçerli bir email adresi giriniz')
        return
      }
    }

    try {
      const response = await fetch('/api/user/sponsor-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': userId || ''
        },
        body: JSON.stringify({
          sponsorId,
          identifier: sponsorInput.trim()
        })
      })

      if (response.ok) {
        await loadData()
        setEditingSponsor(null)
        setSponsorInput('')
        setSelectedSponsor(null)
        toast.success('Sponsor bilgisi kaydedildi')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Kaydetme başarısız')
      }
    } catch (error) {
      console.error('Sponsor bilgisi kaydetme hatası:', error)
      toast.error('Bir hata oluştu')
    }
  }

  async function deleteSponsorInfo(sponsorId: string) {
    try {
      const response = await fetch('/api/user/sponsor-info', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': userId || ''
        },
        body: JSON.stringify({ sponsorId })
      })

      if (response.ok) {
        await loadData()
        toast.success('Sponsor bilgisi silindi')
      } else {
        toast.error('Silme başarısız')
      }
    } catch (error) {
      console.error('Sponsor bilgisi silme hatası:', error)
      toast.error('Bir hata oluştu')
    }
  }

  function startEditSponsor(info: UserSponsorInfo) {
    setEditingSponsor(info.sponsor.id)
    setSponsorInput(info.identifier)
  }

  function startAddSponsor(sponsorId: string) {
    setSelectedSponsor(sponsorId)
    setEditingSponsor(sponsorId)
    setSponsorInput('')
  }

  function cancelEdit() {
    setEditingSponsor(null)
    setSponsorInput('')
    setSelectedSponsor(null)
  }

  const getIdentifierLabel = (type: string) => {
    switch (type) {
      case 'username':
        return 'Kullanıcı Adı'
      case 'id':
        return 'ID'
      case 'email':
        return 'Email'
      default:
        return 'Bilgi'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 p-6 shadow-xl sticky top-0 z-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Wallet className="w-6 h-6 text-white" />
            <h1 className="text-2xl font-bold text-white">Cüzdan Bilgileri</h1>
          </div>
          <p className="text-white/60 text-sm mt-2">
            Cüzdan ve sponsor bilgilerinizi yönetin
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* TRC20 Cüzdan Adresi */}
        <Card className="bg-white/5 border-white/10 p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-white font-semibold">TRC20 Cüzdan Adresi</h2>
                <p className="text-white/60 text-xs">Nakit ürünler için gerekli</p>
              </div>
            </div>
            {walletAddress && !editingWallet && (
              <CheckCircle className="w-5 h-5 text-green-400" />
            )}
          </div>

          {!editingWallet ? (
            <div>
              {walletAddress ? (
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-3">
                  <p className="text-white/40 text-xs mb-1">Kayıtlı Adres</p>
                  <p className="text-white font-mono text-sm break-all">{walletAddress}</p>
                </div>
              ) : (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-400 text-sm font-medium">Cüzdan adresi eklenmemiş</p>
                    <p className="text-yellow-400/70 text-xs mt-1">
                      Nakit kategorisindeki ürünleri satın alabilmek için cüzdan adresinizi ekleyin.
                    </p>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={() => setEditingWallet(true)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  {walletAddress ? 'Düzenle' : 'Ekle'}
                </Button>
                {walletAddress && (
                  <Button
                    onClick={deleteWallet}
                    variant="outline"
                    className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-white/80 text-sm mb-2 block">
                  TRC20 Cüzdan Adresi
                </Label>
                <Input
                  value={walletInput}
                  onChange={(e) => setWalletInput(e.target.value)}
                  placeholder="T ile başlayan 34 karakterlik adres"
                  className="bg-white/5 border-white/20 text-white"
                  maxLength={34}
                />
                <p className="text-white/40 text-xs mt-1">
                  Örnek: TYs7Kza9mCTUF5JMi1234567890abcdefgh
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={saveWallet}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Kaydet
                </Button>
                <Button
                  onClick={() => {
                    setEditingWallet(false)
                    setWalletInput(walletAddress)
                  }}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4 mr-2" />
                  İptal
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Sponsor Bilgileri */}
        <Card className="bg-white/5 border-white/10 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-white font-semibold">Sponsor Bilgilerim</h2>
              <p className="text-white/60 text-xs">Sponsor ürünleri için gerekli</p>
            </div>
          </div>

          {/* Arama Çubuğu */}
          {allSponsors.length > 0 && (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                type="text"
                placeholder="Sponsor ara..."
                value={sponsorSearch}
                onChange={(e) => setSponsorSearch(e.target.value)}
                className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
          )}

          <div className="space-y-3">
            {allSponsors.length === 0 ? (
              <div className="text-center py-8 text-white/60">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Henüz sponsor bulunmuyor</p>
              </div>
            ) : (
              allSponsors
                .filter(sponsor =>
                  sponsor.name.toLowerCase().includes(sponsorSearch.toLowerCase())
                )
                .map((sponsor) => {
                  const userInfo = sponsorInfos.find(info => info.sponsor.id === sponsor.id)
                  const isEditing = editingSponsor === sponsor.id

                  return (
                    <div
                      key={sponsor.id}
                      className="bg-white/5 border border-white/10 rounded-lg p-4"
                    >
                      {/* Logo - Ortada */}
                      {sponsor.logoUrl && (
                        <div className="flex justify-center mb-4">
                          <img
                            src={sponsor.logoUrl}
                            alt={sponsor.name}
                            className="w-20 h-20 rounded-lg object-contain bg-white/5 p-2"
                          />
                        </div>
                      )}

                      {/* Durum Badge */}
                      <div className="flex justify-center mb-3">
                        {userInfo && !isEditing ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Bilgi Kaydedildi
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Bilgi Eklenmemiş
                          </Badge>
                        )}
                      </div>

                      {!isEditing ? (
                        <div>
                          {userInfo ? (
                            <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-3">
                              <p className="text-white/40 text-xs mb-1 text-center">
                                {getIdentifierLabel(sponsor.identifierType)}
                              </p>
                              <p className="text-white font-medium text-center">{userInfo.identifier}</p>
                            </div>
                          ) : (
                            <div className="mb-3 text-center">
                              <p className="text-white/60 text-sm">
                                {sponsor.name}
                              </p>
                              <p className="text-white/40 text-xs mt-1">
                                {getIdentifierLabel(sponsor.identifierType)} gerekli
                              </p>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button
                              onClick={() => userInfo ? startEditSponsor(userInfo) : startAddSponsor(sponsor.id)}
                              size="sm"
                              className="flex-1 bg-blue-600 hover:bg-blue-700"
                            >
                              {userInfo ? (
                                <>
                                  <Edit2 className="w-3 h-3 mr-1" />
                                  Düzenle
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3 mr-1" />
                                  Bilgi Ekle
                                </>
                              )}
                            </Button>
                            {userInfo && (
                              <Button
                                onClick={() => deleteSponsorInfo(sponsor.id)}
                                size="sm"
                                variant="outline"
                                className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="text-center mb-3">
                            <p className="text-white text-sm font-medium">{sponsor.name}</p>
                            <p className="text-white/60 text-xs mt-1">
                              {getIdentifierLabel(sponsor.identifierType)} bilgisi girin
                            </p>
                          </div>
                          <div>
                            <Input
                              value={sponsorInput}
                              onChange={(e) => setSponsorInput(e.target.value)}
                              placeholder={
                                sponsor.identifierType === 'id'
                                  ? 'Örn: 123456789'
                                  : sponsor.identifierType === 'email'
                                  ? 'Örn: kullanici@example.com'
                                  : 'Örn: kullaniciadi'
                              }
                              type={sponsor.identifierType === 'email' ? 'email' : sponsor.identifierType === 'id' ? 'tel' : 'text'}
                              inputMode={sponsor.identifierType === 'id' ? 'numeric' : sponsor.identifierType === 'email' ? 'email' : 'text'}
                              className="bg-white/5 border-white/20 text-white"
                            />
                            <p className="text-white/40 text-xs mt-1">
                              {sponsor.identifierType === 'id' && 'Sadece rakamlar girebilirsiniz'}
                              {sponsor.identifierType === 'email' && 'Geçerli bir email adresi giriniz'}
                              {sponsor.identifierType === 'username' && 'Kullanıcı adınızı giriniz'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => saveSponsorInfo(sponsor.id)}
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              <Save className="w-3 h-3 mr-1" />
                              Kaydet
                            </Button>
                            <Button
                              onClick={cancelEdit}
                              size="sm"
                              variant="outline"
                              className="border-white/20 text-white hover:bg-white/10"
                            >
                              <X className="w-3 h-3 mr-1" />
                              İptal
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
            )}

            {allSponsors.length > 0 && allSponsors.filter(s => s.name.toLowerCase().includes(sponsorSearch.toLowerCase())).length === 0 && (
              <div className="text-center py-8 text-white/60">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Arama sonucu bulunamadı</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <BottomNav userId={userId!} />
    </div>
  )
}

export default function WalletInfoPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <WalletInfoContent />
    </Suspense>
  )
}
