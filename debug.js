const $offscreenMap = document.querySelector('#offscreen-map');

let isDebugging = false;
document.addEventListener('keydown', event => {
  if (event.key.toLowerCase() === 'd') {
    isDebugging = true;
    $offscreenMap.classList.add('debugging');
  }
});

document.addEventListener('keyup', event => {
  if (isDebugging && event.key.toLowerCase() === 'd') {
    $offscreenMap.classList.remove('debugging');
  }
});
