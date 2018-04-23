import React from 'react';
import PropTypes from 'prop-types';
import {
  getClassName,
  DOMNextPaint,
  setCssEndEvent,
  MediaLoader,
} from '../helpers/components';
import {
  getRootClassName,
  setupClassNames,
  transformChildren,
} from './helpers';
import Bullets from './bullets';
import Buttons from './buttons';
import Media from './media';

const ROOTELM = 'aws-sld';
const mediaLoader = new MediaLoader();

export default class AwesomeSlider extends React.Component {
  static propTypes = {
    startup: PropTypes.bool,
    children: PropTypes.node,
    className: PropTypes.string,
    controlsReturnDelay: PropTypes.number,
    cssModule: PropTypes.object,
    disabled: PropTypes.bool,
    media: PropTypes.array,
    name: PropTypes.string,
    onFirstMount: PropTypes.func,
    onResetSlider: PropTypes.func,
    onTransitionEnd: PropTypes.func,
    onTransitionStart: PropTypes.func,
    organicArrows: PropTypes.bool,
    rootElement: PropTypes.string,
    selected: PropTypes.number,
    startupScreen: PropTypes.object,
    style: PropTypes.object,
    transitionDelay: PropTypes.number,
  };

  static defaultProps = {
    startup: true,
    children: null,
    className: null,
    controlsReturnDelay: 0,
    cssModule: null,
    disabled: false,
    media: [],
    name: 'awesome-slider',
    onFirstMount: null,
    onResetSlider: null,
    onTransitionEnd: null,
    onTransitionStart: null,
    organicArrows: true,
    rootElement: ROOTELM,
    selected: 0,
    startupScreen: null,
    style: {},
    transitionDelay: 0,
  };

  constructor(props) {
    super(props);
    this.rootElement = props.rootElement || ROOTELM;
    this.boxA = null;
    this.boxB = null;
    this.loaded = [];
    this.active = 'boxA';
    this.loader = 'boxB';
    this.nextIndex = null;
    this.loading = false;
    this.media = null;
    this.started = false;
    this.checkChildren(props);
    this.setupClassNames(props.cssModule);
    if (props.startupScreen) {
      this.index = null;
      this.state = {
        index: null,
        boxA: {
          className: this.classNames.startUp,
          children: props.startupScreen,
        },
        boxB: null,
      };
    } else {
      this.index = 0;
      this.state = {
        index: 0,
        boxA: this.media[this.props.selected] || null,
        boxB: null,
      };
    }
  }

  componentDidMount() {
    this.boxA.classList.add(this.classNames.active);
    if (this.props.startupScreen) {
      this.buttons.element.classList.add(this.classNames.controlsActive);
      if (this.props.startup === true) {
        this.startup();
      }
    }
    if (this.props.onFirstMount) {
      this.props.onFirstMount({
        currentIndex: this.index,
        currentSlide: this[this.active],
        element: this.slider,
      });
    }
  }

  componentWillReceiveProps(newProps) {
    this.checkChildren(newProps);
    this.setupClassNames(newProps.cssModule);
    if (newProps.name !== this.props.name) {
      this.resetSlider(newProps.selected);
      return;
    }
    if (newProps.startup === true && this.started === false) {
      this.startup();
      return;
    }
    if (newProps.selected !== this.props.selected) {
      const index = newProps.selected;
      this.goTo({
        index,
        direction: !(this.index > index),
      });
    }
  }

  getRootClassName() {
    return getRootClassName({
      rootElement: this.rootElement,
      cssModule: this.props.cssModule,
      disabled: this.props.disabled,
      organicArrows: this.props.organicArrows,
      className: this.props.className,
    });
  }

  getBar() {
    const bar = document.createElement('div');
    bar.className = this.classNames.bar;
    return bar;
  }

  setupClassNames(cssModule) {
    this.classNames = setupClassNames(this.rootElement, cssModule);
  }

  startup() {
    this.started = true;
    setTimeout(() => {
      DOMNextPaint().then(() => {
        this.goTo({ index: 0, direction: true, touch: false });
      });
    }, 125);
  }

  resetSlider(index = 0) {
    this.index = index;
    this.setState({
      index,
      boxA: this.media[index],
      boxB: this.media[index],
    }, () => {
      if (this.props.onResetSlider) {
        this.props.onResetSlider({
          currentIndex: this.index,
          currentSlide: this[this.active],
          element: this.slider,
        });
      }
    });
  }

