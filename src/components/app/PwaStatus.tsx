import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
interface InstallPrompt extends Event { prompt(): Promise<void>; userChoice: Promise<{outcome:string}>; }
export function PwaStatus() {
  const [online,setOnline] = useState(navigator.onLine);
  const [install,setInstall] = useState<InstallPrompt|null>(null);
  const { needRefresh:[refresh], updateServiceWorker } = useRegisterSW();
  useEffect(() => {
    const status=()=>setOnline(navigator.onLine);
    const beforeInstall=(e:Event)=>{e.preventDefault();setInstall(e as InstallPrompt);};
    const installed=()=>setInstall(null);
    window.addEventListener('online',status); window.addEventListener('offline',status);window.addEventListener('beforeinstallprompt',beforeInstall);window.addEventListener('appinstalled',installed);
    return ()=>{window.removeEventListener('online',status);window.removeEventListener('offline',status);window.removeEventListener('beforeinstallprompt',beforeInstall);window.removeEventListener('appinstalled',installed);};
  },[]);
  return <>{!online && <div className="offline-strip" role="status">Você está sem conexão. Reconecte para consultar ou confirmar alterações.</div>}{refresh && <div className="offline-strip" role="status">Uma atualização está disponível. <button className="underline ml-2" onClick={()=>void updateServiceWorker(true)}>Atualizar aplicativo</button></div>}{install && <div className="px-4 py-2 flex items-center justify-between gap-3 text-xs border-b border-border bg-card"><span>Tenha sua agenda na tela inicial.</span><div className="flex gap-4"><button className="text-primary py-2" onClick={async()=>{await install.prompt();await install.userChoice;setInstall(null);}}>Instalar</button><button className="text-muted-foreground py-2" onClick={()=>setInstall(null)}>Agora não</button></div></div>}</>;
}
