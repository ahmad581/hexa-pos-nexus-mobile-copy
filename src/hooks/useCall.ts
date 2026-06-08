import { useState } from 'react';

export function useCall() {
  const [activeCallInfo] = useState<any>(null);
  const endCall = () => {};
  const isInCall = () => false;
  return { activeCallInfo, endCall, isInCall };
}

export default useCall;