  checkChildren(props) {
    if (props.children) {
      if (props.children !== this.props.children || !this.media) {
        this.media = transformChildren(props.children);
      }
    } else if (props.media !== this.props.media) {
      this.media = props.media;
    }
  }

  loadContent(active, url) {
    return new Promise((resolve) => {
      if (this.loaded.includes(url) || !url) {
        resolve(null);
        return;
      }
      const bar = this.getBar();
      active.appendChild(bar);
      DOMNextPaint().then(() => {
        DOMNextPaint().then(() => {
          bar.classList.add(this.classNames.barActive);
        });
        mediaLoader.load(url).then(() => {
          this.loaded.push(url);
          DOMNextPaint().then(() => {
            setCssEndEvent(bar, 'transition').then(() => {
              resolve(bar);
            });
            bar.classList.add(this.classNames.barEnd);
          });
        });
      });
    });
  }

  startAnimationMobile() {
    const { direction } = this;
    const active = this[this.active];
    const loader = this[this.loader];
    const contentEnterMoveClass = direction ?
      this.classNames.contentMoveLeft :
      this.classNames.contentMoveRight;
    const contentExitMoveClass = direction ?
      this.classNames.contentMoveRight :
      this.classNames.contentMoveLeft;
    if (this.props.onTransitionStart) {
      this.props.onTransitionStart({
        currentIndex: this.index,
        currentSlide: this[this.active],
        nextSlide: this[this.loader],
        nextIndex: this.nextIndex,
        element: this.slider,
      });
    }
    const activeContent = active.querySelector(`.${this.classNames.content}`);
    activeContent.classList.add(contentExitMoveClass);
    activeContent.classList.add(this.classNames.contentExit);
    const loaderContent = loader.querySelector(`.${this.classNames.content}`);
    loaderContent.classList.add(contentEnterMoveClass);
    loaderContent.classList.add(this.classNames.contentStatic);
  }

  animateMobileEnd(callback) {
    const { direction } = this;
    const active = this[this.active];
    const loader = this[this.loader];
    const exitPosition = direction ?
      this.classNames.moveLeft :
      this.classNames.moveRight;
    const contentEnterMoveClass = direction ?
      this.classNames.contentMoveLeft :
      this.classNames.contentMoveRight;
    const contentExitMoveClass = direction ?
      this.classNames.contentMoveRight :
      this.classNames.contentMoveLeft;
    const loaderContent = loader.querySelector(`.${this.classNames.content}`);
    const activeContent = active.querySelector(`.${this.classNames.content}`);

    loaderContent.classList.remove(this.classNames.contentStatic);
    DOMNextPaint().then(() => {
      loader.classList.add(this.classNames.animated);
      active.classList.add(this.classNames.animated);
      DOMNextPaint().then(() => {
        loader.style.transform = 'translate3d(0, 0, 0)';
        active.style.transform = `translate3d(${this.direction ? '-' : ''}100%, 0, 0)`;
        setCssEndEvent(active, 'transition').then(() => {
          if (!this.loading) {
            return;
          }
          loader.classList.add(this.classNames.active);
          active.classList.remove(this.classNames.active);
          active.classList.remove(exitPosition);
          loader.classList.remove(this.classNames.animated);
          active.classList.remove(this.classNames.animated);
          activeContent.classList.remove(contentExitMoveClass);
          activeContent.classList.remove(this.classNames.contentExit);
          loaderContent.classList.remove(contentEnterMoveClass);
          setTimeout(() => {
            DOMNextPaint().then(() => {
              this.buttons.element.classList.remove(this.classNames.controlsActive);
            });
          }, this.props.controlsReturnDelay);

          if (this.activeArrow) {
            this.activeArrow.classList.remove(this.activeArrowClass);
            this.activeArrow = null;
            this.activeArrowClass = null;
          }
          /* INVERT BOXES */
          this.active = this.active === 'boxA' ? 'boxB' : 'boxA';
          this.loader = this.active === 'boxA' ? 'boxB' : 'boxA';
          if (callback) {
            callback();
          }
        });
      });
    });
  }

