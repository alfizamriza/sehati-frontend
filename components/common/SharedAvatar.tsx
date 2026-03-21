"use client";

import React, { useMemo } from "react";
import Avatar, { genConfig, AvatarConfig } from "react-nice-avatar";

export interface SharedAvatarProps {
  fotoUrl: string | null;
  nama: string;
  size?: number | string;
  className?: string;
  onClick?: () => void;
}

export default function SharedAvatar({
  fotoUrl,
  nama,
  size = 80,
  className = "",
  onClick,
}: SharedAvatarProps) {
  const isNiceAvatar = fotoUrl && fotoUrl.startsWith("nice-avatar://?");

  const config = useMemo(() => {
    if (isNiceAvatar && fotoUrl) {
      try {
        const queryParams = new URLSearchParams(fotoUrl.replace("nice-avatar://?", ""));
        const parsed = Object.fromEntries(queryParams.entries());
        return { ...genConfig(nama), ...parsed } as AvatarConfig;
      } catch (e) {
        return genConfig(nama);
      }
    }
    return genConfig(nama);
  }, [fotoUrl, nama, isNiceAvatar]);

  const style: React.CSSProperties = {
    width: size,
    height: size,
    flexShrink: 0,
    cursor: onClick ? "pointer" : "default",
    borderRadius: "50%",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "var(--surface-hover)",
  };

  const sharedAvatarStyles = (
    <style jsx global>{`
      .shared-avatar {
        position: relative;
        line-height: 0;
      }

      .shared-avatar > div,
      .shared-avatar > span,
      .shared-avatar svg {
        width: 100%;
        height: 100%;
        display: block;
      }

      .shared-avatar svg {
        overflow: hidden;
      }
    `}</style>
  );

  if (fotoUrl && !isNiceAvatar) {
    return (
      <>
        <div className={`shared-avatar ${className}`} style={style} onClick={onClick}>
          <img
            src={fotoUrl}
            alt={nama}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                nama
              )}&background=random`;
            }}
          />
        </div>
        {sharedAvatarStyles}
      </>
    );
  }

  return (
    <>
      <div className={`shared-avatar ${className}`} style={{ ...style, backgroundColor: "transparent" }} onClick={onClick}>
        <Avatar style={{ width: "100%", height: "100%", display: "block" }} {...config} />
      </div>
      {sharedAvatarStyles}
    </>
  );
}
