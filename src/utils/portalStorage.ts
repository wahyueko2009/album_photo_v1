import { SavedAlbum, AlbumComment } from '../types';

const STORAGE_KEY = 'kamera_albums_portal_v1';
const LIKED_KEY = 'kamera_liked_albums_v1';

export function getSavedAlbums(): SavedAlbum[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (Array.isArray(list)) {
      return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    return [];
  } catch (e) {
    console.error('Failed to read albums from storage:', e);
    return [];
  }
}

export function saveAlbumToPortal(
  album: {
    id: string;
    title: string;
    subtitle?: string;
    images: SavedAlbum['images'];
    config: SavedAlbum['config'];
    coverImage?: string;
    shareUrl?: string;
    createdAt?: number;
    likes?: number;
    views?: number;
    comments?: SavedAlbum['comments'];
    isPrivate?: boolean;
  }
): SavedAlbum {
  const currentList = getSavedAlbums();
  const now = Date.now();

  const cover = album.coverImage || (album.images.length > 0 ? album.images[0].compressedBase64 : '');

  const existingIndex = currentList.findIndex(a => a.id === album.id);
  const existing = existingIndex >= 0 ? currentList[existingIndex] : null;

  const updatedItem: SavedAlbum = {
    id: album.id,
    title: album.title || album.config.title || 'Album Kenangan',
    subtitle: album.subtitle || album.config.subtitle || '',
    createdAt: album.createdAt || (existing ? existing.createdAt : now),
    updatedAt: now,
    images: album.images,
    config: album.config,
    coverImage: cover,
    shareUrl: album.shareUrl,
    likes: typeof album.likes === 'number' ? album.likes : (existing?.likes ?? 0),
    views: typeof album.views === 'number' ? album.views : (existing?.views ?? 0),
    comments: album.comments || existing?.comments || [],
    isPrivate: album.isPrivate ?? album.config.isPrivate ?? existing?.isPrivate ?? false,
  };

  let newList: SavedAlbum[];
  if (existingIndex >= 0) {
    newList = [...currentList];
    newList[existingIndex] = updatedItem;
  } else {
    newList = [updatedItem, ...currentList];
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
  } catch (err) {
    console.warn('Storage quota exceeded, trying to prune older images or store minimal version:', err);
    // If quota exceeded due to heavy base64, try to store without heavy images in list and rely on individual key
    try {
      const strippedList = newList.map(item => ({
        ...item,
        images: item.images.slice(0, 5), // preserve only first 5 in list
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(strippedList));
    } catch {
      // LocalStorage full
    }
  }

  // Also save the full individual item for standalone lookup
  try {
    localStorage.setItem(`kamera_album_${album.id}`, JSON.stringify({
      images: album.images,
      config: album.config,
    }));
  } catch {
    // ignore
  }

  return updatedItem;
}

export function deleteAlbumFromPortal(id: string): void {
  const currentList = getSavedAlbums();
  const newList = currentList.filter(a => a.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    localStorage.removeItem(`kamera_album_${id}`);
  } catch (e) {
    console.error('Failed to delete album:', e);
  }

  // Also delete from server
  try {
    fetch(`/api/portal/albums/${id}`, { method: 'DELETE' }).catch((err) => {
      console.warn('Gagal menghapus album dari server:', err);
    });
  } catch {
    // ignore
  }
}

// Fetch all albums directly from the server's HTML store
export async function fetchPortalAlbumsFromServer(): Promise<SavedAlbum[]> {
  const localList = getSavedAlbums();

  try {
    const res = await fetch('/api/portal/albums');
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    const serverAlbums = await res.json();
    if (Array.isArray(serverAlbums)) {
      // Map server items to SavedAlbum format
      const formattedFromServer: SavedAlbum[] = serverAlbums.map((item: any) => ({
        id: item.id,
        title: item.title || 'Album Kenangan',
        subtitle: item.subtitle || '',
        createdAt: item.createdAt || Date.now(),
        updatedAt: item.updatedAt || Date.now(),
        images: item.images || [],
        config: item.config || {
          title: item.title || 'Album Kenangan',
          subtitle: item.subtitle || '',
          theme: 'vintage',
          transition: 'slide',
          showPageNumbers: false,
          photosPerPage: 4,
          isPrivate: item.isPrivate ?? false,
        },
        coverImage: item.coverImage,
        shareUrl: item.url ? `${window.location.origin}${item.url}` : undefined,
        htmlSize: item.htmlSize,
        totalPhotos: item.totalPhotos || item.images?.length || 0,
        likes: typeof item.likes === 'number' ? item.likes : 0,
        views: typeof item.views === 'number' ? item.views : 0,
        comments: Array.isArray(item.comments) ? item.comments : [],
        isPrivate: Boolean(item.isPrivate ?? item.config?.isPrivate ?? false),
      }));

      // Gabungkan album lokal dengan album server agar album di perangkat pengguna tidak pernah hilang!
      const mergedList = [...formattedFromServer];

      for (const localAlbum of localList) {
        if (!mergedList.some(a => a.id === localAlbum.id)) {
          // Album ada di browser lokal tapi belum ada di server (misal setelah server restart)
          // Ambil gambar penuh dari cache browser individual untuk dikirim ulang
          let fullImages = localAlbum.images || [];
          if (fullImages.length === 0) {
            try {
              const rawItem = localStorage.getItem(`kamera_album_${localAlbum.id}`);
              if (rawItem) {
                const parsed = JSON.parse(rawItem);
                fullImages = parsed.images || [];
              }
            } catch {
              // ignore
            }
          }

          mergedList.push({
            ...localAlbum,
            images: fullImages
          });

          // Otomatis restorasi ulang ke server di latar belakang secara asinkron
          if (fullImages.length > 0) {
            fetch('/api/album', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: localAlbum.id,
                images: fullImages,
                config: localAlbum.config
              })
            }).then(r => {
              if (r.ok) {
                console.log(`Berhasil memulihkan album ${localAlbum.id} kembali ke server`);
              }
            }).catch(e => {
              console.warn(`Gagal memulihkan album ${localAlbum.id} ke server:`, e);
            });
          }
        }
      }

      // Urutkan berdasarkan tanggal pembuatan terbaru
      mergedList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      // Cache lightweight version in localStorage (kosongkan gambar untuk menghemat kuota localStorage)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedList.map(a => ({
          ...a,
          images: [], 
        }))));
      } catch {
        // ignore quota
      }

      return mergedList;
    }
  } catch (err) {
    console.warn('Tidak dapat mengambil album dari server, menggunakan cache lokal:', err);
  }

  return localList;
}

