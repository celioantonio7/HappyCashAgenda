import { useEffect, useRef } from 'react';
/** Keep non-published catalogues fresh without changing the database publication. */
export function useVisibleRefresh(refresh: () => void, enabled: boolean, interval = 30000) {
  const current=useRef(refresh);current.current=refresh;
  useEffect(()=>{
    if(!enabled)return;
    const update=()=>{if(document.visibilityState==='visible')current.current();};
    const timer=window.setInterval(update,interval);
    window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);
    return()=>{window.clearInterval(timer);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update);};
  },[enabled,interval]);
}
