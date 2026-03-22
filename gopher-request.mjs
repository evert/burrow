// @ts-check
import { createConnection } from 'node:net';

const allowedPorts = [70, 7070];


/**
 * @param {URL} url
 * @param {import('node:http').ServerResponse} res
 */
export async function gopherRequest(url, res) {

  if (url.protocol !== 'gopher:') {
    throw new Error('Only the gopher protocol is supported');
  }
  const port = +(url.port) || 70;
  if (!allowedPorts.includes(port)) {
    throw new Error('This proxy only allows connecting to the following ports: ' + allowedPorts.join(', ') + ' for security reasons');
  }
  const host = url.hostname;

  let gopherType;
  let selector;
  if (url.pathname === '/') {
    gopherType = '1';
    selector = '';
  } else {
    gopherType = url.pathname.slice(1, 2);
    selector = url.pathname.slice(2);
  }

  let requestLine = selector;
  if (url.search) {
    requestLine += '\t' + url.search.slice(1);
  }

  // console.log('Requesting gopher resource: ' + requestLine + ' from ' + host + ':' + port);

  const client = createConnection({ port, host }, () => {
    client.write(requestLine + '\r\n');
  });

  switch(gopherType) {
    case 'I': {
      switch(selector.split('.').slice(-1)[0]) {
        case 'jpg':
        case 'jpeg':
          res.setHeader('Content-Type', 'image/jpeg');
          break;
        case 'png':
          res.setHeader('Content-Type', 'image/png');
          break;
        case 'gif':
          res.setHeader('Content-Type', 'image/gif');
          break;
        default:
          res.setHeader('Content-Type', 'application/octet-stream');
      }
      break;
    }
    case 'g': {
      res.setHeader('Content-Type', 'image/gif');
        break;
      }

  }
  client.pipe(res);

}