  startAnimation(direction, media, callback) {
    const { transitionDelay } = this.props;
    const active = this[this.active];
    const loader = this[this.loader];
    const loaderPosition = direction ? this.classNames.moveRight : this.classNames.moveLeft;
    const exitPosition = direction ? this.classNames.moveLeft : this.classNames.moveRight;
    const contentEnterMoveClass = direction ?
      this.classNames.contentMoveRight : this.classNames.contentMoveLeft;
    const contentExitMoveClass = direction ?
      this.classNames.contentMoveLeft : this.classNames.contentMoveRight;
    const activeContentElement = active.querySelector(`.${this.classNames.content}`);
    const loaderContentElement = loader.querySelector(`.${this.classNames.content}`);

    active.style.removeProperty('transform');
    loader.style.removeProperty('transform');

    if (this.props.onTransitionStart) {
      this.props.onTransitionStart({
        currentIndex: this.index,
        currentSlide: this[this.active],
        nextSlide: this[this.loader],
        nextIndex: this.nextIndex,
        element: this.slider,
      });
    }
    this.loadContent(active, media.url).then((bar) => {
      loaderContentElement.classList.remove(this.classNames.contentStatic);
      activeContentElement.classList.add(contentExitMoveClass);
      activeContentElement.classList.add(this.classNames.contentExit);
      loaderContentElement.classList.add(contentEnterMoveClass);
      setTimeout(() => {
        DOMNextPaint().then(() => {
          loader.classList.add(loaderPosition);
          DOMNextPaint().then(() => {
            loader.classList.add(this.classNames.animated);
            active.classList.add(this.classNames.animated);
            DOMNextPaint().then(() => {
              loader.classList.remove(loaderPosition);
              active.classList.add(this.classNames.exit);
              active.classList.add(exitPosition);
              setCssEndEvent(active, 'transition').then(() => {
                loader.classList.add(this.classNames.active);
                active.classList.remove(this.classNames.active);
                active.classList.remove(exitPosition);
                active.classList.remove(this.classNames.exit);
                loader.classList.remove(this.classNames.animated);
                active.classList.remove(this.classNames.animated);
                activeContentElement.classList.remove(contentExitMoveClass);
                activeContentElement.classList.remove(this.classNames.contentExit);
                loaderContentElement.classList.remove(contentEnterMoveClass);
                // removeElement BAR;
                if (bar) {
                  active.removeChild(bar);
                }
                setTimeout(() => {
                  DOMNextPaint().then(() => {
                    this.buttons.element.classList.remove(this.classNames.controlsActive);
                  });
                }, this.props.controlsReturnDelay);
                if (this.activeArrow) {
                  DOMNextPaint().then(() => {
                    this.activeArrow.classList.remove(this.activeArrowClass);
                    this.activeArrow = null;
                    this.activeArrowClass = null;
                  });
                }
                // * INVERT BOXES *
                this.active = this.active === 'boxA' ? 'boxB' : 'boxA';
                this.loader = this.active === 'boxA' ? 'boxB' : 'boxA';
                if (callback) {
                  callback();
                }
              });
            });
          });
        });
      }, transitionDelay);
    });
  }

  goTo({ index, direction, touch = false }) {
    if (this.loading === true || index === this.index) {
      return;
    }
    this.loading = true;
    this.direction = direction;
    if (touch === false) {
      this.activateArrows(direction, () => {
        this.chargeIndex(index, (media) => {
          this.renderedLoader = true;
          this.startAnimation(direction, media, () => {
            this.index = this.nextIndex;
            this.setState({ index: this.index });
            if (this.props.onTransitionEnd) {
              this.props.onTransitionEnd({
                currentIndex: this.index,
                currentSlide: this[this.active],
                element: this.slider,
              });
            }
            DOMNextPaint().then(() => {
              this.loading = false;
            });
          });
        });
      });
    } else {
      this.chargeIndex(index, () => {
        this.activateArrows(direction);
        this.startAnimationMobile();
      });
    }
  }

  chargeIndex(index, callback) {
    this.nextIndex = index > (this.media.length - 1) ?
      0 : index < 0 ? (this.media.length - 1) : index;
    const state = {};
    const media = this.media[this.nextIndex];
    state[this.loader] = {
      loader: true,
      ...media,
    };
    this.setState(state, () => {
      callback(media);
    });
  }

  unchargeIndex() {
    const state = {};
    state[this.loader] = null;
    this.setState(state, () => {});
  }

