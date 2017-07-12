const Emitter = require('tiny-emitter');
const Lethargy = require('lethargy').Lethargy;
const support = require('./support');
const clone = require('./clone');
const bindAll = require('bindall-standalone');

const EVT_ID = 'smoothie';
const keyCodes = {
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    SPACE: 32
};

document.body.innerHTML = "bro";


class Smoothie {
    constructor(options) {
        bindAll(this, '_onWheel', '_onMouseWheel', '_onTouchStart', '_onTouchMove', '_onKeyDown');

        this.el = window;

        if (options && options.el) {
            this.el = options.el;
            delete options.el;
        }

        this.options = Object.assign({
            mouseMultiplier: 1,
            touchMultiplier: 2,
            firefoxMultiplier: 15,
            keyStep: 120,
            preventTouch: false,
            unpreventTouchClass: 'vs-touchmove-allowed',
            limitInertia: false
        }, options);

        if (this.options.limitInertia) this.lethargy = new Lethargy();

        this.emitter = new Emitter();
        this.event = {
            y: 0,
            x: 0,
            deltaX: 0,
            deltaY: 0
        };
        this.touchStartX = null;
        this.touchStartY = null;
        this.bodyTouchAction = null;

        if (this.options.passive !== undefined) {
            this.listenerOptions = { passive: this.options.passive };
        }
    }

    _notify(e) {
        const evt = this.event;
        evt.x += evt.deltaX;
        evt.y += evt.deltaY;

        this.emitter.emit(EVT_ID, {
                x: evt.x,
                y: evt.y,
                deltaX: evt.deltaX,
                deltaY: evt.deltaY,
                originalEvent: e
        });
    }

    _onWheel(e) {
        const options = this.options;
        if (this.lethargy && this.lethargy.check(e) === false) return;
        const evt = this.event;

        // In Chrome and in Firefox (at least the new one)
        evt.deltaX = e.wheelDeltaX || e.deltaX * -1;
        evt.deltaY = e.wheelDeltaY || e.deltaY * -1;

        // for our purpose deltamode = 1 means user is on a wheel mouse, not touch pad
        // real meaning: https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent#Delta_modes
        if(support.isFirefox && e.deltaMode == 1) {
            evt.deltaX *= options.firefoxMultiplier;
            evt.deltaY *= options.firefoxMultiplier;
        }

        evt.deltaX *= options.mouseMultiplier;
        evt.deltaY *= options.mouseMultiplier;

        this._notify(e);
    }

    _onMouseWheel(e) {
        if (this.options.limitInertia && this.lethargy.check(e) === false) return;

        const evt = this.event;

        // In Safari, IE and in Chrome if 'wheel' isn't defined
        evt.deltaX = (e.wheelDeltaX) ? e.wheelDeltaX : 0;
        evt.deltaY = (e.wheelDeltaY) ? e.wheelDeltaY : e.wheelDelta;

        this._notify(e);
    }

    _onTouchStart(e) {
        const t = (e.targetTouches) ? e.targetTouches[0] : e;
        this.touchStartX = t.pageX;
        this.touchStartY = t.pageY;
    }

    _onTouchMove(e) {
        const options = this.options;
        if(options.preventTouch
            && !e.target.classList.contains(options.unpreventTouchClass)) {
            e.preventDefault();
        }

        const evt = this.event;

        const t = (e.targetTouches) ? e.targetTouches[0] : e;

        evt.deltaX = (t.pageX - this.touchStartX) * options.touchMultiplier;
        evt.deltaY = (t.pageY - this.touchStartY) * options.touchMultiplier;

        this.touchStartX = t.pageX;
        this.touchStartY = t.pageY;

        this._notify(e);
    }

    _onKeyDown(e) {
        const evt = this.event;
        evt.deltaX = evt.deltaY = 0;
        const windowHeight = window.innerHeight - 40

        switch(e.keyCode) {
            case keyCodes.LEFT:
            case keyCodes.UP:
                evt.deltaY = this.options.keyStep;
                break;

            case keyCodes.RIGHT:
            case keyCodes.DOWN:
                evt.deltaY = - this.options.keyStep;
                break;
            case keyCodes.SPACE && e.shiftKey:
                evt.deltaY = windowHeight;
                break;
            case keyCodes.SPACE:
                evt.deltaY = - windowHeight;
                break;
            default:
                return;
        }

        this._notify(e);
    }

    _bind() {
        if(support.hasWheelEvent) this.el.addEventListener('wheel', this._onWheel, this.listenerOptions);
        if(support.hasMouseWheelEvent) this.el.addEventListener('mousewheel', this._onMouseWheel, this.listenerOptions);

        if(support.hasTouch) {
            this.el.addEventListener('touchstart', this._onTouchStart, this.listenerOptions);
            this.el.addEventListener('touchmove', this._onTouchMove, this.listenerOptions);
        }

        if(support.hasPointer && support.hasTouchWin) {
            this.bodyTouchAction = document.body.style.msTouchAction;
            document.body.style.msTouchAction = 'none';
            this.el.addEventListener('MSPointerDown', this._onTouchStart, true);
            this.el.addEventListener('MSPointerMove', this._onTouchMove, true);
        }

        if(support.hasKeyDown) document.addEventListener('keydown', this._onKeyDown);
    }

    _unbind() {
        if(support.hasWheelEvent) this.el.removeEventListener('wheel', this._onWheel);
        if(support.hasMouseWheelEvent) this.el.removeEventListener('mousewheel', this._onMouseWheel);

        if(support.hasTouch) {
            this.el.removeEventListener('touchstart', this._onTouchStart);
            this.el.removeEventListener('touchmove', this._onTouchMove);
        }

        if(support.hasPointer && support.hasTouchWin) {
            document.body.style.msTouchAction = this.bodyTouchAction;
            this.el.removeEventListener('MSPointerDown', this._onTouchStart, true);
            this.el.removeEventListener('MSPointerMove', this._onTouchMove, true);
        }

        if(support.hasKeyDown) document.removeEventListener('keydown', this._onKeyDown);
    }

    on(cb, ctx) {
        this.emitter.on(EVT_ID, cb, ctx);

        const events = this.emitter.e;
        if (events && events[EVT_ID] && events[EVT_ID].length === 1) this._bind();
    }

    off(cb, ctx) {
        this.emitter.off(EVT_ID, cb, ctx);

        const events = this.emitter.e;
        if (!events[EVT_ID] || events[EVT_ID].length <= 0) this._unbind();
    }

    reset() {
        const evt = this.event;
        evt.x = 0;
        evt.y = 0;
    }

    destroy() {
        this.emitter.off();
        this._unbind();
    }
}

export default Smoothie;