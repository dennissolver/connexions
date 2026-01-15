// lib/provisioning/templates/child.ts

export const TEMPLATE_FILES: Record<string, string> = {
  'package.json': `{
  "name": "connexions-child-platform",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@elevenlabs/client": "^1.0.0",
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.47.0",
    "lucide-react": "^0.460.0",
    "next": "14.2.15",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "autoprefixer": "^10",
    "postcss": "^8",
    "tailwindcss": "^3",
    "typescript": "^5"
  }
}`,

  'next.config.js': `module.exports = { images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] } };`,

  'tsconfig.json': `{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`,

  'tailwind.config.js': `module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: { colors: { primary: 'var(--color-primary)', accent: 'var(--color-accent)' } } },
  plugins: [],
};`,

  'postcss.config.js': `module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };`,

  '.gitignore': `node_modules\n.next\n.env*.local\n.env\n.vercel`,

  'app/globals.css': `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n:root {\n  --color-primary: #8B5CF6;\n  --color-accent: #10B981;\n  --color-background: #0F172A;\n}\n\nbody { background-color: var(--color-background); color: #F8FAFC; }`,

  'app/layout.tsx': `import './globals.css';\nimport { clientConfig } from '@/config/client';\n\nexport const metadata = { title: clientConfig.platform.name };\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return <html lang="en"><body>{children}</body></html>;\n}`,

  'app/page.tsx': `import { clientConfig } from '@/config/client';\n\nexport default function Home() {\n  return (\n    <div className="min-h-screen flex items-center justify-center">\n      <div className="text-center">\n        <h1 className="text-4xl font-bold mb-4">{clientConfig.platform.name}</h1>\n        <p className="text-slate-400">{clientConfig.company.name}</p>\n      </div>\n    </div>\n  );\n}`,

  'lib/supabase/client.ts': `import { createBrowserClient } from '@supabase/ssr';\n\nexport function createClient() {\n  return createBrowserClient(\n    process.env.NEXT_PUBLIC_SUPABASE_URL!,\n    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!\n  );\n}`,

  'lib/supabase/server.ts': `import { createClient as createSupabaseClient } from '@supabase/supabase-js';\n\nexport function createClient() {\n  return createSupabaseClient(\n    process.env.NEXT_PUBLIC_SUPABASE_URL!,\n    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!\n  );\n}`,
};

export function generateClientConfig(platformName: string, companyName: string, colors: { primary: string; accent: string; background: string }): string {
  return `export const clientConfig = {
  platform: { name: "${platformName}", tagline: "AI-Powered Interviews" },
  company: { name: "${companyName}", supportEmail: "support@example.com" },
  theme: { colors: { primary: "${colors.primary}", accent: "${colors.accent}", background: "${colors.background}" } },
} as const;`;
}

export function generateReadme(platformName: string, companyName: string, supabaseUrl?: string, vercelUrl?: string): string {
  return `# ${platformName}\n\nAI Interview Platform for ${companyName}\n\n- Supabase: ${supabaseUrl || 'TBD'}\n- Vercel: ${vercelUrl || 'TBD'}\n\nPowered by Connexions`;
}
