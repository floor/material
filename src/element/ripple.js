//import animate from 'material/dist/vendor/morpheus';
import offset from './offset';
import css from '../module/css';
import insert from './insert';

const DEFAULT = {
  duration: '500',
  equation: 'ease-out'
};

/**
 * element ripple
 * @module element/ripple
 */

/**
 * show method
 * @param  {string} ripple
 * @param  {string} x
 * @param  {string} y
 * @param  {Object} coord
 * @return {void}
 */
function show(element, e) {
  console.log('shoe');
  this.size = offset(element);

  if (!this.ripple) {
    var ripple = document.createElement('span');
    css.add(ripple, 'material-ripple');

    insert(ripple, element, 'top');
  }

  var rippleCoord = this._rippleCoord(this.size);
  var options = this.options.ripple;

  var startLeft = (e.offsetX || this.size.width / 2);
  var startTop = (e.offsetY || this.size.height / 2);

  this.ripple.style({
    left: startLeft + 'px',
    top: startTop + 'px',
    width: '5px',
    height: '5px',
    opacity: 1
  });

  this.ripple.style.left = startLeft + 'px';
  this.ripple.style.top = startTop + 'px';
  this.ripple.style.height = '5px';
  this.ripple.style.width = '5px';
  this.ripple.style.opacity = '.2';

  this.rippleActive = true;

  // stop animation if exists
  if (this.animation) { this.animation.stop(); }

  this.ripple.style.left = rippleCoord.left;
  this.ripple.style.top = rippleCoord.top;
  this.ripple.style.width = rippleCoord.size;
  this.ripple.style.height = rippleCoord.size;
  this.ripple.style.left = rippleCoord.left;

  this.ripple.style.opacity = '.2';
  // this.animation = animate(ripple, {
  //   width: rippleCoord.size,
  //   height: rippleCoord.size,
  //   left: rippleCoord.left,
  //   top: rippleCoord.top,
  //   opacity: 0.2,
  //   duration: options.duration,
  //   easing: options.equation,
  //   complete: () => {
  //     this.rippleActive = false;
  //     if (!this.hasClass('is-active'))
  //       this.hide();
  //   }
  // });
}

/**
 * [hide description]
 */
function hide(ripple) {
  if (!this.ripple || this.rippleActive) {
    return;
  }

  if (this.animation) {
    this.animation.stop();
  }

  this.animation = animate(ripple, {
    opacity: 0,
    duration: '200',
    easing: defaults.equation,
    complete: () => {
      if (this.ripple) {
        ripple.destroy();
        ripple = null;
      }
    }
  });
}

/**
 * Get ripple final coordiantes
 * @return {Object} Size and top
 */

function coord(offset) {
  var size = offset.width;
  var top = -offset.height / 2;

  if (offset.width > offset.height) {
    size = offset.width;
    top = -(offset.width - offset.height / 2);
  } else if (offset.width < offset.height) {
    size = offset.height;
    top = (offset.width - offset.height) / 2;
  }

  return {
    size: size * 2,
    top: top,
    left: size / -2
  };
}

export default { show, hide };