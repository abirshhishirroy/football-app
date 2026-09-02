import { Router } from 'express';
import multer from 'multer';
import db, { uuidv4 } from '../db';
import { authMiddleware, adminMiddleware, AuthRequest } from '../auth';
import cloudinary from '../cloudinary';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_VIDEO_DURATION = 25;

function uploadToCloudinary(file: Express.Multer.File): Promise<{ url: string; thumbnailUrl: string; type: 'image' | 'video' }> {
  return new Promise((resolve, reject) => {
    const isImage = IMAGE_TYPES.includes(file.mimetype);
    const isVideo = VIDEO_TYPES.includes(file.mimetype);

    if (!isImage && !isVideo) {
      return reject(new Error('Invalid file type. Allowed: JPG, PNG, GIF, WebP, MP4, MOV, WebM'));
    }

    const resourceType = isVideo ? 'video' : 'image';
    const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    const uploadOptions: any = {
      resource_type: resourceType,
      folder: 'football-memories',
    };

    if (isImage) {
      uploadOptions.transformation = [{ quality: 'auto:low', width: 1080, crop: 'limit', fetch_format: 'auto' }];
    } else {
      uploadOptions.transformation = [{ quality: 'auto:best', duration: MAX_VIDEO_DURATION, fetch_format: 'mp4' }];
      uploadOptions.eager = [{ transformation: [{ quality: 'auto:low', width: 400, crop: 'limit', fetch_format: 'auto' }] }];
    }

    cloudinary.uploader.upload_large(base64, uploadOptions, (error, result) => {
      if (error) return reject(error);
      if (!result) return reject(new Error('Upload failed'));

      const url = result.secure_url;
      let thumbnailUrl = url;

      if (isImage) {
        thumbnailUrl = url.replace('/upload/', '/upload/q_auto:low,w_400,f_auto/');
      } else if (result.eager && result.eager.length > 0) {
        thumbnailUrl = result.eager[0].secure_url;
      }

      resolve({ url, thumbnailUrl, type: isVideo ? 'video' : 'image' });
    });
  });
}

router.post('/:matchId', authMiddleware, adminMiddleware, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    const { matchId } = req.params;
    const { caption } = req.body;

    const match = db.prepare('SELECT id FROM matches WHERE id = ?').get(matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    if (req.file.size > 25 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size must be less than 25MB' });
    }

    const { url, thumbnailUrl, type } = await uploadToCloudinary(req.file);

    const id = uuidv4();
    db.prepare(`
      INSERT INTO match_memories (id, matchId, url, thumbnailUrl, type, caption, uploadedBy)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, matchId, url, thumbnailUrl, type, caption || null, req.user!.id);

    const memory = db.prepare(`
      SELECT m.*, u.name as uploaderName, mt.title as matchTitle, mt.matchDate
      FROM match_memories m
      JOIN users u ON m.uploadedBy = u.id
      JOIN matches mt ON m.matchId = mt.id
      WHERE m.id = ?
    `).get(id);

    res.status(201).json(memory);
  } catch (err: any) {
    console.error('Memory upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to upload memory' });
  }
});

router.get('/', authMiddleware, (_req, res) => {
  const memories = db.prepare(`
    SELECT m.*, u.name as uploaderName, mt.title as matchTitle, mt.matchDate
    FROM match_memories m
    JOIN users u ON m.uploadedBy = u.id
    JOIN matches mt ON m.matchId = mt.id
    ORDER BY mt.matchDate DESC, m.createdAt ASC
  `).all();
  res.json(memories);
});

router.get('/:matchId', authMiddleware, (req, res) => {
  const memories = db.prepare(`
    SELECT m.*, u.name as uploaderName, mt.title as matchTitle, mt.matchDate
    FROM match_memories m
    JOIN users u ON m.uploadedBy = u.id
    JOIN matches mt ON m.matchId = mt.id
    WHERE m.matchId = ?
    ORDER BY m.createdAt ASC
  `).all(req.params.matchId);
  res.json(memories);
});

router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  const memory = db.prepare('SELECT * FROM match_memories WHERE id = ?').get(req.params.id) as any;
  if (!memory) return res.status(404).json({ error: 'Memory not found' });

  const result = db.prepare('DELETE FROM match_memories WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Memory not found' });

  res.json({ success: true });
});

export default router;
