import { ImageItem, AlbumConfig } from '../types';

export function chunkImages(images: ImageItem[], size: number = 4): ImageItem[][] {
  const chunks: ImageItem[][] = [];
  for (let i = 0; i < images.length; i += size) {
    chunks.push(images.slice(i, i + size));
  }
  return chunks;
}

export function compileAlbumHTML(images: ImageItem[], config: AlbumConfig): string {
  const pages = chunkImages(images, 4);
  const totalPages = pages.length;

  // Theme definitions (Colors and Typography)
  let bgClass = '';
  let textClass = '';
  let accentClass = '';
  let fontStack = '';
  let cardBgClass = '';
  let borderStyle = '';
  let shadowStyle = '';

  switch (config.theme) {
    case 'vintage':
      bgClass = '#f4efe6'; // warm beige
      textClass = '#2c221e'; // deep espresso
      accentClass = '#8c6239'; // warm sepia
      fontStack = '"Georgia", "Times New Roman", serif';
      cardBgClass = '#fbf9f5';
      borderStyle = '1px solid #e0d5c1';
      shadowStyle = '0 4px 12px rgba(44, 34, 30, 0.05)';
      break;
    case 'dark':
      bgClass = '#121214'; // rich charcoal dark
      textClass = '#f3f4f6'; // off white
      accentClass = '#a78bfa'; // soft violet accent
      fontStack = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      cardBgClass = '#1c1c1f';
      borderStyle = '1px solid #2e2e33';
      shadowStyle = '0 4px 20px rgba(0, 0, 0, 0.4)';
      break;
    case 'aesthetic':
      bgClass = '#f0f3f0'; // soft sage white
      textClass = '#2d3732'; // forest slate
      accentClass = '#6b8e23'; // olive accent
      fontStack = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Century Gothic", sans-serif';
      cardBgClass = '#ffffff';
      borderStyle = '1px solid #e2e8f0';
      shadowStyle = '0 6px 18px rgba(45, 55, 50, 0.04)';
      break;
    case 'modern':
    default:
      bgClass = '#f9fafb'; // clean light gray
      textClass = '#111827'; // near black
      accentClass = '#3b82f6'; // modern indigo-blue
      fontStack = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
      cardBgClass = '#ffffff';
      borderStyle = '1px solid #f3f4f6';
      shadowStyle = '0 4px 10px rgba(0, 0, 0, 0.03)';
      break;
  }

  // Cover Page background style helper
  const coverImage = config.coverImageId 
    ? images.find(img => img.id === config.coverImageId) || images[0]
    : images[0];

  const hasCoverImage = !!coverImage;

  // Build Pages DOM
  let pagesHTML = '';

  pages.forEach((pageImages, index) => {
    const pageNum = index + 1;
    let gridLayout = '';

    // Advanced Dynamic Layout Heuristics:
    // Depending on number of images on this page, and their orientations
    const count = pageImages.length;
    
    if (count === 1) {
      // 1 Image: Full height, focused representation
      const img = pageImages[0];
      const aspect = img.orientation === 'portrait' ? 'aspect-[3/4]' : img.orientation === 'landscape' ? 'aspect-[4/3]' : 'aspect-square';
      gridLayout = `
        <div class="single-image-layout">
          <div class="photo-card" onclick="openLightbox('${img.id}')" data-id="${img.id}">
            <div class="image-container ${aspect}">
              <img src="${img.compressedBase64}" alt="${img.name}" loading="lazy" />
            </div>
            ${img.caption ? `<div class="photo-caption">${img.caption}</div>` : ''}
          </div>
        </div>
      `;
    } else if (count === 2) {
      // 2 Images layout
      const isBothPortrait = pageImages.every(img => img.orientation === 'portrait');
      if (isBothPortrait) {
        // Side-by-side
        gridLayout = `
          <div class="grid-2-portrait">
            ${pageImages.map(img => `
              <div class="photo-card" onclick="openLightbox('${img.id}')" data-id="${img.id}">
                <div class="image-container aspect-[3/4]">
                  <img src="${img.compressedBase64}" alt="${img.name}" loading="lazy" />
                </div>
                ${img.caption ? `<div class="photo-caption">${img.caption}</div>` : ''}
              </div>
            `).join('')}
          </div>
        `;
      } else {
        // Stacked landscape or mixed
        gridLayout = `
          <div class="grid-2-stacked">
            ${pageImages.map(img => `
              <div class="photo-card" onclick="openLightbox('${img.id}')" data-id="${img.id}">
                <div class="image-container ${img.orientation === 'portrait' ? 'aspect-[3/4]' : 'aspect-[16/10]'}">
                  <img src="${img.compressedBase64}" alt="${img.name}" loading="lazy" />
                </div>
                ${img.caption ? `<div class="photo-caption">${img.caption}</div>` : ''}
              </div>
            `).join('')}
          </div>
        `;
      }
    } else if (count === 3) {
      // 3 Images Layout - Bento box style
      // Let's check orientation of first image
      const firstImg = pageImages[0];
      const otherImages = pageImages.slice(1);

      gridLayout = `
        <div class="grid-3-bento">
          <div class="bento-main">
            <div class="photo-card" onclick="openLightbox('${firstImg.id}')" data-id="${firstImg.id}">
              <div class="image-container ${firstImg.orientation === 'portrait' ? 'aspect-[3/4]' : 'aspect-[4/3]'}">
                <img src="${firstImg.compressedBase64}" alt="${firstImg.name}" loading="lazy" />
              </div>
              ${firstImg.caption ? `<div class="photo-caption">${firstImg.caption}</div>` : ''}
            </div>
          </div>
          <div class="bento-sub">
            ${otherImages.map(img => `
              <div class="photo-card" onclick="openLightbox('${img.id}')" data-id="${img.id}">
                <div class="image-container aspect-video">
                  <img src="${img.compressedBase64}" alt="${img.name}" loading="lazy" />
                </div>
                ${img.caption ? `<div class="photo-caption">${img.caption}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      // 4 Images Layout - Balanced Grid or 2x2
      gridLayout = `
        <div class="grid-4-quad">
          ${pageImages.map((img, i) => {
            // Give subtle variations in layout aspect ratios
            const aspect = img.orientation === 'portrait' ? 'aspect-[3/4]' : 'aspect-video';
            return `
              <div class="photo-card" onclick="openLightbox('${img.id}')" data-id="${img.id}">
                <div class="image-container ${aspect}">
                  <img src="${img.compressedBase64}" alt="${img.name}" loading="lazy" />
                </div>
                ${img.caption ? `<div class="photo-caption">${img.caption}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    pagesHTML += `
      <!-- PAGE ${pageNum} -->
      <div class="album-page" id="page-${pageNum}">
        <div class="page-inner">
          <div class="page-header">
            <span class="page-badge">Bagian ${pageNum}</span>
          </div>
          <div class="page-content">
            ${gridLayout}
          </div>
          ${config.showPageNumbers ? `<div class="page-footer">Halaman ${pageNum} dari ${totalPages}</div>` : ''}
        </div>
      </div>
    `;
  });

  // Assemble full interactive HTML template
  const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${config.title} - Album Foto</title>
  <style>
    /* BASE CSS & RESET */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }
    body {
      background-color: ${bgClass};
      color: ${textClass};
      font-family: ${fontStack};
      overflow: hidden;
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      user-select: none;
    }

    /* ALBUM CONTAINER */
    #album-wrapper {
      position: relative;
      flex: 1;
      width: 100%;
      height: 100%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    #slides-container {
      position: relative;
      flex: 1;
      width: 100%;
      height: 100%;
    }

    /* SLIDE BASE CLASS */
    .album-page, .cover-page {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      opacity: 0;
      visibility: hidden;
      transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease-in-out;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding: 16px;
    }

    /* TRANSITION EFFECTS */
    /* Slide effect style */
    .album-page.slide-next {
      transform: translateX(100%);
    }
    .album-page.slide-prev {
      transform: translateX(-100%);
    }
    /* Fade / Stack styles */
    .album-page.active, .cover-page.active {
      opacity: 1;
      visibility: visible;
      transform: translateX(0) scale(1);
    }

    /* COVER PAGE DESIGN */
    .cover-page {
      background: ${hasCoverImage ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.7)), url('${coverImage?.compressedBase64}') no-repeat center center / cover` : bgClass};
      color: ${hasCoverImage ? '#ffffff' : textClass};
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;
      text-align: center;
      padding: 40px 24px;
    }

    .cover-content {
      max-width: 500px;
      margin-bottom: 60px;
      animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .cover-title {
      font-size: 2.25rem;
      font-weight: 800;
      line-height: 1.2;
      margin-bottom: 12px;
      letter-spacing: -0.02em;
    }

    .cover-subtitle {
      font-size: 1.1rem;
      opacity: 0.85;
      font-weight: 300;
      margin-bottom: 30px;
    }

    .start-button {
      background-color: ${config.theme === 'dark' ? '#3e3e42' : '#ffffff'};
      color: ${config.theme === 'dark' ? '#ffffff' : '#111827'};
      border: none;
      padding: 12px 32px;
      border-radius: 9999px;
      font-size: 0.95rem;
      font-weight: 600;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: transform 0.2s;
    }
    .start-button:active {
      transform: scale(0.96);
    }

    .cover-badge {
      display: inline-block;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      margin-bottom: 16px;
      opacity: 0.75;
      font-weight: 600;
    }

    /* PAGES STRUCTURE */
    .page-inner {
      width: 100%;
      max-width: 480px; /* Perfect portrait smartphone size */
      height: 100%;
      max-height: 800px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 12px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 4px;
    }

    .page-badge {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      color: ${accentClass};
      letter-spacing: 0.05em;
    }

    .page-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 0; /* essential for nested flex */
    }

    .page-footer {
      font-size: 0.75rem;
      text-align: center;
      opacity: 0.5;
      padding-top: 4px;
      font-weight: 500;
    }

    /* CARD DESIGN */
    .photo-card {
      background-color: ${cardBgClass};
      border: ${borderStyle};
      border-radius: 8px;
      padding: 10px 10px 14px 10px; /* Elegant white border simulation like fine art print */
      box-shadow: ${shadowStyle};
      display: flex;
      flex-direction: column;
      cursor: pointer;
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      transform-origin: center center;
      position: relative;
    }

    /* AI Assisted Organic Layout - Gentle Scrapbook Tilt */
    .photo-card:nth-child(4n+1) {
      transform: rotate(-0.8deg) translateY(1px);
    }
    .photo-card:nth-child(4n+2) {
      transform: rotate(0.6deg) translateY(-2px);
    }
    .photo-card:nth-child(4n+3) {
      transform: rotate(-0.5deg) translateY(2px);
    }
    .photo-card:nth-child(4n+4) {
      transform: rotate(1.1deg) translateY(-1px);
    }

    .photo-card:hover, .photo-card:active {
      transform: rotate(0deg) scale(1.03) translateY(-4px) !important;
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08), 0 8px 12px rgba(0, 0, 0, 0.04);
      z-index: 10;
    }

    .image-container {
      width: 100%;
      position: relative;
      overflow: hidden;
      border-radius: 4px; /* Inner photo corners */
      background-color: transparent;
    }

    /* Aspect Ratio Utilities for standalone compiled HTML */
    .aspect-\\[3\\/4\\] {
      aspect-ratio: 3 / 4;
    }
    .aspect-\\[4\\/3\\] {
      aspect-ratio: 4 / 3;
    }
    .aspect-\\[16\\/10\\] {
      aspect-ratio: 16 / 10;
    }
    .aspect-square {
      aspect-ratio: 1 / 1;
    }
    .aspect-video {
      aspect-ratio: 16 / 9;
    }

    .image-container img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    /* Orientation-specific adjustments */
    .object-cover-top img {
      object-position: top center;
    }

    .photo-caption {
      padding: 10px 4px 0 4px;
      font-size: 0.8rem;
      line-height: 1.4;
      text-align: center;
      font-style: italic;
      opacity: 0.85;
      font-weight: 500;
    }

    /* DYNAMIC LAYOUTS */
    /* 1 Image Layout */
    .single-image-layout {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
    }
    .single-image-layout .photo-card {
      width: 100%;
    }

    /* 2 Images Layout */
    .grid-2-portrait {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      align-items: center;
    }

    .grid-2-stacked {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      align-items: center;
    }

    /* 3 Images Layout */
    .grid-3-bento {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      align-items: center;
    }
    .bento-main {
      width: 100%;
    }
    .bento-sub {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      width: 100%;
      align-items: center;
    }

    /* 4 Images Layout */
    .grid-4-quad {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: auto auto;
      gap: 12px;
      align-items: center;
    }

    /* OVERLAYS & UI NAVIGATION */
    #nav-controls {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
    }

    .nav-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background-color: ${config.theme === 'dark' ? 'rgba(40, 40, 45, 0.85)' : 'rgba(255, 255, 255, 0.9)'};
      border: ${borderStyle};
      color: ${textClass};
      width: 46px;
      height: 46px;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      pointer-events: auto;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .nav-btn:hover {
      transform: translateY(-50%) scale(1.08);
      background-color: ${config.theme === 'dark' ? '#28282d' : '#ffffff'};
    }

    .nav-btn:active {
      transform: translateY(-50%) scale(0.95);
    }

    #btn-prev {
      left: 20px;
    }

    #btn-next {
      right: 20px;
    }

    .nav-btn.disabled {
      opacity: 0;
      pointer-events: none;
    }

    #indicators-wrapper {
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      pointer-events: none;
      z-index: 20;
    }

    /* SLIDESHOW MODE CONTROL PANEL */
    #slideshow-panel {
      position: absolute;
      bottom: 24px;
      right: 24px;
      display: none; /* Hidden on cover page, shown via JS on subsequent pages */
      flex-direction: column;
      gap: 6px;
      background-color: ${config.theme === 'dark' ? 'rgba(30, 30, 35, 0.95)' : 'rgba(255, 255, 255, 0.96)'};
      border: ${borderStyle};
      padding: 8px 12px;
      border-radius: 14px;
      z-index: 30;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(10px);
      pointer-events: auto;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      width: 220px;
    }

    .panel-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      width: 100%;
    }

    .panel-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: ${config.theme === 'dark' ? '#9ca3af' : '#6b7280'};
    }

    .mode-group, .selector-group {
      display: flex;
      background-color: ${config.theme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)'};
      border-radius: 9999px;
      padding: 2px;
    }

    .mode-btn, .select-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      padding: 4px 8px;
      border-radius: 9999px;
      font-size: 9px;
      font-weight: 700;
      border: none;
      background: none;
      color: ${config.theme === 'dark' ? '#9ca3af' : '#6b7280'};
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .mode-btn.active, .select-btn.active {
      background-color: ${config.theme === 'dark' ? '#ffffff' : '#111827'};
      color: ${config.theme === 'dark' ? '#111827' : '#ffffff'};
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }

    .duration-stepper {
      display: flex;
      align-items: center;
      gap: 4px;
      background-color: ${config.theme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)'};
      border-radius: 8px;
      padding: 2px 4px;
    }

    .step-btn {
      width: 20px;
      height: 20px;
      border-radius: 6px;
      border: none;
      background-color: ${config.theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.8)'};
      color: ${textClass};
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .step-btn:hover {
      background-color: ${config.theme === 'dark' ? 'rgba(255,255,255,0.15)' : '#ffffff'};
      transform: scale(1.05);
    }

    .step-btn:active {
      transform: scale(0.95);
    }

    #input-interval {
      width: 28px;
      border: none;
      background: transparent;
      text-align: center;
      font-size: 11px;
      font-weight: 800;
      color: ${textClass};
      padding: 0;
      margin: 0;
      -moz-appearance: textfield;
    }

    #input-interval::-webkit-outer-spin-button,
    #input-interval::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    #input-interval:focus {
      outline: none;
    }

    .step-unit {
      font-size: 10px;
      font-weight: 700;
      color: ${config.theme === 'dark' ? '#9ca3af' : '#6b7280'};
      margin-right: 4px;
    }

    @media (max-width: 768px) {
      #slideshow-panel {
        bottom: 95px !important; /* Diangkat tinggi sekali agar sangat aman dari semua tombol navigasi HP */
        left: 50% !important;
        right: auto !important;
        transform: translateX(-50%) !important;
        width: calc(100% - 32px) !important;
        max-width: 320px !important;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2) !important;
      }
      #indicators-wrapper {
        bottom: 200px !important; /* Digeser lebih ke atas agar berada di atas panel kontrol */
      }
    }

    /* PAGE INDICATORS */
    .dots-container {
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: ${config.theme === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.5)'};
      backdrop-filter: blur(4px);
      padding: 6px 14px;
      border-radius: 20px;
      pointer-events: auto;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: ${textClass};
      opacity: 0.25;
      transition: opacity 0.3s, transform 0.3s;
      cursor: pointer;
    }

    .dot.active {
      opacity: 0.9;
      transform: scale(1.2);
    }

    /* LIGHTBOX OVERLAY */
    #lightbox {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(10, 10, 12, 0.98);
      z-index: 100;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      padding: 24px;
    }

    #lightbox.active {
      opacity: 1;
      pointer-events: auto;
    }

    #lightbox-img {
      max-width: 100%;
      max-height: 80%;
      object-fit: contain;
      border-radius: 6px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      transform: scale(0.95);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    #lightbox.active #lightbox-img {
      transform: scale(1);
    }

    #lightbox-caption {
      color: #9ca3af;
      font-size: 0.9rem;
      text-align: center;
      margin-top: 16px;
      font-style: italic;
      max-width: 500px;
    }

    .lightbox-close {
      position: absolute;
      top: 20px;
      right: 20px;
      background: none;
      border: none;
      color: white;
      font-size: 2rem;
      cursor: pointer;
      line-height: 1;
      opacity: 0.8;
      transition: opacity 0.2s;
    }

    .lightbox-close:hover {
      opacity: 1;
    }

    /* WATERMARK FOOTER */
    .watermark {
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.65rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      opacity: 0.35;
      font-weight: 700;
      pointer-events: none;
      z-index: 5;
    }

    /* ANIMATIONS */
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  </style>
</head>
<body>

  <div class="watermark">KameraAlbum</div>

  <div id="album-wrapper">
    <div id="slides-container">
      
      <!-- COVER PAGE -->
      <div class="cover-page active" id="cover">
        <div class="cover-content">
          <span class="cover-badge">Koleksi Album</span>
          <h1 class="cover-title">${config.title}</h1>
          ${config.subtitle ? `<p class="cover-subtitle">${config.subtitle}</p>` : ''}
          <button class="start-button" onclick="goToPage(1)">
            Buka Album
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="feather feather-arrow-right"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>
        </div>
      </div>

    </div>

    <!-- SLIDESHOW MODE CONTROL PANEL -->
    <div id="slideshow-panel">
      <!-- Row 1: Mode Selection -->
      <div class="panel-row">
        <span class="panel-label">Mode Album</span>
        <div class="mode-group">
          <button class="mode-btn active" id="btn-mode-manual" onclick="setPlayMode(false)">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 2px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect></svg>
            Manual
          </button>
          <button class="mode-btn" id="btn-mode-auto" onclick="setPlayMode(true)">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="margin-right: 2px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            Otomatis
          </button>
        </div>
      </div>

      <!-- Row 2: Photos Per Page Configuration -->
      <div class="panel-row" id="photo-row" style="display: none;">
        <span class="panel-label">Foto / Layar</span>
        <div class="selector-group">
          <button class="select-btn photo-count-btn" id="btn-count-1" data-val="1" onclick="setPhotosPerPage(1)">1</button>
          <button class="select-btn photo-count-btn" id="btn-count-2" data-val="2" onclick="setPhotosPerPage(2)">2</button>
          <button class="select-btn photo-count-btn" id="btn-count-3" data-val="3" onclick="setPhotosPerPage(3)">3</button>
          <button class="select-btn photo-count-btn" id="btn-count-4" data-val="4" onclick="setPhotosPerPage(4)">4</button>
        </div>
      </div>

      <!-- Row 3: Auto Speed Duration Selection -->
      <div class="panel-row" id="speed-row" style="display: none;">
        <span class="panel-label">Waktu Jeda</span>
        <div class="duration-stepper">
          <button class="step-btn" onclick="adjustInterval(-1)">-</button>
          <input type="number" id="input-interval" min="1" max="60" value="${config.autoplayInterval || 5}" onchange="setAutoplayInterval(this.value)" />
          <span class="step-unit">detik</span>
          <button class="step-btn" onclick="adjustInterval(1)">+</button>
        </div>
      </div>
    </div>

    <!-- NAVIGATION CONTROLS -->
    <div id="nav-controls">
      <div class="nav-btn disabled" id="btn-prev" onclick="navigateSlide(-1, true)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </div>

      <div class="nav-btn" id="btn-next" onclick="navigateSlide(1, true)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </div>
    </div>

    <!-- INDICATORS WRAPPER WITH PLAY/PAUSE -->
    <div id="indicators-wrapper">
      <div class="dots-container" id="indicators">
        <!-- populated dynamically -->
      </div>
    </div>
  </div>

  <!-- LIGHTBOX -->
  <div id="lightbox" onclick="closeLightbox()">
    <button class="lightbox-close" onclick="closeLightbox()">&times;</button>
    <img id="lightbox-img" src="" alt="Fullscreen preview" />
    <div id="lightbox-caption"></div>
  </div>

  <script>
    // Store all album images and config data injected from compiler
    const albumImages = ${JSON.stringify(images)};
    const initialConfig = ${JSON.stringify(config)};
    const transitionType = '${config.transition}';

    // Album State
    let currentSlide = 0; // 0 is cover page, 1+ are page numbers
    let totalSlides = 1;  // cover page initially
    let photosPerPage = ${config.photosPerPage || 4};
    let autoplayIntervalTime = ${config.autoplayInterval * 1000};
    let autoplayEnabled = ${config.autoplay ? 'true' : 'false'};
    let autoplayTimer = null;

    // Build standard flat photo database for lightbox lookups
    const photos = {};
    albumImages.forEach(img => {
      photos[img.id] = { base64: img.compressedBase64, caption: img.caption };
    });

    // Helper to chunk images in JS
    function chunkImagesJS(items, size) {
      const chunks = [];
      for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
      }
      return chunks;
    }

    // Dynamic layout HTML rendering engine based on image counts and orientations
    function renderAlbumSlides() {
      const container = document.getElementById('slides-container');
      const dotsContainer = document.getElementById('indicators');

      // Preserve the cover page and remove only the dynamically added album pages
      const existingPages = container.querySelectorAll('.album-page');
      existingPages.forEach(p => p.remove());

      const pages = chunkImagesJS(albumImages, photosPerPage);
      totalSlides = pages.length + 1; // +1 for cover

      let pagesHTML = '';
      pages.forEach((pageImages, index) => {
        const pageNum = index + 1;
        let gridLayout = '';
        const count = pageImages.length;

        if (count === 1) {
          const img = pageImages[0];
          const aspect = img.orientation === 'portrait' ? 'aspect-[3/4]' : img.orientation === 'landscape' ? 'aspect-[4/3]' : 'aspect-square';
          gridLayout = '<div class="single-image-layout">' +
            '<div class="photo-card" onclick="openLightbox(\\\'\' + img.id + \'\\\')" data-id="' + img.id + '">' +
              '<div class="image-container ' + aspect + '">' +
                '<img src="' + img.compressedBase64 + '" alt="' + img.name + '" loading="lazy" />' +
              '</div>' +
              (img.caption ? '<div class="photo-caption">' + img.caption + '</div>' : '') +
            '</div>' +
          '</div>';
        } else if (count === 2) {
          const isBothPortrait = pageImages.every(img => img.orientation === 'portrait');
          if (isBothPortrait) {
            gridLayout = '<div class="grid-2-portrait">' +
              pageImages.map(img => 
                '<div class="photo-card" onclick="openLightbox(\\\'\' + img.id + \'\\\')" data-id="' + img.id + '">' +
                  '<div class="image-container aspect-[3/4]">' +
                    '<img src="' + img.compressedBase64 + '" alt="' + img.name + '" loading="lazy" />' +
                  '</div>' +
                  (img.caption ? '<div class="photo-caption">' + img.caption + '</div>' : '') +
                '</div>'
              ).join('') +
            '</div>';
          } else {
            gridLayout = '<div class="grid-2-stacked">' +
              pageImages.map(img => {
                const aspect = img.orientation === 'portrait' ? 'aspect-[3/4]' : 'aspect-[16/10]';
                return '<div class="photo-card" onclick="openLightbox(\\\'\' + img.id + \'\\\')" data-id="' + img.id + '">' +
                  '<div class="image-container ' + aspect + '">' +
                    '<img src="' + img.compressedBase64 + '" alt="' + img.name + '" loading="lazy" />' +
                  '</div>' +
                  (img.caption ? '<div class="photo-caption">' + img.caption + '</div>' : '') +
                '</div>';
              }).join('') +
            '</div>';
          }
        } else if (count === 3) {
          const firstImg = pageImages[0];
          const otherImages = pageImages.slice(1);
          gridLayout = '<div class="grid-3-bento">' +
            '<div class="bento-main">' +
              '<div class="photo-card" onclick="openLightbox(\\\'\' + firstImg.id + \'\\\')" data-id="' + firstImg.id + '">' +
                '<div class="image-container ' + (firstImg.orientation === 'portrait' ? 'aspect-[3/4]' : 'aspect-[4/3]') + '">' +
                  '<img src="' + firstImg.compressedBase64 + '" alt="' + firstImg.name + '" loading="lazy" />' +
                '</div>' +
                (firstImg.caption ? '<div class="photo-caption">' + firstImg.caption + '</div>' : '') +
              '</div>' +
            '</div>' +
            '<div class="bento-sub">' +
              otherImages.map(img => 
                '<div class="photo-card" onclick="openLightbox(\\\'\' + img.id + \'\\\')" data-id="' + img.id + '">' +
                  '<div class="image-container aspect-video">' +
                    '<img src="' + img.compressedBase64 + '" alt="' + img.name + '" loading="lazy" />' +
                  '</div>' +
                  (img.caption ? '<div class="photo-caption">' + img.caption + '</div>' : '') +
                '</div>'
              ).join('') +
            '</div>' +
          '</div>';
        } else {
          gridLayout = '<div class="grid-4-quad">' +
            pageImages.map(img => {
              const aspect = img.orientation === 'portrait' ? 'aspect-[3/4]' : 'aspect-video';
              return '<div class="photo-card" onclick="openLightbox(\\\'\' + img.id + \'\\\')" data-id="' + img.id + '">' +
                '<div class="image-container ' + aspect + '">' +
                  '<img src="' + img.compressedBase64 + '" alt="' + img.name + '" loading="lazy" />' +
                '</div>' +
                (img.caption ? '<div class="photo-caption">' + img.caption + '</div>' : '') +
              '</div>';
            }).join('') +
          '</div>';
        }

        pagesHTML += '<div class="album-page" id="page-' + pageNum + '">' +
          '<div class="page-inner">' +
            '<div class="page-header">' +
              '<span class="page-badge">Bagian ' + pageNum + '</span>' +
            '</div>' +
            '<div class="page-content">' +
              gridLayout +
            '</div>' +
            (initialConfig.showPageNumbers ? '<div class="page-footer">Halaman ' + pageNum + ' dari ' + pages.length + '</div>' : '') +
          '</div>' +
        '</div>';
      });

      container.insertAdjacentHTML('beforeend', pagesHTML);

      // Rebuild Navigation Dots
      let dotsHTML = '<div class="dot active" onclick="goToPage(0, true)"></div>';
      for (let i = 1; i < totalSlides; i++) {
        dotsHTML += '<div class="dot" onclick="goToPage(' + i + ', true)"></div>';
      }
      dotsContainer.innerHTML = dotsHTML;

      // Maintain current slide bound within newly configured pages range
      if (currentSlide >= totalSlides) {
        currentSlide = totalSlides - 1;
      }
      goToPage(currentSlide, false);
    }

    function updateNavUI() {
      const btnPrev = document.getElementById('btn-prev');
      const btnNext = document.getElementById('btn-next');
      const dots = document.querySelectorAll('.dot');
      const panel = document.getElementById('slideshow-panel');

      // Update Arrow Buttons
      if (currentSlide === 0) {
        btnPrev.classList.add('disabled');
        if (panel) panel.style.display = 'none';
      } else {
        btnPrev.classList.remove('disabled');
        if (panel) panel.style.display = 'flex';
      }

      if (currentSlide === totalSlides - 1) {
        btnNext.classList.add('disabled');
      } else {
        btnNext.classList.remove('disabled');
      }

      // Update Navigation Dots Active state
      dots.forEach((dot, i) => {
        if (i === currentSlide) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
    }

    // AUTOPLAY FUNCTIONS
    function startAutoplay() {
      if (autoplayTimer) clearInterval(autoplayTimer);
      if (!autoplayEnabled) return;

      autoplayTimer = setInterval(() => {
        let next = currentSlide + 1;
        if (next >= totalSlides) {
          next = 0;
        }
        goToPage(next, false);
      }, autoplayIntervalTime);
    }

    function stopAutoplay() {
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    }

    function resetAutoplay() {
      stopAutoplay();
      if (autoplayEnabled) {
        startAutoplay();
      }
    }

    let settingsExpanded = false;

    // Set Manual / Otomatis slideshow modes
    function setPlayMode(isAuto, forceExpand = null) {
      const clickSame = (autoplayEnabled === isAuto);
      autoplayEnabled = isAuto;

      if (forceExpand !== null) {
        settingsExpanded = forceExpand;
      } else {
        if (clickSame) {
          settingsExpanded = !settingsExpanded;
        } else {
          settingsExpanded = true;
        }
      }

      const btnManual = document.getElementById('btn-mode-manual');
      const btnAuto = document.getElementById('btn-mode-auto');
      const photoRow = document.getElementById('photo-row');
      const speedRow = document.getElementById('speed-row');
      const indicators = document.getElementById('indicators-wrapper');

      if (autoplayEnabled) {
        if (btnAuto) btnAuto.classList.add('active');
        if (btnManual) btnManual.classList.remove('active');
        startAutoplay();
      } else {
        if (btnManual) btnManual.classList.add('active');
        if (btnAuto) btnAuto.classList.remove('active');
        stopAutoplay();
      }

      // Show/hide based on settingsExpanded
      if (settingsExpanded) {
        if (photoRow) photoRow.style.display = 'flex';
        if (speedRow) speedRow.style.display = autoplayEnabled ? 'flex' : 'none';
        
        // Adjust indicators higher because panel is taller
        if (indicators && window.innerWidth <= 768) {
          indicators.style.bottom = autoplayEnabled ? '220px' : '185px';
        }
      } else {
        if (photoRow) photoRow.style.display = 'none';
        if (speedRow) speedRow.style.display = 'none';
        
        // Lower indicators because panel is ultra compact
        if (indicators && window.innerWidth <= 768) {
          indicators.style.bottom = '145px';
        }
      }
    }

    // Dynamically change photos per page (Manual or Automatic layout configuration)
    function setPhotosPerPage(num) {
      photosPerPage = num;

      // Sync active classes on count selector buttons
      for (let i = 1; i <= 4; i++) {
        const btn = document.getElementById('btn-count-' + i);
        if (btn) {
          if (i === num) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        }
      }

      // Re-compile layout grids and dots on the fly!
      renderAlbumSlides();
      resetAutoplay();
    }

    // Dynamically update auto transition speed interval
    function setAutoplayInterval(seconds) {
      let sec = parseInt(seconds);
      if (isNaN(sec) || sec < 1) sec = 1;
      if (sec > 60) sec = 60;

      autoplayIntervalTime = sec * 1000;

      const input = document.getElementById('input-interval');
      if (input) {
        input.value = sec;
      }

      resetAutoplay();
    }

    function adjustInterval(amount) {
      const input = document.getElementById('input-interval');
      if (input) {
        let current = parseInt(input.value) || 5;
        setAutoplayInterval(current + amount);
      }
    }

    // Slides Navigation
    function goToPage(slideIndex, userClicked = false) {
      if (slideIndex < 0 || slideIndex >= totalSlides) return;

      const slides = [];
      slides.push(document.getElementById('cover'));
      for (let i = 1; i < totalSlides; i++) {
        slides.push(document.getElementById('page-' + i));
      }

      currentSlide = slideIndex;

      slides.forEach((slide, i) => {
        if (!slide) return;

        slide.classList.remove('active', 'slide-next', 'slide-prev');

        if (i === currentSlide) {
          slide.classList.add('active');
        } else if (transitionType === 'slide') {
          if (i > currentSlide) {
            slide.classList.add('slide-next');
          } else {
            slide.classList.add('slide-prev');
          }
        }
      });

      updateNavUI();

      if (userClicked) {
        resetAutoplay();
      }
    }

    function navigateSlide(direction, userClicked = false) {
      goToPage(currentSlide + direction, userClicked);
    }

    // Touch Swipes
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;

    const albumWrapper = document.getElementById('album-wrapper');

    albumWrapper.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    albumWrapper.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      handleSwipe();
    }, { passive: true });

    function handleSwipe() {
      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;

      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        if (diffX > 0) {
          navigateSlide(-1, true);
        } else {
          navigateSlide(1, true);
        }
      }
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        navigateSlide(1, true);
      } else if (e.key === 'ArrowLeft') {
        navigateSlide(-1, true);
      } else if (e.key === 'Escape') {
        closeLightbox();
      }
    });

    // Lightbox
    function openLightbox(photoId) {
      const photo = photos[photoId];
      if (!photo) return;

      stopAutoplay();

      const lightbox = document.getElementById('lightbox');
      const lightboxImg = document.getElementById('lightbox-img');
      const lightboxCaption = document.getElementById('lightbox-caption');

      lightboxImg.src = photo.base64;
      lightboxCaption.textContent = photo.caption || '';

      lightbox.classList.add('active');
    }

    function closeLightbox() {
      const lightbox = document.getElementById('lightbox');
      lightbox.classList.remove('active');

      if (autoplayEnabled) {
        startAutoplay();
      }
    }

    // Dynamic Initialization of UI settings on page load
    setPhotosPerPage(photosPerPage);
    setAutoplayInterval(${config.autoplayInterval || 5});
    setPlayMode(autoplayEnabled, false);
  </script>
</body>
</html>`;

  return htmlContent;
}
