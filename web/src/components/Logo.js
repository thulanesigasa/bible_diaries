export default function Logo({ size = 44 }) {
  // The existing source icon has generous transparent padding for app launchers.
  // Crop it visually so the website mark stays legible without altering the asset.
  return <span className="logo-frame" style={{ width: size, height: size }} aria-hidden="true"><img src="/logo.png" width="512" height="512" alt=""/></span>;
}
