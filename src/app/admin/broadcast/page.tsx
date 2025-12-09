'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Send,
  Image as ImageIcon,
  Bold,
  Italic,
  Code,
  Link as LinkIcon,
  X,
  Plus,
  Search,
  Filter,
  Users,
  UserCheck,
  ArrowLeft,
  Eye,
  EyeOff
} from 'lucide-react'
import Link from 'next/link'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface User {
  id: string
  telegramId: string
  username: string | null
  firstName: string | null
  points: number
  xp: number
  messageCount: number
  rank: { name: string } | null
  isBanned: boolean
}

interface InlineButton {
  text: string
  url: string
}

export default function BroadcastPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Message content
  const [messageText, setMessageText] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [buttons, setButtons] = useState<InlineButton[]>([])
  const [newButtonText, setNewButtonText] = useState('')
  const [newButtonUrl, setNewButtonUrl] = useState('')

  // User selection
  const [sendToAll, setSendToAll] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRank, setFilterRank] = useState<string>('all')
  const [filterMinPoints, setFilterMinPoints] = useState('')
  const [filterMaxPoints, setFilterMaxPoints] = useState('')
  const [filterMinMessages, setFilterMinMessages] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [showUserList, setShowUserList] = useState(false)

  // Ranks for filter
  const [ranks, setRanks] = useState<any[]>([])

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    loadRanks()
  }, [])

  async function loadRanks() {
    try {
      const response = await fetch('/api/admin/ranks')
      const data = await response.json()
      if (data.success) {
        setRanks(data.ranks)
      }
    } catch (error) {
      console.error('Error loading ranks:', error)
    }
  }

  async function searchUsers() {
    setLoadingUsers(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (filterRank !== 'all') params.append('rank', filterRank)
      if (filterMinPoints) params.append('minPoints', filterMinPoints)
      if (filterMaxPoints) params.append('maxPoints', filterMaxPoints)
      if (filterMinMessages) params.append('minMessages', filterMinMessages)

      const response = await fetch(`/api/admin/users/search?${params}`)
      const data = await response.json()

      if (data.success) {
        setUsers(data.users)
        setFilteredUsers(data.users)
        setShowUserList(true)
      }
    } catch (error) {
      console.error('Error searching users:', error)
      toast.error('Kullanıcılar yüklenirken hata oluştu')
    } finally {
      setLoadingUsers(false)
    }
  }

  function insertFormatting(format: string) {
    const textarea = document.getElementById('message-text') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = messageText.substring(start, end)

    let formattedText = ''
    switch (format) {
      case 'bold':
        formattedText = `<b>${selectedText || 'kalın metin'}</b>`
        break
      case 'italic':
        formattedText = `<i>${selectedText || 'italik metin'}</i>`
        break
      case 'code':
        formattedText = `<code>${selectedText || 'kod'}</code>`
        break
      case 'spoiler':
        formattedText = `<span class="tg-spoiler">${selectedText || 'gizli metin'}</span>`
        break
      case 'link':
        formattedText = `<a href="URL">${selectedText || 'link metni'}</a>`
        break
    }

    const newText = messageText.substring(0, start) + formattedText + messageText.substring(end)
    setMessageText(newText)
  }

  function insertTag(tag: string) {
    const newText = messageText + ` {${tag}}`
    setMessageText(newText)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Lütfen bir resim dosyası seçin')
      return
    }

    setImageFile(file)
    setUploadingImage(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      if (data.success) {
        setImageUrl(data.url)
        toast.success('Resim yüklendi')
      } else {
        toast.error('Resim yüklenirken hata oluştu')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Resim yüklenirken hata oluştu')
    } finally {
      setUploadingImage(false)
    }
  }

  function removeImage() {
    setImageUrl('')
    setImageFile(null)
  }

  function addButton() {
    if (!newButtonText || !newButtonUrl) {
      toast.error('Buton metni ve URL gerekli')
      return
    }

    setButtons([...buttons, { text: newButtonText, url: newButtonUrl }])
    setNewButtonText('')
    setNewButtonUrl('')
    toast.success('Buton eklendi')
  }

  function removeButton(index: number) {
    setButtons(buttons.filter((_, i) => i !== index))
  }

  function toggleUserSelection(userId: string) {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId))
    } else {
      setSelectedUsers([...selectedUsers, userId])
    }
  }

  function selectAllUsers() {
    setSelectedUsers(filteredUsers.map(u => u.id))
  }

  function deselectAllUsers() {
    setSelectedUsers([])
  }

  async function sendBroadcast() {
    if (!messageText.trim()) {
      toast.error('Mesaj metni gerekli')
      return
    }

    if (!sendToAll && selectedUsers.length === 0) {
      toast.error('En az bir kullanıcı seçmelisiniz')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          imageUrl,
          buttons,
          sendToAll,
          userIds: sendToAll ? [] : selectedUsers
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success(`Mesaj ${data.sentCount} kullanıcıya gönderildi!`)
        // Reset form
        setMessageText('')
        setImageUrl('')
        setImageFile(null)
        setButtons([])
        setSelectedUsers([])
      } else {
        toast.error(data.error || 'Mesaj gönderilemedi')
      }
    } catch (error) {
      console.error('Error sending broadcast:', error)
      toast.error('Mesaj gönderilirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/dashboard">
            <Button variant="outline" size="icon" className="border-white/20">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Toplu Mesaj Gönder</h1>
            <p className="text-gray-400">Kullanıcılara özel mesajlar gönderin</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Message Composer */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Upload */}
            <Card className="bg-white/5 border-white/10 p-6">
              <Label className="text-white mb-3 block">Görsel (Opsiyonel)</Label>
              <div className="space-y-4">
                {imageUrl ? (
                  <div className="relative">
                    <img src={imageUrl} alt="Preview" className="w-full max-h-64 object-cover rounded-lg" />
                    <Button
                      onClick={removeImage}
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center">
                    <input
                      type="file"
                      id="image-upload"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-400">
                        {uploadingImage ? 'Yükleniyor...' : 'Resim yüklemek için tıklayın'}
                      </p>
                    </label>
                  </div>
                )}
              </div>
            </Card>

            {/* Message Text */}
            <Card className="bg-white/5 border-white/10 p-6">
              <Label className="text-white mb-3 block">Mesaj Metni</Label>

              {/* Formatting Toolbar */}
              <div className="flex flex-wrap gap-2 mb-3 p-3 bg-white/5 rounded-lg">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => insertFormatting('bold')}
                  className="border-white/20"
                  title="Kalın"
                >
                  <Bold className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => insertFormatting('italic')}
                  className="border-white/20"
                  title="İtalik"
                >
                  <Italic className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => insertFormatting('code')}
                  className="border-white/20"
                  title="Kod"
                >
                  <Code className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => insertFormatting('spoiler')}
                  className="border-white/20"
                  title="Spoiler"
                >
                  <EyeOff className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => insertFormatting('link')}
                  className="border-white/20"
                  title="Link"
                >
                  <LinkIcon className="w-4 h-4" />
                </Button>

                <div className="border-l border-white/20 mx-2" />

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => insertTag('username')}
                  className="border-white/20"
                  title="Kullanıcı Adı"
                >
                  {'{username}'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => insertTag('firstname')}
                  className="border-white/20"
                  title="İsim"
                >
                  {'{firstname}'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => insertTag('points')}
                  className="border-white/20"
                  title="Puan"
                >
                  {'{points}'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => insertTag('rank')}
                  className="border-white/20"
                  title="Rütbe"
                >
                  {'{rank}'}
                </Button>
              </div>

              <Textarea
                id="message-text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Mesajınızı buraya yazın... HTML etiketleri kullanabilirsiniz."
                className="bg-white/10 border-white/20 text-white min-h-[200px]"
              />
              <p className="text-xs text-gray-400 mt-2">
                HTML etiketleri desteklenir. Tagler: {'{username}'}, {'{firstname}'}, {'{points}'}, {'{rank}'}
              </p>
            </Card>

            {/* Buttons */}
            <Card className="bg-white/5 border-white/10 p-6">
              <Label className="text-white mb-3 block">Butonlar (Opsiyonel)</Label>

              <div className="space-y-3">
                {buttons.map((button, index) => (
                  <div key={index} className="flex items-center gap-2 bg-white/10 p-3 rounded-lg">
                    <div className="flex-1">
                      <p className="text-white font-medium">{button.text}</p>
                      <p className="text-gray-400 text-sm">{button.url}</p>
                    </div>
                    <Button
                      onClick={() => removeButton(index)}
                      size="icon"
                      variant="destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="Buton metni"
                    value={newButtonText}
                    onChange={(e) => setNewButtonText(e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                  />
                  <Input
                    placeholder="Buton URL'si"
                    value={newButtonUrl}
                    onChange={(e) => setNewButtonUrl(e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <Button
                  onClick={addButton}
                  variant="outline"
                  className="w-full border-white/20"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Buton Ekle
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Column - User Selection */}
          <div className="space-y-6">
            {/* Send To Options */}
            <Card className="bg-white/5 border-white/10 p-6">
              <Label className="text-white mb-3 block">Alıcılar</Label>

              <div className="flex items-center justify-between mb-4">
                <span className="text-white">Tüm Kullanıcılara Gönder</span>
                <Switch
                  checked={sendToAll}
                  onCheckedChange={(checked) => {
                    setSendToAll(checked)
                    if (checked) setShowUserList(false)
                  }}
                />
              </div>

              {!sendToAll && (
                <>
                  <div className="space-y-3 mb-4">
                    <Input
                      placeholder="Kullanıcı ara..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />

                    <Select value={filterRank} onValueChange={setFilterRank}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Rütbe Filtrele" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tüm Rütbeler</SelectItem>
                        {ranks.map(rank => (
                          <SelectItem key={rank.id} value={rank.id}>{rank.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Min Puan"
                        value={filterMinPoints}
                        onChange={(e) => setFilterMinPoints(e.target.value)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                      <Input
                        type="number"
                        placeholder="Max Puan"
                        value={filterMaxPoints}
                        onChange={(e) => setFilterMaxPoints(e.target.value)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <Input
                      type="number"
                      placeholder="Min Mesaj Sayısı"
                      value={filterMinMessages}
                      onChange={(e) => setFilterMinMessages(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <Button
                    onClick={searchUsers}
                    className="w-full mb-4"
                    disabled={loadingUsers}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    {loadingUsers ? 'Aranıyor...' : 'Kullanıcıları Ara'}
                  </Button>

                  {showUserList && (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-400">
                          {selectedUsers.length} / {filteredUsers.length} kullanıcı seçildi
                        </span>
                        <div className="flex gap-2">
                          <Button
                            onClick={selectAllUsers}
                            size="sm"
                            variant="outline"
                            className="border-white/20 text-xs"
                          >
                            Tümünü Seç
                          </Button>
                          <Button
                            onClick={deselectAllUsers}
                            size="sm"
                            variant="outline"
                            className="border-white/20 text-xs"
                          >
                            Temizle
                          </Button>
                        </div>
                      </div>

                      <div className="max-h-96 overflow-y-auto space-y-2">
                        {filteredUsers.map(user => (
                          <div
                            key={user.id}
                            onClick={() => toggleUserSelection(user.id)}
                            className={`p-3 rounded-lg cursor-pointer transition-all ${
                              selectedUsers.includes(user.id)
                                ? 'bg-blue-500/30 border-blue-500/50'
                                : 'bg-white/5 border-white/10'
                            } border`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-white font-medium">
                                  {user.firstName || user.username || 'İsimsiz'}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {user.points} puan • {user.messageCount} mesaj
                                </p>
                              </div>
                              {selectedUsers.includes(user.id) && (
                                <UserCheck className="w-5 h-5 text-blue-400" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </Card>

            {/* Send Button */}
            <Button
              onClick={sendBroadcast}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              size="lg"
            >
              <Send className="w-5 h-5 mr-2" />
              {loading ? 'Gönderiliyor...' : 'Mesajı Gönder'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
