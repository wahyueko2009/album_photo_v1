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

// API endpoint to save generated albums
app.post('/api/album', (req, res) => {
  try {
    const { images, config } = req.body;
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'Album must contain at least 1 image.' });
    }

    const id = Math.random().toString(36).substring(2, 11);
    const filePath = path.join(DATA_DIR, `${id}.json`);

    fs.writeFileSync(filePath, JSON.stringify({ images, config }, null, 2), 'utf8');

    // Get the actual public host and protocol to generate a fully qualified URL
    const isHttps = req.headers['x-forwarded-proto'] === 'https' || req.secure || process.env.NODE_ENV === 'production';
    const protocol = isHttps ? 'https' : (req.headers['x-forwarded-proto'] || 'http');
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const publicUrl = `${protocol}://${host}/album/${id}`;

    res.json({ id, url: publicUrl });
  } catch (err) {
    console.error('Error saving album to local file store:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// API endpoint to retrieve a saved album JSON
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

// Route to display a saved album as pure HTML directly in browser
app.get('/album/:id', (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(DATA_DIR, `${id}.json`);

    if (!fs.existsSync(filePath)) {
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
    }

    const fileData = fs.readFileSync(filePath, 'utf8');
    const { images, config } = JSON.parse(fileData);

    const compiledHTML = compileAlbumHTML(images, config);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(compiledHTML);
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
