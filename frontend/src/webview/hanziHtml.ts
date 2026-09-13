// Builds the self-contained HTML document that runs inside the WebView.
// It hosts hanzi-writer (stroke animation / tracing / quiz), a 米字格 grid,
// canvas-confetti, synthesized Web Audio sound effects, and Web Speech.
//
// RN -> WebView : commands are injected by calling window.HZ.* directly.
// WebView -> RN : events are posted via window.ReactNativeWebView.postMessage.
import { OFFLINE_HANZI_DATA } from "./offlineHanziData";

export function buildHanziHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
<style>
  * { -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }
  html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:#FFFFFF; touch-action:none; }
  #wrap { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
  #stage { position:relative; }
  #grid { position:absolute; inset:0; z-index:0; pointer-events:none; }
  #target { position:absolute; inset:0; z-index:1; touch-action:none; }
</style>
</head>
<body>
<div id="wrap"><div id="stage">
  <svg id="grid" viewBox="0 0 100 100" preserveAspectRatio="none">
    <rect x="1.2" y="1.2" width="97.6" height="97.6" rx="4" fill="#FFFFFF" stroke="#F6B8C1" stroke-width="1.2"/>
    <line x1="50" y1="2" x2="50" y2="98" stroke="#F6B8C1" stroke-width="0.8" stroke-dasharray="3 3"/>
    <line x1="2" y1="50" x2="98" y2="50" stroke="#F6B8C1" stroke-width="0.8" stroke-dasharray="3 3"/>
    <line x1="2" y1="2" x2="98" y2="98" stroke="#F9D2D8" stroke-width="0.6" stroke-dasharray="2 3"/>
    <line x1="98" y1="2" x2="2" y2="98" stroke="#F9D2D8" stroke-width="0.6" stroke-dasharray="2 3"/>
  </svg>
  <div id="target"></div>
</div></div>

