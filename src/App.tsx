import React, { useState, useRef, DragEvent, ChangeEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Upload, 
  Download, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Sparkles, 
  Layers, 
  Eye, 
  Check, 
  Info, 
  Smartphone, 
  BookOpen, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Image as ImageIcon,
  HelpCircle,
  Minimize2,
  FileText,
  Settings,
  Grid,
  Share2,
  Copy,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import { ImageItem, AlbumTheme, AlbumTransition, AlbumConfig } from './types';
import { compileAlbumHTML, chunkImages } from './utils/compiler';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  // Navigation tab state for mobile viewports (Configure vs Preview)
  const [activeTab, setActiveTab] = useState<'configure' | 'preview'>('configure');

  // Album Configurations
  const [title, setTitle] = useState<string>('Petualangan Musim Panas');
  const [subtitle, setSubtitle] = useState<string>('Kumpulan kenangan indah diabadikan bersama');
  const [theme, setTheme] = useState<AlbumTheme>('vintage');
  const [transition, setTransition] = useState<AlbumTransition>('slide');
  const [showPageNumbers, setShowPageNumbers] = useState<boolean>(false);
  const [coverImageId, setCoverImageId] = useState<string>('');
  const [autoplay, setAutoplay] = useState<boolean>(false);
  const [autoplayInterval, setAutoplayInterval] = useState<number>(5);
  const [photosPerPage, setPhotosPerPage] = useState<number>(4);

  // Image State
  const [images, setImages] = useState<ImageItem[]>([]);
  const [compressing, setCompressing] = useState<boolean>(false);
  const [compressProgress, setCompressProgress] = useState<number>(0);
  const [compressMessage, setCompressMessage] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Preview State
  const [previewPage, setPreviewPage] = useState<number>(0); // 0 = Cover, 1+ = Page Numbers
  const [lightboxImage, setLightboxImage] = useState<ImageItem | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setIsPanning(false);
  }, [lightboxImage]);

  // Sharing State
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate stats
  const originalTotalSize = images.reduce((acc, img) => acc + img.originalSize, 0);
  const compressedTotalSize = images.reduce((acc, img) => acc + img.compressedSize, 0);
  const sizeSavings = originalTotalSize > 0 
    ? Math.round(((originalTotalSize - compressedTotalSize) / originalTotalSize) * 100) 
    : 0;

  // Handle Drag Events
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFiles(e.dataTransfer.files);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFiles(e.target.files);
    }
  };

  // WebP Image Resizing & Compression Engine (Client-side)
  const compressSingleImage = (file: File): Promise<ImageItem> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Max dimension: 1200px (standard specified requirement)
          const MAX_DIM = 1200;
          let width = img.width;
          let height = img.height;

          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          // Create canvas for rendering and downscaling
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Gagal menginisialisasi canvas context.'));
            return;
          }

          // Draw image to canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to WebP format (target quality 75-80%)
          const compressedBase64 = canvas.toDataURL('image/webp', 0.78);

          // Measure compressed size in Bytes from Base64 string length
          const stringLength = compressedBase64.length - 'data:image/webp;base64,'.length;
          const compressedSize = Math.round(stringLength * 0.75);

          // Orientation categorization
          let orientation: 'portrait' | 'landscape' | 'square' = 'square';
          if (width > height) {
            orientation = 'landscape';
          } else if (height > width) {
            orientation = 'portrait';
          }

          resolve({
            id: 'photo_' + Math.random().toString(36).substr(2, 9),
            name: file.name,
            originalSize: file.size,
            compressedSize,
            compressedBase64,
            width,
            height,
            orientation,
            caption: ''
          });
        };
        img.onerror = () => reject(new Error(`Gagal membaca file gambar: ${file.name}`));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error(`Gagal memuat buffer file: ${file.name}`));
      reader.readAsDataURL(file);
    });
  };

  const processSelectedFiles = async (fileList: FileList) => {
    // Limits: Max 40 photos
    const currentCount = images.length;
    const incomingCount = fileList.length;
    
    if (currentCount + incomingCount > 40) {
      alert(`Batas maksimal album adalah 40 foto. Anda mencoba menambahkan total ${currentCount + incomingCount} foto. File akan dibatasi otomatis.`);
    }

    const availableSlots = 40 - currentCount;
    const filesToProcess = Array.from(fileList).slice(0, availableSlots);

    if (filesToProcess.length === 0) return;

    setCompressing(true);
    setCompressProgress(0);

    const newlyCompressed: ImageItem[] = [];

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      setCompressProgress(Math.round((i / filesToProcess.length) * 100));
      setCompressMessage(`Mengompresi ${file.name} (${i + 1}/${filesToProcess.length})...`);
      
      try {
        const compressedItem = await compressSingleImage(file);
        newlyCompressed.push(compressedItem);
      } catch (error) {
        console.error(error);
      }
    }

    setImages(prev => {
      const updated = [...prev, ...newlyCompressed];
      // Automatically set cover image if not set yet
      if (updated.length > 0 && !coverImageId) {
        setCoverImageId(updated[0].id);
      }
      return updated;
    });

    setCompressing(false);
    setCompressProgress(100);
    setCompressMessage('Selesai mengompresi foto!');
  };

  // Reordering & Captions Handlers
  const moveImage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === images.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...images];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setImages(updated);
    setPreviewPage(0); // Reset preview page to cover
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const updated = prev.filter(img => img.id !== id);
      if (coverImageId === id) {
        setCoverImageId(updated.length > 0 ? updated[0].id : '');
      }
      return updated;
    });
    setPreviewPage(0); // Reset preview page to cover
  };

  const handleCaptionChange = (id: string, caption: string) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, caption } : img));
  };

  // Dynamic Paging calculations
  const chunkedPages = chunkImages(images, photosPerPage);
  const totalPages = chunkedPages.length;

  // Handle preview navigation
  const nextPreview = () => {
    if (previewPage < totalPages) {
      setPreviewPage(prev => prev + 1);
    }
  };

  const prevPreview = () => {
    if (previewPage > 0) {
      setPreviewPage(prev => prev - 1);
    }
  };

  // Slideshow Autoplay Effect inside React preview simulator
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (autoplay && totalPages > 0) {
      timer = setInterval(() => {
        setPreviewPage(prev => {
          if (prev >= totalPages) {
            return 0; // loop back to Cover
          }
          return prev + 1;
        });
      }, autoplayInterval * 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [autoplay, autoplayInterval, totalPages]);

  // Trigger HTML Bundle Download
  const handleDownloadAlbum = () => {
    if (images.length === 0) {
      alert('Unggah setidaknya 1 foto terlebih dahulu sebelum mengunduh album.');
      return;
    }

    const config: AlbumConfig = {
      title,
      subtitle,
      theme,
      transition,
      showPageNumbers,
      coverImageId,
      autoplay,
      autoplayInterval,
      photosPerPage
    };

    const compiledHTML = compileAlbumHTML(images, config);
    const blob = new Blob([compiledHTML], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    // Create clean download link
    const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'album_foto';
    const link = document.createElement('a');
    link.href = url;
    link.download = `album_${cleanTitle}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Trigger Online Share Link generation
  const handleShareAlbum = async () => {
    if (images.length === 0) {
      alert('Unggah setidaknya 1 foto terlebih dahulu sebelum membuat link berbagi.');
      return;
    }

    setIsSharing(true);
    setShareError(null);
    setShareUrl(null);
    setShowShareModal(true);

    const config: AlbumConfig = {
      title,
      subtitle,
      theme,
      transition,
      showPageNumbers,
      coverImageId,
      autoplay,
      autoplayInterval,
      photosPerPage
    };

    try {
      const response = await fetch('/api/album', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ images, config })
      });

      if (!response.ok) {
        throw new Error('Gagal menyimpan album ke server.');
      }

      const data = await response.json();
      const generatedUrl = data.url || (window.location.origin + '/album/' + data.id);
      setShareUrl(generatedUrl);
    } catch (err: any) {
      console.error(err);
      setShareError(err.message || 'Gagal membuat tautan album.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Helpers to render file sizes beautifully
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = 1;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Preview styling setups
  const getThemeStyles = () => {
    switch (theme) {
      case 'vintage':
        return {
          bg: '#f4efe6',
          text: '#2c221e',
          accent: '#8c6239',
          cardBg: '#fbf9f5',
          border: 'border-[#e0d5c1]',
          font: 'font-serif'
        };
      case 'dark':
        return {
          bg: '#121214',
          text: '#f3f4f6',
          accent: '#a78bfa',
          cardBg: '#1c1c1f',
          border: 'border-[#2e2e33]',
          font: 'font-sans'
        };
      case 'aesthetic':
        return {
          bg: '#f0f3f0',
          text: '#2d3732',
          accent: '#6b8e23',
          cardBg: '#ffffff',
          border: 'border-[#e2e8f0]',
          font: 'font-sans'
        };
      case 'modern':
      default:
        return {
          bg: '#f9fafb',
          text: '#111827',
          accent: '#3b82f6',
          cardBg: '#ffffff',
          border: 'border-[#f3f4f6]',
          font: 'font-sans'
        };
    }
  };

  // Lightbox Interactive Zoom and Pan Helpers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomScale(prev => Math.min(prev + 0.25, 4));
    } else {
      setZoomScale(prev => {
        const next = Math.max(prev - 0.25, 1);
        if (next === 1) setPanOffset({ x: 0, y: 0 });
        return next;
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomScale > 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && zoomScale > 1) {
      e.preventDefault();
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  const handleMouseUpOrLeave = () => {
    setIsPanning(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoomScale > 1 && e.touches.length === 1) {
      setIsPanning(true);
      setPanStart({
        x: e.touches[0].clientX - panOffset.x,
        y: e.touches[0].clientY - panOffset.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPanning && zoomScale > 1 && e.touches.length === 1) {
      setPanOffset({
        x: e.touches[0].clientX - panStart.x,
        y: e.touches[0].clientY - panStart.y
      });
    }
  };

  const themeStyles = getThemeStyles();
  const currentCoverImage = images.find(img => img.id === coverImageId) || images[0];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col antialiased" id="main-container">
      
      {/* MINIMALIST HEADER BAR */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 px-6 py-4" id="app-header">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 text-white p-2 rounded-xl flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-normal text-slate-900 lowercase leading-none" style={{ fontFamily: "'Dancing Script', cursive" }}>
                album kenangan
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">Generator Album Foto Offline-First</p>
            </div>
          </div>
          
          {/* Subtle information tag & PWA button */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 font-semibold">
              <span>Kompresi WebP Lokal</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full" />
              <span>Maks 40 Foto</span>
            </div>
            <PWAInstallButton />
          </div>
        </div>
      </header>

      {/* CORE WORKSPACE */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6" id="workspace">
        
        {/* RESPONSIVE SEGMENTED TAB SWITCHER FOR MOBILE */}
        <div className="lg:hidden w-full bg-slate-100 p-1 rounded-xl flex" id="mobile-tab-switcher">
          <button
            onClick={() => setActiveTab('configure')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'configure' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" /> 1. Atur Album
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 relative ${
              activeTab === 'preview' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Eye className="w-4 h-4" /> 2. Pratinjau & Simpan
            {images.length > 0 && (
              <span className="absolute top-2 right-4 w-2 h-2 bg-indigo-500 rounded-full" />
            )}
          </button>
        </div>

        {/* WORKSPACE LAYOUT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* COLUMN 1: FORM CONFIGURATION & IMAGE QUEUE */}
          <section 
            className={`lg:col-span-7 flex flex-col gap-6 ${activeTab === 'configure' ? 'block' : 'hidden lg:block'}`} 
            id="configure-step-section"
          >
            {/* ALBUM CONFIG SECTION */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-5" id="design-card">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                <Settings className="w-4 h-4 text-slate-400" />
                <h2 className="font-extrabold text-slate-900 text-sm tracking-tight">Kustomisasi Konten & Tema</h2>
              </div>

              <div className="space-y-4">
                {/* Title and Subtitle in one elegant block */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Judul Utama</label>
                    <input 
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value.slice(0, 80))}
                      placeholder="Judul perjalanan atau acara"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-950/10 focus:border-slate-800 bg-slate-50/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Subjudul / Memo Singkat</label>
                    <input 
                      type="text"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value.slice(0, 160))}
                      placeholder="Deskripsi singkat atau tanggal"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-950/10 focus:border-slate-800 bg-slate-50/50"
                    />
                  </div>
                </div>

                {/* Theme Selector: Redesigned to be ultra compact and sleek */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tema Warna Album</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'vintage', label: 'Vintage Beige', preview: '#f4efe6' },
                      { id: 'modern', label: 'Minimalist Light', preview: '#f9fafb' },
                      { id: 'dark', label: 'Elegant Dark', preview: '#121214' },
                      { id: 'aesthetic', label: 'Sage Clean', preview: '#f0f3f0' }
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id as AlbumTheme)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-left cursor-pointer transition-all ${
                          theme === t.id 
                            ? 'border-slate-800 bg-slate-50 shadow-xs' 
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <span 
                          style={{ backgroundColor: t.preview }}
                          className="w-5 h-5 rounded-md border border-slate-200/50 block shrink-0" 
                        />
                        <span className="text-[11px] font-bold text-slate-700 truncate">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transition style & toggle in one row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Efek Animasi Halaman</label>
                    <div className="bg-slate-100 p-0.5 rounded-lg flex gap-1">
                      {[
                        { id: 'slide', label: 'Geser Layar' },
                        { id: 'fade', label: 'Soft Fade' }
                      ].map((tr) => (
                        <button
                          key={tr.id}
                          onClick={() => setTransition(tr.id as AlbumTransition)}
                          className={`flex-1 py-1 px-2.5 rounded-md text-[10px] font-bold text-center cursor-pointer transition-all ${
                            transition === tr.id
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {tr.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col justify-end">
                    <button
                      onClick={() => setShowPageNumbers(!showPageNumbers)}
                      className={`flex items-center justify-between p-1.5 px-3 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-200/60 transition-all text-left w-full cursor-pointer`}
                    >
                      <div>
                        <span className="text-[11px] font-bold text-slate-700">Tampilkan Indikator Halaman</span>
                        <p className="text-[9px] text-slate-400">Tulis indeks angka di bawah layar</p>
                      </div>
                      <div className={`w-8 h-4 flex items-center rounded-full p-0.5 transition-colors ${
                        showPageNumbers ? 'bg-slate-900' : 'bg-slate-300'
                      }`}>
                        <div className={`bg-white w-3 h-3 rounded-full shadow-xs transform duration-200 ease-in-out ${
                          showPageNumbers ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </div>
                    </button>
                  </div>
                </div>

                {/* Cover Image Customizer */}
                {images.length > 0 && (
                  <div className="pt-2 border-t border-slate-50">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Foto Background Sampul Depan</label>
                    <select
                      value={coverImageId}
                      onChange={(e) => {
                        setCoverImageId(e.target.value);
                        setPreviewPage(0); // Reset preview to cover
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-950/10 bg-white"
                    >
                      {images.map((img, i) => (
                        <option key={img.id} value={img.id}>
                          {`Foto ${i + 1}: ${img.name.slice(0, 30)}${img.name.length > 30 ? '...' : ''} (${img.orientation === 'portrait' ? 'Potret' : 'Lansekap'})`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* UPLOAD & COMPRESSION CONTAINER */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4" id="upload-manager-card">
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                <div className="flex items-center gap-2">
                  <Grid className="w-4 h-4 text-slate-400" />
                  <h2 className="font-extrabold text-slate-900 text-sm tracking-tight">Koleksi Foto Album</h2>
                </div>
                <span className="text-[11px] bg-slate-100 text-slate-600 font-extrabold px-2 py-0.5 rounded-md">
                  {images.length} / 40 Foto
                </span>
              </div>

              {/* Minimalist Uplink Dropzone */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileInput}
                className={`border border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                  isDragging 
                    ? 'border-slate-800 bg-slate-50/50' 
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/30'
                }`}
              >
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept="image/*"
                  className="hidden"
                />
                <Upload className="w-5 h-5 text-slate-400" />
                <div>
                  <span className="text-xs font-bold text-slate-700 block">Pilih atau Seret Foto Anda</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Format JPG, PNG, WEBP (Maksimal 40 foto sekaligus)</span>
                </div>
              </div>

              {/* Compression Engine State Loading Bar */}
              {compressing && (
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl" id="progress-monitor">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="animate-spin rounded-full h-3 w-3 border-2 border-slate-900 border-t-transparent inline-block" />
                      {compressMessage}
                    </span>
                    <span>{compressProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                    <div className="bg-slate-900 h-full transition-all duration-200" style={{ width: `${compressProgress}%` }} />
                  </div>
                </div>
              )}

              {/* CLEAN & MINI PHOTO MANAGEMENT LIST */}
              {images.length > 0 && (
                <div className="space-y-3 pt-2" id="photo-list-container">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Daftar Foto dalam Album</span>
                  
                  <div className="max-h-[340px] overflow-y-auto pr-1 space-y-2 divide-y divide-slate-100">
                    {images.map((img, i) => {
                      const originalKB = Math.round(img.originalSize / 1024);
                      const compressedKB = Math.round(img.compressedSize / 1024);
                      const savingPct = Math.round(((img.originalSize - img.compressedSize) / img.originalSize) * 100);

                      return (
                        <div key={img.id} className="flex gap-3 pt-2 first:pt-0 items-center">
                          {/* Minimal Thumbnail with label badge inside */}
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 border border-slate-100 relative shrink-0">
                            <img src={img.compressedBase64} alt={img.name} className="w-full h-full object-cover animate-fade-in" />
                            <div className="absolute top-0.5 left-0.5 bg-black/60 text-white text-[8px] font-bold px-1 rounded-sm leading-none">
                              {i + 1}
                            </div>
                            {coverImageId === img.id && (
                              <div className="absolute bottom-0 left-0 right-0 bg-slate-900 text-white text-[7px] font-bold text-center py-0.5 leading-none uppercase">
                                Sampul
                              </div>
                            )}
                          </div>

                          {/* Details and Inputs with very high density & minimal margins */}
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-500 font-bold truncate max-w-[120px] sm:max-w-[180px]">{img.name}</span>
                                <span className="text-[8px] font-extrabold px-1 py-0.5 rounded bg-slate-100 text-slate-500 uppercase leading-none">
                                  {img.orientation === 'portrait' ? 'Potret' : img.orientation === 'landscape' ? 'Lansekap' : 'Kotak'}
                                </span>
                                <span className="text-[9px] font-semibold text-emerald-600">
                                  {compressedKB}KB WebP <span className="text-[8px] text-emerald-500">(-{savingPct}%)</span>
                                </span>
                              </div>

                              {/* Tiny minimal move controls */}
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button 
                                  onClick={() => moveImage(i, 'up')}
                                  disabled={i === 0}
                                  className="p-1 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-20 cursor-pointer"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={() => moveImage(i, 'down')}
                                  disabled={i === images.length - 1}
                                  className="p-1 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-20 cursor-pointer"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={() => removeImage(img.id)}
                                  className="p-1 rounded hover:bg-red-50 text-red-500 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Minimal text caption input */}
                            <input 
                              type="text"
                              value={img.caption}
                              onChange={(e) => handleCaptionChange(img.id, e.target.value)}
                              placeholder="Tambah keterangan atau cerita momen ini..."
                              className="w-full mt-1 px-2 py-0.5 border border-slate-100 rounded-md text-[10px] font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-400 bg-slate-50/50"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* COLUMN 2: LIVE PRATINJAU & EXPORT PORTAL */}
          <section 
            className={`lg:col-span-5 flex flex-col gap-6 ${activeTab === 'preview' ? 'block' : 'hidden lg:block'}`} 
            id="preview-step-section"
          >
            {/* COMPACT LIVING PREVIEW PHONE */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col items-center" id="device-wrapper-card">
              <div className="w-full flex items-center justify-between border-b border-slate-50 pb-3 mb-4">
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-slate-400" />
                  <span className="font-extrabold text-slate-900 text-sm tracking-tight">Pratinjau Album</span>
                </div>
                {images.length > 0 && (
                  <span className="text-[9px] font-extrabold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase tracking-wider">
                    {previewPage === 0 ? 'Cover' : `Page ${previewPage}`}
                  </span>
                )}
              </div>

              {/* Pure Clean Device Shape without ugly background frames */}
              <div className="w-full max-w-[260px] aspect-[9/18] bg-slate-950 rounded-[32px] p-2 shadow-xl border border-slate-800 relative overflow-hidden flex flex-col">
                {/* Minimal Sensor Notch */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-3.5 bg-slate-950 rounded-b-xl z-30" />

                {/* Simulated Screen */}
                <div 
                  style={{ backgroundColor: themeStyles.bg }}
                  className={`flex-1 rounded-[26px] overflow-hidden relative flex flex-col transition-all duration-300 select-none ${themeStyles.font}`}
                >
                  {/* Floating Watermark matching compiled HTML output */}
                  {images.length > 0 && (
                    <div 
                      style={{ fontFamily: "'Dancing Script', cursive" }}
                      className="absolute top-3.5 left-1/2 -translate-x-1/2 text-[15px] font-extrabold text-black dark:text-white opacity-95 z-30 pointer-events-none whitespace-nowrap lowercase"
                    >
                      album kenangan
                    </div>
                  )}
                  {images.length === 0 ? (
                    /* EMPTY LIVE PREVIEW STATE */
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
                      <ImageIcon className="w-8 h-8 text-slate-300 mb-2" />
                      <span className="text-xs font-bold text-slate-700">Album Masih Kosong</span>
                      <p className="text-[9px] text-slate-400 mt-1 px-2 leading-relaxed">Unggah minimal 1 foto untuk melihat simulasi album seluler Anda di sini.</p>
                    </div>
                  ) : (
                    /* FULL ACTIVE SIMULATION ENGINE */
                    <div className="flex-1 flex flex-col justify-between h-full relative">
                      
                      {/* Inner Content Area */}
                      <div className="flex-1 flex flex-col justify-center p-3 min-h-0 overflow-y-auto">
                        
                        {previewPage === 0 ? (
                          /* COVER PREVIEW */
                          <div 
                            style={{ 
                              backgroundImage: currentCoverImage 
                                ? `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.6)), url(${currentCoverImage.compressedBase64})` 
                                : 'none',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center'
                            }}
                            className={`absolute inset-0 flex flex-col justify-end p-4 text-center ${currentCoverImage ? 'text-white' : 'text-slate-800'}`}
                          >
                            <div className="mb-4">
                              <span className="text-[8px] uppercase tracking-wider font-extrabold opacity-75">Koleksi Album</span>
                              <h3 className="text-base font-black leading-tight mt-1 line-clamp-2">{title || 'Judul Album'}</h3>
                              {subtitle && <p className="text-[9px] font-medium opacity-80 mt-1 line-clamp-2">{subtitle}</p>}
                            </div>
                            <button 
                              onClick={() => setPreviewPage(1)}
                              style={{ 
                                backgroundColor: theme === 'dark' ? '#2e2e33' : '#ffffff',
                                color: theme === 'dark' ? '#ffffff' : '#111827'
                              }}
                              className="py-1 px-3.5 rounded-full text-[9px] font-bold self-center shadow-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                            >
                              Buka Album <ChevronRight className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : (
                          /* PAGES CONTENT PREVIEW */
                          <div className="w-full flex-1 flex flex-col justify-center gap-1.5">
                            
                            {/* Dynamically Styled Photo Grids inside phone screen */}
                            <div className="flex-1 flex flex-col justify-center min-h-0">
                              {(() => {
                                const pageImages = chunkedPages[previewPage - 1] || [];
                                const count = pageImages.length;

                                // Helper for organic layout tilt
                                const getTiltClass = (idx: number) => {
                                  const tilts = [
                                    '-rotate-[0.8deg] translate-y-[1px]',
                                    'rotate-[0.6deg] -translate-y-[1px]',
                                    '-rotate-[0.5deg] translate-y-[2px]',
                                    'rotate-[1.1deg] -translate-y-[1px]'
                                  ];
                                  return tilts[idx % 4];
                                };

                                if (count === 1) {
                                  const img = pageImages[0];
                                  return (
                                    <div className="w-full flex justify-center" onClick={() => setLightboxImage(img)}>
                                      <div 
                                        style={{ backgroundColor: themeStyles.cardBg }}
                                        className={`w-full rounded-md p-2 pb-3 border ${themeStyles.border} shadow-sm cursor-pointer transition-all duration-300 origin-center hover:rotate-0 hover:scale-[1.03] active:scale-[0.98]`}
                                      >
                                        <div className={`${img.orientation === 'portrait' ? 'aspect-[3/4]' : 'aspect-[4/3]'} bg-slate-100/50 rounded-xs overflow-hidden relative`} style={{ maxHeight: '55vh' }}>
                                          <img src={img.compressedBase64} alt={img.name} className="w-full h-full object-contain animate-fade-in" />
                                        </div>
                                        {img.caption && (
                                          <p className="text-[7px] mt-1.5 italic text-center font-semibold truncate px-1" style={{ color: themeStyles.text }}>
                                            {img.caption}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                } else if (count === 2) {
                                  const isBothPortrait = pageImages.every(img => img.orientation === 'portrait');
                                  if (isBothPortrait) {
                                    return (
                                      <div className="grid grid-cols-2 gap-1.5 items-center">
                                        {pageImages.map((img, idx) => (
                                          <div 
                                            key={img.id} 
                                            onClick={() => setLightboxImage(img)}
                                            style={{ backgroundColor: themeStyles.cardBg }}
                                            className={`rounded-md p-1.5 pb-2.5 border ${themeStyles.border} shadow-sm cursor-pointer transition-all duration-300 origin-center ${getTiltClass(idx)} hover:rotate-0 hover:scale-[1.03] active:scale-[0.98]`}
                                          >
                                            <div className="aspect-[3/4] bg-slate-100 rounded-xs overflow-hidden" style={{ maxHeight: '45vh' }}>
                                              <img src={img.compressedBase64} alt={img.name} className="w-full h-full object-contain" />
                                            </div>
                                            {img.caption && (
                                              <p className="text-[6px] mt-1 italic text-center font-semibold truncate px-0.5" style={{ color: themeStyles.text }}>
                                                {img.caption}
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div className="flex flex-col gap-1.5 items-center justify-center w-full">
                                        {pageImages.map((img, idx) => {
                                          const aspect = img.orientation === 'portrait' ? 'aspect-[3/4]' : 'aspect-[16/10]';
                                          return (
                                            <div 
                                              key={img.id} 
                                              onClick={() => setLightboxImage(img)}
                                              style={{ backgroundColor: themeStyles.cardBg }}
                                              className={`w-full rounded-md p-1.5 pb-2 border ${themeStyles.border} shadow-sm cursor-pointer transition-all duration-300 origin-center ${getTiltClass(idx)} hover:rotate-0 hover:scale-[1.03] active:scale-[0.98]`}
                                            >
                                              <div className={`${aspect} bg-slate-100 rounded-xs overflow-hidden relative`} style={{ maxHeight: '32vh' }}>
                                                <img src={img.compressedBase64} alt={img.name} className="w-full h-full object-contain" />
                                              </div>
                                              {img.caption && (
                                                <p className="text-[6px] mt-1 italic text-center font-semibold truncate px-0.5" style={{ color: themeStyles.text }}>
                                                  {img.caption}
                                                </p>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  }
                                } else if (count === 3) {
                                  const firstImg = pageImages[0];
                                  const otherImages = pageImages.slice(1);
                                  const firstAspect = firstImg.orientation === 'portrait' ? 'aspect-[3/4]' : 'aspect-[4/3]';
                                  return (
                                    <div className="flex flex-col gap-1.5 items-center justify-center w-full">
                                      <div 
                                        onClick={() => setLightboxImage(firstImg)}
                                        style={{ backgroundColor: themeStyles.cardBg }}
                                        className={`w-full rounded-md p-1.5 pb-2 border ${themeStyles.border} shadow-sm cursor-pointer transition-all duration-300 origin-center ${getTiltClass(0)} hover:rotate-0 hover:scale-[1.03] active:scale-[0.98]`}
                                      >
                                        <div className={`${firstAspect} bg-slate-100 rounded-xs overflow-hidden relative`} style={{ maxHeight: '38vh' }}>
                                          <img src={firstImg.compressedBase64} alt={firstImg.name} className="w-full h-full object-contain" />
                                        </div>
                                        {firstImg.caption && (
                                          <p className="text-[6px] mt-1 italic text-center font-semibold truncate px-0.5" style={{ color: themeStyles.text }}>
                                            {firstImg.caption}
                                          </p>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-2 gap-1.5 w-full items-center">
                                        {otherImages.map((img, idx) => (
                                          <div 
                                            key={img.id} 
                                            onClick={() => setLightboxImage(img)}
                                            style={{ backgroundColor: themeStyles.cardBg }}
                                            className={`rounded-md p-1.5 pb-2 border ${themeStyles.border} shadow-sm cursor-pointer transition-all duration-300 origin-center ${getTiltClass(idx + 1)} hover:rotate-0 hover:scale-[1.03] active:scale-[0.98]`}
                                          >
                                            <div className="aspect-video bg-slate-100 rounded-xs overflow-hidden relative" style={{ maxHeight: '18vh' }}>
                                              <img src={img.compressedBase64} alt={img.name} className="w-full h-full object-contain" />
                                            </div>
                                            {img.caption && (
                                              <p className="text-[6px] mt-1 italic text-center font-semibold truncate px-0.5" style={{ color: themeStyles.text }}>
                                                {img.caption}
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div className="grid grid-cols-2 gap-1.5 items-center">
                                      {pageImages.map((img, idx) => {
                                        const aspect = img.orientation === 'portrait' ? 'aspect-[3/4]' : 'aspect-video';
                                        return (
                                          <div 
                                            key={img.id} 
                                            onClick={() => setLightboxImage(img)}
                                            style={{ backgroundColor: themeStyles.cardBg }}
                                            className={`rounded-md p-1.5 pb-2 border ${themeStyles.border} shadow-sm cursor-pointer transition-all duration-300 origin-center ${getTiltClass(idx)} hover:rotate-0 hover:scale-[1.03] active:scale-[0.98]`}
                                          >
                                            <div className={`${aspect} bg-slate-100 rounded-xs overflow-hidden relative`} style={{ maxHeight: '22vh' }}>
                                              <img src={img.compressedBase64} alt={img.name} className="w-full h-full object-contain" />
                                            </div>
                                            {img.caption && (
                                              <p className="text-[6px] mt-1 italic text-center font-semibold truncate px-0.5" style={{ color: themeStyles.text }}>
                                                {img.caption}
                                              </p>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                }
                              })()}
                            </div>

                          </div>
                        )}

                      </div>

                      {/* Phone Navigation Controls Overlaid */}
                      {previewPage > 0 && (
                        <button 
                          onClick={prevPreview}
                          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-white/95 text-slate-800 rounded-full border border-slate-100/50 flex items-center justify-center cursor-pointer shadow-md active:scale-90 transition-all z-20 pointer-events-auto hover:bg-white"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                      )}

                      {previewPage < totalPages && (
                        <button 
                          onClick={nextPreview}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-white/95 text-slate-800 rounded-full border border-slate-100/50 flex items-center justify-center cursor-pointer shadow-md active:scale-90 transition-all z-20 pointer-events-auto hover:bg-white"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}

                      {/* Dots and Play/Pause control at the bottom center */}
                      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-white/95 border border-slate-100/30 shadow-xs z-20 pointer-events-auto">
                        <div className="flex gap-0.5">
                          <div className={`w-1 h-1 rounded-full transition-all ${previewPage === 0 ? 'bg-slate-950 scale-125' : 'bg-slate-300'}`} />
                          {Array.from({ length: totalPages }).map((_, idx) => (
                            <div key={idx} className={`w-1 h-1 rounded-full transition-all ${previewPage === idx + 1 ? 'bg-slate-950 scale-125' : 'bg-slate-300'}`} />
                          ))}
                        </div>

                        {/* Play/Pause Button */}
                        <button 
                          onClick={() => setAutoplay(prev => !prev)}
                          className="text-slate-700 hover:text-slate-950 focus:outline-none ml-1 shrink-0 cursor-pointer flex items-center justify-center"
                        >
                          {autoplay ? (
                            <span className="w-1.5 h-1.5 flex gap-[1px] justify-center items-center">
                              <span className="w-[1.5px] h-1.5 bg-slate-800 rounded-full block"></span>
                              <span className="w-[1.5px] h-1.5 bg-slate-800 rounded-full block"></span>
                            </span>
                          ) : (
                            <svg className="w-1.5 h-1.5 fill-current" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                          )}
                        </button>
                      </div>

                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* MINIMALIST SUMMARY STATISTICS CARD */}
            {images.length > 0 && (
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs" id="performance-summary">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">Ringkasan File Bundle</span>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-50">
                    <span className="text-[9px] font-bold text-slate-400 block">Ukuran File Asli</span>
                    <span className="text-xs font-black text-slate-500 mt-0.5 block">{formatSize(originalTotalSize)}</span>
                  </div>
                  <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/50">
                    <span className="text-[9px] font-bold text-emerald-700 block">Ukuran Kompres</span>
                    <span className="text-xs font-black text-emerald-600 mt-0.5 block">{formatSize(compressedTotalSize)}</span>
                  </div>
                </div>

                <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-xl text-[10px] font-medium text-slate-500 flex items-center gap-2">
                  <span className="bg-slate-900 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded leading-none">
                    {sizeSavings}% Hemat
                  </span>
                  <span>Semua foto diubah menjadi format WebP lokal sehingga album terunduh secara instan.</span>
                </div>
              </div>
            )}

            {/* DOWNLOAD EXPORT CTA */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-3" id="export-action-box">
              <button
                onClick={handleShareAlbum}
                disabled={images.length === 0}
                className={`w-full py-3.5 px-6 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  images.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] shadow-md shadow-indigo-600/15'
                }`}
              >
                <Share2 className="w-4 h-4" /> Bagikan Album Online (Bisa dibuka di HP)
              </button>

              <button
                onClick={handleDownloadAlbum}
                disabled={images.length === 0}
                className={`w-full py-3 px-6 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  images.length === 0
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 active:scale-[0.98] border border-slate-100'
                }`}
              >
                <Download className="w-4 h-4" /> Simpan File Offline (.html)
              </button>
              
              {images.length > 0 && (
                <span className="text-center text-[10px] text-slate-400 block font-semibold">
                  Nama File Offline: <code className="bg-slate-50 px-1 py-0.5 rounded border border-slate-100 text-slate-600 font-mono">album_{title.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'foto'}.html</code>
                </span>
              )}
            </div>
          </section>

        </div>

      </div>

      {/* LIGHTBOX COMPONENT FOR HIGH DEF PREVIEW */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4 md:p-6"
          >
            {/* Top Close Button */}
            <button 
              onClick={() => setLightboxImage(null)}
              className="absolute top-5 right-5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full cursor-pointer transition-all z-50 shadow-lg"
              title="Tutup Pratinjau"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Inner Interactive Image Container */}
            <div 
              onClick={(e) => e.stopPropagation()}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUpOrLeave}
              className={`relative overflow-hidden flex items-center justify-center max-w-full max-h-[75vh] md:max-h-[80vh] rounded-lg select-none transition-shadow ${
                zoomScale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
              }`}
            >
              <motion.img 
                initial={{ scale: 0.95 }}
                animate={{ 
                  scale: zoomScale,
                  x: panOffset.x,
                  y: panOffset.y,
                }}
                transition={isPanning ? { type: 'just' } : { type: 'spring', damping: 25, stiffness: 200 }}
                src={lightboxImage.compressedBase64} 
                alt={lightboxImage.name} 
                className="max-w-full max-h-[75vh] md:max-h-[80vh] object-contain rounded-md shadow-2xl origin-center pointer-events-none"
                style={{ imageRendering: 'auto' }}
              />
            </div>

            {/* Caption */}
            {lightboxImage.caption && (
              <p className="text-slate-300 text-xs mt-3 italic max-w-sm text-center leading-relaxed font-medium bg-black/40 px-3 py-1.5 rounded-lg backdrop-blur-xs select-none">
                {lightboxImage.caption}
              </p>
            )}

            {/* Elegant Floating Zoom Control Bar */}
            <div 
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 shadow-2xl z-50 text-white min-w-[280px]"
            >
              <div className="flex items-center justify-between w-full gap-4">
                <button
                  onClick={() => {
                    setZoomScale(prev => {
                      const next = Math.max(prev - 0.25, 1);
                      if (next === 1) setPanOffset({ x: 0, y: 0 });
                      return next;
                    });
                  }}
                  disabled={zoomScale <= 1}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                  title="Perkecil"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <div className="flex flex-col items-center select-none shrink-0">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Skala</span>
                  <span className="text-xs font-bold font-mono mt-0.5">{Math.round(zoomScale * 100)}%</span>
                </div>

                <button
                  onClick={() => {
                    setZoomScale(prev => Math.min(prev + 0.25, 4));
                  }}
                  disabled={zoomScale >= 4}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                  title="Perbesar"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <div className="h-4 w-[1px] bg-white/15" />

                <button
                  onClick={() => {
                    setZoomScale(1);
                    setPanOffset({ x: 0, y: 0 });
                  }}
                  disabled={zoomScale === 1 && panOffset.x === 0 && panOffset.y === 0}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                  title="Atur Ulang"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>100%</span>
                </button>
              </div>

              <p className="text-[9px] text-slate-400 text-center font-medium leading-none mt-1">
                {zoomScale > 1 
                  ? 'Geser gambar untuk melihat detail' 
                  : 'Gunakan tombol, scroll mouse, atau cubit untuk memperbesar'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ONLINE SHARE DIALOG MODAL */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-100 max-w-sm w-full relative space-y-4"
            >
              <button 
                onClick={() => setShowShareModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center">
                <span className="text-2xl mb-1 block">🌐</span>
                <h3 className="font-extrabold text-slate-900 text-base tracking-tight">Bagikan Album Foto</h3>
                <p className="text-[10px] text-slate-400 mt-1">Dapatkan tautan unik untuk membuka album ini langsung di HP apa saja.</p>
              </div>

              {isSharing ? (
                <div className="py-6 flex flex-col items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-3 border-indigo-600 border-t-transparent" />
                  <span className="text-[11px] font-bold text-slate-600">Sedang memproses & mengupload album...</span>
                </div>
              ) : shareError ? (
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-center space-y-3">
                  <span className="text-xs font-bold text-red-700 block">Ada Masalah Koneksi</span>
                  <p className="text-[10px] text-red-500">{shareError}</p>
                  <button 
                    onClick={handleShareAlbum}
                    className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] rounded-lg transition-all cursor-pointer"
                  >
                    Coba Lagi
                  </button>
                </div>
              ) : shareUrl ? (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-1.5">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Link Album Anda</span>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="text" 
                        readOnly 
                        value={shareUrl}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-slate-600 focus:outline-none"
                      />
                      <button 
                        onClick={handleCopyLink}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold shrink-0 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3 animate-bounce" /> Tersalin!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Salin
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <a 
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent('Halo! Lihat album foto interaktif kami: ' + shareUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/10 transition-all active:scale-[0.98] text-center"
                    >
                      💬 Kirim ke WhatsApp
                    </a>

                    <a 
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] text-center"
                    >
                      🌍 Buka Sekarang di Browser
                    </a>
                  </div>

                  <div className="bg-indigo-50/50 border border-indigo-100/50 p-3 rounded-xl text-[9px] text-indigo-700 leading-relaxed font-medium">
                    💡 <strong>Selesai!</strong> Anda bisa mengirimkan link di atas melalui WhatsApp atau jejaring sosial lain. Penerima dapat langsung membuka, melihat, dan menikmati album foto interaktif ini di HP/laptop mereka secara otomatis!
                  </div>
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MINIMAL FOOTER BAR */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-[11px] text-slate-400 mt-auto px-4" id="app-footer">
        <p className="max-w-xl mx-auto leading-relaxed">
          album kenangan memproses data 100% lokal di browser Anda. Foto tidak pernah diunggah ke jaringan internet manapun untuk menjaga privasi mutlak.
        </p>
      </footer>
      <OfflineIndicator />
    </div>
  );
}
