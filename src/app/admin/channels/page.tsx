'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, Plus, Edit, Trash2, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Channel {
  id: string
  channelId: string
  channelName: string
  channelLink: string
  isActive: boolean
  order: number
}

export default function AdminChannelsPage() {
  const router = useRouter()
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null)

  const [formData, setFormData] = useState({
    channelId: '',
    channelName: '',
    channelLink: '',
    order: 0
  })

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    loadChannels()
  }, [])

  async function loadChannels() {
    try {
      const response = await fetch('/api/admin/channels')
      const data = await response.json()
      setChannels(data.channels || [])
    } catch (error) {
      console.error('Error loading channels:', error)
      toast.error('Kanallar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  function openDialog(channel?: Channel) {
    if (channel) {
      setEditingChannel(channel)
      setFormData({
        channelId: channel.channelId,
        channelName: channel.channelName,
        channelLink: channel.channelLink,
        order: channel.order
      })
    } else {
      setEditingChannel(null)
      setFormData({
        channelId: '',
        channelName: '',
        channelLink: '',
        order: channels.length
      })
    }
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      const url = editingChannel
        ? `/api/admin/channels/${editingChannel.id}`
        : '/api/admin/channels'

      const method = editingChannel ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success || data.channel) {
        toast.success(editingChannel ? 'Kanal güncellendi' : 'Kanal eklendi')
        setDialogOpen(false)
        loadChannels()
      } else {
        toast.error(data.error || 'İşlem başarısız')
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Bir hata oluştu')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu kanalı silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch(`/api/admin/channels/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Kanal silindi')
        loadChannels()
      } else {
        toast.error(data.error || 'Silme başarısız')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Bir hata oluştu')
    }
  }

  async function toggleActive(id: string, currentActive: boolean) {
    try {
      const response = await fetch(`/api/admin/channels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive })
      })

      const data = await response.json()

      if (data.success || data.channel) {
        toast.success('Durum güncellendi')
        loadChannels()
      } else {
        toast.error(data.error || 'Güncelleme başarısız')
      }
    } catch (error) {
      console.error('Toggle error:', error)
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
      <div className="max-w-5xl mx-auto">
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
              <MessageSquare className="w-8 h-8" />
              Kanal Yönetimi
            </h1>
            <p className="text-gray-400 mt-1">Zorunlu kanalları yönetin</p>
          </div>
          <Button
            onClick={() => openDialog()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni Kanal Ekle
          </Button>
        </div>

        {/* Channels List */}
        <div className="space-y-3">
          {channels.length === 0 ? (
            <Card className="bg-white/5 border-white/10 p-12 text-center">
              <MessageSquare className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Henüz kanal eklenmemiş</p>
            </Card>
          ) : (
            channels.map((channel) => (
              <Card key={channel.id} className="bg-white/5 border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">{channel.channelName}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        channel.isActive
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {channel.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">{channel.channelId}</p>
                    <a
                      href={channel.channelLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 text-sm hover:underline"
                    >
                      {channel.channelLink}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActive(channel.id, channel.isActive)}
                      className="border-white/20 hover:bg-white/10"
                    >
                      {channel.isActive ? 'Devre Dışı' : 'Aktif Et'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDialog(channel)}
                      className="border-white/20 hover:bg-white/10"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(channel.id)}
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingChannel ? 'Kanalı Düzenle' : 'Yeni Kanal Ekle'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="channelId" className="text-white">Kanal ID</Label>
              <Input
                id="channelId"
                value={formData.channelId}
                onChange={(e) => setFormData({ ...formData, channelId: e.target.value })}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="@kanaladi veya -1001234567890"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Kanal username'i (@kanaladi) veya kanal ID'si (-1001234567890)
              </p>
            </div>

            <div>
              <Label htmlFor="channelName" className="text-white">Kanal Adı</Label>
              <Input
                id="channelName"
                value={formData.channelName}
                onChange={(e) => setFormData({ ...formData, channelName: e.target.value })}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="Örnek Kanal"
                required
              />
            </div>

            <div>
              <Label htmlFor="channelLink" className="text-white">Kanal Linki</Label>
              <Input
                id="channelLink"
                value={formData.channelLink}
                onChange={(e) => setFormData({ ...formData, channelLink: e.target.value })}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="https://t.me/kanaladi"
                required
              />
            </div>

            <div>
              <Label htmlFor="order" className="text-white">Sıralama</Label>
              <Input
                id="order"
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
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
                {editingChannel ? 'Güncelle' : 'Ekle'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
