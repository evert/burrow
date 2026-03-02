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

    const target = new URL(/** @type {string} */(req.url).slice('/proxy?'.length));
    await gopherRequest(target, res);

  } catch (err) {

    res.statusCode = 200;
    res.end(JSON.stringify({
      error: err.message
    }));

  }

}

