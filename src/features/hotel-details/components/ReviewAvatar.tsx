"use client";

import Image from "next/image";
import { useState } from "react";
import { initials } from "../model/reviews";

type ReviewAvatarProps = { name: string; src: string };

/**
 * Avatar `size-10` redondo. Sem foto ou foto quebrada: iniciais (6.40:1). Decorativo (`alt=""`):
 * o nome do hóspede está sempre ao lado, em texto.
 */
export const ReviewAvatar = ({ name, src }: ReviewAvatarProps) => {
  const [failed, setFailed] = useState(false);
  return (
    <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-sunken">
      {failed ? (
        <span aria-hidden="true" className="text-sm font-semibold text-fg-muted">
          {initials(name)}
        </span>
      ) : (
        <Image
          src={src}
          alt=""
          width={40}
          height={40}
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      )}
    </span>
  );
};
