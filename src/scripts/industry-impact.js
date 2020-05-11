import scrollama from 'scrollama';

function archive() {
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
      console.log(newLeft, leftTop, leftBottom);
      isStuck = false;
      const old = window.scrollY;
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

  const scroller = scrollama();
  scroller
    .setup({
      step: '#jasons-detection',
      offset: 0,
    })
    .onStepEnter(handleEnter);

  function handleEnter({ direction }) {
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
}
