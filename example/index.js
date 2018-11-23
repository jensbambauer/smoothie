const Smoothie = window.smoothie;

let smoothie;
let nested;
function init() {
    smoothie = new Smoothie('.smoothie', {
        listener: document.querySelector('.smoothie-container')
    });
    smoothie.init(1000);
    smoothie.stop();

    nested = new Smoothie('.nested', {
        orientation: 'horizontal',
        listener: document.querySelector('.nested-container')
    });
    nested.init();
}

init();

setTimeout(function() {
    const els = document.querySelectorAll('.el');

    smoothie.addListener(function(status) {
        els.forEach(function(el) {
            if (smoothie.inViewport(el)) {
                el.setAttribute('data-animated', '');
            } else {
                el.removeAttribute('data-animated');
            }
        });
    });
}, 3000);


// console.log('start from bottom!');
// smoothie.setTo('bottom');


let toggle = true;
const $switch = document.querySelector('#switch');
$switch.addEventListener('click', function() {
    toggle = !toggle;

    if (!toggle) {
        smoothie.stop();
        nested.start();
    } else {
        smoothie.start();
        nested.stop();
    }
});

let enable = true;
const $enabler = document.querySelector('#enable');
$enabler.addEventListener('click', function() {
    enable = !enable;

    if (!enable) {
        smoothie.destroy();
        nested.destroy();
    } else {
        init();
    }
});
