'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserPlus, Edit, Trash2, Shield, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Admin {
  id: string
  username: string
  isSuperAdmin: boolean
  canAccessBroadcast: boolean
  canAccessStatistics: boolean
  canAccessTasks: boolean
  canAccessShop: boolean
  canAccessWheel: boolean
  canAccessSponsors: boolean
  canAccessAds: boolean
  canAccessRanks: boolean
  canAccessRandy: boolean
  canAccessSettings: boolean
  canAccessAdmins: boolean
  createdAt: string
}

const PERMISSION_LABELS = {
  canAccessBroadcast: 'Toplu Mesaj',
  canAccessStatistics: 'İstatistikler',
  canAccessTasks: 'Görevler',
  canAccessShop: 'Market',
  canAccessWheel: 'Çark',
  canAccessSponsors: 'Sponsorlar',
  canAccessAds: 'Reklam Ayarları',
  canAccessRanks: 'Rütbeler',
  canAccessRandy: 'Randy',
  canAccessSettings: 'Ayarlar',
  canAccessAdmins: 'Adminler',
}

export default function AdminsPage() {
  const router = useRouter()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null)
  const [newAdminData, setNewAdminData] = useState({
    username: '',
    password: '',
    permissions: {} as Record<string, boolean>
  })

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    loadAdmins()
  }, [])

  async function loadAdmins() {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/admins', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.status === 403) {
        toast.error('Bu sayfaya erişim yetkiniz yok')
        router.push('/admin/dashboard')
        return
      }

      const data = await response.json()
      setAdmins(data)
    } catch (error) {
      console.error('Error loading admins:', error)
      toast.error('Adminler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateAdmin() {
    if (!newAdminData.username || !newAdminData.password) {
      toast.error('Kullanıcı adı ve şifre gerekli')
      return
    }

    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newAdminData)
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Admin başarıyla oluşturuldu')
        setShowCreateDialog(false)
        setNewAdminData({ username: '', password: '', permissions: {} })
        loadAdmins()
      } else {
        toast.error(data.error || 'Admin oluşturulamadı')
      }
    } catch (error) {
      console.error('Error creating admin:', error)
      toast.error('Bir hata oluştu')
    }
  }

  async function handleUpdateAdmin() {
    if (!selectedAdmin) return

    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/admins/${selectedAdmin.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          permissions: {
            canAccessBroadcast: selectedAdmin.canAccessBroadcast,
            canAccessStatistics: selectedAdmin.canAccessStatistics,
            canAccessTasks: selectedAdmin.canAccessTasks,
            canAccessShop: selectedAdmin.canAccessShop,
            canAccessWheel: selectedAdmin.canAccessWheel,
            canAccessSponsors: selectedAdmin.canAccessSponsors,
            canAccessRanks: selectedAdmin.canAccessRanks,
            canAccessRandy: selectedAdmin.canAccessRandy,
            canAccessSettings: selectedAdmin.canAccessSettings,
            canAccessAdmins: selectedAdmin.canAccessAdmins,
          }
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Admin başarıyla güncellendi')
        setShowEditDialog(false)
        setSelectedAdmin(null)
        loadAdmins()
      } else {
        toast.error(data.error || 'Admin güncellenemedi')
      }
    } catch (error) {
      console.error('Error updating admin:', error)
      toast.error('Bir hata oluştu')
    }
  }

  async function handleDeleteAdmin(admin: Admin) {
    if (!confirm(`${admin.username} adminini silmek istediğinize emin misiniz?`)) {
      return
    }

    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/admins/${admin.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Admin başarıyla silindi')
        loadAdmins()
      } else {
        toast.error(data.error || 'Admin silinemedi')
      }
    } catch (error) {
      console.error('Error deleting admin:', error)
      toast.error('Bir hata oluştu')
    }
  }

  function openEditDialog(admin: Admin) {
    setSelectedAdmin(admin)
    setShowEditDialog(true)
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard">
              <Button variant="outline" size="icon" className="border-white/20 hover:bg-white/10">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Admin Yönetimi</h1>
              <p className="text-gray-400">Admin kullanıcılarını ve yetkilerini yönetin</p>
            </div>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Yeni Admin
          </Button>
        </div>

        <Card className="bg-white/5 border-white/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-white/5">
                <TableHead className="text-white">Kullanıcı Adı</TableHead>
                <TableHead className="text-white">Rol</TableHead>
                <TableHead className="text-white">Oluşturma Tarihi</TableHead>
                <TableHead className="text-white text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="text-white font-medium">{admin.username}</TableCell>
                  <TableCell>
                    {admin.isSuperAdmin ? (
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-yellow-500" />
                        <span className="text-yellow-500 font-bold">Ana Admin</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">Admin</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-400">
                    {new Date(admin.createdAt).toLocaleDateString('tr-TR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        onClick={() => openEditDialog(admin)}
                        variant="outline"
                        size="sm"
                        className="border-white/20 hover:bg-white/10"
                        disabled={admin.isSuperAdmin}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteAdmin(admin)}
                        variant="outline"
                        size="sm"
                        className="border-red-500/20 hover:bg-red-500/10 text-red-500"
                        disabled={admin.isSuperAdmin}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Create Admin Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="bg-gray-900 border-white/20 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Yeni Admin Oluştur</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label>Kullanıcı Adı</Label>
                <Input
                  value={newAdminData.username}
                  onChange={(e) => setNewAdminData({ ...newAdminData, username: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="Kullanıcı adı"
                />
              </div>
              <div className="space-y-2">
                <Label>Şifre</Label>
                <Input
                  type="password"
                  value={newAdminData.password}
                  onChange={(e) => setNewAdminData({ ...newAdminData, password: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="Şifre"
                />
              </div>
              <div className="space-y-4">
                <Label className="text-lg">Yetkiler</Label>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-sm">{label}</span>
                      <Switch
                        checked={newAdminData.permissions[key] || false}
                        onCheckedChange={(checked) =>
                          setNewAdminData({
                            ...newAdminData,
                            permissions: { ...newAdminData.permissions, [key]: checked }
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateAdmin}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  Oluştur
                </Button>
                <Button
                  onClick={() => setShowCreateDialog(false)}
                  variant="outline"
                  className="flex-1 border-white/20 hover:bg-white/10"
                >
                  İptal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Admin Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="bg-gray-900 border-white/20 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Admin Yetkilerini Düzenle</DialogTitle>
            </DialogHeader>
            {selectedAdmin && (
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label>Kullanıcı Adı</Label>
                  <Input
                    value={selectedAdmin.username}
                    disabled
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
                <div className="space-y-4">
                  <Label className="text-lg">Yetkiler</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <span className="text-sm">{label}</span>
                        <Switch
                          checked={selectedAdmin[key as keyof Admin] as boolean}
                          onCheckedChange={(checked) =>
                            setSelectedAdmin({ ...selectedAdmin, [key]: checked })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleUpdateAdmin}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    Güncelle
                  </Button>
                  <Button
                    onClick={() => setShowEditDialog(false)}
                    variant="outline"
                    className="flex-1 border-white/20 hover:bg-white/10"
                  >
                    İptal
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
