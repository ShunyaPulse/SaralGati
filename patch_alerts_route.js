const fs = require('fs');
const filepath = 'src/app/api/alerts/route.ts';
let code = fs.readFileSync(filepath, 'utf8');

const search = `import { AssistanceLog, ApiResponse } from '@/types';`;
const replace = `import { AssistanceLog, ApiResponse } from '@/types';
import { verifyAndroidHmac } from '@/lib/hmac';`;
code = code.replace(search, replace);

const search2 = `export async function POST(request: Request): Promise<NextResponse<ApiResponse<AssistanceLog>>> {
  try {
    const body = await request.json();`;
const replace2 = `export async function POST(request: Request): Promise<NextResponse<ApiResponse<AssistanceLog>>> {
  try {
    if (!verifyAndroidHmac(request)) {
      return NextResponse.json({ success: false, error: 'Invalid app signature' }, { status: 403 });
    }
    const body = await request.json();`;
code = code.replace(search2, replace2);
fs.writeFileSync(filepath, code);
