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
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const publicUrl = `${protocol}://${host}/album/${id}`;

    // 4. Save lightweight metadata for portal gallery listing
    const coverImage = images[0]?.compressedBase64 || '';
    const htmlSize = Buffer.byteLength(compiledHTML, 'utf8');
    const now = Date.now();
    const metadata = {
      id,
      title: config.title || 'Album Kenangan',
      subtitle: config.subtitle || '',
      coverImage,
      totalPhotos: images.length,
      createdAt: now,
      updatedAt: now,
      htmlSize,
      url: publicUrl,
      config
    };
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');

    res.json({ id, url: publicUrl, htmlSize, totalPhotos: images.length });
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
app.get('/album/:id/download', (req, res) => {
  try {
    const { id } = req.params;
    const htmlPath = path.join(DATA_DIR, `${id}.html`);
    const jsonPath = path.join(DATA_DIR, `${id}.json`);

    if (fs.existsSync(htmlPath)) {
      let fileName = `album_${id}.html`;
      const metaPath = path.join(DATA_DIR, `${id}.meta.json`);
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
