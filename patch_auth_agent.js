const fs = require('fs');
const filepath = 'src/lib/agent-auth.ts';
let code = fs.readFileSync(filepath, 'utf8');

const search = `import { getDeviceSession, setDeviceSession } from './redis';
import { queryOne } from './db';
import crypto from 'crypto';

export interface DeviceAuthResult {`;
const replace = `import { getDeviceSession, setDeviceSession } from './redis';
import { queryOne } from './db';
import crypto from 'crypto';
import { verifyAndroidHmac } from './hmac';

export interface DeviceAuthResult {`;
code = code.replace(search, replace);

const search2 = `export async function validateDeviceToken(request: Request): Promise<DeviceAuthResult> {
  const authHeader = request.headers.get('Authorization');`;
const replace2 = `export async function validateDeviceToken(request: Request): Promise<DeviceAuthResult> {
  if (!verifyAndroidHmac(request)) {
    return { isAuthenticated: false };
  }

  const authHeader = request.headers.get('Authorization');`;
code = code.replace(search2, replace2);
fs.writeFileSync(filepath, code);
