const esbuild = require('esbuild')
const path = require('path')
const fs = require('fs')

const watch = process.argv.includes('--watch')

const sharedAlias = {
  name: 'af-shared-alias',
  setup(build) {
    build.onResolve({ filter: /^@af\/shared$/ }, () => ({
      path: path.resolve(__dirname, '../packages/shared/src/index.ts'),
    }))
  },
}

// Extension host bundle (Node/CJS)
const extensionConfig = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  platform: 'node',
  format: 'cjs',
  external: ['vscode'],
  sourcemap: true,
  plugins: [sharedAlias],
}

// Webview bundle (Browser/IIFE)
const webviewConfig = {
  entryPoints: ['webview/index.tsx'],
  bundle: true,
  outfile: 'dist/webview.js',
  platform: 'browser',
  format: 'iife',
  sourcemap: true,
  jsx: 'automatic',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  plugins: [sharedAlias],
}

async function main() {
  if (watch) {
    const extCtx = await esbuild.context(extensionConfig)
    const webCtx = await esbuild.context(webviewConfig)
    await Promise.all([extCtx.watch(), webCtx.watch()])
    console.log('Watching for changes...')
  } else {
    await Promise.all([
      esbuild.build(extensionConfig),
      esbuild.build(webviewConfig),
    ])
    // Copy CSS to dist
    fs.copyFileSync(
      path.resolve(__dirname, 'webview/styles/webview.css'),
      path.resolve(__dirname, 'dist/webview.css')
    )
    console.log('Build complete.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
