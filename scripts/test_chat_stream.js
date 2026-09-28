// Simple script to test SSE streaming against the Orbit backend
const http = require('http');

const postData = JSON.stringify({
  content: 'Hello Orbit, tell me who you are and what your principles are.',
});

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/chat/stream',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'Authorization': 'Bearer dev-token',
  },
};

console.log('[Orbit Stream Test] Sending request to http://localhost:4000/api/chat/stream...');

const req = http.request(options, (res) => {
  console.log(`[Status Code]: ${res.statusCode}`);
  console.log(`[Headers]: Content-Type = ${res.headers['content-type']}`);

  res.on('data', (chunk) => {
    const text = chunk.toString();
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'token') {
            process.stdout.write(data.text);
          } else {
            console.log(`\n[Event: ${data.type}]`, data);
          }
        } catch {
          // ignore
        }
      }
    }
  });

  res.on('end', () => {
    console.log('\n\n[Orbit Stream Test] Stream ended.');
  });
});

req.on('error', (e) => {
  console.error(`[Problem with request]: ${e.message}`);
});

req.write(postData);
req.end();
