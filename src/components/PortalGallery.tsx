import { useState } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SavedAlbum } from '../types';
import { AlbumKenanganLogo } from './AlbumKenanganLogo';

interface PortalGalleryProps {
  albums: SavedAlbum[];
  onCreateNewAlbum: () => void;
  onSelectAlbum: (album: SavedAlbum) => void;
  onEditAlbum: (album: SavedAlbum) => void;
  onDeleteAlbum: (albumId: string) => void;
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
  onShareAlbum,
  onLoadSampleAlbum,
}: PortalGalleryProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'feed'>('grid');
  const [albumToDelete, setAlbumToDelete] = useState<SavedAlbum | null>(null);

  const totalPhotos = albums.reduce((acc, alb) => acc + (alb.totalPhotos || alb.images?.length || 0), 0);

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
              <button
                onClick={() => setViewMode('feed')}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === 'feed' 
                    ? 'bg-white text-slate-900 shadow-xs font-bold' 
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Tampilan Feed Vertikal"
                id="portal-feed-btn"
              >
                <LayoutList className="w-4 h-4" />
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
        <section className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-xs mb-6" id="portal-profile-header">
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
                Koleksi album foto interaktif Anda
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
              </div>
            </div>
          </div>
        </section>

        {/* ALBUMS CONTENT */}
        {albums.length === 0 ? (
          /* EMPTY STATE (INSTAGRAM STYLE) */
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
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW (3 COLUMNS INSTAGRAM STYLE) */
          <div 
            className="grid grid-cols-3 gap-1.5 sm:gap-3" 
            id="portal-grid-container"
          >
            {albums.map((album) => {
              const coverSrc = album.coverImage || album.images?.[0]?.compressedBase64;
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

                  {/* Photo count badge and HTML tag */}
                  <div className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 flex flex-col items-end gap-1 z-10">
                    <div className="bg-black/60 backdrop-blur-xs text-white text-[9px] sm:text-[11px] font-bold px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-md flex items-center gap-1">
                      <Camera className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <span>{album.totalPhotos || album.images?.length || 0}</span>
                    </div>
                    {album.htmlSize ? (
                      <span className="bg-amber-600/85 backdrop-blur-xs text-white text-[8px] sm:text-[9px] font-semibold px-1.5 py-0.5 rounded-md hidden sm:inline-block shadow-2xs">
                        {formatSize(album.htmlSize)}
                      </span>
                    ) : null}
                  </div>

                  {/* Action buttons (Delete & Edit) in Grid View */}
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
                  </div>

                  {/* Theme badge bottom */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 sm:p-3 text-white">
                    <p className="text-[10px] sm:text-xs font-bold truncate">
                      {album.title}
                    </p>
                    <p className="text-[8px] sm:text-[10px] text-slate-300 truncate hidden sm:block">
                      {formatDate(album.createdAt)}
                    </p>
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 p-2 text-center">
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
          /* FEED VIEW (INSTAGRAM POST CARDS) */
          <div className="max-w-md mx-auto space-y-5" id="portal-feed-container">
            {albums.map((album) => {
              const coverSrc = album.coverImage || album.images?.[0]?.compressedBase64;
              return (
                <article
                  key={album.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"
                  id={`portal-feed-card-${album.id}`}
                >
                  {/* Card Header */}
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
                          <h3 className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[170px] sm:max-w-[220px]">
                            {album.title}
                          </h3>
                          {album.htmlSize ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/60">
                              {formatSize(album.htmlSize)}
                            </span>
                          ) : null}
                        </div>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-2.5 h-2.5" />
                          {formatDate(album.createdAt)} • {album.totalPhotos || album.images?.length || 0} Foto
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
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

                  {/* Card Action Bar */}
                  <div className="p-3.5 space-y-2.5">
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
                        <button
                          onClick={() => onShareAlbum(album)}
                          className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Bagikan</span>
                        </button>
                      )}
                    </div>

                    {album.subtitle && (
                      <p className="text-xs text-slate-600 italic">
                        "{album.subtitle}"
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>



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
