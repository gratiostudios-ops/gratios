import React, { useEffect, useState } from 'react';
import { Image, type ImageProps } from 'react-native';
import { imageSource } from '../assets';
import type { AssetKey, ImageReference } from '../data/types';

/** Missing references and failed remote requests use a bundled, offline asset. */
export function SafeImage({ image, fallback = 'flight', allowAvatar = true, onError, ...props }: Omit<ImageProps, 'source'> & {
  image?: ImageReference; fallback?: AssetKey; allowAvatar?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const reference = JSON.stringify(image);
  useEffect(() => setFailed(false), [reference]);
  return <Image {...props} source={imageSource(failed || (!allowAvatar && image?.asset === 'avatar') ? undefined : image, fallback)}
    onError={event => { if (!failed) setFailed(true); onError?.(event); }} />;
}
