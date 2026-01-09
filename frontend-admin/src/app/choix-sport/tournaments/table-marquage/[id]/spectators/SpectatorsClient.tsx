"use client";

import { getSpectatorsComponent, type SportCode } from '../../registry';
import type { SportConfig } from '../../config';

interface Props {
  sportCode: SportCode;
  config: SportConfig;
}

export default function SpectatorsClient({ sportCode, config }: Props) {
  const SpectatorsComponent = getSpectatorsComponent(sportCode);
  if (!SpectatorsComponent) {
    return null;
  }
  return (
    <div className="min-h-screen bg-black">
      <SpectatorsComponent config={config} />
    </div>
  );
}
