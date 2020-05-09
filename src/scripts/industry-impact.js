import enterView from 'enter-view';
import scrollama from 'scrollama';

const overflowContainer = document.getElementById('industry-impact-overflow');
const container = document.getElementById('industry-impact-container');
const containerWidth = container.offsetWidth;

window.addEventListener('scroll', moveLeft);

let isStuck = false;
let initY = null;

const maxScrollLeft =
  overflowContainer.scrollWidth - overflowContainer.offsetWidth;
let justSent = false;
function moveLeft(e) {
  if (!isStuck) {
    return;
  }

  const newLeft = window.scrollY - initY;

  const leftTop = newLeft < 0 && newLeft < overflowContainer.scrollLeft;
  const leftBottom =
    newLeft > maxScrollLeft && newLeft > overflowContainer.scrollLeft;
  if (leftTop || leftBottom) {
    console.log(newLeft, leftTop, leftBottom)
    isStuck = false;
    const old= window.scrollY;
    document.body.classList.remove('fixed');
    document.documentElement.style.height = 'auto';
    console.log('old, window.scrollY :>> ', old, window.scrollY);
  } else {
    overflowContainer.scrollLeft = newLeft;
  }

  if (leftBottom) {
    window.scrollBy(0, -maxScrollLeft);
    justSent = true;
  }
  if (leftTop) {
    window.scrollBy(0, overflowContainer.clientHeight);
    justSent = true;
  }
}

let observer = new IntersectionObserver(callback, {
  threshold: 0,
  rootMargin: '0px',
});

function callback(entries) {
  entries.forEach(entry => {
    const { target, isIntersecting, boundingClientRect } = entry;
    // Both are enter cases
    if (
      target.id === 'top-detect' &&
      !isIntersecting &&
      boundingClientRect.y < 0
    ) {
      console.log('top', boundingClientRect.y);
      if (justSent) justSent = false;
      else {
        handleEnter();
        initY = window.scrollY;
      }
    }
    if (
      target.id === 'bottom-detect' &&
      !isIntersecting &&
      boundingClientRect.y > 0
    ) {
      console.log('bottom', boundingClientRect.y);
      if (justSent) justSent = false;
      else {
        handleEnter();
        initY = window.scrollY; // - overflowContainer.offsetHeight;
      }
    }
  });
}

// observer.observe(document.getElementById('top-detect'))
// observer.observe(document.getElementById('bottom-detect'))

const scroller = scrollama();
scroller
  .setup({
    // step: '#industry-impact-overflow',
    step: '#test',
    offset: 0,
  })
  .onStepEnter(handleEnter);

function handleEnter({ index, direction }) {
  initY = window.scrollY;
  if (direction === 'up') {
    initY -= overflowContainer.clientHeight;
  }
  console.log('initY :>> ', initY);
  document.documentElement.style.height =
    document.body.offsetHeight + containerWidth + 'px';
  document.body.classList.add('fixed');
  document.body.style.top = -overflowContainer.offsetTop + 'px';
  isStuck = true;
}

window.addEventListener('resize', scroller.resize);

// document.documentElement.style.height = document.body.offsetHeight + containerWidth + 'px';

