import { SavedAlbum } from '../types';

const STORAGE_KEY = 'kamera_albums_portal_v1';

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
  }
): SavedAlbum {
  const currentList = getSavedAlbums();
  const now = Date.now();

  const cover = album.coverImage || (album.images.length > 0 ? album.images[0].compressedBase64 : '');

  const existingIndex = currentList.findIndex(a => a.id === album.id);
  const updatedItem: SavedAlbum = {
    id: album.id,
    title: album.title || album.config.title || 'Album Kenangan',
    subtitle: album.subtitle || album.config.subtitle || '',
    createdAt: album.createdAt || (existingIndex >= 0 ? currentList[existingIndex].createdAt : now),
    updatedAt: now,
    images: album.images,
    config: album.config,
    coverImage: cover,
    shareUrl: album.shareUrl,
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
        },
        coverImage: item.coverImage,
        shareUrl: item.url ? `${window.location.origin}${item.url}` : undefined,
        htmlSize: item.htmlSize,
        totalPhotos: item.totalPhotos || item.images?.length || 0,
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
