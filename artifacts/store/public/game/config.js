// Endless Arena — Backend configuration
// -----------------------------------------------
// When hosting FRONTEND on GitHub Pages and BACKEND on Replit,
// set BACKEND_URL to your Replit deployed URL, e.g.:
//   window.BACKEND_URL = 'https://endless-arena.replit.app';
//
// Leave empty ('') when everything is hosted on Replit.
// -----------------------------------------------
window.BACKEND_URL = '';

// When BACKEND_URL is set, intercept Image and Audio creation
// so asset paths resolve to the backend.
// This is a no-op when BACKEND_URL is empty (Replit hosting).
(function () {
  if (!window.BACKEND_URL) return;

  var B = window.BACKEND_URL;

  // Normalise any asset src to an absolute backend URL.
  // Handles three formats used by game.js / heroes-dlc.js:
  //   "images/heroes/james.png"   -> B + "/game/images/heroes/james.png"
  //   "sounds/fire_james.mp3"     -> B + "/game/sounds/fire_james.mp3"
  //   "/game/images/heroes/..."   -> B + "/game/images/heroes/..."
  function fixSrc(val) {
    if (typeof val !== 'string') return val;
    if (val.startsWith('/game/'))   return B + val;
    if (val.startsWith('images/'))  return B + '/game/' + val;
    if (val.startsWith('sounds/'))  return B + '/game/' + val;
    return val;
  }

  // Patch HTMLImageElement.prototype.src — catches all new Image() calls
  var _imgDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    configurable: true,
    get: _imgDesc.get,
    set: function (val) {
      _imgDesc.set.call(this, fixSrc(val));
    }
  });

  // Patch Audio constructor — catches all new Audio(src) calls
  var _OrigAudio = window.Audio;
  window.Audio = function (src) {
    return new _OrigAudio(fixSrc(src));
  };
  window.Audio.prototype = _OrigAudio.prototype;
})();
