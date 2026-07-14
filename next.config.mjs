/** @type {import('next').NextConfig} */
const nextConfig = {
  // Base UI's Dialog/DropdownMenu popups mount a render-phase state update
  // that only surfaces under React 18 StrictMode's dev-only double-render
  // check, causing a visible remount/flash on every navigation. StrictMode
  // never runs in production, so this doesn't affect deployed behavior.
  reactStrictMode: false,
};

export default nextConfig;
