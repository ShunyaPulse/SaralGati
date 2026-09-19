const fs = require('fs');
const filepath = 'src/lib/hmac.ts';
let code = fs.readFileSync(filepath, 'utf8');

const search = `  return signature === expectedSignature;`;
const replace = `  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (e) {
    return false;
  }`;

code = code.replace(search, replace);
fs.writeFileSync(filepath, code);
