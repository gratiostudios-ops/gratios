import {isGmailMessageUrl} from '../../../backend/shared/response';
/** A failed native handoff never silently opens a browser or generic inbox. */
export async function openEmailWithFallback(url:string,openApp:()=>Promise<unknown>,confirmBrowser:()=>Promise<boolean>,openBrowser:(url:string)=>Promise<unknown>){
  if(!isGmailMessageUrl(url))throw new Error('Invalid source email link');
  try{await openApp();return 'app' as const;}catch{
    if(!await confirmBrowser())return 'cancelled' as const;
    await openBrowser(url);return 'browser' as const;
  }
}
