// @ts-check
import { defineConfig } from "astro/config"
import { execSync } from "child_process"
import cloudflare from "@astrojs/cloudflare"
import tailwindcss from "@tailwindcss/vite"
import Icons from "unplugin-icons/vite"

const pkg = JSON.parse(
  (await import("fs")).readFileSync("../../package.json", "utf-8"),
)
const gitHash = execSync("git rev-parse --short HEAD").toString().trim()

// https://astro.build/config
export default defineConfig({
  output: "server",
  site: 'https://flare-site.pages.dev',
  adapter: cloudflare(),

  experimental: {
    liveContentCollections: true,
  },

  vite: {
    plugins: [
      tailwindcss(),
      Icons({
        compiler: "astro",
        defaultClass: "inline-block",
      }),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __GIT_HASH__: JSON.stringify(gitHash),
    },
  },
})