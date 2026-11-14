/** Messages from learner JavaScript in the isolated preview. Their content is untrusted text. */
export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error';
export interface ConsoleEntry {
  level: ConsoleLevel;
  text: string;
  /** Project file named by the browser for an error, when it names one. */
  file?: string;
  line?: number;
}

export const CONSOLE_MESSAGE = 'zdaj-preview-console';
export const MAX_CONSOLE_ENTRIES = 200;
const MAX_TEXT = 2000;
const levels: readonly string[] = ['log', 'info', 'warn', 'error'];

/** Accepts only the expected shape; anything else posted by the frame is ignored. */
export function readConsoleMessage(data: unknown): ConsoleEntry | null {
  if (!data || typeof data !== 'object') return null;
  const message = data as Record<string, unknown>;
  if (message.type !== CONSOLE_MESSAGE) return null;
  if (typeof message.level !== 'string' || !levels.includes(message.level)) return null;
  if (typeof message.text !== 'string') return null;
  const entry: ConsoleEntry = {
    level: message.level as ConsoleLevel,
    text: message.text.slice(0, MAX_TEXT),
  };
  // The frame itself is about:srcdoc; only a name given by a sourceURL comment is a file.
  if (
    typeof message.file === 'string' &&
    message.file.length > 0 &&
    message.file.length <= 200 &&
    !/^[a-z][a-z0-9+.-]*:/i.test(message.file)
  ) {
    entry.file = message.file;
    if (Number.isInteger(message.line) && (message.line as number) > 0)
      entry.line = message.line as number;
  }
  return entry;
}

export function appendConsoleEntry(entries: readonly ConsoleEntry[], entry: ConsoleEntry) {
  return [...entries, entry].slice(-MAX_CONSOLE_ENTRIES);
}

/**
 * Runs inside the frame before any learner script. It copies console calls and uncaught
 * errors to the parent as plain strings; the parent decides what to show.
 */
export const consoleBridgeScript = `(function(){
function send(level,text,file,line){try{parent.postMessage({type:'${CONSOLE_MESSAGE}',level:level,text:String(text).slice(0,${MAX_TEXT}),file:file||'',line:line||0},'*');}catch(e){}}
function show(value){if(typeof value==='string')return value;
if(value instanceof Error)return value.name+': '+value.message;
if(typeof value==='function')return String(value).slice(0,200);
if(value&&typeof value==='object'){if(value.nodeType===1)return '<'+value.tagName.toLowerCase()+(value.id?' id="'+value.id+'"':'')+'>';
try{var text=JSON.stringify(value);if(text!==undefined)return text;}catch(e){}
return Object.prototype.toString.call(value);}
return String(value);}
['log','info','warn','error','debug'].forEach(function(name){var original=console[name];
console[name]=function(){var parts=[];for(var i=0;i<arguments.length;i++)parts.push(show(arguments[i]));
send(name==='debug'?'log':name,parts.join(' '));if(original)original.apply(console,arguments);};});
window.addEventListener('error',function(event){send('error',event.message||'Błąd skryptu',event.filename,event.lineno);});
window.addEventListener('unhandledrejection',function(event){send('error','Nieobsłużona obietnica: '+show(event.reason));});
})();`;
