type BrandLogoProps = {
  size?: number;
  alt?: string;
  className?: string;
  priority?: boolean;
  color?: string;
};

export default function BrandLogo({
  size = 30,
  alt = "SEHATI",
  className,
  priority: _priority = false,
  color = "currentColor",
}: BrandLogoProps) {
  return (
    <span
      role="img"
      aria-label={alt}
      className={className}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        backgroundColor: color,
        maskImage: "url('/branding/logo/logo-sehati.svg')",
        maskRepeat: "no-repeat",
        maskPosition: "center",
        maskSize: "contain",
        WebkitMaskImage: "url('/branding/logo/logo-sehati.svg')",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        WebkitMaskSize: "contain",
        verticalAlign: "middle",
      }}
    />
  );
}
