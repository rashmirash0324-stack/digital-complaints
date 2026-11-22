function Logo({ size = 34, full = false }) {
  if (full) {
    return (
      <img
        src="/logo_full.png?v=2"
        alt="Digital Complaints"
        className="brand-logo-full"
        style={{ height: size }}
      />
    );
  }

  return (
    <img
      src="/logo.png?v=2"
      alt="Digital Complaints logo"
      width={size}
      height={size}
      className="brand-logo"
      style={{ width: size, height: size }}
    />
  );
}

export default Logo;
