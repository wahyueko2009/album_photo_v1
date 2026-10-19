import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { compileAlbumHTML } from './src/utils/compiler.js';

const app = express();
const PORT = 3000;

// Set payload limit to 50MB to handle multiple base64 compressed images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Path to data directory
const DATA_DIR = path.join(process.cwd(), 'data', 'albums');

// Create the data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// API endpoint to save generated albums in standalone HTML format
app.post('/api/album', (req, res) => {
  try {
    const { images, config } = req.body;
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'Album must contain at least 1 image.' });
    }

    const id = req.body.id || Math.random().toString(36).substring(2, 11);
    const jsonPath = path.join(DATA_DIR, `${id}.json`);
    const htmlPath = path.join(DATA_DIR, `${id}.html`);
    const metaPath = path.join(DATA_DIR, `${id}.meta.json`);

    // 1. Compile album into standalone HTML file
    const compiledHTML = compileAlbumHTML(images, config);
    fs.writeFileSync(htmlPath, compiledHTML, 'utf8');

    // 2. Save JSON for editable structure
    fs.writeFileSync(jsonPath, JSON.stringify({ images, config }, null, 2), 'utf8');

    // 3. Compute public URL
    const isHttps = req.headers['x-forwarded-proto'] === 'https' || req.secure || process.env.NODE_ENV === 'production';
    const protocol = isHttps ? 'https' : (req.headers['x-forwarded-proto'] || 'http');
    let host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'localhost:3000';
    // If x-forwarded-host contains internal non-routable .ai.studio host, prioritize real Cloud Run host from req.headers.host
    if (host.includes('.ai.studio') && req.headers.host && !req.headers.host.includes('.ai.studio')) {
      host = req.headers.host;
    }
    const publicUrl = `${protocol}://${host}/album/${id}`;

    // 4. Save lightweight metadata for portal gallery listing
    const coverImage = images[0]?.compressedBase64 || '';
    const htmlSize = Buffer.byteLength(compiledHTML, 'utf8');
    const now = Date.now();
    let existingMeta: any = {};
    if (fs.existsSync(metaPath)) {
      try {
        existingMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      } catch (e) {
        console.warn('Error reading existing meta:', e);
      }
    }

    const metadata = {
      id,
      title: config.title || 'Album Kenangan',
      subtitle: config.subtitle || '',
      coverImage,
      totalPhotos: images.length,
      createdAt: existingMeta.createdAt || now,
      updatedAt: now,
      htmlSize,
      url: publicUrl,
      config,
      likes: typeof existingMeta.likes === 'number' ? existingMeta.likes : 0,
      views: typeof existingMeta.views === 'number' ? existingMeta.views : 0,
      comments: Array.isArray(existingMeta.comments) ? existingMeta.comments : [],
      isPrivate: config.isPrivate ?? existingMeta.isPrivate ?? false
    };
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');

    res.json({ id, url: publicUrl, htmlSize, totalPhotos: images.length, metadata });
  } catch (err) {
    console.error('Error saving album to local file store:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// API endpoint to retrieve all albums stored on the server for the Portal Gallery
app.get('/api/portal/albums', (req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR);
    const albumMap = new Map();

    // Scan for all .meta.json or .json files
    for (const file of files) {
      if (file.endsWith('.meta.json')) {
        const id = file.replace('.meta.json', '');
        try {
          const raw = fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
          const meta = JSON.parse(raw);
          albumMap.set(id, meta);
        } catch (e) {
          console.error(`Error reading meta for ${id}:`, e);
        }
      }
    }

    // Process any legacy .json files that don't have .meta.json yet
    for (const file of files) {
      if (file.endsWith('.json') && !file.endsWith('.meta.json')) {
        const id = file.replace('.json', '');
        if (!albumMap.has(id)) {
          try {
            const raw = fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
            const data = JSON.parse(raw);
            if (data && Array.isArray(data.images)) {
              const htmlPath = path.join(DATA_DIR, `${id}.html`);
              let htmlSize = 0;
              if (fs.existsSync(htmlPath)) {
                htmlSize = fs.statSync(htmlPath).size;
              } else {
                // Auto-compile HTML if not yet compiled
                const compiled = compileAlbumHTML(data.images, data.config || {});
                fs.writeFileSync(htmlPath, compiled, 'utf8');
                htmlSize = Buffer.byteLength(compiled, 'utf8');
              }

              const coverImage = data.images[0]?.compressedBase64 || '';
              const stat = fs.statSync(path.join(DATA_DIR, file));
              const meta = {
                id,
                title: data.config?.title || 'Album Kenangan',
                subtitle: data.config?.subtitle || '',
                coverImage,
                totalPhotos: data.images.length,
                createdAt: stat.mtimeMs || Date.now(),
                updatedAt: stat.mtimeMs || Date.now(),
                htmlSize,
                url: `/album/${id}`,
                config: data.config
              };
              fs.writeFileSync(path.join(DATA_DIR, `${id}.meta.json`), JSON.stringify(meta, null, 2), 'utf8');
              albumMap.set(id, meta);
            }
          } catch (e) {
            console.error(`Error reading legacy album ${id}:`, e);
          }
        }
      }
    }

    const albums = Array.from(albumMap.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    res.json(albums);
  } catch (err) {
    console.error('Error fetching portal albums:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// API endpoint to delete an album from the server
app.delete('/api/portal/albums/:id', (req, res) => {
  try {
    const { id } = req.params;
    const jsonPath = path.join(DATA_DIR, `${id}.json`);
    const htmlPath = path.join(DATA_DIR, `${id}.html`);
    const metaPath = path.join(DATA_DIR, `${id}.meta.json`);

    if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
    if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
    if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);

    res.json({ success: true, id });
  } catch (err) {
    console.error('Error deleting album:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// API endpoint to clear all albums and photos from the server (to free up space)
app.post('/api/portal/albums/clear-all', (req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR);
    let deletedCount = 0;
    for (const file of files) {
      if (file.endsWith('.json') || file.endsWith('.html')) {
        const filePath = path.join(DATA_DIR, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }
    }
    res.json({ success: true, message: 'Semua berkas album dan foto berhasil dihapus dari server.', deletedCount });
  } catch (err) {
    console.error('Error clearing all albums:', err);
    res.status(500).json({ error: 'Gagal membersihkan data dari server.' });
  }
});

// SOCIAL FEATURES ENDPOINTS: Likes, Views, Comments, Privacy

// 1. Like/Unlike an album
app.post('/api/portal/albums/:id/like', (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'like' | 'unlike' | 'toggle'
    const metaPath = path.join(DATA_DIR, `${id}.meta.json`);

    if (!fs.existsSync(metaPath)) {
      return res.status(404).json({ error: 'Album tidak ditemukan' });
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const currentLikes = typeof meta.likes === 'number' ? meta.likes : 0;
    let newLikes = currentLikes;

    if (action === 'unlike') {
      newLikes = Math.max(0, currentLikes - 1);
    } else {
      newLikes = currentLikes + 1;
    }

    meta.likes = newLikes;
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

    res.json({ success: true, id, likes: newLikes });
  } catch (err) {
    console.error('Error updating like:', err);
    res.status(500).json({ error: 'Gagal memperbarui suka' });
  }
});

// 2. Increment view count
app.post('/api/portal/albums/:id/view', (req, res) => {
  try {
    const { id } = req.params;
    const metaPath = path.join(DATA_DIR, `${id}.meta.json`);

    if (!fs.existsSync(metaPath)) {
      return res.status(404).json({ error: 'Album tidak ditemukan' });
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    meta.views = (typeof meta.views === 'number' ? meta.views : 0) + 1;
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

    res.json({ success: true, id, views: meta.views });
  } catch (err) {
    console.error('Error incrementing views:', err);
    res.status(500).json({ error: 'Gagal memperbarui tayangan' });
  }
});

// 3. Add comment / ucapan (Guestbook)
app.post('/api/portal/albums/:id/comments', (req, res) => {
  try {
    const { id } = req.params;
    const { name, message } = req.body;

    if (!name || !name.trim() || !message || !message.trim()) {
      return res.status(400).json({ error: 'Nama dan pesan tidak boleh kosong' });
    }

    const metaPath = path.join(DATA_DIR, `${id}.meta.json`);
    if (!fs.existsSync(metaPath)) {
      return res.status(404).json({ error: 'Album tidak ditemukan' });
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    if (!Array.isArray(meta.comments)) {
      meta.comments = [];
    }

    const newComment = {
      id: Math.random().toString(36).substring(2, 11),
      name: name.trim().slice(0, 50),
      message: message.trim().slice(0, 500),
      createdAt: Date.now()
    };

    meta.comments.push(newComment);
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

    res.json({ success: true, id, comment: newComment, comments: meta.comments });
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Gagal menambahkan ucapan' });
  }
});

// 4. Delete comment
app.delete('/api/portal/albums/:id/comments/:commentId', (req, res) => {
  try {
    const { id, commentId } = req.params;
    const metaPath = path.join(DATA_DIR, `${id}.meta.json`);

    if (!fs.existsSync(metaPath)) {
      return res.status(404).json({ error: 'Album tidak ditemukan' });
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    if (Array.isArray(meta.comments)) {
      meta.comments = meta.comments.filter((c: any) => c.id !== commentId);
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
    }

    res.json({ success: true, id, comments: meta.comments || [] });
  } catch (err) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ error: 'Gagal menghapus ucapan' });
  }
});

// 5. Update privacy (Public / Private)
app.patch('/api/portal/albums/:id/privacy', (req, res) => {
  try {
    const { id } = req.params;
    const { isPrivate } = req.body;
    const metaPath = path.join(DATA_DIR, `${id}.meta.json`);
    const jsonPath = path.join(DATA_DIR, `${id}.json`);

    if (!fs.existsSync(metaPath)) {
      return res.status(404).json({ error: 'Album tidak ditemukan' });
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    meta.isPrivate = Boolean(isPrivate);
    if (meta.config) {
      meta.config.isPrivate = Boolean(isPrivate);
    }
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

    if (fs.existsSync(jsonPath)) {
      try {
        const fullData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        if (fullData && fullData.config) {
          fullData.config.isPrivate = Boolean(isPrivate);
          fs.writeFileSync(jsonPath, JSON.stringify(fullData, null, 2), 'utf8');
        }
      } catch (e) {
        console.warn('Could not update json config privacy:', e);
      }
    }

    res.json({ success: true, id, isPrivate: meta.isPrivate });
  } catch (err) {
    console.error('Error toggling privacy:', err);
    res.status(500).json({ error: 'Gagal memperbarui status privasi' });
  }
});


// API endpoint to retrieve a saved album JSON (for editing or in-app preview)
app.get('/api/album/:id', (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(DATA_DIR, `${id}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Album tidak ditemukan atau sudah kedaluwarsa.' });
    }

    const fileData = fs.readFileSync(filePath, 'utf8');
    const albumData = JSON.parse(fileData);
    res.json(albumData);
  } catch (err) {
    console.error('Error reading album JSON:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route to directly download the compiled standalone HTML file
// Route to directly download the compiled standalone HTML file
app.get('/album/:id/download', (req, res) => {
  try {
    const { id } = req.params;
    const htmlPath = path.join(DATA_DIR, `${id}.html`);
    const jsonPath = path.join(DATA_DIR, `${id}.json`);
    const metaPath = path.join(DATA_DIR, `${id}.meta.json`);

    // Privacy guard: private albums cannot be downloaded directly via public link
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (meta.isPrivate) {
          return res.status(403).send('Akses Ditolak: Album ini disetel sebagai Privat oleh pemiliknya.');
        }
      } catch (e) {
        console.warn('Error reading meta for download:', e);
      }
    }

    if (fs.existsSync(htmlPath)) {
      let fileName = `album_${id}.html`;
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          const cleanTitle = (meta.title || 'album').toLowerCase().replace(/[^a-z0-9]/g, '_');
          fileName = `album_${cleanTitle}.html`;
        } catch {
          // fallback filename
        }
      }
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.sendFile(htmlPath);
    } else if (fs.existsSync(jsonPath)) {
      const fileData = fs.readFileSync(jsonPath, 'utf8');
      const { images, config } = JSON.parse(fileData);
      const compiledHTML = compileAlbumHTML(images, config);
      fs.writeFileSync(htmlPath, compiledHTML, 'utf8');
      const cleanTitle = (config.title || 'album').toLowerCase().replace(/[^a-z0-9]/g, '_');
      res.setHeader('Content-Disposition', `attachment; filename="album_${cleanTitle}.html"`);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(compiledHTML);
    } else {
      return res.status(404).send('File album tidak ditemukan.');
    }
  } catch (err) {
    console.error('Error downloading album HTML:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Route to display a saved album as pure HTML directly in browser
app.get('/album/:id', (req, res) => {
  try {
    const { id } = req.params;
    const htmlPath = path.join(DATA_DIR, `${id}.html`);
    const jsonPath = path.join(DATA_DIR, `${id}.json`);
    const metaPath = path.join(DATA_DIR, `${id}.meta.json`);

    // Privacy guard: If album is private, block public direct access with a friendly notice
    let isPrivateAlbum = false;
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (meta.isPrivate) isPrivateAlbum = true;
      } catch (e) {}
    } else if (fs.existsSync(jsonPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        if (data?.config?.isPrivate) isPrivateAlbum = true;
      } catch (e) {}
    }

    if (isPrivateAlbum) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(403).send(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Album Bersifat Privat - Album Kenangan</title>
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              background-color: #0f172a;
              color: #f8fafc;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 24px;
              box-sizing: border-box;
            }
            .card {
              background-color: #1e293b;
              border: 1px solid #334155;
              padding: 44px 32px;
              border-radius: 24px;
              box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.4);
              max-width: 440px;
              width: 100%;
              text-align: center;
            }
            .icon-wrapper {
              width: 72px;
              height: 72px;
              background: rgba(239, 68, 68, 0.12);
              border: 1px solid rgba(239, 68, 68, 0.25);
              border-radius: 22px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 24px auto;
              color: #f87171;
            }
            h1 {
              font-size: 20px;
              font-weight: 800;
              margin: 0 0 10px 0;
              color: #ffffff;
            }
            p {
              font-size: 14px;
              line-height: 1.6;
              color: #94a3b8;
              margin: 0 0 28px 0;
            }
            .btn {
              display: inline-block;
              background-color: #f59e0b;
              color: #0f172a;
              font-weight: 700;
              font-size: 14px;
              padding: 12px 28px;
              border-radius: 12px;
              text-decoration: none;
              transition: all 0.2s ease;
            }
            .btn:hover {
              background-color: #d97706;
              transform: translateY(-1px);
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon-wrapper">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <h1>Album Ini Bersifat Privat</h1>
            <p>Album foto kenangan ini disetel sebagai <strong>Privat</strong> oleh pembuatnya. Hanya pemilik album yang memiliki izin untuk membukanya.</p>
            <a href="/" class="btn">Kembali ke Beranda</a>
          </div>
        </body>
        </html>
      `);
    }

    // If standalone HTML is already saved, serve it directly
    if (fs.existsSync(htmlPath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.sendFile(htmlPath);
    }

    // Fallback: compile on the fly if only .json exists
    if (fs.existsSync(jsonPath)) {
      const fileData = fs.readFileSync(jsonPath, 'utf8');
      const { images, config } = JSON.parse(fileData);

      const compiledHTML = compileAlbumHTML(images, config);
      fs.writeFileSync(htmlPath, compiledHTML, 'utf8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(compiledHTML);
    }

    // Not found
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Album Tidak Ditemukan</title>
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background-color: #f8fafc;
            color: #0f172a;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 24px;
            box-sizing: border-box;
          }
          .card {
            background-color: white;
            padding: 40px 32px;
            border-radius: 24px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
            max-width: 420px;
            width: 100%;
            text-align: center;
            border: 1px solid #f1f5f9;
          }
          .icon {
            font-size: 48px;
            margin-bottom: 16px;
          }
          h1 {
            font-size: 20px;
            font-weight: 800;
            margin: 0 0 8px 0;
            letter-spacing: -0.025em;
          }
          p {
            font-size: 13px;
            color: #64748b;
            margin: 0 0 24px 0;
            line-height: 1.6;
          }
          .btn {
            display: inline-block;
            background-color: #0f172a;
            color: white;
            font-size: 13px;
            font-weight: 700;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 12px;
            transition: all 0.2s;
          }
          .btn:hover {
            background-color: #1e293b;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">📁</div>
          <h1>Album Tidak Ditemukan</h1>
          <p>Maaf, tautan album ini tidak valid, tidak ditemukan, atau mungkin sudah kedaluwarsa.</p>
          <a href="/" class="btn">Buat Album Baru</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Error serving compiled album page:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Global Error Handler to always return JSON for API errors instead of HTML
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Error Handler]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Terjadi kesalahan internal pada server.',
    details: typeof err === 'object' ? err.stack : err
  });
});

// Start express server with Vite support in non-production environments
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Running on port ${PORT}`);
  });
}

startServer();
