import http from 'node:http';

const port = process.env.PORT || 3000;
const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('dev server running');
});

server.listen(port, () => {
  console.log(`Dev server running at http://localhost:${port}`);
});
