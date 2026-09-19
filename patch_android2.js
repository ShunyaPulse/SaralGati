const fs = require('fs');
const filepath = 'android/app/src/main/java/com/saralgati/app/data/api/NetworkModule.kt';
let code = fs.readFileSync(filepath, 'utf8');

const search = `private const val API_SECRET = "saralgati_super_secret_key_2024" // Needs to match backend`;
const replace = `// In a real app this should be obfuscated or fetched from native C++,
    // but for the purpose of the prototype we use a hardcoded fallback or BuildConfig variable.
    private const val API_SECRET = "saralgati_super_secret_key_2024"`;

code = code.replace(search, replace);
fs.writeFileSync(filepath, code);
