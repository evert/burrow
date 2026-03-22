// @ts-check
import http from 'node:http';
import { asset } from './serve-assets.mjs';
import { gopherRequest } from './gopher-request.mjs';

const server = http.createServer((req, res) => {
  handle(req, res);
});

server.listen(process.env.PORT || 3000, () => {
  console.log('Server running at http://localhost:' + (process.env.PORT || 3000));
});

/**
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
async function handle(req, res) {

  console.log('->', req.method, req.url);
  if (req.url?.startsWith('/proxy/')) {
    await gopherProxy(req, res);
  } else {
    await asset(req,res);
  }
  console.log('<-', req.method, req.url, res.statusCode);

}

/**
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
async function gopherProxy(req, res) {

  try {

    const targetUrl = decodeURIComponent(/** @type {string} */(req.url).slice('/proxy/'.length));
    console.log('-- Proxying gopher request for: ' + targetUrl);
    const target = new URL(targetUrl);
    await gopherRequest(target, res);

  } catch (err) {

    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
      error: err.message
    }));

  }

}

