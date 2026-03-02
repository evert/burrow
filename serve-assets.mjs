import path from 'path';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';

const assetsPath = path.resolve(import.meta.dirname, 'assets');
export async function asset(req, res) {

  let safePath = path.resolve(assetsPath, decodeURIComponent(req.url).slice(1));
  if (safePath.indexOf(assetsPath) !== 0) {
    res.statusCode = 403;
    res.end('Forbidden');
    console.warn('Forbidden path: ' + safePath);
    return;
  }

  let stat;
  try {
    stat = await fs.stat(safePath);
    if (stat.isDirectory()) {
      safePath = path.join(safePath, 'index.html');
      stat = await fs.stat(safePath);
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }
    throw err;
  }

  if (!stat.isFile()) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  const extName = path.extname(safePath).toLowerCase();

  switch(extName) {
    case '.html': 
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      break;
    case '.js': 
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      break;
    case '.css': 
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      break;
    case '.json': 
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      break;
    case '.png': 
      res.setHeader('Content-Type', 'image/png');
      break;
    case '.webp': 
      res.setHeader('Content-Type', 'image/webp');
      break;

    default:
      res.statusCode = 403;
      res.end('Forbidden');
      console.warn('Forbidden file type: ' + extName);
      return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Length', stat.size);
  const fileReadStream = createReadStream(safePath); 
  fileReadStream.pipe(res);

}
