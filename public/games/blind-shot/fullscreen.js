export function createFullscreen(container, button, {beforeChange, onChange}) {
  let fallback = false, pending = false, disposed = false;
  const active = () => fallback || document.fullscreenElement === container;
  function sync() {
    const enabled = active();
    container.classList.toggle('is-fullscreen', fallback);
    document.body.classList.toggle('arena-fullscreen', enabled);
    button.textContent = enabled ? '⛶ Tam ekrandan çık' : '⛶ Tam ekran';
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', enabled ? 'Tam ekrandan çık' : 'Oyun sahnesini tam ekran yap');
    button.title = fallback ? 'Sahne tarayıcı penceresini kaplıyor. Esc ile çık.' : enabled ? 'Esc ile tam ekrandan çık.' : 'Oyun sahnesini büyüt.';
    onChange();
  }
  async function close() {
    beforeChange(); fallback = false;
    if (document.fullscreenElement === container) {
      try { await document.exitFullscreen(); } catch { /* Keep the exit control available. */ }
    }
    sync();
  }
  async function toggle() {
    if (pending || disposed) return;
    pending = true; beforeChange();
    try {
      if (active()) await close();
      else {
        try {
          if (!container.requestFullscreen || !document.fullscreenEnabled) throw new Error('Unavailable');
          await container.requestFullscreen();
        } catch {
          // Embedded browsers and phones may only allow filling the viewport.
          if (!disposed && !container.closest('[hidden]')) fallback = true;
        }
        if (disposed || container.closest('[hidden]')) await close();
        else sync();
      }
    } finally { pending = false; }
  }
  function changed() { beforeChange(); sync(); }
  function keydown(event) { if (event.key === 'Escape' && active()) close(); }
  button.addEventListener('click', toggle);
  document.addEventListener('fullscreenchange', changed);
  document.addEventListener('keydown', keydown);
  return {close, dispose() {
    disposed = true; close();
    button.removeEventListener('click', toggle);
    document.removeEventListener('fullscreenchange', changed);
    document.removeEventListener('keydown', keydown);
  }};
}
