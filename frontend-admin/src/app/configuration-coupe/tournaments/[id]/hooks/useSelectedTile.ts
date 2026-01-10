import { useState } from 'react';

export function useSelectedTile() {
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [selectedPool, setSelectedPool] = useState<any>(null);
  const [selectedBracket, setSelectedBracket] = useState<any>(null);
  const [selectedLoserBracket, setSelectedLoserBracket] = useState<any>(null);

  return {
    selectedMatch,
    setSelectedMatch,
    selectedPool,
    setSelectedPool,
    selectedBracket,
    setSelectedBracket,
    selectedLoserBracket,
    setSelectedLoserBracket,
  };
}
