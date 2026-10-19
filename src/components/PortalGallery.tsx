import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Grid3X3, 
  LayoutList, 
  Camera, 
  Eye, 
  Share2, 
  Trash2, 
  Edit3, 
  Calendar, 
  Images, 
  Download, 
  ExternalLink,
  Heart,
  MessageCircle,
  Lock,
  Globe,
  Send,
  X,
  User,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SavedAlbum, AlbumComment } from '../types';
import { AlbumKenanganLogo } from './AlbumKenanganLogo';
import { 
  getLikedAlbumIds, 
  toggleAlbumLike, 
  addAlbumComment, 
  deleteAlbumComment, 
  updateAlbumPrivacy 
} from '../utils/portalStorage';

interface PortalGalleryProps {
  albums: SavedAlbum[];
  onCreateNewAlbum: () => void;
  onSelectAlbum: (album: SavedAlbum) => void;
  onEditAlbum: (album: SavedAlbum) => void;
  onDeleteAlbum: (albumId: string) => void;
  onUpdateAlbum?: (album: SavedAlbum) => void;
  onShareAlbum?: (album: SavedAlbum) => void;
  onLoadSampleAlbum?: () => void;
  onRefresh?: () => void;
}

export function PortalGallery({
  albums,
  onCreateNewAlbum,
  onSelectAlbum,
  onEditAlbum,
  onDeleteAlbum,
  onUpdateAlbum,
  onShareAlbum,
  onLoadSampleAlbum,
  onRefresh,
}: PortalGalleryProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'feed'>('feed');
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'public' | 'private'>('all');
  const [albumToDelete, setAlbumToDelete] = useState<SavedAlbum | null>(null);

  // Social states
  const [likedAlbumIds, setLikedAlbumIds] = useState<string[]>([]);
  const [activeGuestbookAlbum, setActiveGuestbookAlbum] = useState<SavedAlbum | null>(null);
  const [guestName, setGuestName] = useState<string>('');
  const [guestMessage, setGuestMessage] = useState<string>('');
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);
  const [commentFeedback, setCommentFeedback] = useState<string | null>(null);

  // Load liked status and remembered name on mount
  useEffect(() => {
    setLikedAlbumIds(getLikedAlbumIds());
    try {
      const savedName = localStorage.getItem('kamera_guest_name');
      if (savedName) setGuestName(savedName);
    } catch {
      // ignore
    }
  }, []);

  const totalPhotos = albums.reduce((acc, alb) => acc + (alb.totalPhotos || alb.images?.length || 0), 0);
  const publicCount = albums.filter(a => !a.isPrivate).length;
  const privateCount = albums.filter(a => a.isPrivate).length;

  const filteredAlbums = albums.filter(album => {
    if (privacyFilter === 'public') return !album.isPrivate;
    if (privacyFilter === 'private') return album.isPrivate;
    return true;
  });

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB HTML`;
    }
    return `${Math.round(bytes / 1024)} KB HTML`;
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Hari ini';
    const date = new Date(timestamp);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes} mnt lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} hari lalu`;
    return formatDate(timestamp);
  };

  const getAvatarBg = (name: string) => {
    const palette = [
      'bg-amber-600 text-white',
      'bg-rose-600 text-white',
      'bg-indigo-600 text-white',
      'bg-emerald-600 text-white',
      'bg-teal-600 text-white',
      'bg-sky-600 text-white',
      'bg-purple-600 text-white'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
  };

  // Like / Suka Handler (Hanya aktif untuk album Publik)
  const handleLikeToggle = async (e: React.MouseEvent, album: SavedAlbum) => {
    e.stopPropagation();
    if (album.isPrivate) return;
    const result = await toggleAlbumLike(album.id);
    if (result.isLiked) {
      setLikedAlbumIds(prev => [...prev, album.id]);
    } else {
      setLikedAlbumIds(prev => prev.filter(id => id !== album.id));
    }
    const updated = {
      ...album,
      likes: result.newLikes,
    };
    onUpdateAlbum?.(updated);
  };

  // Privacy Toggle Handler
  const handlePrivacyToggle = async (e: React.MouseEvent, album: SavedAlbum) => {
    e.stopPropagation();
    const newPrivacy = !album.isPrivate;
    const confirmed = await updateAlbumPrivacy(album.id, newPrivacy);
    const updated = {
      ...album,
      isPrivate: confirmed,
      config: { ...album.config, isPrivate: confirmed }
    };
    onUpdateAlbum?.(updated);
  };

  // Open Guestbook Modal (Hanya aktif untuk album Publik)
  const handleOpenGuestbook = (album: SavedAlbum) => {
    if (album.isPrivate) return;
    setActiveGuestbookAlbum(album);
    setCommentFeedback(null);
  };

  // Submit new comment
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGuestbookAlbum || !guestName.trim() || !guestMessage.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    setCommentFeedback(null);

    try {
      localStorage.setItem('kamera_guest_name', guestName.trim());
    } catch {
      // ignore
    }

    try {
      const updatedComments = await addAlbumComment(
        activeGuestbookAlbum.id, 
        guestName.trim(), 
        guestMessage.trim()
      );

      const updatedAlbum: SavedAlbum = {
        ...activeGuestbookAlbum,
        comments: updatedComments
      };

      setActiveGuestbookAlbum(updatedAlbum);
      onUpdateAlbum?.(updatedAlbum);
      setGuestMessage('');
      setCommentFeedback('Ucapan berhasil dikirim!');
      setTimeout(() => setCommentFeedback(null), 2500);
    } catch (err) {
      console.error('Failed to submit comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Delete a comment
  const handleDeleteComment = async (commentId: string) => {
    if (!activeGuestbookAlbum) return;
    try {
      const remaining = await deleteAlbumComment(activeGuestbookAlbum.id, commentId);
      const updatedAlbum: SavedAlbum = {
        ...activeGuestbookAlbum,
        comments: remaining
      };
      setActiveGuestbookAlbum(updatedAlbum);
      onUpdateAlbum?.(updatedAlbum);
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-slate-800 pb-28" id="portal-gallery-page">
      {/* TOP APP BAR */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 sm:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlbumKenanganLogo size="md" />
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 font-serif italic">
                album kenangan
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
              <button
                onClick={() => setViewMode('feed')}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === 'feed' 
                    ? 'bg-white text-slate-900 shadow-xs font-bold' 
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Tampilan Feed Vertikal (Instagram Style)"
                id="portal-feed-btn"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === 'grid' 
                    ? 'bg-white text-slate-900 shadow-xs font-bold' 
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Tampilan Grid 3 Kolom"
                id="portal-grid-btn"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Create Album Button */}
            <button
              onClick={onCreateNewAlbum}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              id="portal-header-create-btn"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Album</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-5">
        {/* INSTAGRAM-STYLE PROFILE & COLLECTION HEADER */}
        <section className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-xs mb-5" id="portal-profile-header">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Memory Album Cover Ring */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-[2.5px] bg-gradient-to-tr from-amber-600 via-amber-400 to-slate-900 shadow-sm">
                <div className="w-full h-full rounded-[14px] bg-white p-[2px] flex items-center justify-center overflow-hidden">
                  {albums.length > 0 && albums[0].coverImage ? (
                    <img 
                      src={albums[0].coverImage} 
                      alt="Cover" 
                      className="w-full h-full object-cover rounded-[12px]"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-100 rounded-[12px] flex items-center justify-center text-slate-400">
                      <Images className="w-6 h-6" />
                    </div>
                  )}
                </div>
              </div>
              <button 
                onClick={onCreateNewAlbum}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center border-2 border-white shadow-xs hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                title="Tambah Album Baru"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>

            {/* Profile Info & Counters */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  Galeri Kenangan
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                Koleksi album foto interaktif & media sosial kenangan
              </p>

              {/* Stats Counters */}
              <div className="flex items-center gap-5 sm:gap-8 mt-3 text-xs">
                <div>
                  <span className="font-extrabold text-slate-900 block text-sm sm:text-base">
                    {albums.length}
                  </span>
                  <span className="text-slate-400 text-[11px]">Album</span>
                </div>
                <div>
                  <span className="font-extrabold text-slate-900 block text-sm sm:text-base">
                    {totalPhotos}
                  </span>
                  <span className="text-slate-400 text-[11px]">Total Foto</span>
                </div>
                <div>
                  <span className="font-extrabold text-slate-900 block text-sm sm:text-base">
                    {albums.reduce((acc, a) => acc + (a.likes || 0), 0)}
                  </span>
                  <span className="text-slate-400 text-[11px]">Total Suka</span>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Filter Tabs (All / Public / Private) */}
          {albums.length > 0 && (
            <div className="flex items-center gap-2 mt-4 pt-3.5 border-t border-slate-100 overflow-x-auto text-xs">
              <button
                onClick={() => setPrivacyFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  privacyFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua ({albums.length})
              </button>
              <button
                onClick={() => setPrivacyFilter('public')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  privacyFilter === 'public'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Publik ({publicCount})</span>
              </button>
              <button
                onClick={() => setPrivacyFilter('private')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  privacyFilter === 'private'
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Privat ({privateCount})</span>
              </button>
            </div>
          )}
        </section>

        {/* ALBUMS CONTENT */}
        {albums.length === 0 ? (
          /* EMPTY STATE */
          <div 
            className="bg-white rounded-3xl border border-dashed border-slate-200 p-8 sm:p-14 text-center max-w-lg mx-auto my-6 space-y-4"
            id="portal-empty-state"
          >
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Camera className="w-8 h-8 stroke-[1.5]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Belum Ada Album Foto
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Abadikan momen-momen berharga Anda ke dalam album interaktif yang dapat dibaca seperti buku foto fisik.
              </p>
            </div>
            <button
              onClick={onCreateNewAlbum}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Album Sekarang</span>
            </button>
          </div>
        ) : filteredAlbums.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-500 text-xs">
            Tidak ada album dalam kategori ini.
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW (3 COLUMNS INSTAGRAM STYLE) */
          <div 
            className="grid grid-cols-3 gap-1.5 sm:gap-3" 
            id="portal-grid-container"
          >
            {filteredAlbums.map((album) => {
              const coverSrc = album.coverImage || album.images?.[0]?.compressedBase64;
              const isLiked = likedAlbumIds.includes(album.id);
              return (
                <motion.div
                  key={album.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectAlbum(album)}
                  className="group relative aspect-square bg-slate-100 rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer shadow-xs border border-slate-200/50"
                  id={`portal-album-card-${album.id}`}
                >
                  {coverSrc ? (
                    <img
                      src={coverSrc}
                      alt={album.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Images className="w-8 h-8" />
                    </div>
                  )}

                  {/* Photo count badge and Privacy indicator */}
                  <div className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 flex flex-col items-end gap-1 z-10">
                    <div className="bg-black/60 backdrop-blur-xs text-white text-[9px] sm:text-[11px] font-bold px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-md flex items-center gap-1">
                      <Camera className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <span>{album.totalPhotos || album.images?.length || 0}</span>
                    </div>

                    {album.isPrivate ? (
                      <span className="bg-slate-800/90 text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-2xs">
                        <Lock className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                        <span className="hidden sm:inline">Privat</span>
                      </span>
                    ) : (
                      <span className="bg-emerald-700/90 text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-2xs">
                        <Globe className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                        <span className="hidden sm:inline">Publik</span>
                      </span>
                    )}
                  </div>

                  {/* Action buttons (Delete, Edit, Share) in Grid View */}
                  <div className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 flex items-center gap-1 z-20">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAlbumToDelete(album);
                      }}
                      className="p-1 sm:p-1.5 bg-black/60 hover:bg-rose-600 active:scale-90 text-white rounded-md backdrop-blur-xs transition-colors cursor-pointer shadow-xs"
                      title="Hapus Album"
                      aria-label="Hapus Album"
                    >
                      <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditAlbum(album);
                      }}
                      className="p-1 sm:p-1.5 bg-black/60 hover:bg-indigo-600 active:scale-90 text-white rounded-md backdrop-blur-xs transition-colors cursor-pointer shadow-xs hidden sm:flex"
                      title="Atur / Edit Album"
                      aria-label="Atur / Edit Album"
                    >
                      <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                    {onShareAlbum && (
                      <button
                        type="button"
                        disabled={album.isPrivate}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!album.isPrivate) {
                            onShareAlbum(album);
                          }
                        }}
                        className={`p-1 sm:p-1.5 rounded-md backdrop-blur-xs transition-colors shadow-xs ${
                          album.isPrivate
                            ? 'bg-black/30 text-white/30 cursor-not-allowed'
                            : 'bg-black/60 hover:bg-emerald-600 active:scale-90 text-white cursor-pointer'
                        }`}
                        title={album.isPrivate ? 'Icon bagikan tidak aktif untuk album Privat' : 'Bagikan Album'}
                        aria-label="Bagikan Album"
                      >
                        <Share2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Theme badge bottom */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2 sm:p-3 text-white">
                    <p className="text-[10px] sm:text-xs font-bold truncate">
                      {album.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[9px] text-slate-300">
                      <span className="flex items-center gap-0.5">
                        <Heart className={`w-2.5 h-2.5 ${isLiked ? 'fill-rose-500 text-rose-500' : 'text-slate-300'}`} />
                        {album.likes || 0}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <MessageCircle className="w-2.5 h-2.5 text-slate-300" />
                        {album.comments?.length || 0}
                      </span>
                      <span className="hidden sm:inline">• {formatDate(album.createdAt)}</span>
                    </div>
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1.5 p-2 text-center pointer-events-none">
                    <Eye className="w-6 h-6 drop-shadow-sm" />
                    <span className="text-[11px] font-extrabold drop-shadow-sm hidden sm:inline-block">
                      Buka Pratinjau
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* FEED VIEW (INSTAGRAM POST CARDS) - MATCHES USER DESIGN EXACTLY */
          <div className="max-w-md mx-auto space-y-5" id="portal-feed-container">
            {filteredAlbums.map((album) => {
              const coverSrc = album.coverImage || album.images?.[0]?.compressedBase64;
              const isLiked = likedAlbumIds.includes(album.id);
              const latestComment = album.comments && album.comments.length > 0 
                ? album.comments[album.comments.length - 1] 
                : null;

              return (
                <article
                  key={album.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"
                  id={`portal-feed-card-${album.id}`}
                >
                  {/* Card Header (Top) */}
                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                        {coverSrc ? (
                          <img src={coverSrc} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[150px] sm:max-w-[200px]">
                            {album.title}
                          </h3>
                          {album.htmlSize ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/60">
                              {formatSize(album.htmlSize)}
                            </span>
                          ) : null}

                          {/* 1. LOKASI BADGE PRIVASI (PUBLIK / PRIVAT) */}
                          <button
                            type="button"
                            onClick={(e) => handlePrivacyToggle(e, album)}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                              album.isPrivate
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80'
                            }`}
                            title={album.isPrivate ? 'Klik untuk mengubah menjadi Publik' : 'Klik untuk mengubah menjadi Privat'}
                          >
                            {album.isPrivate ? (
                              <>
                                <Lock className="w-2.5 h-2.5" />
                                <span>Privat</span>
                              </>
                            ) : (
                              <>
                                <Globe className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Publik</span>
                              </>
                            )}
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-2.5 h-2.5" />
                          {formatDate(album.createdAt)} • {album.totalPhotos || album.images?.length || 0} Foto
                        </span>
                      </div>
                    </div>

                    {/* Action buttons (Edit & Delete) */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditAlbum(album)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Atur / Edit Album"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setAlbumToDelete(album)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Album"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Card Media (Clicking opens Pratinjau) */}
                  <div
                    onClick={() => onSelectAlbum(album)}
                    className="relative aspect-4/3 bg-slate-100 cursor-pointer overflow-hidden group"
                  >
                    {coverSrc ? (
                      <img
                        src={coverSrc}
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Images className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-xs text-xs font-bold flex items-center gap-1.5">
                        <Eye className="w-4 h-4" /> Buka Pratinjau
                      </div>
                    </div>
                  </div>

                  {/* 2. SOCIAL INTERACTION BAR (LANGSUNG DI BAWAH FOTO, SEBELUM TOMBOL AKSI) */}
                  {/* Likes, Comments & Views Meta */}
                  <div className="px-3.5 pt-3 pb-2 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Tombol Suka / Love (Hanya aktif untuk status Publik) */}
                      {album.isPrivate ? (
                        <button
                          type="button"
                          disabled
                          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 cursor-not-allowed opacity-60 select-none"
                          title="Tombol Suka hanya aktif untuk album Publik. Klik badge 'Privat' di atas untuk mengubah ke Publik."
                          aria-disabled="true"
                        >
                          <Heart className="w-5 h-5 text-slate-400" />
                          <span>{album.likes || 0}</span>
                          <span className="text-[11px] text-slate-400 font-normal hidden xs:inline">
                            Suka
                          </span>
                          <Lock className="w-2.5 h-2.5 text-slate-400 ml-0.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleLikeToggle(e, album)}
                          className="flex items-center gap-1.5 text-xs font-bold transition-transform active:scale-90 cursor-pointer group"
                          title={isLiked ? 'Batal Menyukai' : 'Sukai Album'}
                        >
                          <Heart
                            className={`w-5 h-5 transition-all group-hover:scale-115 ${
                              isLiked 
                                ? 'fill-rose-500 text-rose-500 scale-105' 
                                : 'text-slate-600 hover:text-rose-500'
                            }`}
                          />
                          <span className={isLiked ? 'text-rose-600 font-extrabold' : 'text-slate-700'}>
                            {album.likes || 0}
                          </span>
                          <span className="text-[11px] text-slate-400 font-normal hidden xs:inline">
                            Suka
                          </span>
                        </button>
                      )}

                      {/* Tombol Buku Ucapan / Komentar (Hanya aktif untuk status Publik) */}
                      {album.isPrivate ? (
                        <button
                          type="button"
                          disabled
                          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 cursor-not-allowed opacity-60 select-none"
                          title="Tombol Ucapan/Komentar hanya aktif untuk album Publik. Klik badge 'Privat' di atas untuk mengubah ke Publik."
                          aria-disabled="true"
                        >
                          <MessageCircle className="w-5 h-5 text-slate-400" />
                          <span>{album.comments?.length || 0}</span>
                          <span className="text-[11px] text-slate-400 font-normal hidden xs:inline">
                            Ucapan
                          </span>
                          <Lock className="w-2.5 h-2.5 text-slate-400 ml-0.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenGuestbook(album)}
                          className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-amber-600 transition-colors cursor-pointer group"
                          title="Buka Buku Ucapan & Doa"
                        >
                          <MessageCircle className="w-5 h-5 text-slate-600 group-hover:text-amber-600 group-hover:scale-110 transition-transform" />
                          <span>{album.comments?.length || 0}</span>
                          <span className="text-[11px] text-slate-400 font-normal hidden xs:inline">
                            Ucapan
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Penghitung Tayangan / View Counter */}
                    <div 
                      className="flex items-center gap-1 text-[11px] text-slate-400" 
                      title="Jumlah Dilihat"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-600">{album.views || 0}</span>
                      <span className="hidden xs:inline">Dilihat</span>
                    </div>
                  </div>

                  {/* Card Action Bar */}
                  <div className="p-3.5 space-y-3">
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => onSelectAlbum(album)}
                          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Buka Pratinjau</span>
                        </button>

                        <a
                          href={`/album/${album.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 transition-all"
                          title="Buka File HTML Mandiri di Tab Baru"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                          <span className="hidden sm:inline">HTML</span>
                        </a>

                        <a
                          href={`/album/${album.id}/download`}
                          download
                          className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 transition-all"
                          title="Unduh File HTML Mandiri (.html)"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-600" />
                          <span className="hidden sm:inline">Unduh</span>
                        </a>
                      </div>

                      {onShareAlbum && (
                        album.isPrivate ? (
                          <button
                            type="button"
                            disabled
                            className="px-3 py-2 bg-slate-100/90 border border-slate-200 text-slate-400 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-not-allowed opacity-60 select-none"
                            title="Icon bagikan hanya aktif jika status album dibuat Publik. Klik label 'Privat' di atas untuk mengubah ke Publik."
                            aria-disabled="true"
                          >
                            <Share2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Bagikan</span>
                            <Lock className="w-2.5 h-2.5 text-slate-400" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onShareAlbum(album)}
                            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 active:scale-95 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                            title="Bagikan Tautan Album Publik"
                          >
                            <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Bagikan</span>
                          </button>
                        )
                      )}
                    </div>

                    {album.subtitle && (
                      <p className="text-xs text-slate-600 italic">
                        "{album.subtitle}"
                      </p>
                    )}

                    {/* 3. PREVIEW BUKU UCAPAN TERBARU (DI BAWAH SUBTITLE) */}
                    <div className="pt-2 border-t border-slate-100">
                      {album.isPrivate ? (
                        <div className="flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-xl bg-slate-50 border border-slate-150 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>Interaksi sosial (Suka & Ucapan) nonaktif pada album Privat</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handlePrivacyToggle(e, album)}
                            className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer shrink-0"
                            title="Ubah status album menjadi Publik agar dapat disukai dan dikomentari"
                          >
                            Ubah ke Publik
                          </button>
                        </div>
                      ) : latestComment ? (
                        <div 
                          onClick={() => handleOpenGuestbook(album)}
                          className="bg-slate-50 hover:bg-slate-100/90 rounded-xl p-2.5 text-xs cursor-pointer transition-colors space-y-1"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 flex items-center gap-1">
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${getAvatarBg(latestComment.name)}`}>
                                  {latestComment.name.charAt(0).toUpperCase()}
                                </span>
                                {latestComment.name}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {formatTimeAgo(latestComment.createdAt)}
                            </span>
                          </div>
                          <p className="text-slate-600 line-clamp-1 italic pl-5">
                            "{latestComment.message}"
                          </p>

                          {album.comments && album.comments.length > 1 && (
                            <div className="pt-1 text-[10px] text-amber-700 font-semibold pl-5">
                              Lihat semua {album.comments.length} ucapan & doa...
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenGuestbook(album)}
                          className="w-full text-left py-1 text-[11px] text-slate-400 hover:text-amber-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <MessageCircle className="w-3 h-3 text-slate-400" />
                          <span>Belum ada ucapan. Jadilah yang pertama menuliskan ucapan!</span>
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* GUESTBOOK / KOMENTAR MODAL & DRAWER */}
      <AnimatePresence>
        {activeGuestbookAlbum && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                      Buku Ucapan & Doa
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate max-w-[240px] sm:max-w-xs">
                      {activeGuestbookAlbum.title}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveGuestbookAlbum(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  title="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Comments List (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100">
                {(!activeGuestbookAlbum.comments || activeGuestbookAlbum.comments.length === 0) ? (
                  <div className="py-12 text-center space-y-2 text-slate-400">
                    <Sparkles className="w-8 h-8 mx-auto text-amber-400/80" />
                    <p className="text-xs font-semibold text-slate-600">
                      Belum ada ucapan
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Tuliskan ucapan selamat, doa kenangan manis, atau apresiasi Anda untuk album ini di bawah!
                    </p>
                  </div>
                ) : (
                  activeGuestbookAlbum.comments.map((comment) => (
                    <div key={comment.id} className="pt-3 first:pt-0 group flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarBg(comment.name)}`}>
                        {comment.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {comment.name}
                          </h4>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400">
                              {formatTimeAgo(comment.createdAt)}
                            </span>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-600 p-0.5 transition cursor-pointer"
                              title="Hapus Ucapan Ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-700 mt-1 leading-relaxed bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                          {comment.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* New Comment Input Form */}
              <form onSubmit={handleSubmitComment} className="p-4 border-t border-slate-200 bg-white space-y-2.5">
                {commentFeedback && (
                  <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60 font-semibold animate-fadeIn">
                    ✓ {commentFeedback}
                  </div>
                )}
                <div className="flex gap-2">
                  <div className="relative shrink-0 w-32 sm:w-40">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value.slice(0, 40))}
                      placeholder="Nama Anda"
                      required
                      className="w-full pl-8 pr-2 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 bg-slate-50"
                    />
                  </div>
                  <input
                    type="text"
                    value={guestMessage}
                    onChange={(e) => setGuestMessage(e.target.value.slice(0, 400))}
                    placeholder="Tulis ucapan, doa, atau kesan kenangan..."
                    required
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 bg-slate-50"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !guestName.trim() || !guestMessage.trim()}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition active:scale-95 cursor-pointer shrink-0"
                    title="Kirim Ucapan"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Kirim</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {albumToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-xs w-full p-5 space-y-4 text-center shadow-xl border border-slate-100"
            >
              <div className="w-10 h-10 mx-auto rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Hapus Album Foto?
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Album "<strong>{albumToDelete.title}</strong>" akan dihapus dari galeri portal Anda. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setAlbumToDelete(null)}
                  className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    onDeleteAlbum(albumToDelete.id);
                    setAlbumToDelete(null);
                  }}
                  className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition cursor-pointer"
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