  activateArrows(direction, callback) {
    const activeArrow = direction ? this.buttons.next : this.buttons.prev;
    const dirName = direction ? 'right' : 'left';
    this.activeArrow = activeArrow.querySelector('span');
    this.activeArrowClass = getClassName(`${this.rootElement}__controls__arrow-${dirName}--active`, this.props.cssModule);

    // This needs to be done due to the usage of pseudo elements animation
    setCssEndEvent(this.activeArrow, 'transition', this.index === null ? 0 : 2).then(() => {
      if (callback) {
        callback();
      }
    });

    this.buttons.element.classList.add(this.classNames.controlsActive);
    this.activeArrow.classList.add(this.activeArrowClass);
  }

  clickNext = () => {
    this.goTo({
      index: this.index + 1,
      direction: true,
    });
  }

  clickPrev = () => {
    this.goTo({
      index: this.index - 1,
      direction: false,
    });
  }

  touchStart = (event) => {
    if (this.animating) {
      return;
    }
    const native = event.nativeEvent;
    this.touchStartPoint = native.touches[0].clientX;
  }

  touchMove = (event) => {
    if (this.animating || !this.touchStartPoint) {
      return;
    }
    const native = event.nativeEvent;
    let diff = this.latestX - this.touchStartPoint;
    const active = this[this.active];
    const loader = this[this.loader];
    const direction = !(diff > 0);
    const abs = Math.abs(diff);
    this.latestX = native.touches[0].clientX;
    if (abs >= 10) {
      if (this.loading === false) {
        this.goTo({
          index: direction ? this.index + 1 : this.index - 1,
          direction,
          touch: true,
        });
      } else if (this.direction === true) {
        diff += 10;
        if (Math.abs(diff) > active.offsetWidth) {
          diff = -active.offsetWidth;
        } else if (diff > 0) {
          diff = 0;
        }
        active.style.transform = `translate3d(${diff}px, 0, 0)`;
        loader.style.transform = `translate3d(calc(100% + ${diff}px), 0, 0)`;
      } else {
        diff -= 10;
        if (Math.abs(diff) > active.offsetWidth) {
          diff = active.offsetWidth;
        } else if (diff < 0) {
          diff = 0;
        }
        active.style.transform = `translate3d(${diff}px, 0, 0)`;
        loader.style.transform = `translate3d(calc(-100% + ${diff}px), 0, 0)`;
      }
    }
  }

  touchEnd = () => {
    if (this.animating || !this.touchStartPoint || !this.loading) {
      return;
    }
    this.touchStartPoint = null;
    this.animating = true;
    this.animateMobileEnd(() => {
      this.index = this.nextIndex;
      this.setState({ index: this.index });
      if (this.props.onTransitionEnd) {
        this.props.onTransitionEnd({
          currentIndex: this.index,
          currentSlide: this[this.active],
          element: this.slider,
        });
      }
      this.animating = false;
      this.loading = false;
      this.unchargeIndex();
    });
  }

  bulletClick = (event) => {
    const button = event.currentTarget;
    const index = parseInt(button.getAttribute('data-index'), 10);
    this.goTo({
      index,
      direction: !(this.index > index),
    }, () => {
      DOMNextPaint().then(() => {
        button.classList.add(this.classNames.bulletsLoading);
      });
    });
  }

  renderBox(box) {
    return (
      <div
        ref={(el) => { this[`box${box}`] = el; }}
        className={this.classNames.box}
        onTouchStart={this.touchStart}
        onTouchMove={this.touchMove}
        onTouchEnd={this.touchEnd}
      >
        {
          this.state[`box${box}`] &&
          <Media
            media={this.state[`box${box}`]}
            className={this.classNames.content}
          />
        }
      </div>
    );
  }

  render() {
    const {
      cssModule,
      organicArrows,
    } = this.props;
    const {
      rootElement,
    } = this;

    return (
      <div
        ref={(slider) => { this.slider = slider; }}
        className={this.getRootClassName()}
      >
        <div
          ref={(wrapper) => { this.wrapper = wrapper; }}
          className={this.classNames.wrapper}
        >
          <div
            ref={(container) => { this.container = container; }}
            className={this.classNames.container}
          >
            {this.renderBox('A')}
            {this.renderBox('B')}
          </div>
          <Buttons
            rootElement={rootElement}
            cssModule={cssModule}
            onMount={(buttons) => { this.buttons = buttons; }}
            onNext={this.clickNext}
            onPrev={this.clickPrev}
            organicArrows={organicArrows}
          />
        </div>
        <Bullets
          cssModule={cssModule}
          rootElement={rootElement}
          media={this.media}
          selected={this.state.index}
          onClick={(info) => {
            this.goTo(info);
          }}
        />
      </div>
    );
  }
}
