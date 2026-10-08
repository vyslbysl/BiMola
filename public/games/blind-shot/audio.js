// Synthesized locally: no audio downloads or external requests.
export function createAudio() {
  let context, enabled=false, disposed=false;
  const voices=new Set();
  async function unlock() {
    if(!enabled||disposed)return;
    try {context ||= new (window.AudioContext||window.webkitAudioContext)();if(context.state==='suspended')await context.resume();} catch {enabled=false;}
  }
  function tone(frequency,duration,volume=.08,type='sine',delay=0,end=frequency) {
    if(document.hidden||!enabled||context?.state!=='running'||disposed)return;
    const oscillator=context.createOscillator(),gain=context.createGain(),at=context.currentTime+delay;
    oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,at);oscillator.frequency.exponentialRampToValueAtTime(Math.max(20,end),at+duration);
    gain.gain.setValueAtTime(volume,at);gain.gain.exponentialRampToValueAtTime(.001,at+duration);
    oscillator.connect(gain);gain.connect(context.destination);voices.add(oscillator);
    oscillator.onended=()=>{voices.delete(oscillator);oscillator.disconnect();gain.disconnect();};oscillator.start(at);oscillator.stop(at+duration+.02);
  }
  function play(event,count=1) {
    if(event==='shot'){tone(150,.2,.11,'sawtooth',0,35);if(count>1)tone(95,.22,.07,'triangle',.04,25);}
    if(event==='hit'){tone(60,.24,.12,'triangle',.3,25);tone(700,.09,.035,'square',.3,150);}
    if(event==='blocked')tone(1200,.15,.045,'triangle',.3,300);
    if(event==='lock')tone(600,.12,.06,'sine',0,950);
    if(event==='countdown')tone(750,.09,.055);
    if(event==='round'){tone(440,.25);tone(660,.25,.06,'sine',.18);tone(880,.4,.06,'sine',.36);}
  }
  return {play,unlock,get enabled(){return enabled;},async toggle(){enabled=!enabled;if(enabled)await unlock();else for(const voice of voices){try{voice.stop();}catch{}}return enabled;},dispose(){disposed=true;for(const voice of voices){try{voice.stop();}catch{}}voices.clear();context?.close().catch(()=>{});}};
}
