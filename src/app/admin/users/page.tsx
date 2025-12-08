'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, Users, Edit, Trash2, Search } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface User {
  id: string
  telegramId: string
  username?: string
  firstName?: string
  lastName?: string
  points: number
  xp: number
  totalMessages: number
  dailySpinsLeft: number
  rank?: {
    name: string
    icon: string
    color: string
  }
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const [formData, setFormData] = useState({
    points: 0,
    xp: 0,
    dailySpinsLeft: 1
  })

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    loadUsers()
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) return

    const delayDebounceFn = setTimeout(() => {
      loadUsers()
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm])

  async function loadUsers() {
    try {
      const response = await fetch(`/api/admin/users?search=${searchTerm}`)
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Kullanıcılar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  function openDialog(user: User) {
    setEditingUser(user)
    setFormData({
      points: user.points,
      xp: user.xp,
      dailySpinsLeft: user.dailySpinsLeft
    })
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUser) return

    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.user) {
        toast.success('Kullanıcı güncellendi')
        setDialogOpen(false)
        loadUsers()
      } else {
        toast.error(data.error || 'Güncelleme başarısız')
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Bir hata oluştu')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Kullanıcı silindi')
        loadUsers()
      } else {
        toast.error(data.error || 'Silme başarısız')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Bir hata oluştu')
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
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin/dashboard">
              <Button variant="outline" className="mb-4 border-white/20 hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Geri
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Users className="w-8 h-8" />
              Kullanıcı Yönetimi
            </h1>
            <p className="text-gray-400 mt-1">Toplam {users.length} kullanıcı</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white"
              placeholder="Kullanıcı ara..."
            />
          </div>
        </div>

        {/* Users List */}
        <div className="space-y-3">
          {users.length === 0 ? (
            <Card className="bg-white/5 border-white/10 p-12 text-center">
              <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Kullanıcı bulunamadı</p>
            </Card>
          ) : (
            users.map((user) => (
              <Card key={user.id} className="bg-white/5 border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {user.firstName || user.username || 'Kullanıcı'}
                          {user.rank && (
                            <span className="ml-2" style={{ color: user.rank.color }}>
                              {user.rank.icon} {user.rank.name}
                            </span>
                          )}
                        </h3>
                        <p className="text-gray-400 text-sm">@{user.username || user.telegramId}</p>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-2">
                      <span className="text-sm text-yellow-400">{user.points} Puan</span>
                      <span className="text-sm text-purple-400">{user.xp} XP</span>
                      <span className="text-sm text-blue-400">{user.totalMessages} Mesaj</span>
                      <span className="text-sm text-green-400">{user.dailySpinsLeft} Çark</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDialog(user)}
                      className="border-white/20 hover:bg-white/10"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(user.id)}
                      className="border-red-500/20 hover:bg-red-500/10 text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">
              Kullanıcıyı Düzenle
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="points" className="text-white">Puan</Label>
              <Input
                id="points"
                type="number"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                className="bg-white/5 border-white/10 text-white mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="xp" className="text-white">XP</Label>
              <Input
                id="xp"
                type="number"
                value={formData.xp}
                onChange={(e) => setFormData({ ...formData, xp: parseInt(e.target.value) })}
                className="bg-white/5 border-white/10 text-white mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="dailySpinsLeft" className="text-white">Günlük Çark Hakkı</Label>
              <Input
                id="dailySpinsLeft"
                type="number"
                value={formData.dailySpinsLeft}
                onChange={(e) => setFormData({ ...formData, dailySpinsLeft: parseInt(e.target.value) })}
                className="bg-white/5 border-white/10 text-white mt-1"
                min="0"
                required
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1 border-white/20 hover:bg-white/10"
              >
                İptal
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Güncelle
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