export function getAlbumFromPortal(id: string): SavedAlbum | null {
  const list = getSavedAlbums();
  const found = list.find(a => a.id === id);
  if (found) {
    // Jika data gambarnya kosong (karena di-cache ringan), ambil dari cache individual
    if (!found.images || found.images.length === 0) {
      try {
        const raw = localStorage.getItem(`kamera_album_${id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.images) {
            found.images = parsed.images;
          }
        }
      } catch {
        // ignore
      }
    }
    return found;
  }

  // Fallback to individual key
  try {
    const raw = localStorage.getItem(`kamera_album_${id}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.images) {
        return {
          id,
          title: parsed.config?.title || 'Album Kenangan',
          subtitle: parsed.config?.subtitle || '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          images: parsed.images,
          config: parsed.config || {},
          coverImage: parsed.images[0]?.compressedBase64 || '',
        };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function clearAllLocalAlbums() {
  try {
    const list = getSavedAlbums();
    for (const alb of list) {
      localStorage.removeItem(`kamera_album_${alb.id}`);
    }
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Gagal membersihkan cache lokal:', err);
  }
}

// ==========================================
// SOCIAL INTERACTION FUNCTIONS (LIKES, VIEWS, COMMENTS, PRIVACY)
// ==========================================

export function getLikedAlbumIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LIKED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function toggleAlbumLike(albumId: string): Promise<{ isLiked: boolean; newLikes: number }> {
  const likedList = getLikedAlbumIds();
  const isCurrentlyLiked = likedList.includes(albumId);
  const action = isCurrentlyLiked ? 'unlike' : 'like';

  // Update local liked list
  let nextLikedList: string[];
  if (isCurrentlyLiked) {
    nextLikedList = likedList.filter(id => id !== albumId);
  } else {
    nextLikedList = [...likedList, albumId];
  }
  try {
    localStorage.setItem(LIKED_KEY, JSON.stringify(nextLikedList));
  } catch (e) {
    console.warn('Failed to save liked state locally:', e);
  }

  // Update local albums cache
  const albums = getSavedAlbums();
  const target = albums.find(a => a.id === albumId);
  let newLikes = (target?.likes || 0) + (isCurrentlyLiked ? -1 : 1);
  if (newLikes < 0) newLikes = 0;

  if (target) {
    target.likes = newLikes;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(albums));
    } catch {
      // ignore
    }
  }

  // Sync to server API
  try {
    const res = await fetch(`/api/portal/albums/${albumId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.likes === 'number') {
        newLikes = data.likes;
      }
    }
  } catch (err) {
    console.warn('Could not sync like to server, local state applied:', err);
  }

  return {
    isLiked: !isCurrentlyLiked,
    newLikes
  };
}

export async function incrementAlbumView(albumId: string): Promise<number> {
  const albums = getSavedAlbums();
  const target = albums.find(a => a.id === albumId);
  let newViews = (target?.views || 0) + 1;

  if (target) {
    target.views = newViews;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(albums));
    } catch {
      // ignore
    }
  }

  try {
    const res = await fetch(`/api/portal/albums/${albumId}/view`, {
      method: 'POST'
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.views === 'number') {
        newViews = data.views;
      }
    }
  } catch (err) {
    console.warn('Could not sync view to server:', err);
  }

  return newViews;
}

export async function addAlbumComment(albumId: string, name: string, message: string): Promise<AlbumComment[]> {
  const newComment: AlbumComment = {
    id: Math.random().toString(36).substring(2, 11),
    name: name.trim().slice(0, 50),
    message: message.trim().slice(0, 500),
    createdAt: Date.now()
  };

  const albums = getSavedAlbums();
  const target = albums.find(a => a.id === albumId);
  if (target) {
    if (!Array.isArray(target.comments)) target.comments = [];
    target.comments.push(newComment);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(albums));
    } catch {
      // ignore
    }
  }

  let finalComments = target?.comments || [newComment];

  try {
    const res = await fetch(`/api/portal/albums/${albumId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, message })
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.comments)) {
        finalComments = data.comments;
        if (target) {
          target.comments = finalComments;
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(albums));
          } catch {
            // ignore
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not sync comment to server, local saved:', err);
  }

  return finalComments;
}

export async function deleteAlbumComment(albumId: string, commentId: string): Promise<AlbumComment[]> {
  const albums = getSavedAlbums();
  const target = albums.find(a => a.id === albumId);
  if (target && Array.isArray(target.comments)) {
    target.comments = target.comments.filter(c => c.id !== commentId);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(albums));
    } catch {
      // ignore
    }
  }

  let remaining = target?.comments || [];

  try {
    const res = await fetch(`/api/portal/albums/${albumId}/comments/${commentId}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.comments)) {
        remaining = data.comments;
      }
    }
  } catch (err) {
    console.warn('Could not sync delete comment to server:', err);
  }

  return remaining;
}

export async function updateAlbumPrivacy(albumId: string, isPrivate: boolean): Promise<boolean> {
  const albums = getSavedAlbums();
  const target = albums.find(a => a.id === albumId);
  if (target) {
    target.isPrivate = isPrivate;
    if (target.config) {
      target.config.isPrivate = isPrivate;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(albums));
    } catch {
      // ignore
    }
  }

  try {
    const res = await fetch(`/api/portal/albums/${albumId}/privacy`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPrivate })
    });
    if (res.ok) {
      const data = await res.json();
      return Boolean(data.isPrivate);
    }
  } catch (err) {
    console.warn('Could not sync privacy to server:', err);
  }

  return isPrivate;
}

