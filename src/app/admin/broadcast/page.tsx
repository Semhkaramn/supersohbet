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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'

interface User {
  id: string
  siteUsername: string | null
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
  const [mediaType, setMediaType] = useState<'photo' | 'video' | 'animation'>('photo')
  const [buttons, setButtons] = useState<InlineButton[]>([])
  const [newButtonText, setNewButtonText] = useState('')
  const [newButtonUrl, setNewButtonUrl] = useState('')

  // User selection
  const [sendToAll, setSendToAll] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [showUserModal, setShowUserModal] = useState(false)

  // Modal filters and search
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRank, setFilterRank] = useState<string>('all')
  const [filterMinPoints, setFilterMinPoints] = useState('')
  const [filterMaxPoints, setFilterMaxPoints] = useState('')
  const [filterMinMessages, setFilterMinMessages] = useState('')
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

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

  // Load all users when modal opens
  useEffect(() => {
    if (showUserModal && allUsers.length === 0) {
      loadAllUsers()
    }
  }, [showUserModal])

  // Filter users based on search and filters
  useEffect(() => {
    let filtered = [...allUsers]

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(user =>
        user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.firstName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Rank filter
    if (filterRank !== 'all') {
      filtered = filtered.filter(user => user.rank?.name === filterRank)
    }

    // Points filter
    if (filterMinPoints) {
      filtered = filtered.filter(user => user.points >= parseInt(filterMinPoints))
    }
    if (filterMaxPoints) {
      filtered = filtered.filter(user => user.points <= parseInt(filterMaxPoints))
    }

    // Messages filter
    if (filterMinMessages) {
      filtered = filtered.filter(user => user.messageCount >= parseInt(filterMinMessages))
    }

    setFilteredUsers(filtered)
  }, [searchQuery, filterRank, filterMinPoints, filterMaxPoints, filterMinMessages, allUsers])

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

  async function loadAllUsers() {
    setLoadingUsers(true)
    try {
      const response = await fetch('/api/admin/users/search')
      const data = await response.json()

      if (data.success) {
        setAllUsers(data.users)
        setFilteredUsers(data.users)
      }
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Kullanıcılar yüklenirken hata oluştu')
    } finally {
      setLoadingUsers(false)
    }
  }

  function handleSendToAllChange(checked: boolean) {
    setSendToAll(checked)
    if (!checked) {
      // Open modal when switching to select users
      setShowUserModal(true)
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

    // Accept images, videos, and GIFs
    const validTypes = ['image/', 'video/']
    const isValid = validTypes.some(type => file.type.startsWith(type))

    if (!isValid) {
      toast.error('Lütfen bir görsel veya video dosyası seçin')
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

        // Determine media type
        if (file.type.startsWith('video/')) {
          setMediaType('video')
        } else if (file.type === 'image/gif') {
          setMediaType('animation')
        } else {
          setMediaType('photo')
        }

        toast.success('Medya yüklendi')
      } else {
        toast.error('Medya yüklenirken hata oluştu')
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
    setMediaType('photo')
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

  function selectAllFilteredUsers() {
    const newSelected = [...selectedUsers]
    filteredUsers.forEach(user => {
      if (!newSelected.includes(user.id)) {
        newSelected.push(user.id)
      }
    })
    setSelectedUsers(newSelected)
    toast.success(`${filteredUsers.length} kullanıcı seçildi`)
  }

  function deselectAllFilteredUsers() {
    const filteredUserIds = filteredUsers.map(u => u.id)
    setSelectedUsers(selectedUsers.filter(id => !filteredUserIds.includes(id)))
    toast.success('Seçim temizlendi')
  }

  function clearAllSelections() {
    setSelectedUsers([])
    toast.success('Tüm seçimler temizlendi')
  }

  function resetFilters() {
    setSearchQuery('')
    setFilterRank('all')
    setFilterMinPoints('')
    setFilterMaxPoints('')
    setFilterMinMessages('')
  }

  async function sendBroadcast() {
    // At least one content should exist: message text or image
    if (!messageText.trim() && !imageUrl) {
      toast.error('En az bir mesaj metni veya görsel gerekli')
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
            {/* Media Upload */}
            <Card className="bg-white/5 border-white/10 p-6">
              <Label className="text-white mb-3 block">Medya (Opsiyonel)</Label>
              <div className="space-y-4">
                {imageUrl ? (
                  <div className="relative">
                    {imageFile?.type.startsWith('video/') ? (
                      <video src={imageUrl} controls className="w-full max-h-64 rounded-lg" />
                    ) : (
                      <img src={imageUrl} alt="Preview" className="w-full max-h-64 object-cover rounded-lg" />
                    )}
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
                      accept="image/*,video/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-400">
                        {uploadingImage ? 'Yükleniyor...' : 'Resim, GIF veya Video yüklemek için tıklayın'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Desteklenen: JPG, PNG, GIF, MP4, WebM
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
                  onCheckedChange={handleSendToAllChange}
                />
              </div>

              {!sendToAll && (
                <div className="space-y-3">
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-blue-200 text-sm mb-2">
                      <Users className="w-4 h-4 inline mr-1" />
                      {selectedUsers.length} kullanıcı seçildi
                    </p>
                    <Button
                      onClick={() => setShowUserModal(true)}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      Kullanıcı Seç
                    </Button>
                  </div>

                  {selectedUsers.length > 0 && (
                    <Button
                      onClick={clearAllSelections}
                      variant="outline"
                      className="w-full border-white/20"
                    >
                      Tüm Seçimleri Temizle
                    </Button>
                  )}
                </div>
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

        {/* User Selection Modal */}
        <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-gray-900 border-white/20">
            <DialogHeader>
              <DialogTitle className="text-white text-2xl">Kullanıcı Seç</DialogTitle>
              <DialogDescription className="text-gray-400">
                Mesaj göndermek istediğiniz kullanıcıları seçin
              </DialogDescription>
            </DialogHeader>

            {loadingUsers ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Filters */}
                <div className="space-y-3 mb-4">
                  <Input
                    placeholder="Kullanıcı ara (isim veya kullanıcı adı)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Select value={filterRank} onValueChange={setFilterRank}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Tüm Rütbeler" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-white/20">
                        <SelectItem value="all">Tüm Rütbeler</SelectItem>
                        {ranks.map(rank => (
                          <SelectItem key={rank.id} value={rank.name} className="text-white">
                            {rank.icon} {rank.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="grid grid-cols-2 gap-2 col-span-2">
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
                  </div>

                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min Mesaj Sayısı"
                      value={filterMinMessages}
                      onChange={(e) => setFilterMinMessages(e.target.value)}
                      className="bg-white/10 border-white/20 text-white flex-1"
                    />
                    <Button
                      onClick={resetFilters}
                      variant="outline"
                      className="border-white/20"
                    >
                      Filtreleri Temizle
                    </Button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between mb-3 p-3 bg-white/5 rounded-lg">
                  <span className="text-sm text-gray-400">
                    {selectedUsers.length} / {filteredUsers.length} kullanıcı seçildi (Toplam: {allUsers.length})
                  </span>
                  <div className="flex gap-2">
                    <Button
                      onClick={selectAllFilteredUsers}
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-xs"
                    >
                      Tümünü Seç
                    </Button>
                    <Button
                      onClick={deselectAllFilteredUsers}
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-xs"
                    >
                      Seçimi Kaldır
                    </Button>
                  </div>
                </div>

                {/* User List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-400">Kullanıcı bulunamadı</p>
                    </div>
                  ) : (
                    filteredUsers.map(user => (
                      <div
                        key={user.id}
                        onClick={() => toggleUserSelection(user.id)}
                        className={`p-4 rounded-lg cursor-pointer transition-all border ${
                          selectedUsers.includes(user.id)
                            ? 'bg-blue-500/30 border-blue-500/50'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <Checkbox
                              checked={selectedUsers.includes(user.id)}
                              onCheckedChange={() => toggleUserSelection(user.id)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-bold text-base truncate">
                                {user.siteUsername || 'Kullanıcı'}
                              </p>
                              <div className="flex flex-col text-xs text-gray-400">
                                {user.firstName && <span className="truncate">{user.firstName}</span>}
                                {user.username && <span className="truncate">@{user.username}</span>}
                              </div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                                  {user.points} puan
                                </span>
                                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                                  {user.xp} XP
                                </span>
                                <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">
                                  {user.messageCount} mesaj
                                </span>
                                {user.rank && (
                                  <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">
                                    {user.rank.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-white/10">
                  <Button
                    onClick={() => setShowUserModal(false)}
                    variant="outline"
                    className="border-white/20"
                  >
                    İptal
                  </Button>
                  <Button
                    onClick={() => {
                      setShowUserModal(false)
                      if (selectedUsers.length > 0) {
                        toast.success(`${selectedUsers.length} kullanıcı seçildi`)
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Tamam ({selectedUsers.length} kullanıcı)
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
