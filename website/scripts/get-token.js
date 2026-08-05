const jwt = require('jsonwebtoken');
const secret = 's0d4zWpm3qOvzNzKVp79CVmwTkGhZ4ejUr6tU/j7DTU';
const payload = {
  sub: 'cms315zw00006hxgj4b85p166',
  email: 'admin@insan-platform.com',
  roleId: 'cms315xpn0000hxgjqvf183mb',
  roleName: 'SUPER_ADMIN'
};
const token = jwt.sign(payload, secret, { expiresIn: '1h' });
console.log(token);
