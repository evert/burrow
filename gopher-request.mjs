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
    requestLine += '\t' + url.search;
  }

  console.log('Requesting gopher resource: ' + requestLine + ' from ' + host + ':' + port);
  const client = createConnection({ port, host }, () => {
    client.write(requestLine + '\r\n');
  });

  client.pipe(res);

}
