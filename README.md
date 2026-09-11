# KameraAlbum - Generator Album Foto Offline-First

Aplikasi web modern (Progressive Web App / PWA) untuk mengompres foto lokal ke format WebP dan mengompilasi album interaktif mandiri yang bekerja 100% offline.

## ✨ Fitur Utama

- **PWA & Offline-First**: Dapat diinstal di Android, iOS, dan Desktop layaknya aplikasi bawaan (native app) dan tetap berfungsi tanpa koneksi internet.
- **Kompresi WebP Lokal**: Pemrosesan gambar langsung di sisi browser pengguna tanpa mengunggah file foto ke server (privasi 100% terjaga).
- **Ekspor Album Mandiri (.html)**: Hasil album dapat diunduh sebagai satu file `.html` mandiri yang dapat dibuka di perangkat mana pun tanpa server tambahan.
- **Kustomisasi Album**: Pilihan tema warna, efek transisi halaman (slide, fade, flip 3D), rasio aspek foto, dan tata letak multi-foto per halaman.
- **Navigasi Interaktif**: Mendukung navigasi manual (tombol & swipe gesture) serta mode putar otomatis (slideshow) dengan durasi yang dapat diatur.

## 🚀 Menjalankan Secara Lokal

1. **Clone repositori**:
   ```bash
   git clone https://github.com/wahyueko2009-gif/album_photo.git
   cd album_photo
   ```

2. **Instal dependensi**:
   ```bash
   npm install
   ```

3. **Jalankan development server**:
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di `http://localhost:3000`.

4. **Build untuk produksi**:
   ```bash
   npm run build
   npm start
   ```

## 📄 Lisensi

MIT
