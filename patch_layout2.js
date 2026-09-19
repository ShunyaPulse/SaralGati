const fs = require('fs');
const filepath = 'src/app/layout.tsx';
let code = fs.readFileSync(filepath, 'utf8');

const search = `  return (
    <html lang="en">
      <body className={\`\${inter.variable} \${notoSansDevanagari.variable} font-sans overflow-x-hidden\`}>
        <SmoothScrollProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </SmoothScrollProvider>
        <Toaster position="top-center" richColors theme="light" />
      </body>
    </html>
  );`;

const replace = `  return (
    <html lang="en" nonce={nonce}>
      <body className={\`\${inter.variable} \${notoSansDevanagari.variable} font-sans overflow-x-hidden\`} nonce={nonce}>
        <SmoothScrollProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </SmoothScrollProvider>
        <Toaster position="top-center" richColors theme="light" />
      </body>
    </html>
  );`;

code = code.replace(search, replace);
fs.writeFileSync(filepath, code);
