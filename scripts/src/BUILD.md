Source of the two bundles. The bundles include the original pose compiler and flipbook tools; from a checkout of that source, replace
`<upstream checkout>/` with its path, then:

    npx esbuild animate-cli.ts --bundle --platform=node --format=esm --target=node18 --outfile=../animate.mjs \
      --banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
    npx esbuild texture-tool-cli.ts --bundle --platform=node --format=esm --target=node18 --outfile=../texture-tool.mjs
