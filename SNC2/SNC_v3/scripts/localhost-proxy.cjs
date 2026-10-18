const http = require('node:http');

const targetHost = process.env.SNC_WSL_HOST || '192.168.243.129';
const targetPort = Number(process.env.SNC_WSL_PORT || 5556);
const listenPort = Number(process.env.SNC_LOCAL_PORT || 5556);

const server = http.createServer((request, response) => {
  const upstream = http.request({
    hostname: targetHost,
    port: targetPort,
    path: request.url,
    method: request.method,
    headers: { ...request.headers, host: `${targetHost}:${targetPort}` }
  }, upstreamResponse => {
    response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
    upstreamResponse.pipe(response);
  });
  upstream.on('error', error => {
    if (!response.headersSent) response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'SNC_v3 no disponible', detail: error.code || 'UPSTREAM_ERROR' }));
  });
  request.pipe(upstream);
});

server.listen(listenPort, '127.0.0.1', () => console.log(`SNC proxy http://127.0.0.1:${listenPort} -> http://${targetHost}:${targetPort}`));
