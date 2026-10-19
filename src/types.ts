export interface ImageItem {
  id: string;
  name: string;
  originalSize: number;
  compressedSize: number;
  compressedBase64: string; // inline Base64 data URL
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape' | 'square';
  caption: string;
}

export type AlbumTheme = 'modern' | 'vintage' | 'dark' | 'aesthetic';
export type AlbumTransition = 'slide' | 'fade' | 'stack';

export interface AlbumComment {
  id: string;
  name: string;
  message: string;
  createdAt: number;
}

export interface AlbumConfig {
  title: string;
  subtitle: string;
  theme: AlbumTheme;
  transition: AlbumTransition;
  showPageNumbers: boolean;
  coverImageId?: string;
  autoplay?: boolean;
  autoplayInterval?: number; // seconds
  photosPerPage?: number; // 1, 2, 3, or 4
  isPrivate?: boolean;
}

export interface SavedAlbum {
  id: string;
  title: string;
  subtitle?: string;
  createdAt: number;
  updatedAt: number;
  images: ImageItem[];
  config: AlbumConfig;
  coverImage?: string;
  shareUrl?: string;
  htmlSize?: number;
  totalPhotos?: number;
  likes?: number;
  views?: number;
  comments?: AlbumComment[];
  isPrivate?: boolean;
}

