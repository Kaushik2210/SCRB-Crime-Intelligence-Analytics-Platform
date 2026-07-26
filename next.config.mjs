/** @type {import('next').NextConfig} */
const nextConfig = {
  // Base UI's Dialog/DropdownMenu popups mount a render-phase state update
  // that only surfaces under React 18 StrictMode's dev-only double-render
  // check, causing a visible remount/flash on every navigation. StrictMode
  // never runs in production, so this doesn't affect deployed behavior.
  reactStrictMode: false,
  // Catalyst's AppSail build/pack scripts (app-config.json) expect the build
  // output under "dist", per Catalyst's official Next.js-on-AppSail guide.
  distDir: "dist",
  // AppSail requires node_modules in the uploaded package, but the Catalyst
  // CLI zips every file with an open handle each and dies with EMFILE on
  // Windows well before ~30k files. Standalone output traces only the modules
  // actually reachable at runtime, cutting that by ~95%.
  output: "standalone",
};

export default nextConfig;
