const http = require('http');

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const options = {
      hostname: 'localhost',
      port: 5556,
      path,
      method,
      headers
    };
    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  const login = await request('POST', '/api/auth/login', { email: 'santo.palo@gmail.com', password: '123*' });
  console.log('LOGIN_STATUS', login.status);
  console.log('LOGIN_BODY', JSON.stringify(login.data).slice(0, 200));

  if (login.data?.token) {
    const members = await request('GET', '/api/admin/members', null, login.data.token);
    console.log('MEMBERS_STATUS', members.status);
    console.log('MEMBERS_BODY', JSON.stringify(members.data).slice(0, 400));
  }
})();