<script src="https://cdn.jsdelivr.net/npm/hanzi-writer@3.7.0/dist/hanzi-writer.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"></script>
<script>
(function(){
  var OFFLINE = ${OFFLINE_HANZI_DATA};
  var writer = null;
  var stage = document.getElementById('stage');
  var target = document.getElementById('target');
  var grid = document.getElementById('grid');
  var currentChar = null;
  var currentMode = 'trace';
  var audioCtx = null;

  function post(type, data){
    var msg = JSON.stringify({ type: type, data: data || null });
    try { if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(msg); return; } } catch(e) {}
    try { window.parent.postMessage(msg, '*'); } catch(e) {}
  }

  function sizeStage(){
    var s = Math.min(window.innerWidth, window.innerHeight);
    s = Math.max(280, s - 16);
    stage.style.width = s + 'px';
    stage.style.height = s + 'px';
    return s;
  }

  // ---- Web Audio synthesized effects ----
  function ctx(){
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){}
    }
    if (audioCtx && audioCtx.state === 'suspended') { audioCtx.resume(); }
    return audioCtx;
  }
  function tone(freq, start, dur, type, vol){
    var c = ctx(); if(!c) return;
    var o = c.createOscillator(); var g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    var t = c.currentTime + start;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function ding(){ tone(880, 0, 0.16, 'sine', 0.16); tone(1320, 0.05, 0.18, 'sine', 0.12); }
  function boing(){ tone(300, 0, 0.18, 'sine', 0.16); tone(180, 0.08, 0.22, 'sine', 0.14); }
  function fanfare(){
    var notes = [523, 659, 784, 1047];
    for (var i=0;i<notes.length;i++){ tone(notes[i], i*0.12, 0.26, 'triangle', 0.16); }
  }

  function confettiBurst(){
    if (typeof confetti !== 'function') return;
    var colors = ['#10B981','#F43F5E','#FBBF24','#22C55E','#FB7185'];
    confetti({ particleCount: 90, spread: 75, startVelocity: 45, origin: { y: 0.6 }, colors: colors });
    setTimeout(function(){ confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0 }, colors: colors }); }, 150);
    setTimeout(function(){ confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1 }, colors: colors }); }, 250);
  }

  function loader(char, onComplete, onError){
    if (OFFLINE && OFFLINE[char]) { onComplete(OFFLINE[char]); return; }
    if (window.HanziWriter && HanziWriter.loadCharacterData) {
      HanziWriter.loadCharacterData(char).then(onComplete).catch(function(){
        fetch('https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/' + encodeURIComponent(char) + '.json')
          .then(function(r){ return r.json(); }).then(onComplete).catch(onError);
      });
    } else {
      fetch('https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/' + encodeURIComponent(char) + '.json')
        .then(function(r){ return r.json(); }).then(onComplete).catch(onError);
    }
  }

  function buildWriter(char){
    var size = sizeStage();
    target.innerHTML = '';
    writer = HanziWriter.create('target', char, {
      width: size,
      height: size,
      padding: Math.round(size * 0.08),
      showCharacter: false,
      showOutline: false,
      strokeColor: '#10B981',
      radicalColor: '#F43F5E',
      outlineColor: '#D6C7B0',
      highlightColor: '#FBBF24',
      drawingColor: '#F43F5E',
      drawingWidth: 26,
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 350,
      charDataLoader: loader,
      onLoadCharDataError: function(){ post('charError', { char: char }); }
    });
  }

  function startMode(mode){
    if (!writer) return;
    currentMode = mode;
    try { writer.cancelQuiz(); } catch(e){}
    if (mode === 'demonstrate') {
      writer.showOutline();
      writer.hideCharacter();
      writer.loopCharacterAnimation();
      post('modeReady', { mode: mode });
    } else if (mode === 'trace') {
      writer.showOutline();
      writer.quiz({
        showOutline: true,
        showHintAfterMisses: 1,
        leniency: 1.8,
        onCorrectStroke: function(d){ ding(); post('strokeCorrect', d); },
        onMistake: function(d){ boing(); post('strokeError', d); },
        onComplete: function(d){ fanfare(); confettiBurst(); post('complete', d); }
      });
      post('modeReady', { mode: mode });
    } else { // test
      writer.hideOutline();
      writer.hideCharacter();
      writer.quiz({
        showOutline: false,
        showHintAfterMisses: false,
        leniency: 1.2,
        onCorrectStroke: function(d){ ding(); post('strokeCorrect', d); },
        onMistake: function(d){ boing(); post('strokeError', d); },
        onComplete: function(d){ fanfare(); confettiBurst(); post('complete', d); }
      });
      post('modeReady', { mode: mode });
    }
  }

  // ---- Public bridge ----
  window.HZ = {
    load: function(char, mode){
      ctx();
      currentChar = char;
      buildWriter(char);
      // small delay so the writer finishes mounting before starting the mode
      setTimeout(function(){ startMode(mode || 'trace'); }, 60);
    },
    setMode: function(mode){ startMode(mode); },
    replay: function(){
      if (!writer) return;
      if (currentMode === 'demonstrate') { writer.loopCharacterAnimation(); }
      else { startMode(currentMode); }
    },
    reset: function(){ if (currentChar) window.HZ.load(currentChar, currentMode); },
    speak: function(char, lang){
      try {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(char);
        u.lang = lang || 'zh-CN';
        u.rate = 0.8; u.pitch = 1.05;
        window.speechSynthesis.speak(u);
      } catch(e) { post('speakError', { message: String(e) }); }
    },
    celebrate: function(){ fanfare(); confettiBurst(); }
  };

  window.addEventListener('resize', function(){ if (currentChar) window.HZ.reset(); });
  document.addEventListener('touchstart', function(){ ctx(); }, { once: true });

  function ready(){ post('ready', {}); }
  if (window.HanziWriter) { ready(); }
  else {
    var tries = 0;
    var iv = setInterval(function(){
      tries++;
      if (window.HanziWriter) { clearInterval(iv); ready(); }
      else if (tries > 60) { clearInterval(iv); post('engineError', {}); }
    }, 100);
  }
})();
</script>
</body>
</html>`;
}
