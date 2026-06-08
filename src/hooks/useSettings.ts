import { useState } from 'react';

export function useSettings() {
  const [menuDesign] = useState<'simple' | 'modern'>('simple');
  return { menuDesign };
}

export default useSettings;
