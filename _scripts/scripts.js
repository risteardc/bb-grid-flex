/**
 * Copyright (c) 2011-2014 Felix Gnass
 * Licensed under the MIT license
 */
(function(root, factory) {

  /* CommonJS */
  if (typeof exports == 'object')  module.exports = factory()

  /* AMD module */
  else if (typeof define == 'function' && define.amd) define(factory)

  /* Browser global */
  else root.Spinner = factory()
}
(this, function() {
  "use strict";

  var prefixes = ['webkit', 'Moz', 'ms', 'O'] /* Vendor prefixes */
    , animations = {} /* Animation rules keyed by their name */
    , useCssAnimations /* Whether to use CSS animations or setTimeout */

  /**
   * Utility function to create elements. If no tag name is given,
   * a DIV is created. Optionally properties can be passed.
   */
  function createEl(tag, prop) {
    var el = document.createElement(tag || 'div')
      , n

    for(n in prop) el[n] = prop[n]
    return el
  }

  /**
   * Appends children and returns the parent.
   */
  function ins(parent /* child1, child2, ...*/) {
    for (var i=1, n=arguments.length; i<n; i++)
      parent.appendChild(arguments[i])

    return parent
  }

  /**
   * Insert a new stylesheet to hold the @keyframe or VML rules.
   */
  var sheet = (function() {
    var el = createEl('style', {type : 'text/css'})
    ins(document.getElementsByTagName('head')[0], el)
    return el.sheet || el.styleSheet
  }())

  /**
   * Creates an opacity keyframe animation rule and returns its name.
   * Since most mobile Webkits have timing issues with animation-delay,
   * we create separate rules for each line/segment.
   */
  function addAnimation(alpha, trail, i, lines) {
    var name = ['opacity', trail, ~~(alpha*100), i, lines].join('-')
      , start = 0.01 + i/lines * 100
      , z = Math.max(1 - (1-alpha) / trail * (100-start), alpha)
      , prefix = useCssAnimations.substring(0, useCssAnimations.indexOf('Animation')).toLowerCase()
      , pre = prefix && '-' + prefix + '-' || ''

    if (!animations[name]) {
      sheet.insertRule(
        '@' + pre + 'keyframes ' + name + '{' +
        '0%{opacity:' + z + '}' +
        start + '%{opacity:' + alpha + '}' +
        (start+0.01) + '%{opacity:1}' +
        (start+trail) % 100 + '%{opacity:' + alpha + '}' +
        '100%{opacity:' + z + '}' +
        '}', sheet.cssRules.length)

      animations[name] = 1
    }

    return name
  }

  /**
   * Tries various vendor prefixes and returns the first supported property.
   */
  function vendor(el, prop) {
    var s = el.style
      , pp
      , i

    prop = prop.charAt(0).toUpperCase() + prop.slice(1)
    for(i=0; i<prefixes.length; i++) {
      pp = prefixes[i]+prop
      if(s[pp] !== undefined) return pp
    }
    if(s[prop] !== undefined) return prop
  }

  /**
   * Sets multiple style properties at once.
   */
  function css(el, prop) {
    for (var n in prop)
      el.style[vendor(el, n)||n] = prop[n]

    return el
  }

  /**
   * Fills in default values.
   */
  function merge(obj) {
    for (var i=1; i < arguments.length; i++) {
      var def = arguments[i]
      for (var n in def)
        if (obj[n] === undefined) obj[n] = def[n]
    }
    return obj
  }

  /**
   * Returns the absolute page-offset of the given element.
   */
  function pos(el) {
    var o = { x:el.offsetLeft, y:el.offsetTop }
    while((el = el.offsetParent))
      o.x+=el.offsetLeft, o.y+=el.offsetTop

    return o
  }

  /**
   * Returns the line color from the given string or array.
   */
  function getColor(color, idx) {
    return typeof color == 'string' ? color : color[idx % color.length]
  }

  // Built-in defaults

  var defaults = {
    lines: 12,            // The number of lines to draw
    length: 7,            // The length of each line
    width: 5,             // The line thickness
    radius: 10,           // The radius of the inner circle
    rotate: 0,            // Rotation offset
    corners: 1,           // Roundness (0..1)
    color: '#000',        // #rgb or #rrggbb
    direction: 1,         // 1: clockwise, -1: counterclockwise
    speed: 1,             // Rounds per second
    trail: 100,           // Afterglow percentage
    opacity: 1/4,         // Opacity of the lines
    fps: 20,              // Frames per second when using setTimeout()
    zIndex: 2e9,          // Use a high z-index by default
    className: 'spinner', // CSS class to assign to the element
    top: '50%',           // center vertically
    left: '50%',          // center horizontally
    position: 'absolute'  // element position
  }

  /** The constructor */
  function Spinner(o) {
    this.opts = merge(o || {}, Spinner.defaults, defaults)
  }

  // Global defaults that override the built-ins:
  Spinner.defaults = {}

  merge(Spinner.prototype, {

    /**
     * Adds the spinner to the given target element. If this instance is already
     * spinning, it is automatically removed from its previous target b calling
     * stop() internally.
     */
    spin: function(target) {
      this.stop()

      var self = this
        , o = self.opts
        , el = self.el = css(createEl(0, {className: o.className}), {position: o.position, width: 0, zIndex: o.zIndex})
        , mid = o.radius+o.length+o.width

      css(el, {
        left: o.left,
        top: o.top
      })
        
      if (target) {
        target.insertBefore(el, target.firstChild||null)
      }

      el.setAttribute('role', 'progressbar')
      self.lines(el, self.opts)

      if (!useCssAnimations) {
        // No CSS animation support, use setTimeout() instead
        var i = 0
          , start = (o.lines - 1) * (1 - o.direction) / 2
          , alpha
          , fps = o.fps
          , f = fps/o.speed
          , ostep = (1-o.opacity) / (f*o.trail / 100)
          , astep = f/o.lines

        ;(function anim() {
          i++;
          for (var j = 0; j < o.lines; j++) {
            alpha = Math.max(1 - (i + (o.lines - j) * astep) % f * ostep, o.opacity)

            self.opacity(el, j * o.direction + start, alpha, o)
          }
          self.timeout = self.el && setTimeout(anim, ~~(1000/fps))
        })()
      }
      return self
    },

    /**
     * Stops and removes the Spinner.
     */
    stop: function() {
      var el = this.el
      if (el) {
        clearTimeout(this.timeout)
        if (el.parentNode) el.parentNode.removeChild(el)
        this.el = undefined
      }
      return this
    },

    /**
     * Internal method that draws the individual lines. Will be overwritten
     * in VML fallback mode below.
     */
    lines: function(el, o) {
      var i = 0
        , start = (o.lines - 1) * (1 - o.direction) / 2
        , seg

      function fill(color, shadow) {
        return css(createEl(), {
          position: 'absolute',
          width: (o.length+o.width) + 'px',
          height: o.width + 'px',
          background: color,
          boxShadow: shadow,
          transformOrigin: 'left',
          transform: 'rotate(' + ~~(360/o.lines*i+o.rotate) + 'deg) translate(' + o.radius+'px' +',0)',
          borderRadius: (o.corners * o.width>>1) + 'px'
        })
      }

      for (; i < o.lines; i++) {
        seg = css(createEl(), {
          position: 'absolute',
          top: 1+~(o.width/2) + 'px',
          transform: o.hwaccel ? 'translate3d(0,0,0)' : '',
          opacity: o.opacity,
          animation: useCssAnimations && addAnimation(o.opacity, o.trail, start + i * o.direction, o.lines) + ' ' + 1/o.speed + 's linear infinite'
        })

        if (o.shadow) ins(seg, css(fill('#000', '0 0 4px ' + '#000'), {top: 2+'px'}))
        ins(el, ins(seg, fill(getColor(o.color, i), '0 0 1px rgba(0,0,0,.1)')))
      }
      return el
    },

    /**
     * Internal method that adjusts the opacity of a single line.
     * Will be overwritten in VML fallback mode below.
     */
    opacity: function(el, i, val) {
      if (i < el.childNodes.length) el.childNodes[i].style.opacity = val
    }

  })


  function initVML() {

    /* Utility function to create a VML tag */
    function vml(tag, attr) {
      return createEl('<' + tag + ' xmlns="urn:schemas-microsoft.com:vml" class="spin-vml">', attr)
    }

    // No CSS transforms but VML support, add a CSS rule for VML elements:
    sheet.addRule('.spin-vml', 'behavior:url(#default#VML)')

    Spinner.prototype.lines = function(el, o) {
      var r = o.length+o.width
        , s = 2*r

      function grp() {
        return css(
          vml('group', {
            coordsize: s + ' ' + s,
            coordorigin: -r + ' ' + -r
          }),
          { width: s, height: s }
        )
      }

      var margin = -(o.width+o.length)*2 + 'px'
        , g = css(grp(), {position: 'absolute', top: margin, left: margin})
        , i

      function seg(i, dx, filter) {
        ins(g,
          ins(css(grp(), {rotation: 360 / o.lines * i + 'deg', left: ~~dx}),
            ins(css(vml('roundrect', {arcsize: o.corners}), {
                width: r,
                height: o.width,
                left: o.radius,
                top: -o.width>>1,
                filter: filter
              }),
              vml('fill', {color: getColor(o.color, i), opacity: o.opacity}),
              vml('stroke', {opacity: 0}) // transparent stroke to fix color bleeding upon opacity change
            )
          )
        )
      }

      if (o.shadow)
        for (i = 1; i <= o.lines; i++)
          seg(i, -2, 'progid:DXImageTransform.Microsoft.Blur(pixelradius=2,makeshadow=1,shadowopacity=.3)')

      for (i = 1; i <= o.lines; i++) seg(i)
      return ins(el, g)
    }

    Spinner.prototype.opacity = function(el, i, val, o) {
      var c = el.firstChild
      o = o.shadow && o.lines || 0
      if (c && i+o < c.childNodes.length) {
        c = c.childNodes[i+o]; c = c && c.firstChild; c = c && c.firstChild
        if (c) c.opacity = val
      }
    }
  }

  var probe = css(createEl('group'), {behavior: 'url(#default#VML)'})

  if (!vendor(probe, 'transform') && probe.adj) initVML()
  else useCssAnimations = vendor(probe, 'animation')

  return Spinner

}));

/**
 * Copyright (c) 2011-2014 Felix Gnass
 * Licensed under the MIT license
 */

/*

Basic Usage:
============

$('#el').spin(); // Creates a default Spinner using the text color of #el.
$('#el').spin({ ... }); // Creates a Spinner using the provided options.

$('#el').spin(false); // Stops and removes the spinner.

Using Presets:
==============

$('#el').spin('small'); // Creates a 'small' Spinner using the text color of #el.
$('#el').spin('large', '#fff'); // Creates a 'large' white Spinner.

Adding a custom preset:
=======================

$.fn.spin.presets.flower = {
	lines: 9
	length: 10
	width: 20
	radius: 0
}

$('#el').spin('flower', 'red');

*/

(function(factory) {

	if (typeof exports == 'object') {
		// CommonJS
		factory(require('jquery'), require('spin'))
	}
	else if (typeof define == 'function' && define.amd) {
		// AMD, register as anonymous module
		define(['jquery', 'spin'], factory)
	}
	else {
		// Browser globals
		if (!window.Spinner) throw new Error('Spin.js not present')
		factory(window.jQuery, window.Spinner)
	}

}(function($, Spinner) {

	$.fn.spin = function(opts, color) {

		return this.each(function() {
			var $this = $(this),
				data = $this.data();

			if (data.spinner) {
				data.spinner.stop();
				delete data.spinner;
			}
			if (opts !== false) {
				opts = $.extend(
					{ color: color || $this.css('color') },
					$.fn.spin.presets[opts] || opts
				)
				data.spinner = new Spinner(opts).spin(this)
			}
		})
	}

	$.fn.spin.presets = {
		tiny: { lines: 8, length: 2, width: 2, radius: 3 },
		small: { lines: 8, length: 4, width: 3, radius: 5 },
		large: { lines: 10, length: 8, width: 4, radius: 8 }
	}

}));

// Console-polyfill. MIT license.
// https://github.com/paulmillr/console-polyfill
// Make it safe to do console.log() always.
(function (con) {
  'use strict';
  var prop, method;
  var empty = {};
  var dummy = function() {};
  var properties = 'memory'.split(',');
  var methods = ('assert,count,debug,dir,dirxml,error,exception,group,' +
     'groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,' +
     'time,timeEnd,trace,warn').split(',');
  while (prop = properties.pop()) con[prop] = con[prop] || empty;
  while (method = methods.pop()) con[method] = con[method] || dummy;
})(window.console = window.console || {});
/*! Tiny Pub/Sub - v0.7.0 - 2013-01-29
 * https://github.com/cowboy/jquery-tiny-pubsub
 * Copyright (c) 2013 "Cowboy" Ben Alman; Licensed MIT */
 (function($) {

  var o = $({});

  $.subscribe = function() {
    o.on.apply(o, arguments);
  };

  $.unsubscribe = function() {
    o.off.apply(o, arguments);
  };

  $.publish = function() {
    o.trigger.apply(o, arguments);
  };

}(jQuery));

/**
 * BxSlider v4.1.2 - Fully loaded, responsive content slider
 * http://bxslider.com
 *
 * Copyright 2014, Steven Wanderski - http://stevenwanderski.com - http://bxcreative.com
 * Written while drinking Belgian ales and listening to jazz
 *
 * Released under the MIT license - http://opensource.org/licenses/MIT
 */

;(function($){

	var plugin = {};

	var defaults = {

		// GENERAL
		mode: 'horizontal',
		slideSelector: '',
		infiniteLoop: true,
		hideControlOnEnd: false,
		speed: 500,
		easing: null,
		slideMargin: 0,
		startSlide: 0,
		randomStart: false,
		captions: false,
		ticker: false,
		tickerHover: false,
		adaptiveHeight: false,
		adaptiveHeightSpeed: 500,
		video: false,
		useCSS: true,
		preloadImages: 'visible',
		responsive: true,
		slideZIndex: 50,
		wrapperClass: 'bx-wrapper',

		// TOUCH
		touchEnabled: true,
		swipeThreshold: 50,
		oneToOneTouch: true,
		preventDefaultSwipeX: true,
		preventDefaultSwipeY: false,

		// PAGER
		pager: true,
		pagerType: 'full',
		pagerShortSeparator: ' / ',
		pagerSelector: null,
		buildPager: null,
		pagerCustom: null,

		// CONTROLS
		controls: true,
		nextText: 'Next',
		prevText: 'Prev',
		nextSelector: null,
		prevSelector: null,
		autoControls: false,
		startText: 'Start',
		stopText: 'Stop',
		autoControlsCombine: false,
		autoControlsSelector: null,

		// AUTO
		auto: true,
		pause: 4000,
		autoStart: true,
		autoDirection: 'next',
		autoHover: false,
		autoDelay: 0,
		autoSlideForOnePage: false,

		// CAROUSEL
		minSlides: 1,
		maxSlides: 1,
		moveSlides: 0,
		slideWidth: 0,

		// CALLBACKS
		onSliderLoad: function() {},
		onSlideBefore: function() {},
		onSlideAfter: function() {},
		onSlideNext: function() {},
		onSlidePrev: function() {},
		onSliderResize: function() {}
	}

	$.fn.bxSlider = function(options){

		if(this.length == 0) return this;

		// support mutltiple elements
		if(this.length > 1){
			this.each(function(){$(this).bxSlider(options)});
			return this;
		}

		// create a namespace to be used throughout the plugin
		var slider = {};
		// set a reference to our slider element
		var el = this;
		plugin.el = this;

		/**
		 * Makes slideshow responsive
		 */
		// first get the original window dimens (thanks alot IE)
		var windowWidth = $(window).width();
		var windowHeight = $(window).height();



		/**
		 * ===================================================================================
		 * = PRIVATE FUNCTIONS
		 * ===================================================================================
		 */

		/**
		 * Initializes namespace settings to be used throughout plugin
		 */
		var init = function(){
			// merge user-supplied options with the defaults
			slider.settings = $.extend({}, defaults, options);
			// parse slideWidth setting
			slider.settings.slideWidth = parseInt(slider.settings.slideWidth);
			// store the original children
			slider.children = el.children(slider.settings.slideSelector);
			// check if actual number of slides is less than minSlides / maxSlides
			if(slider.children.length < slider.settings.minSlides) slider.settings.minSlides = slider.children.length;
			if(slider.children.length < slider.settings.maxSlides) slider.settings.maxSlides = slider.children.length;
			// if random start, set the startSlide setting to random number
			if(slider.settings.randomStart) slider.settings.startSlide = Math.floor(Math.random() * slider.children.length);
			// store active slide information
			slider.active = { index: slider.settings.startSlide }
			// store if the slider is in carousel mode (displaying / moving multiple slides)
			slider.carousel = slider.settings.minSlides > 1 || slider.settings.maxSlides > 1;
			// if carousel, force preloadImages = 'all'
			if(slider.carousel) slider.settings.preloadImages = 'all';
			// calculate the min / max width thresholds based on min / max number of slides
			// used to setup and update carousel slides dimensions
			slider.minThreshold = (slider.settings.minSlides * slider.settings.slideWidth) + ((slider.settings.minSlides - 1) * slider.settings.slideMargin);
			slider.maxThreshold = (slider.settings.maxSlides * slider.settings.slideWidth) + ((slider.settings.maxSlides - 1) * slider.settings.slideMargin);
			// store the current state of the slider (if currently animating, working is true)
			slider.working = false;
			// initialize the controls object
			slider.controls = {};
			// initialize an auto interval
			slider.interval = null;
			// determine which property to use for transitions
			slider.animProp = slider.settings.mode == 'vertical' ? 'top' : 'left';
			// determine if hardware acceleration can be used
			slider.usingCSS = slider.settings.useCSS && slider.settings.mode != 'fade' && (function(){
				// create our test div element
				var div = document.createElement('div');
				// css transition properties
				var props = ['WebkitPerspective', 'MozPerspective', 'OPerspective', 'msPerspective'];
				// test for each property
				for(var i in props){
					if(div.style[props[i]] !== undefined){
						slider.cssPrefix = props[i].replace('Perspective', '').toLowerCase();
						slider.animProp = '-' + slider.cssPrefix + '-transform';
						return true;
					}
				}
				return false;
			}());
			// if vertical mode always make maxSlides and minSlides equal
			if(slider.settings.mode == 'vertical') slider.settings.maxSlides = slider.settings.minSlides;
			// save original style data
			el.data("origStyle", el.attr("style"));
			el.children(slider.settings.slideSelector).each(function() {
			  $(this).data("origStyle", $(this).attr("style"));
			});
			// perform all DOM / CSS modifications
			setup();
		}

		/**
		 * Performs all DOM and CSS modifications
		 */
		var setup = function(){
			// wrap el in a wrapper
			el.wrap('<div class="' + slider.settings.wrapperClass + '"><div class="bx-viewport"></div></div>');
			// store a namspace reference to .bx-viewport
			slider.viewport = el.parent();
			// add a loading div to display while images are loading
			slider.loader = $('<div class="bx-loading" />');
			slider.viewport.prepend(slider.loader);
			// set el to a massive width, to hold any needed slides
			// also strip any margin and padding from el
			el.css({
				width: slider.settings.mode == 'horizontal' ? (slider.children.length * 100 + 215) + '%' : 'auto',
				position: 'relative'
			});
			// if using CSS, add the easing property
			if(slider.usingCSS && slider.settings.easing){
				el.css('-' + slider.cssPrefix + '-transition-timing-function', slider.settings.easing);
			// if not using CSS and no easing value was supplied, use the default JS animation easing (swing)
			}else if(!slider.settings.easing){
				slider.settings.easing = 'swing';
			}
			var slidesShowing = getNumberSlidesShowing();
			// make modifications to the viewport (.bx-viewport)
			slider.viewport.css({
				width: '100%',
				overflow: 'hidden',
				position: 'relative'
			});
			slider.viewport.parent().css({
				maxWidth: getViewportMaxWidth()
			});
			// make modification to the wrapper (.bx-wrapper)
			if(!slider.settings.pager) {
				slider.viewport.parent().css({
				margin: '0 auto 0px'
				});
			}
			// apply css to all slider children
			slider.children.css({
				'float': slider.settings.mode == 'horizontal' ? 'left' : 'none',
				listStyle: 'none',
				position: 'relative'
			});
			// apply the calculated width after the float is applied to prevent scrollbar interference
			slider.children.css('width', getSlideWidth());
			// if slideMargin is supplied, add the css
			if(slider.settings.mode == 'horizontal' && slider.settings.slideMargin > 0) slider.children.css('marginRight', slider.settings.slideMargin);
			if(slider.settings.mode == 'vertical' && slider.settings.slideMargin > 0) slider.children.css('marginBottom', slider.settings.slideMargin);
			// if "fade" mode, add positioning and z-index CSS
			if(slider.settings.mode == 'fade'){
				slider.children.css({
					position: 'absolute',
					zIndex: 0,
					display: 'none'
				});
				// prepare the z-index on the showing element
				slider.children.eq(slider.settings.startSlide).css({zIndex: slider.settings.slideZIndex, display: 'block'});
			}
			// create an element to contain all slider controls (pager, start / stop, etc)
			slider.controls.el = $('<div class="bx-controls" />');
			// if captions are requested, add them
			if(slider.settings.captions) appendCaptions();
			// check if startSlide is last slide
			slider.active.last = slider.settings.startSlide == getPagerQty() - 1;
			// if video is true, set up the fitVids plugin
			if(slider.settings.video) el.fitVids();
			// set the default preload selector (visible)
			var preloadSelector = slider.children.eq(slider.settings.startSlide);
			if (slider.settings.preloadImages == "all") preloadSelector = slider.children;
			// only check for control addition if not in "ticker" mode
			if(!slider.settings.ticker){
				// if pager is requested, add it
				if(slider.settings.pager) appendPager();
				// if controls are requested, add them
				if(slider.settings.controls) appendControls();
				// if auto is true, and auto controls are requested, add them
				if(slider.settings.auto && slider.settings.autoControls) appendControlsAuto();
				// if any control option is requested, add the controls wrapper
				if(slider.settings.controls || slider.settings.autoControls || slider.settings.pager) slider.viewport.after(slider.controls.el);
			// if ticker mode, do not allow a pager
			}else{
				slider.settings.pager = false;
			}
			// preload all images, then perform final DOM / CSS modifications that depend on images being loaded
			loadElements(preloadSelector, start);
		}

		var loadElements = function(selector, callback){
			var total = selector.find('img, iframe').length;
			if (total == 0){
				callback();
				return;
			}
			var count = 0;
			selector.find('img, iframe').each(function(){
				$(this).one('load', function() {
				  if(++count == total) callback();
				}).each(function() {
				  if(this.complete) $(this).load();
				});
			});
		}

		/**
		 * Start the slider
		 */
		var start = function(){
			// if infinite loop, prepare additional slides
			if(slider.settings.infiniteLoop && slider.settings.mode != 'fade' && !slider.settings.ticker){
				var slice = slider.settings.mode == 'vertical' ? slider.settings.minSlides : slider.settings.maxSlides;
				var sliceAppend = slider.children.slice(0, slice).clone().addClass('bx-clone');
				var slicePrepend = slider.children.slice(-slice).clone().addClass('bx-clone');
				el.append(sliceAppend).prepend(slicePrepend);
			}
			// remove the loading DOM element
			slider.loader.remove();
			// set the left / top position of "el"
			setSlidePosition();
			// if "vertical" mode, always use adaptiveHeight to prevent odd behavior
			if (slider.settings.mode == 'vertical') slider.settings.adaptiveHeight = true;
			// set the viewport height
			slider.viewport.height(getViewportHeight());
			// make sure everything is positioned just right (same as a window resize)
			el.redrawSlider();
			// onSliderLoad callback
			slider.settings.onSliderLoad(slider.active.index);
			// slider has been fully initialized
			slider.initialized = true;
			// bind the resize call to the window
			if (slider.settings.responsive) $(window).bind('resize', resizeWindow);
			// if auto is true and has more than 1 page, start the show
			if (slider.settings.auto && slider.settings.autoStart && (getPagerQty() > 1 || slider.settings.autoSlideForOnePage)) initAuto();
			// if ticker is true, start the ticker
			if (slider.settings.ticker) initTicker();
			// if pager is requested, make the appropriate pager link active
			if (slider.settings.pager) updatePagerActive(slider.settings.startSlide);
			// check for any updates to the controls (like hideControlOnEnd updates)
			if (slider.settings.controls) updateDirectionControls();
			// if touchEnabled is true, setup the touch events
			if (slider.settings.touchEnabled && !slider.settings.ticker) initTouch();
		}

		/**
		 * Returns the calculated height of the viewport, used to determine either adaptiveHeight or the maxHeight value
		 */
		var getViewportHeight = function(){
			var height = 0;
			// first determine which children (slides) should be used in our height calculation
			var children = $();
			// if mode is not "vertical" and adaptiveHeight is false, include all children
			if(slider.settings.mode != 'vertical' && !slider.settings.adaptiveHeight){
				children = slider.children;
			}else{
				// if not carousel, return the single active child
				if(!slider.carousel){
					children = slider.children.eq(slider.active.index);
				// if carousel, return a slice of children
				}else{
					// get the individual slide index
					var currentIndex = slider.settings.moveSlides == 1 ? slider.active.index : slider.active.index * getMoveBy();
					// add the current slide to the children
					children = slider.children.eq(currentIndex);
					// cycle through the remaining "showing" slides
					for (i = 1; i <= slider.settings.maxSlides - 1; i++){
						// if looped back to the start
						if(currentIndex + i >= slider.children.length){
							children = children.add(slider.children.eq(i - 1));
						}else{
							children = children.add(slider.children.eq(currentIndex + i));
						}
					}
				}
			}
			// if "vertical" mode, calculate the sum of the heights of the children
			if(slider.settings.mode == 'vertical'){
				children.each(function(index) {
				  height += $(this).outerHeight();
				});
				// add user-supplied margins
				if(slider.settings.slideMargin > 0){
					height += slider.settings.slideMargin * (slider.settings.minSlides - 1);
				}
			// if not "vertical" mode, calculate the max height of the children
			}else{
				height = Math.max.apply(Math, children.map(function(){
					return $(this).outerHeight(false);
				}).get());
			}

			if(slider.viewport.css('box-sizing') == 'border-box'){
				height +=	parseFloat(slider.viewport.css('padding-top')) + parseFloat(slider.viewport.css('padding-bottom')) +
							parseFloat(slider.viewport.css('border-top-width')) + parseFloat(slider.viewport.css('border-bottom-width'));
			}else if(slider.viewport.css('box-sizing') == 'padding-box'){
				height +=	parseFloat(slider.viewport.css('padding-top')) + parseFloat(slider.viewport.css('padding-bottom'));
			}

			return height;
		}

		/**
		 * Returns the calculated width to be used for the outer wrapper / viewport
		 */
		var getViewportMaxWidth = function(){
			var width = '100%';
			if(slider.settings.slideWidth > 0){
				if(slider.settings.mode == 'horizontal'){
					width = (slider.settings.maxSlides * slider.settings.slideWidth) + ((slider.settings.maxSlides - 1) * slider.settings.slideMargin);
				}else{
					width = slider.settings.slideWidth;
				}
			}
			return width;
		}

		/**
		 * Returns the calculated width to be applied to each slide
		 */
		var getSlideWidth = function(){
			// start with any user-supplied slide width
			var newElWidth = slider.settings.slideWidth;
			// get the current viewport width
			var wrapWidth = slider.viewport.width();
			// if slide width was not supplied, or is larger than the viewport use the viewport width
			if(slider.settings.slideWidth == 0 ||
				(slider.settings.slideWidth > wrapWidth && !slider.carousel) ||
				slider.settings.mode == 'vertical'){
				newElWidth = wrapWidth;
			// if carousel, use the thresholds to determine the width
			}else if(slider.settings.maxSlides > 1 && slider.settings.mode == 'horizontal'){
				if(wrapWidth > slider.maxThreshold){
					// newElWidth = (wrapWidth - (slider.settings.slideMargin * (slider.settings.maxSlides - 1))) / slider.settings.maxSlides;
				}else if(wrapWidth < slider.minThreshold){
					newElWidth = (wrapWidth - (slider.settings.slideMargin * (slider.settings.minSlides - 1))) / slider.settings.minSlides;
				}
			}
			return newElWidth;
		}

		/**
		 * Returns the number of slides currently visible in the viewport (includes partially visible slides)
		 */
		var getNumberSlidesShowing = function(){
			var slidesShowing = 1;
			if(slider.settings.mode == 'horizontal' && slider.settings.slideWidth > 0){
				// if viewport is smaller than minThreshold, return minSlides
				if(slider.viewport.width() < slider.minThreshold){
					slidesShowing = slider.settings.minSlides;
				// if viewport is larger than minThreshold, return maxSlides
				}else if(slider.viewport.width() > slider.maxThreshold){
					slidesShowing = slider.settings.maxSlides;
				// if viewport is between min / max thresholds, divide viewport width by first child width
				}else{
					var childWidth = slider.children.first().width() + slider.settings.slideMargin;
					slidesShowing = Math.floor((slider.viewport.width() +
						slider.settings.slideMargin) / childWidth);
				}
			// if "vertical" mode, slides showing will always be minSlides
			}else if(slider.settings.mode == 'vertical'){
				slidesShowing = slider.settings.minSlides;
			}
			return slidesShowing;
		}

		/**
		 * Returns the number of pages (one full viewport of slides is one "page")
		 */
		var getPagerQty = function(){
			var pagerQty = 0;
			// if moveSlides is specified by the user
			if(slider.settings.moveSlides > 0){
				if(slider.settings.infiniteLoop){
					pagerQty = Math.ceil(slider.children.length / getMoveBy());
				}else{
					// use a while loop to determine pages
					var breakPoint = 0;
					var counter = 0
					// when breakpoint goes above children length, counter is the number of pages
					while (breakPoint < slider.children.length){
						++pagerQty;
						breakPoint = counter + getNumberSlidesShowing();
						counter += slider.settings.moveSlides <= getNumberSlidesShowing() ? slider.settings.moveSlides : getNumberSlidesShowing();
					}
				}
			// if moveSlides is 0 (auto) divide children length by sides showing, then round up
			}else{
				pagerQty = Math.ceil(slider.children.length / getNumberSlidesShowing());
			}
			return pagerQty;
		}

		/**
		 * Returns the number of indivual slides by which to shift the slider
		 */
		var getMoveBy = function(){
			// if moveSlides was set by the user and moveSlides is less than number of slides showing
			if(slider.settings.moveSlides > 0 && slider.settings.moveSlides <= getNumberSlidesShowing()){
				return slider.settings.moveSlides;
			}
			// if moveSlides is 0 (auto)
			return getNumberSlidesShowing();
		}

		/**
		 * Sets the slider's (el) left or top position
		 */
		var setSlidePosition = function(){
			// if last slide, not infinite loop, and number of children is larger than specified maxSlides
			if(slider.children.length > slider.settings.maxSlides && slider.active.last && !slider.settings.infiniteLoop){
				if (slider.settings.mode == 'horizontal'){
					// get the last child's position
					var lastChild = slider.children.last();
					var position = lastChild.position();
					// set the left position
					setPositionProperty(-(position.left - (slider.viewport.width() - lastChild.outerWidth())), 'reset', 0);
				}else if(slider.settings.mode == 'vertical'){
					// get the last showing index's position
					var lastShowingIndex = slider.children.length - slider.settings.minSlides;
					var position = slider.children.eq(lastShowingIndex).position();
					// set the top position
					setPositionProperty(-position.top, 'reset', 0);
				}
			// if not last slide
			}else{
				// get the position of the first showing slide
				var position = slider.children.eq(slider.active.index * getMoveBy()).position();
				// check for last slide
				if (slider.active.index == getPagerQty() - 1) slider.active.last = true;
				// set the repective position
				if (position != undefined){
					if (slider.settings.mode == 'horizontal') setPositionProperty(-position.left, 'reset', 0);
					else if (slider.settings.mode == 'vertical') setPositionProperty(-position.top, 'reset', 0);
				}
			}
		}

		/**
		 * Sets the el's animating property position (which in turn will sometimes animate el).
		 * If using CSS, sets the transform property. If not using CSS, sets the top / left property.
		 *
		 * @param value (int)
		 *  - the animating property's value
		 *
		 * @param type (string) 'slider', 'reset', 'ticker'
		 *  - the type of instance for which the function is being
		 *
		 * @param duration (int)
		 *  - the amount of time (in ms) the transition should occupy
		 *
		 * @param params (array) optional
		 *  - an optional parameter containing any variables that need to be passed in
		 */
		var setPositionProperty = function(value, type, duration, params){
			// use CSS transform
			if(slider.usingCSS){
				// determine the translate3d value
				var propValue = slider.settings.mode == 'vertical' ? 'translate3d(0, ' + value + 'px, 0)' : 'translate3d(' + value + 'px, 0, 0)';
				// add the CSS transition-duration
				el.css('-' + slider.cssPrefix + '-transition-duration', duration / 1000 + 's');
				if(type == 'slide'){
					// set the property value
					el.css(slider.animProp, propValue);
					// bind a callback method - executes when CSS transition completes
					el.bind('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', function(){
						// unbind the callback
						el.unbind('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd');
						updateAfterSlideTransition();
					});
				}else if(type == 'reset'){
					el.css(slider.animProp, propValue);
				}else if(type == 'ticker'){
					// make the transition use 'linear'
					el.css('-' + slider.cssPrefix + '-transition-timing-function', 'linear');
					el.css(slider.animProp, propValue);
					// bind a callback method - executes when CSS transition completes
					el.bind('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', function(){
						// unbind the callback
						el.unbind('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd');
						// reset the position
						setPositionProperty(params['resetValue'], 'reset', 0);
						// start the loop again
						tickerLoop();
					});
				}
			// use JS animate
			}else{
				var animateObj = {};
				animateObj[slider.animProp] = value;
				if(type == 'slide'){
					el.animate(animateObj, duration, slider.settings.easing, function(){
						updateAfterSlideTransition();
					});
				}else if(type == 'reset'){
					el.css(slider.animProp, value)
				}else if(type == 'ticker'){
					el.animate(animateObj, speed, 'linear', function(){
						setPositionProperty(params['resetValue'], 'reset', 0);
						// run the recursive loop after animation
						tickerLoop();
					});
				}
			}
		}

		/**
		 * Populates the pager with proper amount of pages
		 */
		var populatePager = function(){
			var pagerHtml = '';
			var pagerQty = getPagerQty();
			// loop through each pager item
			for(var i=0; i < pagerQty; i++){
				var linkContent = '';
				// if a buildPager function is supplied, use it to get pager link value, else use index + 1
				if(slider.settings.buildPager && $.isFunction(slider.settings.buildPager)){
					linkContent = slider.settings.buildPager(i);
					slider.pagerEl.addClass('bx-custom-pager');
				}else{
					linkContent = i + 1;
					slider.pagerEl.addClass('bx-default-pager');
				}
				// var linkContent = slider.settings.buildPager && $.isFunction(slider.settings.buildPager) ? slider.settings.buildPager(i) : i + 1;
				// add the markup to the string
				pagerHtml += '<div class="bx-pager-item"><a href="" data-slide-index="' + i + '" class="bx-pager-link">' + linkContent + '</a></div>';
			};
			// populate the pager element with pager links
			slider.pagerEl.html(pagerHtml);
		}

		/**
		 * Appends the pager to the controls element
		 */
		var appendPager = function(){
			if(!slider.settings.pagerCustom){
				// create the pager DOM element
				slider.pagerEl = $('<div class="bx-pager" />');
				// if a pager selector was supplied, populate it with the pager
				if(slider.settings.pagerSelector){
					$(slider.settings.pagerSelector).html(slider.pagerEl);
				// if no pager selector was supplied, add it after the wrapper
				}else{
					slider.controls.el.addClass('bx-has-pager').append(slider.pagerEl);
				}
				// populate the pager
				populatePager();
			}else{
				slider.pagerEl = $(slider.settings.pagerCustom);
			}
			// assign the pager click binding
			slider.pagerEl.on('click', 'a', clickPagerBind);
		}

		/**
		 * Appends prev / next controls to the controls element
		 */
		var appendControls = function(){
			slider.controls.next = $('<a class="bx-next" href="">' + slider.settings.nextText + '</a>');
			slider.controls.prev = $('<a class="bx-prev" href="">' + slider.settings.prevText + '</a>');
			// bind click actions to the controls
			slider.controls.next.bind('click', clickNextBind);
			slider.controls.prev.bind('click', clickPrevBind);
			// if nextSlector was supplied, populate it
			if(slider.settings.nextSelector){
				$(slider.settings.nextSelector).append(slider.controls.next);
			}
			// if prevSlector was supplied, populate it
			if(slider.settings.prevSelector){
				$(slider.settings.prevSelector).append(slider.controls.prev);
			}
			// if no custom selectors were supplied
			if(!slider.settings.nextSelector && !slider.settings.prevSelector){
				// add the controls to the DOM
				slider.controls.directionEl = $('<div class="bx-controls-direction" />');
				// add the control elements to the directionEl
				slider.controls.directionEl.append(slider.controls.prev).append(slider.controls.next);
				// slider.viewport.append(slider.controls.directionEl);
				slider.controls.el.addClass('bx-has-controls-direction').append(slider.controls.directionEl);
			}
		}

		/**
		 * Appends start / stop auto controls to the controls element
		 */
		var appendControlsAuto = function(){
			slider.controls.start = $('<div class="bx-controls-auto-item"><a class="bx-start" href="">' + slider.settings.startText + '</a></div>');
			slider.controls.stop = $('<div class="bx-controls-auto-item"><a class="bx-stop" href="">' + slider.settings.stopText + '</a></div>');
			// add the controls to the DOM
			slider.controls.autoEl = $('<div class="bx-controls-auto" />');
			// bind click actions to the controls
			slider.controls.autoEl.on('click', '.bx-start', clickStartBind);
			slider.controls.autoEl.on('click', '.bx-stop', clickStopBind);
			// if autoControlsCombine, insert only the "start" control
			if(slider.settings.autoControlsCombine){
				slider.controls.autoEl.append(slider.controls.start);
			// if autoControlsCombine is false, insert both controls
			}else{
				slider.controls.autoEl.append(slider.controls.start).append(slider.controls.stop);
			}
			// if auto controls selector was supplied, populate it with the controls
			if(slider.settings.autoControlsSelector){
				$(slider.settings.autoControlsSelector).html(slider.controls.autoEl);
			// if auto controls selector was not supplied, add it after the wrapper
			}else{
				slider.controls.el.addClass('bx-has-controls-auto').append(slider.controls.autoEl);
			}
			// update the auto controls
			updateAutoControls(slider.settings.autoStart ? 'stop' : 'start');
		}

		/**
		 * Appends image captions to the DOM
		 */
		var appendCaptions = function(){
			// cycle through each child
			slider.children.each(function(index){
				// get the image title attribute
				var title = $(this).find('img:first').attr('title');
				// append the caption
				if (title != undefined && ('' + title).length) {
                    $(this).append('<div class="bx-caption"><span>' + title + '</span></div>');
                }
			});
		}

		/**
		 * Click next binding
		 *
		 * @param e (event)
		 *  - DOM event object
		 */
		var clickNextBind = function(e){
			// if auto show is running, stop it
			if (slider.settings.auto) el.stopAuto();
			el.goToNextSlide();
			e.preventDefault();
			el.startAuto();
		}

		/**
		 * Click prev binding
		 *
		 * @param e (event)
		 *  - DOM event object
		 */
		var clickPrevBind = function(e){
			// if auto show is running, stop it
			if (slider.settings.auto) el.stopAuto();
			el.goToPrevSlide();
			e.preventDefault();
			el.startAuto();
		}

		/**
		 * Click start binding
		 *
		 * @param e (event)
		 *  - DOM event object
		 */
		var clickStartBind = function(e){
			el.startAuto();
			e.preventDefault();
		}

		/**
		 * Click stop binding
		 *
		 * @param e (event)
		 *  - DOM event object
		 */
		var clickStopBind = function(e){
			el.stopAuto();
			e.preventDefault();
		}

		/**
		 * Click pager binding
		 *
		 * @param e (event)
		 *  - DOM event object
		 */
		var clickPagerBind = function(e){
			// if auto show is running, stop it
			if (slider.settings.auto) el.stopAuto();
			var pagerLink = $(e.currentTarget);
			if(pagerLink.attr('data-slide-index') !== undefined){
				var pagerIndex = parseInt(pagerLink.attr('data-slide-index'));
				// if clicked pager link is not active, continue with the goToSlide call
				if(pagerIndex != slider.active.index) el.goToSlide(pagerIndex);
				e.preventDefault();
				el.startAuto();
			}
		}

		/**
		 * Updates the pager links with an active class
		 *
		 * @param slideIndex (int)
		 *  - index of slide to make active
		 */
		var updatePagerActive = function(slideIndex){
			// if "short" pager type
			var len = slider.children.length; // nb of children
			if(slider.settings.pagerType == 'short'){
				if(slider.settings.maxSlides > 1) {
					len = Math.ceil(slider.children.length/slider.settings.maxSlides);
				}
				slider.pagerEl.html( (slideIndex + 1) + slider.settings.pagerShortSeparator + len);
				return;
			}
			// remove all pager active classes
			slider.pagerEl.find('a').removeClass('active');
			// apply the active class for all pagers
			slider.pagerEl.each(function(i, el) { $(el).find('a').eq(slideIndex).addClass('active'); });
		}

		/**
		 * Performs needed actions after a slide transition
		 */
		var updateAfterSlideTransition = function(){
			// if infinte loop is true
			if(slider.settings.infiniteLoop){
				var position = '';
				// first slide
				if(slider.active.index == 0){
					// set the new position
					position = slider.children.eq(0).position();
				// carousel, last slide
				}else if(slider.active.index == getPagerQty() - 1 && slider.carousel){
					position = slider.children.eq((getPagerQty() - 1) * getMoveBy()).position();
				// last slide
				}else if(slider.active.index == slider.children.length - 1){
					position = slider.children.eq(slider.children.length - 1).position();
				}
				if(position){
					if (slider.settings.mode == 'horizontal') { setPositionProperty(-position.left, 'reset', 0); }
					else if (slider.settings.mode == 'vertical') { setPositionProperty(-position.top, 'reset', 0); }
				}
			}
			// declare that the transition is complete
			slider.working = false;
			// onSlideAfter callback
			slider.settings.onSlideAfter(slider.children.eq(slider.active.index), slider.oldIndex, slider.active.index);
		}

		/**
		 * Updates the auto controls state (either active, or combined switch)
		 *
		 * @param state (string) "start", "stop"
		 *  - the new state of the auto show
		 */
		var updateAutoControls = function(state){
			// if autoControlsCombine is true, replace the current control with the new state
			if(slider.settings.autoControlsCombine){
				slider.controls.autoEl.html(slider.controls[state]);
			// if autoControlsCombine is false, apply the "active" class to the appropriate control
			}else{
				slider.controls.autoEl.find('a').removeClass('active');
				slider.controls.autoEl.find('a:not(.bx-' + state + ')').addClass('active');
			}
		}

		/**
		 * Updates the direction controls (checks if either should be hidden)
		 */
		var updateDirectionControls = function(){
			if(getPagerQty() == 1){
				slider.controls.prev.addClass('disabled');
				slider.controls.next.addClass('disabled');
			}else if(!slider.settings.infiniteLoop && slider.settings.hideControlOnEnd){
				// if first slide
				if (slider.active.index == 0){
					slider.controls.prev.addClass('disabled');
					slider.controls.next.removeClass('disabled');
				// if last slide
				}else if(slider.active.index == getPagerQty() - 1){
					slider.controls.next.addClass('disabled');
					slider.controls.prev.removeClass('disabled');
				// if any slide in the middle
				}else{
					slider.controls.prev.removeClass('disabled');
					slider.controls.next.removeClass('disabled');
				}
			}
		}

		/**
		 * Initialzes the auto process
		 */
		var initAuto = function(){
			// if autoDelay was supplied, launch the auto show using a setTimeout() call
			if(slider.settings.autoDelay > 0){
				var timeout = setTimeout(el.startAuto, slider.settings.autoDelay);
			// if autoDelay was not supplied, start the auto show normally
			}else{
				el.startAuto();
			}
			// if autoHover is requested
			if(slider.settings.autoHover){
				// on el hover
				el.hover(function(){
					// if the auto show is currently playing (has an active interval)
					if(slider.interval){
						// stop the auto show and pass true agument which will prevent control update
						el.stopAuto(true);
						// create a new autoPaused value which will be used by the relative "mouseout" event
						slider.autoPaused = true;
					}
				}, function(){
					// if the autoPaused value was created be the prior "mouseover" event
					if(slider.autoPaused){
						// start the auto show and pass true agument which will prevent control update
						el.startAuto(true);
						// reset the autoPaused value
						slider.autoPaused = null;
					}
				});
			}
		}

		/**
		 * Initialzes the ticker process
		 */
		var initTicker = function(){
			var startPosition = 0;
			// if autoDirection is "next", append a clone of the entire slider
			if(slider.settings.autoDirection == 'next'){
				el.append(slider.children.clone().addClass('bx-clone'));
			// if autoDirection is "prev", prepend a clone of the entire slider, and set the left position
			}else{
				el.prepend(slider.children.clone().addClass('bx-clone'));
				var position = slider.children.first().position();
				startPosition = slider.settings.mode == 'horizontal' ? -position.left : -position.top;
			}
			setPositionProperty(startPosition, 'reset', 0);
			// do not allow controls in ticker mode
			slider.settings.pager = false;
			slider.settings.controls = false;
			slider.settings.autoControls = false;
			// if autoHover is requested
			if(slider.settings.tickerHover && !slider.usingCSS){
				// on el hover
				slider.viewport.hover(function(){
					el.stop();
				}, function(){
					// calculate the total width of children (used to calculate the speed ratio)
					var totalDimens = 0;
					slider.children.each(function(index){
					  totalDimens += slider.settings.mode == 'horizontal' ? $(this).outerWidth(true) : $(this).outerHeight(true);
					});
					// calculate the speed ratio (used to determine the new speed to finish the paused animation)
					var ratio = slider.settings.speed / totalDimens;
					// determine which property to use
					var property = slider.settings.mode == 'horizontal' ? 'left' : 'top';
					// calculate the new speed
					var newSpeed = ratio * (totalDimens - (Math.abs(parseInt(el.css(property)))));
					tickerLoop(newSpeed);
				});
			}
			// start the ticker loop
			tickerLoop();
		}

		/**
		 * Runs a continuous loop, news ticker-style
		 */
		var tickerLoop = function(resumeSpeed){
			speed = resumeSpeed ? resumeSpeed : slider.settings.speed;
			var position = {left: 0, top: 0};
			var reset = {left: 0, top: 0};
			// if "next" animate left position to last child, then reset left to 0
			if(slider.settings.autoDirection == 'next'){
				position = el.find('.bx-clone').first().position();
			// if "prev" animate left position to 0, then reset left to first non-clone child
			}else{
				reset = slider.children.first().position();
			}
			var animateProperty = slider.settings.mode == 'horizontal' ? -position.left : -position.top;
			var resetValue = slider.settings.mode == 'horizontal' ? -reset.left : -reset.top;
			var params = {resetValue: resetValue};
			setPositionProperty(animateProperty, 'ticker', speed, params);
		}

		/**
		 * Initializes touch events
		 */
		var initTouch = function(){
			// initialize object to contain all touch values
			slider.touch = {
				start: {x: 0, y: 0},
				end: {x: 0, y: 0}
			}
			slider.viewport.bind('touchstart', onTouchStart);
		}

		/**
		 * Event handler for "touchstart"
		 *
		 * @param e (event)
		 *  - DOM event object
		 */
		var onTouchStart = function(e){
			if(slider.working){
				e.preventDefault();
			}else{
				// record the original position when touch starts
				slider.touch.originalPos = el.position();
				var orig = e.originalEvent;
				// record the starting touch x, y coordinates
				slider.touch.start.x = orig.changedTouches[0].pageX;
				slider.touch.start.y = orig.changedTouches[0].pageY;
				// bind a "touchmove" event to the viewport
				slider.viewport.bind('touchmove', onTouchMove);
				// bind a "touchend" event to the viewport
				slider.viewport.bind('touchend', onTouchEnd);
			}
		}

		/**
		 * Event handler for "touchmove"
		 *
		 * @param e (event)
		 *  - DOM event object
		 */
		var onTouchMove = function(e){
			var orig = e.originalEvent;
			// if scrolling on y axis, do not prevent default
			var xMovement = Math.abs(orig.changedTouches[0].pageX - slider.touch.start.x);
			var yMovement = Math.abs(orig.changedTouches[0].pageY - slider.touch.start.y);
			// x axis swipe
			if((xMovement * 3) > yMovement && slider.settings.preventDefaultSwipeX){
				e.preventDefault();
			// y axis swipe
			}else if((yMovement * 3) > xMovement && slider.settings.preventDefaultSwipeY){
				e.preventDefault();
			}
			if(slider.settings.mode != 'fade' && slider.settings.oneToOneTouch){
				var value = 0;
				// if horizontal, drag along x axis
				if(slider.settings.mode == 'horizontal'){
					var change = orig.changedTouches[0].pageX - slider.touch.start.x;
					value = slider.touch.originalPos.left + change;
				// if vertical, drag along y axis
				}else{
					var change = orig.changedTouches[0].pageY - slider.touch.start.y;
					value = slider.touch.originalPos.top + change;
				}
				setPositionProperty(value, 'reset', 0);
			}
		}

		/**
		 * Event handler for "touchend"
		 *
		 * @param e (event)
		 *  - DOM event object
		 */
		var onTouchEnd = function(e){
			slider.viewport.unbind('touchmove', onTouchMove);
			var orig = e.originalEvent;
			var value = 0;
			// record end x, y positions
			slider.touch.end.x = orig.changedTouches[0].pageX;
			slider.touch.end.y = orig.changedTouches[0].pageY;
			// if fade mode, check if absolute x distance clears the threshold
			if(slider.settings.mode == 'fade'){
				var distance = Math.abs(slider.touch.start.x - slider.touch.end.x);
				if(distance >= slider.settings.swipeThreshold){
					slider.touch.start.x > slider.touch.end.x ? el.goToNextSlide() : el.goToPrevSlide();
					el.stopAuto();
				}
			// not fade mode
			}else{
				var distance = 0;
				// calculate distance and el's animate property
				if(slider.settings.mode == 'horizontal'){
					distance = slider.touch.end.x - slider.touch.start.x;
					value = slider.touch.originalPos.left;
				}else{
					distance = slider.touch.end.y - slider.touch.start.y;
					value = slider.touch.originalPos.top;
				}
				// if not infinite loop and first / last slide, do not attempt a slide transition
				if(!slider.settings.infiniteLoop && ((slider.active.index == 0 && distance > 0) || (slider.active.last && distance < 0))){
					setPositionProperty(value, 'reset', 200);
				}else{
					// check if distance clears threshold
					if(Math.abs(distance) >= slider.settings.swipeThreshold){
						distance < 0 ? el.goToNextSlide() : el.goToPrevSlide();
						el.stopAuto();
					}else{
						// el.animate(property, 200);
						setPositionProperty(value, 'reset', 200);
					}
				}
			}
			slider.viewport.unbind('touchend', onTouchEnd);
		}

		/**
		 * Window resize event callback
		 */
		var resizeWindow = function(e){
			// don't do anything if slider isn't initialized.
			if(!slider.initialized) return;
			// get the new window dimens (again, thank you IE)
			var windowWidthNew = $(window).width();
			var windowHeightNew = $(window).height();
			// make sure that it is a true window resize
			// *we must check this because our dinosaur friend IE fires a window resize event when certain DOM elements
			// are resized. Can you just die already?*
			if(windowWidth != windowWidthNew || windowHeight != windowHeightNew){
				// set the new window dimens
				windowWidth = windowWidthNew;
				windowHeight = windowHeightNew;
				// update all dynamic elements
				el.redrawSlider();
				// Call user resize handler
				slider.settings.onSliderResize.call(el, slider.active.index);
			}
		}

		/**
		 * ===================================================================================
		 * = PUBLIC FUNCTIONS
		 * ===================================================================================
		 */

		/**
		 * Performs slide transition to the specified slide
		 *
		 * @param slideIndex (int)
		 *  - the destination slide's index (zero-based)
		 *
		 * @param direction (string)
		 *  - INTERNAL USE ONLY - the direction of travel ("prev" / "next")
		 */
		el.goToSlide = function(slideIndex, direction){
			// if plugin is currently in motion, ignore request
			if(slider.working || slider.active.index == slideIndex) return;
			// declare that plugin is in motion
			slider.working = true;
			// store the old index
			slider.oldIndex = slider.active.index;
			// if slideIndex is less than zero, set active index to last child (this happens during infinite loop)
			if(slideIndex < 0){
				slider.active.index = getPagerQty() - 1;
			// if slideIndex is greater than children length, set active index to 0 (this happens during infinite loop)
			}else if(slideIndex >= getPagerQty()){
				slider.active.index = 0;
			// set active index to requested slide
			}else{
				slider.active.index = slideIndex;
			}
			// onSlideBefore, onSlideNext, onSlidePrev callbacks
			slider.settings.onSlideBefore(slider.children.eq(slider.active.index), slider.oldIndex, slider.active.index);
			if(direction == 'next'){
				slider.settings.onSlideNext(slider.children.eq(slider.active.index), slider.oldIndex, slider.active.index);
			}else if(direction == 'prev'){
				slider.settings.onSlidePrev(slider.children.eq(slider.active.index), slider.oldIndex, slider.active.index);
			}
			// check if last slide
			slider.active.last = slider.active.index >= getPagerQty() - 1;
			// update the pager with active class
			if(slider.settings.pager) updatePagerActive(slider.active.index);
			// // check for direction control update
			if(slider.settings.controls) updateDirectionControls();
			// if slider is set to mode: "fade"
			if(slider.settings.mode == 'fade'){
				// if adaptiveHeight is true and next height is different from current height, animate to the new height
				if(slider.settings.adaptiveHeight && slider.viewport.height() != getViewportHeight()){
					slider.viewport.animate({height: getViewportHeight()}, slider.settings.adaptiveHeightSpeed);
				}
				// fade out the visible child and reset its z-index value
				slider.children.filter(':visible').fadeOut(slider.settings.speed).css({zIndex: 0});
				// fade in the newly requested slide
				slider.children.eq(slider.active.index).css('zIndex', slider.settings.slideZIndex+1).fadeIn(slider.settings.speed, function(){
					$(this).css('zIndex', slider.settings.slideZIndex);
					updateAfterSlideTransition();
				});
			// slider mode is not "fade"
			}else{
				// if adaptiveHeight is true and next height is different from current height, animate to the new height
				if(slider.settings.adaptiveHeight && slider.viewport.height() != getViewportHeight()){
					slider.viewport.animate({height: getViewportHeight()}, slider.settings.adaptiveHeightSpeed);
				}
				var moveBy = 0;
				var position = {left: 0, top: 0};
				// if carousel and not infinite loop
				if(!slider.settings.infiniteLoop && slider.carousel && slider.active.last){
					if(slider.settings.mode == 'horizontal'){
						// get the last child position
						var lastChild = slider.children.eq(slider.children.length - 1);
						position = lastChild.position();
						// calculate the position of the last slide
						moveBy = slider.viewport.width() - lastChild.outerWidth();
					}else{
						// get last showing index position
						var lastShowingIndex = slider.children.length - slider.settings.minSlides;
						position = slider.children.eq(lastShowingIndex).position();
					}
					// horizontal carousel, going previous while on first slide (infiniteLoop mode)
				}else if(slider.carousel && slider.active.last && direction == 'prev'){
					// get the last child position
					var eq = slider.settings.moveSlides == 1 ? slider.settings.maxSlides - getMoveBy() : ((getPagerQty() - 1) * getMoveBy()) - (slider.children.length - slider.settings.maxSlides);
					var lastChild = el.children('.bx-clone').eq(eq);
					position = lastChild.position();
				// if infinite loop and "Next" is clicked on the last slide
				}else if(direction == 'next' && slider.active.index == 0){
					// get the last clone position
					position = el.find('> .bx-clone').eq(slider.settings.maxSlides).position();
					slider.active.last = false;
				// normal non-zero requests
				}else if(slideIndex >= 0){
					var requestEl = slideIndex * getMoveBy();
					position = slider.children.eq(requestEl).position();
				}

				/* If the position doesn't exist
				 * (e.g. if you destroy the slider on a next click),
				 * it doesn't throw an error.
				 */
				if ("undefined" !== typeof(position)) {
					var value = slider.settings.mode == 'horizontal' ? -(position.left - moveBy) : -position.top;
					// plugin values to be animated
					setPositionProperty(value, 'slide', slider.settings.speed);
				}
			}
		}

		/**
		 * Transitions to the next slide in the show
		 */
		el.goToNextSlide = function(){
			// if infiniteLoop is false and last page is showing, disregard call
			if (!slider.settings.infiniteLoop && slider.active.last) return;
			var pagerIndex = parseInt(slider.active.index) + 1;
			el.goToSlide(pagerIndex, 'next');
		}

		/**
		 * Transitions to the prev slide in the show
		 */
		el.goToPrevSlide = function(){
			// if infiniteLoop is false and last page is showing, disregard call
			if (!slider.settings.infiniteLoop && slider.active.index == 0) return;
			var pagerIndex = parseInt(slider.active.index) - 1;
			el.goToSlide(pagerIndex, 'prev');
		}

		/**
		 * Starts the auto show
		 *
		 * @param preventControlUpdate (boolean)
		 *  - if true, auto controls state will not be updated
		 */
		el.startAuto = function(preventControlUpdate){
			// if an interval already exists, disregard call
			if(slider.interval) return;
			// create an interval
			slider.interval = setInterval(function(){
				slider.settings.autoDirection == 'next' ? el.goToNextSlide() : el.goToPrevSlide();
			}, slider.settings.pause);
			// if auto controls are displayed and preventControlUpdate is not true
			if (slider.settings.autoControls && preventControlUpdate != true) updateAutoControls('stop');
		}

		/**
		 * Stops the auto show
		 *
		 * @param preventControlUpdate (boolean)
		 *  - if true, auto controls state will not be updated
		 */
		el.stopAuto = function(preventControlUpdate){
			// if no interval exists, disregard call
			if(!slider.interval) return;
			// clear the interval
			clearInterval(slider.interval);
			slider.interval = null;
			// if auto controls are displayed and preventControlUpdate is not true
			if (slider.settings.autoControls && preventControlUpdate != true) updateAutoControls('start');
		}

		/**
		 * Returns current slide index (zero-based)
		 */
		el.getCurrentSlide = function(){
			return slider.active.index;
		}

		/**
		 * Returns current slide element
		 */
		el.getCurrentSlideElement = function(){
			return slider.children.eq(slider.active.index);
		}

		/**
		 * Returns number of slides in show
		 */
		el.getSlideCount = function(){
			return slider.children.length;
		}

		/**
		 * Update all dynamic slider elements
		 */
		el.redrawSlider = function(){
			// resize all children in ratio to new screen size
			slider.children.add(el.find('.bx-clone')).width(getSlideWidth());
			// adjust the height
			slider.viewport.css('height', getViewportHeight());
			// update the slide position
			if(!slider.settings.ticker) setSlidePosition();
			// if active.last was true before the screen resize, we want
			// to keep it last no matter what screen size we end on
			if (slider.active.last) slider.active.index = getPagerQty() - 1;
			// if the active index (page) no longer exists due to the resize, simply set the index as last
			if (slider.active.index >= getPagerQty()) slider.active.last = true;
			// if a pager is being displayed and a custom pager is not being used, update it
			if(slider.settings.pager && !slider.settings.pagerCustom){
				populatePager();
				updatePagerActive(slider.active.index);
			}
		}

		/**
		 * Destroy the current instance of the slider (revert everything back to original state)
		 */
		el.destroySlider = function(){
			// don't do anything if slider has already been destroyed
			if(!slider.initialized) return;
			slider.initialized = false;
			$('.bx-clone', this).remove();
			slider.children.each(function() {
				$(this).data("origStyle") != undefined ? $(this).attr("style", $(this).data("origStyle")) : $(this).removeAttr('style');
			});
			$(this).data("origStyle") != undefined ? this.attr("style", $(this).data("origStyle")) : $(this).removeAttr('style');
			$(this).unwrap().unwrap();
			if(slider.controls.el) slider.controls.el.remove();
			if(slider.controls.next) slider.controls.next.remove();
			if(slider.controls.prev) slider.controls.prev.remove();
			if(slider.pagerEl && slider.settings.controls) slider.pagerEl.remove();
			$('.bx-caption', this).remove();
			if(slider.controls.autoEl) slider.controls.autoEl.remove();
			clearInterval(slider.interval);
			if(slider.settings.responsive) $(window).unbind('resize', resizeWindow);
		}

		/**
		 * Reload the slider (revert all DOM changes, and re-initialize)
		 */
		el.reloadSlider = function(settings){
			if (settings != undefined) options = settings;
			el.destroySlider();
			init();
		}

		init();

		// returns the current jQuery object
		return this;
	}

})(jQuery);
// Console-polyfill. MIT license.
// https://github.com/paulmillr/console-polyfill
// Make it safe to do console.log() always.
(function (con) {
  'use strict';
  var prop, method;
  var empty = {};
  var dummy = function() {};
  var properties = 'memory'.split(',');
  var methods = ('assert,count,debug,dir,dirxml,error,exception,group,' +
     'groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,' +
     'time,timeEnd,trace,warn').split(',');
  while (prop = properties.pop()) con[prop] = con[prop] || empty;
  while (method = methods.pop()) con[method] = con[method] || dummy;
})(window.console = window.console || {});
/*!
 * headroom.js v0.9.3 - Give your page some headroom. Hide your header until you need it
 * Copyright (c) 2016 Nick Williams - http://wicky.nillia.ms/headroom.js
 * License: MIT
 */

!function(a,b){"use strict";"function"==typeof define&&define.amd?define([],b):"object"==typeof exports?module.exports=b():a.Headroom=b()}(this,function(){"use strict";function a(a){this.callback=a,this.ticking=!1}function b(a){return a&&"undefined"!=typeof window&&(a===window||a.nodeType)}function c(a){if(arguments.length<=0)throw new Error("Missing arguments in extend function");var d,e,f=a||{};for(e=1;e<arguments.length;e++){var g=arguments[e]||{};for(d in g)"object"!=typeof f[d]||b(f[d])?f[d]=f[d]||g[d]:f[d]=c(f[d],g[d])}return f}function d(a){return a===Object(a)?a:{down:a,up:a}}function e(a,b){b=c(b,e.options),this.lastKnownScrollY=0,this.elem=a,this.tolerance=d(b.tolerance),this.classes=b.classes,this.offset=b.offset,this.scroller=b.scroller,this.initialised=!1,this.onPin=b.onPin,this.onUnpin=b.onUnpin,this.onTop=b.onTop,this.onNotTop=b.onNotTop,this.onBottom=b.onBottom,this.onNotBottom=b.onNotBottom}var f={bind:!!function(){}.bind,classList:"classList"in document.documentElement,rAF:!!(window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame)};return window.requestAnimationFrame=window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame,a.prototype={constructor:a,update:function(){this.callback&&this.callback(),this.ticking=!1},requestTick:function(){this.ticking||(requestAnimationFrame(this.rafCallback||(this.rafCallback=this.update.bind(this))),this.ticking=!0)},handleEvent:function(){this.requestTick()}},e.prototype={constructor:e,init:function(){return e.cutsTheMustard?(this.debouncer=new a(this.update.bind(this)),this.elem.classList.add(this.classes.initial),setTimeout(this.attachEvent.bind(this),100),this):void 0},destroy:function(){var a=this.classes;this.initialised=!1,this.elem.classList.remove(a.unpinned,a.pinned,a.top,a.notTop,a.initial),this.scroller.removeEventListener("scroll",this.debouncer,!1)},attachEvent:function(){this.initialised||(this.lastKnownScrollY=this.getScrollY(),this.initialised=!0,this.scroller.addEventListener("scroll",this.debouncer,!1),this.debouncer.handleEvent())},unpin:function(){var a=this.elem.classList,b=this.classes;!a.contains(b.pinned)&&a.contains(b.unpinned)||(a.add(b.unpinned),a.remove(b.pinned),this.onUnpin&&this.onUnpin.call(this))},pin:function(){var a=this.elem.classList,b=this.classes;a.contains(b.unpinned)&&(a.remove(b.unpinned),a.add(b.pinned),this.onPin&&this.onPin.call(this))},top:function(){var a=this.elem.classList,b=this.classes;a.contains(b.top)||(a.add(b.top),a.remove(b.notTop),this.onTop&&this.onTop.call(this))},notTop:function(){var a=this.elem.classList,b=this.classes;a.contains(b.notTop)||(a.add(b.notTop),a.remove(b.top),this.onNotTop&&this.onNotTop.call(this))},bottom:function(){var a=this.elem.classList,b=this.classes;a.contains(b.bottom)||(a.add(b.bottom),a.remove(b.notBottom),this.onBottom&&this.onBottom.call(this))},notBottom:function(){var a=this.elem.classList,b=this.classes;a.contains(b.notBottom)||(a.add(b.notBottom),a.remove(b.bottom),this.onNotBottom&&this.onNotBottom.call(this))},getScrollY:function(){return void 0!==this.scroller.pageYOffset?this.scroller.pageYOffset:void 0!==this.scroller.scrollTop?this.scroller.scrollTop:(document.documentElement||document.body.parentNode||document.body).scrollTop},getViewportHeight:function(){return window.innerHeight||document.documentElement.clientHeight||document.body.clientHeight},getElementPhysicalHeight:function(a){return Math.max(a.offsetHeight,a.clientHeight)},getScrollerPhysicalHeight:function(){return this.scroller===window||this.scroller===document.body?this.getViewportHeight():this.getElementPhysicalHeight(this.scroller)},getDocumentHeight:function(){var a=document.body,b=document.documentElement;return Math.max(a.scrollHeight,b.scrollHeight,a.offsetHeight,b.offsetHeight,a.clientHeight,b.clientHeight)},getElementHeight:function(a){return Math.max(a.scrollHeight,a.offsetHeight,a.clientHeight)},getScrollerHeight:function(){return this.scroller===window||this.scroller===document.body?this.getDocumentHeight():this.getElementHeight(this.scroller)},isOutOfBounds:function(a){var b=0>a,c=a+this.getScrollerPhysicalHeight()>this.getScrollerHeight();return b||c},toleranceExceeded:function(a,b){return Math.abs(a-this.lastKnownScrollY)>=this.tolerance[b]},shouldUnpin:function(a,b){var c=a>this.lastKnownScrollY,d=a>=this.offset;return c&&d&&b},shouldPin:function(a,b){var c=a<this.lastKnownScrollY,d=a<=this.offset;return c&&b||d},update:function(){var a=this.getScrollY(),b=a>this.lastKnownScrollY?"down":"up",c=this.toleranceExceeded(a,b);this.isOutOfBounds(a)||(a<=this.offset?this.top():this.notTop(),a+this.getViewportHeight()>=this.getScrollerHeight()?this.bottom():this.notBottom(),this.shouldUnpin(a,c)?this.unpin():this.shouldPin(a,c)&&this.pin(),this.lastKnownScrollY=a)}},e.options={tolerance:{up:0,down:0},offset:0,scroller:window,classes:{pinned:"headroom--pinned",unpinned:"headroom--unpinned",top:"headroom--top",notTop:"headroom--not-top",bottom:"headroom--bottom",notBottom:"headroom--not-bottom",initial:"headroom"}},e.cutsTheMustard="undefined"!=typeof f&&f.rAF&&f.bind&&f.classList,e});
/*! highlight.js v9.5.0 | BSD3 License | git.io/hljslicense */
!function(e){var n="object"==typeof window&&window||"object"==typeof self&&self;"undefined"!=typeof exports?e(exports):n&&(n.hljs=e({}),"function"==typeof define&&define.amd&&define([],function(){return n.hljs}))}(function(e){function n(e){return e.replace(/[&<>]/gm,function(e){return I[e]})}function t(e){return e.nodeName.toLowerCase()}function r(e,n){var t=e&&e.exec(n);return t&&0===t.index}function a(e){return k.test(e)}function i(e){var n,t,r,i,o=e.className+" ";if(o+=e.parentNode?e.parentNode.className:"",t=B.exec(o))return R(t[1])?t[1]:"no-highlight";for(o=o.split(/\s+/),n=0,r=o.length;r>n;n++)if(i=o[n],a(i)||R(i))return i}function o(e,n){var t,r={};for(t in e)r[t]=e[t];if(n)for(t in n)r[t]=n[t];return r}function u(e){var n=[];return function r(e,a){for(var i=e.firstChild;i;i=i.nextSibling)3===i.nodeType?a+=i.nodeValue.length:1===i.nodeType&&(n.push({event:"start",offset:a,node:i}),a=r(i,a),t(i).match(/br|hr|img|input/)||n.push({event:"stop",offset:a,node:i}));return a}(e,0),n}function c(e,r,a){function i(){return e.length&&r.length?e[0].offset!==r[0].offset?e[0].offset<r[0].offset?e:r:"start"===r[0].event?e:r:e.length?e:r}function o(e){function r(e){return" "+e.nodeName+'="'+n(e.value)+'"'}l+="<"+t(e)+w.map.call(e.attributes,r).join("")+">"}function u(e){l+="</"+t(e)+">"}function c(e){("start"===e.event?o:u)(e.node)}for(var s=0,l="",f=[];e.length||r.length;){var g=i();if(l+=n(a.substr(s,g[0].offset-s)),s=g[0].offset,g===e){f.reverse().forEach(u);do c(g.splice(0,1)[0]),g=i();while(g===e&&g.length&&g[0].offset===s);f.reverse().forEach(o)}else"start"===g[0].event?f.push(g[0].node):f.pop(),c(g.splice(0,1)[0])}return l+n(a.substr(s))}function s(e){function n(e){return e&&e.source||e}function t(t,r){return new RegExp(n(t),"m"+(e.cI?"i":"")+(r?"g":""))}function r(a,i){if(!a.compiled){if(a.compiled=!0,a.k=a.k||a.bK,a.k){var u={},c=function(n,t){e.cI&&(t=t.toLowerCase()),t.split(" ").forEach(function(e){var t=e.split("|");u[t[0]]=[n,t[1]?Number(t[1]):1]})};"string"==typeof a.k?c("keyword",a.k):E(a.k).forEach(function(e){c(e,a.k[e])}),a.k=u}a.lR=t(a.l||/\w+/,!0),i&&(a.bK&&(a.b="\\b("+a.bK.split(" ").join("|")+")\\b"),a.b||(a.b=/\B|\b/),a.bR=t(a.b),a.e||a.eW||(a.e=/\B|\b/),a.e&&(a.eR=t(a.e)),a.tE=n(a.e)||"",a.eW&&i.tE&&(a.tE+=(a.e?"|":"")+i.tE)),a.i&&(a.iR=t(a.i)),null==a.r&&(a.r=1),a.c||(a.c=[]);var s=[];a.c.forEach(function(e){e.v?e.v.forEach(function(n){s.push(o(e,n))}):s.push("self"===e?a:e)}),a.c=s,a.c.forEach(function(e){r(e,a)}),a.starts&&r(a.starts,i);var l=a.c.map(function(e){return e.bK?"\\.?("+e.b+")\\.?":e.b}).concat([a.tE,a.i]).map(n).filter(Boolean);a.t=l.length?t(l.join("|"),!0):{exec:function(){return null}}}}r(e)}function l(e,t,a,i){function o(e,n){for(var t=0;t<n.c.length;t++)if(r(n.c[t].bR,e))return n.c[t]}function u(e,n){if(r(e.eR,n)){for(;e.endsParent&&e.parent;)e=e.parent;return e}return e.eW?u(e.parent,n):void 0}function c(e,n){return!a&&r(n.iR,e)}function g(e,n){var t=N.cI?n[0].toLowerCase():n[0];return e.k.hasOwnProperty(t)&&e.k[t]}function h(e,n,t,r){var a=r?"":y.classPrefix,i='<span class="'+a,o=t?"":C;return i+=e+'">',i+n+o}function p(){var e,t,r,a;if(!E.k)return n(B);for(a="",t=0,E.lR.lastIndex=0,r=E.lR.exec(B);r;)a+=n(B.substr(t,r.index-t)),e=g(E,r),e?(M+=e[1],a+=h(e[0],n(r[0]))):a+=n(r[0]),t=E.lR.lastIndex,r=E.lR.exec(B);return a+n(B.substr(t))}function d(){var e="string"==typeof E.sL;if(e&&!x[E.sL])return n(B);var t=e?l(E.sL,B,!0,L[E.sL]):f(B,E.sL.length?E.sL:void 0);return E.r>0&&(M+=t.r),e&&(L[E.sL]=t.top),h(t.language,t.value,!1,!0)}function b(){k+=null!=E.sL?d():p(),B=""}function v(e){k+=e.cN?h(e.cN,"",!0):"",E=Object.create(e,{parent:{value:E}})}function m(e,n){if(B+=e,null==n)return b(),0;var t=o(n,E);if(t)return t.skip?B+=n:(t.eB&&(B+=n),b(),t.rB||t.eB||(B=n)),v(t,n),t.rB?0:n.length;var r=u(E,n);if(r){var a=E;a.skip?B+=n:(a.rE||a.eE||(B+=n),b(),a.eE&&(B=n));do E.cN&&(k+=C),E.skip||(M+=E.r),E=E.parent;while(E!==r.parent);return r.starts&&v(r.starts,""),a.rE?0:n.length}if(c(n,E))throw new Error('Illegal lexeme "'+n+'" for mode "'+(E.cN||"<unnamed>")+'"');return B+=n,n.length||1}var N=R(e);if(!N)throw new Error('Unknown language: "'+e+'"');s(N);var w,E=i||N,L={},k="";for(w=E;w!==N;w=w.parent)w.cN&&(k=h(w.cN,"",!0)+k);var B="",M=0;try{for(var I,j,O=0;;){if(E.t.lastIndex=O,I=E.t.exec(t),!I)break;j=m(t.substr(O,I.index-O),I[0]),O=I.index+j}for(m(t.substr(O)),w=E;w.parent;w=w.parent)w.cN&&(k+=C);return{r:M,value:k,language:e,top:E}}catch(T){if(T.message&&-1!==T.message.indexOf("Illegal"))return{r:0,value:n(t)};throw T}}function f(e,t){t=t||y.languages||E(x);var r={r:0,value:n(e)},a=r;return t.filter(R).forEach(function(n){var t=l(n,e,!1);t.language=n,t.r>a.r&&(a=t),t.r>r.r&&(a=r,r=t)}),a.language&&(r.second_best=a),r}function g(e){return y.tabReplace||y.useBR?e.replace(M,function(e,n){return y.useBR&&"\n"===e?"<br>":y.tabReplace?n.replace(/\t/g,y.tabReplace):void 0}):e}function h(e,n,t){var r=n?L[n]:t,a=[e.trim()];return e.match(/\bhljs\b/)||a.push("hljs"),-1===e.indexOf(r)&&a.push(r),a.join(" ").trim()}function p(e){var n,t,r,o,s,p=i(e);a(p)||(y.useBR?(n=document.createElementNS("http://www.w3.org/1999/xhtml","div"),n.innerHTML=e.innerHTML.replace(/\n/g,"").replace(/<br[ \/]*>/g,"\n")):n=e,s=n.textContent,r=p?l(p,s,!0):f(s),t=u(n),t.length&&(o=document.createElementNS("http://www.w3.org/1999/xhtml","div"),o.innerHTML=r.value,r.value=c(t,u(o),s)),r.value=g(r.value),e.innerHTML=r.value,e.className=h(e.className,p,r.language),e.result={language:r.language,re:r.r},r.second_best&&(e.second_best={language:r.second_best.language,re:r.second_best.r}))}function d(e){y=o(y,e)}function b(){if(!b.called){b.called=!0;var e=document.querySelectorAll("pre code");w.forEach.call(e,p)}}function v(){addEventListener("DOMContentLoaded",b,!1),addEventListener("load",b,!1)}function m(n,t){var r=x[n]=t(e);r.aliases&&r.aliases.forEach(function(e){L[e]=n})}function N(){return E(x)}function R(e){return e=(e||"").toLowerCase(),x[e]||x[L[e]]}var w=[],E=Object.keys,x={},L={},k=/^(no-?highlight|plain|text)$/i,B=/\blang(?:uage)?-([\w-]+)\b/i,M=/((^(<[^>]+>|\t|)+|(?:\n)))/gm,C="</span>",y={classPrefix:"hljs-",tabReplace:null,useBR:!1,languages:void 0},I={"&":"&amp;","<":"&lt;",">":"&gt;"};return e.highlight=l,e.highlightAuto=f,e.fixMarkup=g,e.highlightBlock=p,e.configure=d,e.initHighlighting=b,e.initHighlightingOnLoad=v,e.registerLanguage=m,e.listLanguages=N,e.getLanguage=R,e.inherit=o,e.IR="[a-zA-Z]\\w*",e.UIR="[a-zA-Z_]\\w*",e.NR="\\b\\d+(\\.\\d+)?",e.CNR="(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)",e.BNR="\\b(0b[01]+)",e.RSR="!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~",e.BE={b:"\\\\[\\s\\S]",r:0},e.ASM={cN:"string",b:"'",e:"'",i:"\\n",c:[e.BE]},e.QSM={cN:"string",b:'"',e:'"',i:"\\n",c:[e.BE]},e.PWM={b:/\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|like)\b/},e.C=function(n,t,r){var a=e.inherit({cN:"comment",b:n,e:t,c:[]},r||{});return a.c.push(e.PWM),a.c.push({cN:"doctag",b:"(?:TODO|FIXME|NOTE|BUG|XXX):",r:0}),a},e.CLCM=e.C("//","$"),e.CBCM=e.C("/\\*","\\*/"),e.HCM=e.C("#","$"),e.NM={cN:"number",b:e.NR,r:0},e.CNM={cN:"number",b:e.CNR,r:0},e.BNM={cN:"number",b:e.BNR,r:0},e.CSSNM={cN:"number",b:e.NR+"(%|em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|pt|pc|px|deg|grad|rad|turn|s|ms|Hz|kHz|dpi|dpcm|dppx)?",r:0},e.RM={cN:"regexp",b:/\//,e:/\/[gimuy]*/,i:/\n/,c:[e.BE,{b:/\[/,e:/\]/,r:0,c:[e.BE]}]},e.TM={cN:"title",b:e.IR,r:0},e.UTM={cN:"title",b:e.UIR,r:0},e.METHOD_GUARD={b:"\\.\\s*"+e.UIR,r:0},e});hljs.registerLanguage("javascript",function(e){return{aliases:["js","jsx"],k:{keyword:"in of if for while finally var new function do return void else break catch instanceof with throw case default try this switch continue typeof delete let yield const export super debugger as async await static import from as",literal:"true false null undefined NaN Infinity",built_in:"eval isFinite isNaN parseFloat parseInt decodeURI decodeURIComponent encodeURI encodeURIComponent escape unescape Object Function Boolean Error EvalError InternalError RangeError ReferenceError StopIteration SyntaxError TypeError URIError Number Math Date String RegExp Array Float32Array Float64Array Int16Array Int32Array Int8Array Uint16Array Uint32Array Uint8Array Uint8ClampedArray ArrayBuffer DataView JSON Intl arguments require module console window document Symbol Set Map WeakSet WeakMap Proxy Reflect Promise"},c:[{cN:"meta",r:10,b:/^\s*['"]use (strict|asm)['"]/},{cN:"meta",b:/^#!/,e:/$/},e.ASM,e.QSM,{cN:"string",b:"`",e:"`",c:[e.BE,{cN:"subst",b:"\\$\\{",e:"\\}"}]},e.CLCM,e.CBCM,{cN:"number",v:[{b:"\\b(0[bB][01]+)"},{b:"\\b(0[oO][0-7]+)"},{b:e.CNR}],r:0},{b:"("+e.RSR+"|\\b(case|return|throw)\\b)\\s*",k:"return throw case",c:[e.CLCM,e.CBCM,e.RM,{b:/</,e:/(\/\w+|\w+\/)>/,sL:"xml",c:[{b:/<\w+\s*\/>/,skip:!0},{b:/<\w+/,e:/(\/\w+|\w+\/)>/,skip:!0,c:["self"]}]}],r:0},{cN:"function",bK:"function",e:/\{/,eE:!0,c:[e.inherit(e.TM,{b:/[A-Za-z$_][0-9A-Za-z$_]*/}),{cN:"params",b:/\(/,e:/\)/,eB:!0,eE:!0,c:[e.CLCM,e.CBCM]}],i:/\[|%/},{b:/\$[(.]/},e.METHOD_GUARD,{cN:"class",bK:"class",e:/[{;=]/,eE:!0,i:/[:"\[\]]/,c:[{bK:"extends"},e.UTM]},{bK:"constructor",e:/\{/,eE:!0}],i:/#(?!!)/}});

/*!
 * imagesLoaded PACKAGED v4.1.0
 * JavaScript is all like "You images are done yet or what?"
 * MIT License
 */

/**
 * EvEmitter v1.0.1
 * Lil' event emitter
 * MIT License
 */

/* jshint unused: true, undef: true, strict: true */

( function( global, factory ) {
  // universal module definition
  /* jshint strict: false */ /* globals define, module */
  if ( typeof define == 'function' && define.amd ) {
    // AMD - RequireJS
    define( 'ev-emitter/ev-emitter',factory );
  } else if ( typeof module == 'object' && module.exports ) {
    // CommonJS - Browserify, Webpack
    module.exports = factory();
  } else {
    // Browser globals
    global.EvEmitter = factory();
  }

}( this, function() {



function EvEmitter() {}

var proto = EvEmitter.prototype;

proto.on = function( eventName, listener ) {
  if ( !eventName || !listener ) {
    return;
  }
  // set events hash
  var events = this._events = this._events || {};
  // set listeners array
  var listeners = events[ eventName ] = events[ eventName ] || [];
  // only add once
  if ( listeners.indexOf( listener ) == -1 ) {
    listeners.push( listener );
  }

  return this;
};

proto.once = function( eventName, listener ) {
  if ( !eventName || !listener ) {
    return;
  }
  // add event
  this.on( eventName, listener );
  // set once flag
  // set onceEvents hash
  var onceEvents = this._onceEvents = this._onceEvents || {};
  // set onceListeners array
  var onceListeners = onceEvents[ eventName ] = onceEvents[ eventName ] || [];
  // set flag
  onceListeners[ listener ] = true;

  return this;
};

proto.off = function( eventName, listener ) {
  var listeners = this._events && this._events[ eventName ];
  if ( !listeners || !listeners.length ) {
    return;
  }
  var index = listeners.indexOf( listener );
  if ( index != -1 ) {
    listeners.splice( index, 1 );
  }

  return this;
};

proto.emitEvent = function( eventName, args ) {
  var listeners = this._events && this._events[ eventName ];
  if ( !listeners || !listeners.length ) {
    return;
  }
  var i = 0;
  var listener = listeners[i];
  args = args || [];
  // once stuff
  var onceListeners = this._onceEvents && this._onceEvents[ eventName ];

  while ( listener ) {
    var isOnce = onceListeners && onceListeners[ listener ];
    if ( isOnce ) {
      // remove listener
      // remove before trigger to prevent recursion
      this.off( eventName, listener );
      // unset once flag
      delete onceListeners[ listener ];
    }
    // trigger listener
    listener.apply( this, args );
    // get next listener
    i += isOnce ? 0 : 1;
    listener = listeners[i];
  }

  return this;
};

return EvEmitter;

}));

/*!
 * imagesLoaded v4.1.0
 * JavaScript is all like "You images are done yet or what?"
 * MIT License
 */

( function( window, factory ) { 'use strict';
  // universal module definition

  /*global define: false, module: false, require: false */

  if ( typeof define == 'function' && define.amd ) {
    // AMD
    define( [
      'ev-emitter/ev-emitter'
    ], function( EvEmitter ) {
      return factory( window, EvEmitter );
    });
  } else if ( typeof module == 'object' && module.exports ) {
    // CommonJS
    module.exports = factory(
      window,
      require('ev-emitter')
    );
  } else {
    // browser global
    window.imagesLoaded = factory(
      window,
      window.EvEmitter
    );
  }

})( window,

// --------------------------  factory -------------------------- //

function factory( window, EvEmitter ) {



var $ = window.jQuery;
var console = window.console;

// -------------------------- helpers -------------------------- //

// extend objects
function extend( a, b ) {
  for ( var prop in b ) {
    a[ prop ] = b[ prop ];
  }
  return a;
}

// turn element or nodeList into an array
function makeArray( obj ) {
  var ary = [];
  if ( Array.isArray( obj ) ) {
    // use object if already an array
    ary = obj;
  } else if ( typeof obj.length == 'number' ) {
    // convert nodeList to array
    for ( var i=0; i < obj.length; i++ ) {
      ary.push( obj[i] );
    }
  } else {
    // array of single index
    ary.push( obj );
  }
  return ary;
}

// -------------------------- imagesLoaded -------------------------- //

/**
 * @param {Array, Element, NodeList, String} elem
 * @param {Object or Function} options - if function, use as callback
 * @param {Function} onAlways - callback function
 */
function ImagesLoaded( elem, options, onAlways ) {
  // coerce ImagesLoaded() without new, to be new ImagesLoaded()
  if ( !( this instanceof ImagesLoaded ) ) {
    return new ImagesLoaded( elem, options, onAlways );
  }
  // use elem as selector string
  if ( typeof elem == 'string' ) {
    elem = document.querySelectorAll( elem );
  }

  this.elements = makeArray( elem );
  this.options = extend( {}, this.options );

  if ( typeof options == 'function' ) {
    onAlways = options;
  } else {
    extend( this.options, options );
  }

  if ( onAlways ) {
    this.on( 'always', onAlways );
  }

  this.getImages();

  if ( $ ) {
    // add jQuery Deferred object
    this.jqDeferred = new $.Deferred();
  }

  // HACK check async to allow time to bind listeners
  setTimeout( function() {
    this.check();
  }.bind( this ));
}

ImagesLoaded.prototype = Object.create( EvEmitter.prototype );

ImagesLoaded.prototype.options = {};

ImagesLoaded.prototype.getImages = function() {
  this.images = [];

  // filter & find items if we have an item selector
  this.elements.forEach( this.addElementImages, this );
};

/**
 * @param {Node} element
 */
ImagesLoaded.prototype.addElementImages = function( elem ) {
  // filter siblings
  if ( elem.nodeName == 'IMG' ) {
    this.addImage( elem );
  }
  // get background image on element
  if ( this.options.background === true ) {
    this.addElementBackgroundImages( elem );
  }

  // find children
  // no non-element nodes, #143
  var nodeType = elem.nodeType;
  if ( !nodeType || !elementNodeTypes[ nodeType ] ) {
    return;
  }
  var childImgs = elem.querySelectorAll('img');
  // concat childElems to filterFound array
  for ( var i=0; i < childImgs.length; i++ ) {
    var img = childImgs[i];
    this.addImage( img );
  }

  // get child background images
  if ( typeof this.options.background == 'string' ) {
    var children = elem.querySelectorAll( this.options.background );
    for ( i=0; i < children.length; i++ ) {
      var child = children[i];
      this.addElementBackgroundImages( child );
    }
  }
};

var elementNodeTypes = {
  1: true,
  9: true,
  11: true
};

ImagesLoaded.prototype.addElementBackgroundImages = function( elem ) {
  var style = getComputedStyle( elem );
  if ( !style ) {
    // Firefox returns null if in a hidden iframe https://bugzil.la/548397
    return;
  }
  // get url inside url("...")
  var reURL = /url\((['"])?(.*?)\1\)/gi;
  var matches = reURL.exec( style.backgroundImage );
  while ( matches !== null ) {
    var url = matches && matches[2];
    if ( url ) {
      this.addBackground( url, elem );
    }
    matches = reURL.exec( style.backgroundImage );
  }
};

/**
 * @param {Image} img
 */
ImagesLoaded.prototype.addImage = function( img ) {
  var loadingImage = new LoadingImage( img );
  this.images.push( loadingImage );
};

ImagesLoaded.prototype.addBackground = function( url, elem ) {
  var background = new Background( url, elem );
  this.images.push( background );
};

ImagesLoaded.prototype.check = function() {
  var _this = this;
  this.progressedCount = 0;
  this.hasAnyBroken = false;
  // complete if no images
  if ( !this.images.length ) {
    this.complete();
    return;
  }

  function onProgress( image, elem, message ) {
    // HACK - Chrome triggers event before object properties have changed. #83
    setTimeout( function() {
      _this.progress( image, elem, message );
    });
  }

  this.images.forEach( function( loadingImage ) {
    loadingImage.once( 'progress', onProgress );
    loadingImage.check();
  });
};

ImagesLoaded.prototype.progress = function( image, elem, message ) {
  this.progressedCount++;
  this.hasAnyBroken = this.hasAnyBroken || !image.isLoaded;
  // progress event
  this.emitEvent( 'progress', [ this, image, elem ] );
  if ( this.jqDeferred && this.jqDeferred.notify ) {
    this.jqDeferred.notify( this, image );
  }
  // check if completed
  if ( this.progressedCount == this.images.length ) {
    this.complete();
  }

  if ( this.options.debug && console ) {
    console.log( 'progress: ' + message, image, elem );
  }
};

ImagesLoaded.prototype.complete = function() {
  var eventName = this.hasAnyBroken ? 'fail' : 'done';
  this.isComplete = true;
  this.emitEvent( eventName, [ this ] );
  this.emitEvent( 'always', [ this ] );
  if ( this.jqDeferred ) {
    var jqMethod = this.hasAnyBroken ? 'reject' : 'resolve';
    this.jqDeferred[ jqMethod ]( this );
  }
};

// --------------------------  -------------------------- //

function LoadingImage( img ) {
  this.img = img;
}

LoadingImage.prototype = Object.create( EvEmitter.prototype );

LoadingImage.prototype.check = function() {
  // If complete is true and browser supports natural sizes,
  // try to check for image status manually.
  var isComplete = this.getIsImageComplete();
  if ( isComplete ) {
    // report based on naturalWidth
    this.confirm( this.img.naturalWidth !== 0, 'naturalWidth' );
    return;
  }

  // If none of the checks above matched, simulate loading on detached element.
  this.proxyImage = new Image();
  this.proxyImage.addEventListener( 'load', this );
  this.proxyImage.addEventListener( 'error', this );
  // bind to image as well for Firefox. #191
  this.img.addEventListener( 'load', this );
  this.img.addEventListener( 'error', this );
  this.proxyImage.src = this.img.src;
};

LoadingImage.prototype.getIsImageComplete = function() {
  return this.img.complete && this.img.naturalWidth !== undefined;
};

LoadingImage.prototype.confirm = function( isLoaded, message ) {
  this.isLoaded = isLoaded;
  this.emitEvent( 'progress', [ this, this.img, message ] );
};

// ----- events ----- //

// trigger specified handler for event type
LoadingImage.prototype.handleEvent = function( event ) {
  var method = 'on' + event.type;
  if ( this[ method ] ) {
    this[ method ]( event );
  }
};

LoadingImage.prototype.onload = function() {
  this.confirm( true, 'onload' );
  this.unbindEvents();
};

LoadingImage.prototype.onerror = function() {
  this.confirm( false, 'onerror' );
  this.unbindEvents();
};

LoadingImage.prototype.unbindEvents = function() {
  this.proxyImage.removeEventListener( 'load', this );
  this.proxyImage.removeEventListener( 'error', this );
  this.img.removeEventListener( 'load', this );
  this.img.removeEventListener( 'error', this );
};

// -------------------------- Background -------------------------- //

function Background( url, element ) {
  this.url = url;
  this.element = element;
  this.img = new Image();
}

// inherit LoadingImage prototype
Background.prototype = Object.create( LoadingImage.prototype );

Background.prototype.check = function() {
  this.img.addEventListener( 'load', this );
  this.img.addEventListener( 'error', this );
  this.img.src = this.url;
  // check if image is already complete
  var isComplete = this.getIsImageComplete();
  if ( isComplete ) {
    this.confirm( this.img.naturalWidth !== 0, 'naturalWidth' );
    this.unbindEvents();
  }
};

Background.prototype.unbindEvents = function() {
  this.img.removeEventListener( 'load', this );
  this.img.removeEventListener( 'error', this );
};

Background.prototype.confirm = function( isLoaded, message ) {
  this.isLoaded = isLoaded;
  this.emitEvent( 'progress', [ this, this.element, message ] );
};

// -------------------------- jQuery -------------------------- //

ImagesLoaded.makeJQueryPlugin = function( jQuery ) {
  jQuery = jQuery || window.jQuery;
  if ( !jQuery ) {
    return;
  }
  // set local variable
  $ = jQuery;
  // $().imagesLoaded()
  $.fn.imagesLoaded = function( options, callback ) {
    var instance = new ImagesLoaded( this, options, callback );
    return instance.jqDeferred.promise( $(this) );
  };
};
// try making plugin
ImagesLoaded.makeJQueryPlugin();

// --------------------------  -------------------------- //

return ImagesLoaded;

});

/*! v0.1.1 https://github.com/codekipple/conformity. Plugin adapted from this code:- http://codepen.io/micahgodbolt/details/FgqLc */

/*
    pass conformity a jquery collection of blocks inside a container, conformity will make sure each row is
    equal heights, call conformity on window resize for responsive equal heights

    Supports CommonJS, AMD or browser globals.
    see: https://github.com/umdjs/umd/blob/master/jqueryPluginCommonjs.js
*/
(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        // Node/CommonJS
        factory(require('jquery'));
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function ($) {
    $.fn.conformity = function (options) {
        var settings = {
                'mode': 'min-height'
            },
            elements = $(this),
            currentTallest = 0,
            currentRowStart = 0,
            rowDivs = [],
            $el,
            topPosition = 0;

        if (options) {
            $.extend(settings, options);
        }

        return elements.each(function() {
            $el = $(this);
            /*
                alter height and min-height so we can get an accurate measure of the
                elements height
            */
            if (settings.mode === 'min-height') {
                $el
                    .height('auto')
                    .css('min-height', 0);
            } else if (settings.mode === 'height')  {
                $el.height('auto');
            }
            /*
                top position is used to determine if the element is on the current
                row or a new one
            */
            topPostion = $el.offset().top;
            if (currentRowStart != topPostion) {
                for (currentDiv = 0 ; currentDiv < rowDivs.length ; currentDiv++) {
                    rowDivs[currentDiv].css(settings.mode, currentTallest);
                }
                rowDivs.length = 0; // empty the array
                currentRowStart = topPostion;
                currentTallest = $el.outerHeight();
                rowDivs.push($el);
            } else {
                rowDivs.push($el);
                currentTallest = (currentTallest < $el.outerHeight()) ? ($el.outerHeight()) : (currentTallest);
            }
            for (currentDiv = 0 ; currentDiv < rowDivs.length ; currentDiv++) {
                rowDivs[currentDiv].css(settings.mode, currentTallest);
            }
        });
    };
}));
/*!
 * jQuery Cookie Plugin v1.4.1
 * https://github.com/carhartl/jquery-cookie
 *
 * Copyright 2006, 2014 Klaus Hartl
 * Released under the MIT license
 */
(function (factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD
		define(['jquery'], factory);
	} else if (typeof exports === 'object') {
		// CommonJS
		factory(require('jquery'));
	} else {
		// Browser globals
		factory(jQuery);
	}
}(function ($) {

	var pluses = /\+/g;

	function encode(s) {
		return config.raw ? s : encodeURIComponent(s);
	}

	function decode(s) {
		return config.raw ? s : decodeURIComponent(s);
	}

	function stringifyCookieValue(value) {
		return encode(config.json ? JSON.stringify(value) : String(value));
	}

	function parseCookieValue(s) {
		if (s.indexOf('"') === 0) {
			// This is a quoted cookie as according to RFC2068, unescape...
			s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
		}

		try {
			// Replace server-side written pluses with spaces.
			// If we can't decode the cookie, ignore it, it's unusable.
			// If we can't parse the cookie, ignore it, it's unusable.
			s = decodeURIComponent(s.replace(pluses, ' '));
			return config.json ? JSON.parse(s) : s;
		} catch(e) {}
	}

	function read(s, converter) {
		var value = config.raw ? s : parseCookieValue(s);
		return $.isFunction(converter) ? converter(value) : value;
	}

	var config = $.cookie = function (key, value, options) {

		// Write

		if (arguments.length > 1 && !$.isFunction(value)) {
			options = $.extend({}, config.defaults, options);

			if (typeof options.expires === 'number') {
				var days = options.expires, t = options.expires = new Date();
				t.setTime(+t + days * 864e+5);
			}

			return (document.cookie = [
				encode(key), '=', stringifyCookieValue(value),
				options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
				options.path    ? '; path=' + options.path : '',
				options.domain  ? '; domain=' + options.domain : '',
				options.secure  ? '; secure' : ''
			].join(''));
		}

		// Read

		var result = key ? undefined : {};

		// To prevent the for loop in the first place assign an empty array
		// in case there are no cookies at all. Also prevents odd result when
		// calling $.cookie().
		var cookies = document.cookie ? document.cookie.split('; ') : [];

		for (var i = 0, l = cookies.length; i < l; i++) {
			var parts = cookies[i].split('=');
			var name = decode(parts.shift());
			var cookie = parts.join('=');

			if (key && key === name) {
				// If second argument (value) is a function it's a converter...
				result = read(cookie, value);
				break;
			}

			// Prevent storing a cookie that we couldn't decode.
			if (!key && (cookie = read(cookie)) !== undefined) {
				result[name] = cookie;
			}
		}

		return result;
	};

	config.defaults = {};

	$.removeCookie = function (key, options) {
		if ($.cookie(key) === undefined) {
			return false;
		}

		// Must not alter options, thus extending a fresh object...
		$.cookie(key, '', $.extend({}, options, { expires: -1 }));
		return !$.cookie(key);
	};

}));

/*
CSS Browser Selector v0.5.0 (Apr 04, 2011)
Rafael Lima (http://rafael.adm.br)
http://rafael.adm.br/css_browser_selector
License: http://creativecommons.org/licenses/by/2.5/
Contributors: http://rafael.adm.br/css_browser_selector#contributors
*/
function css_browser_selector(u){var ua=u.toLowerCase(),is=function(t){return ua.indexOf(t)>-1},g='gecko',w='webkit',s='safari',o='opera',m='mobile',h=document.documentElement,b=[(!(/opera|webtv/i.test(ua))&&/msie\s(\d)/.test(ua))?('ie ie'+RegExp.$1):is('firefox/2')?g+' ff2':is('firefox/3.5')?g+' ff3 ff3_5':is('firefox/3.6')?g+' ff3 ff3_6':is('firefox/3')?g+' ff3':is('firefox/4')?g+' ff4':is('gecko/')?g:is('opera')?o+(/version\/(\d+)/.test(ua)?' '+o+RegExp.$1:(/opera(\s|\/)(\d+)/.test(ua)?' '+o+RegExp.$2:'')):is('konqueror')?'konqueror':is('blackberry')?m+' blackberry':is('android')?m+' android':is('chrome')?w+' chrome':is('iron')?w+' iron':is('applewebkit/')?w+' '+s+(/version\/(\d+)/.test(ua)?' '+s+RegExp.$1:''):is('mozilla/')?g:'',is('j2me')?m+' j2me':is('iphone')?m+' iphone':is('ipod')?m+' ipod':is('ipad')?m+' ipad':is('mac')?'mac':is('darwin')?'mac':is('webtv')?'webtv':is('win')?'win'+(is('windows nt 6.0')?' vista':''):is('freebsd')?'freebsd':(is('x11')||is('linux'))?'linux':'','js']; c = b.join(' '); h.className += ' '+c; return c;}; css_browser_selector(navigator.userAgent);

/*! jQuery Mobile v1.4.3 | Copyright 2010, 2014 jQuery Foundation, Inc. | jquery.org/license */

(function(e,t,n){typeof define=="function"&&define.amd?define(["jquery"],function(r){return n(r,e,t),r.mobile}):n(e.jQuery,e,t)})(this,document,function(e,t,n,r){(function(e,t,n,r){function T(e){while(e&&typeof e.originalEvent!="undefined")e=e.originalEvent;return e}function N(t,n){var i=t.type,s,o,a,l,c,h,p,d,v;t=e.Event(t),t.type=n,s=t.originalEvent,o=e.event.props,i.search(/^(mouse|click)/)>-1&&(o=f);if(s)for(p=o.length,l;p;)l=o[--p],t[l]=s[l];i.search(/mouse(down|up)|click/)>-1&&!t.which&&(t.which=1);if(i.search(/^touch/)!==-1){a=T(s),i=a.touches,c=a.changedTouches,h=i&&i.length?i[0]:c&&c.length?c[0]:r;if(h)for(d=0,v=u.length;d<v;d++)l=u[d],t[l]=h[l]}return t}function C(t){var n={},r,s;while(t){r=e.data(t,i);for(s in r)r[s]&&(n[s]=n.hasVirtualBinding=!0);t=t.parentNode}return n}function k(t,n){var r;while(t){r=e.data(t,i);if(r&&(!n||r[n]))return t;t=t.parentNode}return null}function L(){g=!1}function A(){g=!0}function O(){E=0,v.length=0,m=!1,A()}function M(){L()}function _(){D(),c=setTimeout(function(){c=0,O()},e.vmouse.resetTimerDuration)}function D(){c&&(clearTimeout(c),c=0)}function P(t,n,r){var i;if(r&&r[t]||!r&&k(n.target,t))i=N(n,t),e(n.target).trigger(i);return i}function H(t){var n=e.data(t.target,s),r;!m&&(!E||E!==n)&&(r=P("v"+t.type,t),r&&(r.isDefaultPrevented()&&t.preventDefault(),r.isPropagationStopped()&&t.stopPropagation(),r.isImmediatePropagationStopped()&&t.stopImmediatePropagation()))}function B(t){var n=T(t).touches,r,i,o;n&&n.length===1&&(r=t.target,i=C(r),i.hasVirtualBinding&&(E=w++,e.data(r,s,E),D(),M(),d=!1,o=T(t).touches[0],h=o.pageX,p=o.pageY,P("vmouseover",t,i),P("vmousedown",t,i)))}function j(e){if(g)return;d||P("vmousecancel",e,C(e.target)),d=!0,_()}function F(t){if(g)return;var n=T(t).touches[0],r=d,i=e.vmouse.moveDistanceThreshold,s=C(t.target);d=d||Math.abs(n.pageX-h)>i||Math.abs(n.pageY-p)>i,d&&!r&&P("vmousecancel",t,s),P("vmousemove",t,s),_()}function I(e){if(g)return;A();var t=C(e.target),n,r;P("vmouseup",e,t),d||(n=P("vclick",e,t),n&&n.isDefaultPrevented()&&(r=T(e).changedTouches[0],v.push({touchID:E,x:r.clientX,y:r.clientY}),m=!0)),P("vmouseout",e,t),d=!1,_()}function q(t){var n=e.data(t,i),r;if(n)for(r in n)if(n[r])return!0;return!1}function R(){}function U(t){var n=t.substr(1);return{setup:function(){q(this)||e.data(this,i,{});var r=e.data(this,i);r[t]=!0,l[t]=(l[t]||0)+1,l[t]===1&&b.bind(n,H),e(this).bind(n,R),y&&(l.touchstart=(l.touchstart||0)+1,l.touchstart===1&&b.bind("touchstart",B).bind("touchend",I).bind("touchmove",F).bind("scroll",j))},teardown:function(){--l[t],l[t]||b.unbind(n,H),y&&(--l.touchstart,l.touchstart||b.unbind("touchstart",B).unbind("touchmove",F).unbind("touchend",I).unbind("scroll",j));var r=e(this),s=e.data(this,i);s&&(s[t]=!1),r.unbind(n,R),q(this)||r.removeData(i)}}}var i="virtualMouseBindings",s="virtualTouchID",o="vmouseover vmousedown vmousemove vmouseup vclick vmouseout vmousecancel".split(" "),u="clientX clientY pageX pageY screenX screenY".split(" "),a=e.event.mouseHooks?e.event.mouseHooks.props:[],f=e.event.props.concat(a),l={},c=0,h=0,p=0,d=!1,v=[],m=!1,g=!1,y="addEventListener"in n,b=e(n),w=1,E=0,S,x;e.vmouse={moveDistanceThreshold:10,clickDistanceThreshold:10,resetTimerDuration:1500};for(x=0;x<o.length;x++)e.event.special[o[x]]=U(o[x]);y&&n.addEventListener("click",function(t){var n=v.length,r=t.target,i,o,u,a,f,l;if(n){i=t.clientX,o=t.clientY,S=e.vmouse.clickDistanceThreshold,u=r;while(u){for(a=0;a<n;a++){f=v[a],l=0;if(u===r&&Math.abs(f.x-i)<S&&Math.abs(f.y-o)<S||e.data(u,s)===f.touchID){t.preventDefault(),t.stopPropagation();return}}u=u.parentNode}}},!0)})(e,t,n),function(e){e.mobile={}}(e),function(e,t){var r={touch:"ontouchend"in n};e.mobile.support=e.mobile.support||{},e.extend(e.support,r),e.extend(e.mobile.support,r)}(e),function(e,t,r){function l(t,n,i,s){var o=i.type;i.type=n,s?e.event.trigger(i,r,t):e.event.dispatch.call(t,i),i.type=o}var i=e(n),s=e.mobile.support.touch,o="touchmove scroll",u=s?"touchstart":"mousedown",a=s?"touchend":"mouseup",f=s?"touchmove":"mousemove";e.each("touchstart touchmove touchend tap taphold swipe swipeleft swiperight scrollstart scrollstop".split(" "),function(t,n){e.fn[n]=function(e){return e?this.bind(n,e):this.trigger(n)},e.attrFn&&(e.attrFn[n]=!0)}),e.event.special.scrollstart={enabled:!0,setup:function(){function s(e,n){r=n,l(t,r?"scrollstart":"scrollstop",e)}var t=this,n=e(t),r,i;n.bind(o,function(t){if(!e.event.special.scrollstart.enabled)return;r||s(t,!0),clearTimeout(i),i=setTimeout(function(){s(t,!1)},50)})},teardown:function(){e(this).unbind(o)}},e.event.special.tap={tapholdThreshold:750,emitTapOnTaphold:!0,setup:function(){var t=this,n=e(t),r=!1;n.bind("vmousedown",function(s){function a(){clearTimeout(u)}function f(){a(),n.unbind("vclick",c).unbind("vmouseup",a),i.unbind("vmousecancel",f)}function c(e){f(),!r&&o===e.target?l(t,"tap",e):r&&e.preventDefault()}r=!1;if(s.which&&s.which!==1)return!1;var o=s.target,u;n.bind("vmouseup",a).bind("vclick",c),i.bind("vmousecancel",f),u=setTimeout(function(){e.event.special.tap.emitTapOnTaphold||(r=!0),l(t,"taphold",e.Event("taphold",{target:o}))},e.event.special.tap.tapholdThreshold)})},teardown:function(){e(this).unbind("vmousedown").unbind("vclick").unbind("vmouseup"),i.unbind("vmousecancel")}},e.event.special.swipe={scrollSupressionThreshold:30,durationThreshold:1e3,horizontalDistanceThreshold:30,verticalDistanceThreshold:30,getLocation:function(e){var n=t.pageXOffset,r=t.pageYOffset,i=e.clientX,s=e.clientY;if(e.pageY===0&&Math.floor(s)>Math.floor(e.pageY)||e.pageX===0&&Math.floor(i)>Math.floor(e.pageX))i-=n,s-=r;else if(s<e.pageY-r||i<e.pageX-n)i=e.pageX-n,s=e.pageY-r;return{x:i,y:s}},start:function(t){var n=t.originalEvent.touches?t.originalEvent.touches[0]:t,r=e.event.special.swipe.getLocation(n);return{time:(new Date).getTime(),coords:[r.x,r.y],origin:e(t.target)}},stop:function(t){var n=t.originalEvent.touches?t.originalEvent.touches[0]:t,r=e.event.special.swipe.getLocation(n);return{time:(new Date).getTime(),coords:[r.x,r.y]}},handleSwipe:function(t,n,r,i){if(n.time-t.time<e.event.special.swipe.durationThreshold&&Math.abs(t.coords[0]-n.coords[0])>e.event.special.swipe.horizontalDistanceThreshold&&Math.abs(t.coords[1]-n.coords[1])<e.event.special.swipe.verticalDistanceThreshold){var s=t.coords[0]>n.coords[0]?"swipeleft":"swiperight";return l(r,"swipe",e.Event("swipe",{target:i,swipestart:t,swipestop:n}),!0),l(r,s,e.Event(s,{target:i,swipestart:t,swipestop:n}),!0),!0}return!1},eventInProgress:!1,setup:function(){var t,n=this,r=e(n),s={};t=e.data(this,"mobile-events"),t||(t={length:0},e.data(this,"mobile-events",t)),t.length++,t.swipe=s,s.start=function(t){if(e.event.special.swipe.eventInProgress)return;e.event.special.swipe.eventInProgress=!0;var r,o=e.event.special.swipe.start(t),u=t.target,l=!1;s.move=function(t){if(!o)return;r=e.event.special.swipe.stop(t),l||(l=e.event.special.swipe.handleSwipe(o,r,n,u),l&&(e.event.special.swipe.eventInProgress=!1)),Math.abs(o.coords[0]-r.coords[0])>e.event.special.swipe.scrollSupressionThreshold&&t.preventDefault()},s.stop=function(){l=!0,e.event.special.swipe.eventInProgress=!1,i.off(f,s.move),s.move=null},i.on(f,s.move).one(a,s.stop)},r.on(u,s.start)},teardown:function(){var t,n;t=e.data(this,"mobile-events"),t&&(n=t.swipe,delete t.swipe,t.length--,t.length===0&&e.removeData(this,"mobile-events")),n&&(n.start&&e(this).off(u,n.start),n.move&&i.off(f,n.move),n.stop&&i.off(a,n.stop))}},e.each({scrollstop:"scrollstart",taphold:"tap",swipeleft:"swipe.left",swiperight:"swipe.right"},function(t,n){e.event.special[t]={setup:function(){e(this).bind(n,e.noop)},teardown:function(){e(this).unbind(n)}}})}(e,this),function(e,t,n){e.extend(e.mobile,{version:"1.4.3",subPageUrlKey:"ui-page",hideUrlBar:!0,keepNative:":jqmData(role='none'), :jqmData(role='nojs')",activePageClass:"ui-page-active",activeBtnClass:"ui-btn-active",focusClass:"ui-focus",ajaxEnabled:!0,hashListeningEnabled:!0,linkBindingEnabled:!0,defaultPageTransition:"fade",maxTransitionWidth:!1,minScrollBack:0,defaultDialogTransition:"pop",pageLoadErrorMessage:"Error Loading Page",pageLoadErrorMessageTheme:"a",phonegapNavigationEnabled:!1,autoInitializePage:!0,pushStateEnabled:!0,ignoreContentEnabled:!1,buttonMarkup:{hoverDelay:200},dynamicBaseEnabled:!0,pageContainer:e(),allowCrossDomainPages:!1,dialogHashKey:"&ui-state=dialog"})}(e,this),function(e,t,n){var r={},i=e.find,s=/(?:\{[\s\S]*\}|\[[\s\S]*\])$/,o=/:jqmData\(([^)]*)\)/g;e.extend(e.mobile,{ns:"",getAttribute:function(t,n){var r;t=t.jquery?t[0]:t,t&&t.getAttribute&&(r=t.getAttribute("data-"+e.mobile.ns+n));try{r=r==="true"?!0:r==="false"?!1:r==="null"?null:+r+""===r?+r:s.test(r)?JSON.parse(r):r}catch(i){}return r},nsNormalizeDict:r,nsNormalize:function(t){return r[t]||(r[t]=e.camelCase(e.mobile.ns+t))},closestPageData:function(e){return e.closest(":jqmData(role='page'), :jqmData(role='dialog')").data("mobile-page")}}),e.fn.jqmData=function(t,r){var i;return typeof t!="undefined"&&(t&&(t=e.mobile.nsNormalize(t)),arguments.length<2||r===n?i=this.data(t):i=this.data(t,r)),i},e.jqmData=function(t,n,r){var i;return typeof n!="undefined"&&(i=e.data(t,n?e.mobile.nsNormalize(n):n,r)),i},e.fn.jqmRemoveData=function(t){return this.removeData(e.mobile.nsNormalize(t))},e.jqmRemoveData=function(t,n){return e.removeData(t,e.mobile.nsNormalize(n))},e.find=function(t,n,r,s){return t.indexOf(":jqmData")>-1&&(t=t.replace(o,"[data-"+(e.mobile.ns||"")+"$1]")),i.call(this,t,n,r,s)},e.extend(e.find,i)}(e,this),function(e,t){function s(t,n){var r,i,s,u=t.nodeName.toLowerCase();return"area"===u?(r=t.parentNode,i=r.name,!t.href||!i||r.nodeName.toLowerCase()!=="map"?!1:(s=e("img[usemap=#"+i+"]")[0],!!s&&o(s))):(/input|select|textarea|button|object/.test(u)?!t.disabled:"a"===u?t.href||n:n)&&o(t)}function o(t){return e.expr.filters.visible(t)&&!e(t).parents().addBack().filter(function(){return e.css(this,"visibility")==="hidden"}).length}var r=0,i=/^ui-id-\d+$/;e.ui=e.ui||{},e.extend(e.ui,{version:"c0ab71056b936627e8a7821f03c044aec6280a40",keyCode:{BACKSPACE:8,COMMA:188,DELETE:46,DOWN:40,END:35,ENTER:13,ESCAPE:27,HOME:36,LEFT:37,PAGE_DOWN:34,PAGE_UP:33,PERIOD:190,RIGHT:39,SPACE:32,TAB:9,UP:38}}),e.fn.extend({focus:function(t){return function(n,r){return typeof n=="number"?this.each(function(){var t=this;setTimeout(function(){e(t).focus(),r&&r.call(t)},n)}):t.apply(this,arguments)}}(e.fn.focus),scrollParent:function(){var t;return e.ui.ie&&/(static|relative)/.test(this.css("position"))||/absolute/.test(this.css("position"))?t=this.parents().filter(function(){return/(relative|absolute|fixed)/.test(e.css(this,"position"))&&/(auto|scroll)/.test(e.css(this,"overflow")+e.css(this,"overflow-y")+e.css(this,"overflow-x"))}).eq(0):t=this.parents().filter(function(){return/(auto|scroll)/.test(e.css(this,"overflow")+e.css(this,"overflow-y")+e.css(this,"overflow-x"))}).eq(0),/fixed/.test(this.css("position"))||!t.length?e(this[0].ownerDocument||n):t},uniqueId:function(){return this.each(function(){this.id||(this.id="ui-id-"+ ++r)})},removeUniqueId:function(){return this.each(function(){i.test(this.id)&&e(this).removeAttr("id")})}}),e.extend(e.expr[":"],{data:e.expr.createPseudo?e.expr.createPseudo(function(t){return function(n){return!!e.data(n,t)}}):function(t,n,r){return!!e.data(t,r[3])},focusable:function(t){return s(t,!isNaN(e.attr(t,"tabindex")))},tabbable:function(t){var n=e.attr(t,"tabindex"),r=isNaN(n);return(r||n>=0)&&s(t,!r)}}),e("<a>").outerWidth(1).jquery||e.each(["Width","Height"],function(n,r){function u(t,n,r,s){return e.each(i,function(){n-=parseFloat(e.css(t,"padding"+this))||0,r&&(n-=parseFloat(e.css(t,"border"+this+"Width"))||0),s&&(n-=parseFloat(e.css(t,"margin"+this))||0)}),n}var i=r==="Width"?["Left","Right"]:["Top","Bottom"],s=r.toLowerCase(),o={innerWidth:e.fn.innerWidth,innerHeight:e.fn.innerHeight,outerWidth:e.fn.outerWidth,outerHeight:e.fn.outerHeight};e.fn["inner"+r]=function(n){return n===t?o["inner"+r].call(this):this.each(function(){e(this).css(s,u(this,n)+"px")})},e.fn["outer"+r]=function(t,n){return typeof t!="number"?o["outer"+r].call(this,t):this.each(function(){e(this).css(s,u(this,t,!0,n)+"px")})}}),e.fn.addBack||(e.fn.addBack=function(e){return this.add(e==null?this.prevObject:this.prevObject.filter(e))}),e("<a>").data("a-b","a").removeData("a-b").data("a-b")&&(e.fn.removeData=function(t){return function(n){return arguments.length?t.call(this,e.camelCase(n)):t.call(this)}}(e.fn.removeData)),e.ui.ie=!!/msie [\w.]+/.exec(navigator.userAgent.toLowerCase()),e.support.selectstart="onselectstart"in n.createElement("div"),e.fn.extend({disableSelection:function(){return this.bind((e.support.selectstart?"selectstart":"mousedown")+".ui-disableSelection",function(e){e.preventDefault()})},enableSelection:function(){return this.unbind(".ui-disableSelection")},zIndex:function(r){if(r!==t)return this.css("zIndex",r);if(this.length){var i=e(this[0]),s,o;while(i.length&&i[0]!==n){s=i.css("position");if(s==="absolute"||s==="relative"||s==="fixed"){o=parseInt(i.css("zIndex"),10);if(!isNaN(o)&&o!==0)return o}i=i.parent()}}return 0}}),e.ui.plugin={add:function(t,n,r){var i,s=e.ui[t].prototype;for(i in r)s.plugins[i]=s.plugins[i]||[],s.plugins[i].push([n,r[i]])},call:function(e,t,n,r){var i,s=e.plugins[t];if(!s)return;if(!r&&(!e.element[0].parentNode||e.element[0].parentNode.nodeType===11))return;for(i=0;i<s.length;i++)e.options[s[i][0]]&&s[i][1].apply(e.element,n)}}}(e),function(e,t,r){var i=function(t,n){var r=t.parent(),i=[],s=r.children(":jqmData(role='header')"),o=t.children(":jqmData(role='header')"),u=r.children(":jqmData(role='footer')"),a=t.children(":jqmData(role='footer')");return o.length===0&&s.length>0&&(i=i.concat(s.toArray())),a.length===0&&u.length>0&&(i=i.concat(u.toArray())),e.each(i,function(t,r){n-=e(r).outerHeight()}),Math.max(0,n)};e.extend(e.mobile,{window:e(t),document:e(n),keyCode:e.ui.keyCode,behaviors:{},silentScroll:function(n){e.type(n)!=="number"&&(n=e.mobile.defaultHomeScroll),e.event.special.scrollstart.enabled=!1,setTimeout(function(){t.scrollTo(0,n),e.mobile.document.trigger("silentscroll",{x:0,y:n})},20),setTimeout(function(){e.event.special.scrollstart.enabled=!0},150)},getClosestBaseUrl:function(t){var n=e(t).closest(".ui-page").jqmData("url"),r=e.mobile.path.documentBase.hrefNoHash;if(!e.mobile.dynamicBaseEnabled||!n||!e.mobile.path.isPath(n))n=r;return e.mobile.path.makeUrlAbsolute(n,r)},removeActiveLinkClass:function(t){!!e.mobile.activeClickedLink&&(!e.mobile.activeClickedLink.closest("."+e.mobile.activePageClass).length||t)&&e.mobile.activeClickedLink.removeClass(e.mobile.activeBtnClass),e.mobile.activeClickedLink=null},getInheritedTheme:function(e,t){var n=e[0],r="",i=/ui-(bar|body|overlay)-([a-z])\b/,s,o;while(n){s=n.className||"";if(s&&(o=i.exec(s))&&(r=o[2]))break;n=n.parentNode}return r||t||"a"},enhanceable:function(e){return this.haveParents(e,"enhance")},hijackable:function(e){return this.haveParents(e,"ajax")},haveParents:function(t,n){if(!e.mobile.ignoreContentEnabled)return t;var r=t.length,i=e(),s,o,u,a,f;for(a=0;a<r;a++){o=t.eq(a),u=!1,s=t[a];while(s){f=s.getAttribute?s.getAttribute("data-"+e.mobile.ns+n):"";if(f==="false"){u=!0;break}s=s.parentNode}u||(i=i.add(o))}return i},getScreenHeight:function(){return t.innerHeight||e.mobile.window.height()},resetActivePageHeight:function(t){var n=e("."+e.mobile.activePageClass),r=n.height(),s=n.outerHeight(!0);t=i(n,typeof t=="number"?t:e.mobile.getScreenHeight()),n.css("min-height",""),n.height()<t&&n.css("min-height",t-(s-r))},loading:function(){var t=this.loading._widget||e(e.mobile.loader.prototype.defaultHtml).loader(),n=t.loader.apply(t,arguments);return this.loading._widget=t,n}}),e.addDependents=function(t,n){var r=e(t),i=r.jqmData("dependents")||e();r.jqmData("dependents",e(i).add(n))},e.fn.extend({removeWithDependents:function(){e.removeWithDependents(this)},enhanceWithin:function(){var t,n={},r=e.mobile.page.prototype.keepNativeSelector(),i=this;e.mobile.nojs&&e.mobile.nojs(this),e.mobile.links&&e.mobile.links(this),e.mobile.degradeInputsWithin&&e.mobile.degradeInputsWithin(this),e.fn.buttonMarkup&&this.find(e.fn.buttonMarkup.initSelector).not(r).jqmEnhanceable().buttonMarkup(),e.fn.fieldcontain&&this.find(":jqmData(role='fieldcontain')").not(r).jqmEnhanceable().fieldcontain(),e.each(e.mobile.widgets,function(t,s){if(s.initSelector){var o=e.mobile.enhanceable(i.find(s.initSelector));o.length>0&&(o=o.not(r)),o.length>0&&(n[s.prototype.widgetName]=o)}});for(t in n)n[t][t]();return this},addDependents:function(t){e.addDependents(this,t)},getEncodedText:function(){return e("<a>").text(this.text()).html()},jqmEnhanceable:function(){return e.mobile.enhanceable(this)},jqmHijackable:function(){return e.mobile.hijackable(this)}}),e.removeWithDependents=function(t){var n=e(t);(n.jqmData("dependents")||e()).remove(),n.remove()},e.addDependents=function(t,n){var r=e(t),i=r.jqmData("dependents")||e();r.jqmData("dependents",e(i).add(n))},e.find.matches=function(t,n){return e.find(t,null,null,n)},e.find.matchesSelector=function(t,n){return e.find(n,null,null,[t]).length>0}}(e,this),function(e,r){t.matchMedia=t.matchMedia||function(e,t){var n,r=e.documentElement,i=r.firstElementChild||r.firstChild,s=e.createElement("body"),o=e.createElement("div");return o.id="mq-test-1",o.style.cssText="position:absolute;top:-100em",s.style.background="none",s.appendChild(o),function(e){return o.innerHTML='&shy;<style media="'+e+'"> #mq-test-1 { width: 42px; }</style>',r.insertBefore(s,i),n=o.offsetWidth===42,r.removeChild(s),{matches:n,media:e}}}(n),e.mobile.media=function(e){return t.matchMedia(e).matches}}(e),function(e,n){e.extend(e.support,{orientation:"orientation"in t&&"onorientationchange"in t})}(e),function(e,r){function i(e){var t=e.charAt(0).toUpperCase()+e.substr(1),n=(e+" "+u.join(t+" ")+t).split(" "),i;for(i in n)if(o[n[i]]!==r)return!0}function h(){var n=t,r=!!n.document.createElementNS&&!!n.document.createElementNS("http://www.w3.org/2000/svg","svg").createSVGRect&&(!n.opera||navigator.userAgent.indexOf("Chrome")!==-1),i=function(t){(!t||!r)&&e("html").addClass("ui-nosvg")},s=new n.Image;s.onerror=function(){i(!1)},s.onload=function(){i(s.width===1&&s.height===1)},s.src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="}function p(){var i="transform-3d",o=e.mobile.media("(-"+u.join("-"+i+"),(-")+"-"+i+"),("+i+")"),a,f,l;if(o)return!!o;a=n.createElement("div"),f={MozTransform:"-moz-transform",transform:"transform"},s.append(a);for(l in f)a.style[l]!==r&&(a.style[l]="translate3d( 100px, 1px, 1px )",o=t.getComputedStyle(a).getPropertyValue(f[l]));return!!o&&o!=="none"}function d(){var t=location.protocol+"//"+location.host+location.pathname+"ui-dir/",n=e("head base"),r=null,i="",o,u;return n.length?i=n.attr("href"):n=r=e("<base>",{href:t}).appendTo("head"),o=e("<a href='testurl' />").prependTo(s),u=o[0].href,n[0].href=i||location.pathname,r&&r.remove(),u.indexOf(t)===0}function v(){var e=n.createElement("x"),r=n.documentElement,i=t.getComputedStyle,s;return"pointerEvents"in e.style?(e.style.pointerEvents="auto",e.style.pointerEvents="x",r.appendChild(e),s=i&&i(e,"").pointerEvents==="auto",r.removeChild(e),!!s):!1}function m(){var e=n.createElement("div");return typeof e.getBoundingClientRect!="undefined"}function g(){var e=t,n=navigator.userAgent,r=navigator.platform,i=n.match(/AppleWebKit\/([0-9]+)/),s=!!i&&i[1],o=n.match(/Fennec\/([0-9]+)/),u=!!o&&o[1],a=n.match(/Opera Mobi\/([0-9]+)/),f=!!a&&a[1];return(r.indexOf("iPhone")>-1||r.indexOf("iPad")>-1||r.indexOf("iPod")>-1)&&s&&s<534||e.operamini&&{}.toString.call(e.operamini)==="[object OperaMini]"||a&&f<7458||n.indexOf("Android")>-1&&s&&s<533||u&&u<6||"palmGetResource"in t&&s&&s<534||n.indexOf("MeeGo")>-1&&n.indexOf("NokiaBrowser/8.5.0")>-1?!1:!0}var s=e("<body>").prependTo("html"),o=s[0].style,u=["Webkit","Moz","O"],a="palmGetResource"in t,f=t.operamini&&{}.toString.call(t.operamini)==="[object OperaMini]",l=t.blackberry&&!i("-webkit-transform"),c;e.extend(e.mobile,{browser:{}}),e.mobile.browser.oldIE=function(){var e=3,t=n.createElement("div"),r=t.all||[];do t.innerHTML="<!--[if gt IE "+ ++e+"]><br><![endif]-->";while(r[0]);return e>4?e:!e}(),e.extend(e.support,{pushState:"pushState"in history&&"replaceState"in history&&!(t.navigator.userAgent.indexOf("Firefox")>=0&&t.top!==t)&&t.navigator.userAgent.search(/CriOS/)===-1,mediaquery:e.mobile.media("only all"),cssPseudoElement:!!i("content"),touchOverflow:!!i("overflowScrolling"),cssTransform3d:p(),boxShadow:!!i("boxShadow")&&!l,fixedPosition:g(),scrollTop:("pageXOffset"in t||"scrollTop"in n.documentElement||"scrollTop"in s[0])&&!a&&!f,dynamicBaseTag:d(),cssPointerEvents:v(),boundingRect:m(),inlineSVG:h}),s.remove(),c=function(){var e=t.navigator.userAgent;return e.indexOf("Nokia")>-1&&(e.indexOf("Symbian/3")>-1||e.indexOf("Series60/5")>-1)&&e.indexOf("AppleWebKit")>-1&&e.match(/(BrowserNG|NokiaBrowser)\/7\.[0-3]/)}(),e.mobile.gradeA=function(){return(e.support.mediaquery&&e.support.cssPseudoElement||e.mobile.browser.oldIE&&e.mobile.browser.oldIE>=8)&&(e.support.boundingRect||e.fn.jquery.match(/1\.[0-7+]\.[0-9+]?/)!==null)},e.mobile.ajaxBlacklist=t.blackberry&&!t.WebKitPoint||f||c,c&&e(function(){e("head link[rel='stylesheet']").attr("rel","alternate stylesheet").attr("rel","stylesheet")}),e.support.boxShadow||e("html").addClass("ui-noboxshadow")}(e)});
(function($) {
	jQuery.fn.quickOuterWidth = function(includeMargin) {
		var elem = this.get(0),
			width = elem.offsetWidth;
		if (includeMargin && window.getComputedStyle) {
			var computedStyle = window.getComputedStyle(elem, null);
			width = width + (parseInt(computedStyle.getPropertyValue('margin-left'), 10) || 0) + (parseInt(computedStyle.getPropertyValue('margin-right'), 10) || 0);
		} else if (includeMargin) {
			width = width + (parseInt(elem.currentStyle["marginLeft"]) || 0) + (parseInt(elem.currentStyle["marginRight"]) || 0);
		}
		return width;
	};
}(jQuery));

(function($) {
	jQuery.fn.reverse = [].reverse;
}(jQuery));

(function($) {
  var version = '1.7.2';
  var optionOverrides = {};
  var defaults = {
    exclude: [],
    excludeWithin: [],
    offset: 0,

    // one of 'top' or 'left'
    direction: 'top',

    // if set, bind click events through delegation
    //  supported since jQuery 1.4.2
    delegateSelector: null,

    // jQuery set of elements you wish to scroll (for $.smoothScroll).
    //  if null (default), $('html, body').firstScrollable() is used.
    scrollElement: null,

    // only use if you want to override default behavior
    scrollTarget: null,

    // fn(opts) function to be called before scrolling occurs.
    // `this` is the element(s) being scrolled
    beforeScroll: function() {},

    // fn(opts) function to be called after scrolling occurs.
    // `this` is the triggering element
    afterScroll: function() {},
    easing: 'swing',
    speed: 400,

    // coefficient for "auto" speed
    autoCoefficient: 2,

    // $.fn.smoothScroll only: whether to prevent the default click action
    preventDefault: true
  };

  var getScrollable = function(opts) {
    var scrollable = [];
    var scrolled = false;
    var dir = opts.dir && opts.dir === 'left' ? 'scrollLeft' : 'scrollTop';

    this.each(function() {
      var el = $(this);

      if (this === document || this === window) {
        return;
      }

      if (document.scrollingElement && (this === document.documentElement || this === document.body)) {
        scrollable.push(document.scrollingElement);

        return false;
      }

      if (el[dir]() > 0) {
        scrollable.push(this);
      } else {
        // if scroll(Top|Left) === 0, nudge the element 1px and see if it moves
        el[dir](1);
        scrolled = el[dir]() > 0;

        if (scrolled) {
          scrollable.push(this);
        }
        // then put it back, of course
        el[dir](0);
      }
    });

    if (!scrollable.length) {
      this.each(function() {
        // If no scrollable elements and <html> has scroll-behavior:smooth because
        // "When this property is specified on the root element, it applies to the viewport instead."
        // and "The scroll-behavior property of the … body element is *not* propagated to the viewport."
        // → https://drafts.csswg.org/cssom-view/#propdef-scroll-behavior
        if (this === document.documentElement && $(this).css('scrollBehavior') === 'smooth') {
          scrollable = [this];
        }

        // If still no scrollable elements, fall back to <body>,
        // if it's in the jQuery collection
        // (doing this because Safari sets scrollTop async,
        // so can't set it to 1 and immediately get the value.)
        if (!scrollable.length && this.nodeName === 'BODY') {
          scrollable = [this];
        }
      });
    }

    // Use the first scrollable element if we're calling firstScrollable()
    if (opts.el === 'first' && scrollable.length > 1) {
      scrollable = [scrollable[0]];
    }

    return scrollable;
  };

  $.fn.extend({
    scrollable: function(dir) {
      var scrl = getScrollable.call(this, {dir: dir});

      return this.pushStack(scrl);
    },
    firstScrollable: function(dir) {
      var scrl = getScrollable.call(this, {el: 'first', dir: dir});

      return this.pushStack(scrl);
    },

    smoothScroll: function(options, extra) {
      options = options || {};

      if (options === 'options') {
        if (!extra) {
          return this.first().data('ssOpts');
        }

        return this.each(function() {
          var $this = $(this);
          var opts = $.extend($this.data('ssOpts') || {}, extra);

          $(this).data('ssOpts', opts);
        });
      }

      var opts = $.extend({}, $.fn.smoothScroll.defaults, options);

      var clickHandler = function(event) {
        var escapeSelector = function(str) {
          return str.replace(/(:|\.|\/)/g, '\\$1');
        };

        var link = this;
        var $link = $(this);
        var thisOpts = $.extend({}, opts, $link.data('ssOpts') || {});
        var exclude = opts.exclude;
        var excludeWithin = thisOpts.excludeWithin;
        var elCounter = 0;
        var ewlCounter = 0;
        var include = true;
        var clickOpts = {};
        var locationPath = $.smoothScroll.filterPath(location.pathname);
        var linkPath = $.smoothScroll.filterPath(link.pathname);
        var hostMatch = location.hostname === link.hostname || !link.hostname;
        var pathMatch = thisOpts.scrollTarget || (linkPath === locationPath);
        var thisHash = escapeSelector(link.hash);

        if (thisHash && !$(thisHash).length) {
          include = false;
        }

        if (!thisOpts.scrollTarget && (!hostMatch || !pathMatch || !thisHash)) {
          include = false;
        } else {
          while (include && elCounter < exclude.length) {
            if ($link.is(escapeSelector(exclude[elCounter++]))) {
              include = false;
            }
          }

          while (include && ewlCounter < excludeWithin.length) {
            if ($link.closest(excludeWithin[ewlCounter++]).length) {
              include = false;
            }
          }
        }

        if (include) {
          if (thisOpts.preventDefault) {
            event.preventDefault();
          }

          $.extend(clickOpts, thisOpts, {
            scrollTarget: thisOpts.scrollTarget || thisHash,
            link: link
          });

          $.smoothScroll(clickOpts);
        }
      };

      if (options.delegateSelector !== null) {
        this
        .undelegate(options.delegateSelector, 'click.smoothscroll')
        .delegate(options.delegateSelector, 'click.smoothscroll', clickHandler);
      } else {
        this
        .unbind('click.smoothscroll')
        .bind('click.smoothscroll', clickHandler);
      }

      return this;
    }
  });

  $.smoothScroll = function(options, px) {
    if (options === 'options' && typeof px === 'object') {
      return $.extend(optionOverrides, px);
    }
    var opts, $scroller, scrollTargetOffset, speed, delta;
    var scrollerOffset = 0;
    var offPos = 'offset';
    var scrollDir = 'scrollTop';
    var aniProps = {};
    var aniOpts = {};

    if (typeof options === 'number') {
      opts = $.extend({link: null}, $.fn.smoothScroll.defaults, optionOverrides);
      scrollTargetOffset = options;
    } else {
      opts = $.extend({link: null}, $.fn.smoothScroll.defaults, options || {}, optionOverrides);

      if (opts.scrollElement) {
        offPos = 'position';

        if (opts.scrollElement.css('position') === 'static') {
          opts.scrollElement.css('position', 'relative');
        }
      }
    }

    scrollDir = opts.direction === 'left' ? 'scrollLeft' : scrollDir;

    if (opts.scrollElement) {
      $scroller = opts.scrollElement;

      if (!(/^(?:HTML|BODY)$/).test($scroller[0].nodeName)) {
        scrollerOffset = $scroller[scrollDir]();
      }
    } else {
      $scroller = $('html, body').firstScrollable(opts.direction);
    }

    // beforeScroll callback function must fire before calculating offset
    opts.beforeScroll.call($scroller, opts);

    scrollTargetOffset = (typeof options === 'number') ? options :
                          px ||
                          ($(opts.scrollTarget)[offPos]() &&
                          $(opts.scrollTarget)[offPos]()[opts.direction]) ||
                          0;

    aniProps[scrollDir] = scrollTargetOffset + scrollerOffset + opts.offset;
    speed = opts.speed;

    // automatically calculate the speed of the scroll based on distance / coefficient
    if (speed === 'auto') {

      // $scroller[scrollDir]() is position before scroll, aniProps[scrollDir] is position after
      // When delta is greater, speed will be greater.
      delta = Math.abs(aniProps[scrollDir] - $scroller[scrollDir]());

      // Divide the delta by the coefficient
      speed = delta / opts.autoCoefficient;
    }

    aniOpts = {
      duration: speed,
      easing: opts.easing,
      complete: function() {
        opts.afterScroll.call(opts.link, opts);
      }
    };

    if (opts.step) {
      aniOpts.step = opts.step;
    }

    if ($scroller.length) {
      $scroller.stop().animate(aniProps, aniOpts);
    } else {
      opts.afterScroll.call(opts.link, opts);
    }
  };

  $.smoothScroll.version = version;
  $.smoothScroll.filterPath = function(string) {
    string = string || '';

    return string
      .replace(/^\//, '')
      .replace(/(?:index|default).[a-zA-Z]{3,4}$/, '')
      .replace(/\/$/, '');
  };

  // default options
  $.fn.smoothScroll.defaults = defaults;

})(jQuery);
(function(a){if(typeof define==="function"&&define.amd&&define.amd.jQuery){define(["jquery"],a)}else{a(jQuery)}}(function(f){var p="left",o="right",e="up",x="down",c="in",z="out",m="none",s="auto",l="swipe",t="pinch",A="tap",j="doubletap",b="longtap",y="hold",D="horizontal",u="vertical",i="all",r=10,g="start",k="move",h="end",q="cancel",a="ontouchstart" in window,v=window.navigator.msPointerEnabled&&!window.navigator.pointerEnabled,d=window.navigator.pointerEnabled||window.navigator.msPointerEnabled,B="TouchSwipe";var n={fingers:1,threshold:75,cancelThreshold:null,pinchThreshold:20,maxTimeThreshold:null,fingerReleaseThreshold:250,longTapThreshold:500,doubleTapThreshold:200,swipe:null,swipeLeft:null,swipeRight:null,swipeUp:null,swipeDown:null,swipeStatus:null,pinchIn:null,pinchOut:null,pinchStatus:null,click:null,tap:null,doubleTap:null,longTap:null,hold:null,triggerOnTouchEnd:true,triggerOnTouchLeave:false,allowPageScroll:"auto",fallbackToMouseEvents:true,excludedElements:"label, button, input, select, textarea, a, .noSwipe",preventDefaultEvents:true};f.fn.swipe=function(G){var F=f(this),E=F.data(B);if(E&&typeof G==="string"){if(E[G]){return E[G].apply(this,Array.prototype.slice.call(arguments,1))}else{f.error("Method "+G+" does not exist on jQuery.swipe")}}else{if(!E&&(typeof G==="object"||!G)){return w.apply(this,arguments)}}return F};f.fn.swipe.defaults=n;f.fn.swipe.phases={PHASE_START:g,PHASE_MOVE:k,PHASE_END:h,PHASE_CANCEL:q};f.fn.swipe.directions={LEFT:p,RIGHT:o,UP:e,DOWN:x,IN:c,OUT:z};f.fn.swipe.pageScroll={NONE:m,HORIZONTAL:D,VERTICAL:u,AUTO:s};f.fn.swipe.fingers={ONE:1,TWO:2,THREE:3,ALL:i};function w(E){if(E&&(E.allowPageScroll===undefined&&(E.swipe!==undefined||E.swipeStatus!==undefined))){E.allowPageScroll=m}if(E.click!==undefined&&E.tap===undefined){E.tap=E.click}if(!E){E={}}E=f.extend({},f.fn.swipe.defaults,E);return this.each(function(){var G=f(this);var F=G.data(B);if(!F){F=new C(this,E);G.data(B,F)}})}function C(a4,av){var az=(a||d||!av.fallbackToMouseEvents),J=az?(d?(v?"MSPointerDown":"pointerdown"):"touchstart"):"mousedown",ay=az?(d?(v?"MSPointerMove":"pointermove"):"touchmove"):"mousemove",U=az?(d?(v?"MSPointerUp":"pointerup"):"touchend"):"mouseup",S=az?null:"mouseleave",aD=(d?(v?"MSPointerCancel":"pointercancel"):"touchcancel");var ag=0,aP=null,ab=0,a1=0,aZ=0,G=1,aq=0,aJ=0,M=null;var aR=f(a4);var Z="start";var W=0;var aQ=null;var T=0,a2=0,a5=0,ad=0,N=0;var aW=null,af=null;try{aR.bind(J,aN);aR.bind(aD,a9)}catch(ak){f.error("events not supported "+J+","+aD+" on jQuery.swipe")}this.enable=function(){aR.bind(J,aN);aR.bind(aD,a9);return aR};this.disable=function(){aK();return aR};this.destroy=function(){aK();aR.data(B,null);aR=null};this.option=function(bc,bb){if(av[bc]!==undefined){if(bb===undefined){return av[bc]}else{av[bc]=bb}}else{f.error("Option "+bc+" does not exist on jQuery.swipe.options")}return null};function aN(bd){if(aB()){return}if(f(bd.target).closest(av.excludedElements,aR).length>0){return}var be=bd.originalEvent?bd.originalEvent:bd;var bc,bb=a?be.touches[0]:be;Z=g;if(a){W=be.touches.length}else{bd.preventDefault()}ag=0;aP=null;aJ=null;ab=0;a1=0;aZ=0;G=1;aq=0;aQ=aj();M=aa();R();if(!a||(W===av.fingers||av.fingers===i)||aX()){ai(0,bb);T=at();if(W==2){ai(1,be.touches[1]);a1=aZ=au(aQ[0].start,aQ[1].start)}if(av.swipeStatus||av.pinchStatus){bc=O(be,Z)}}else{bc=false}if(bc===false){Z=q;O(be,Z);return bc}else{if(av.hold){af=setTimeout(f.proxy(function(){aR.trigger("hold",[be.target]);if(av.hold){bc=av.hold.call(aR,be,be.target)}},this),av.longTapThreshold)}ao(true)}return null}function a3(be){var bh=be.originalEvent?be.originalEvent:be;if(Z===h||Z===q||am()){return}var bd,bc=a?bh.touches[0]:bh;var bf=aH(bc);a2=at();if(a){W=bh.touches.length}if(av.hold){clearTimeout(af)}Z=k;if(W==2){if(a1==0){ai(1,bh.touches[1]);a1=aZ=au(aQ[0].start,aQ[1].start)}else{aH(bh.touches[1]);aZ=au(aQ[0].end,aQ[1].end);aJ=ar(aQ[0].end,aQ[1].end)}G=a7(a1,aZ);aq=Math.abs(a1-aZ)}if((W===av.fingers||av.fingers===i)||!a||aX()){aP=aL(bf.start,bf.end);al(be,aP);ag=aS(bf.start,bf.end);ab=aM();aI(aP,ag);if(av.swipeStatus||av.pinchStatus){bd=O(bh,Z)}if(!av.triggerOnTouchEnd||av.triggerOnTouchLeave){var bb=true;if(av.triggerOnTouchLeave){var bg=aY(this);bb=E(bf.end,bg)}if(!av.triggerOnTouchEnd&&bb){Z=aC(k)}else{if(av.triggerOnTouchLeave&&!bb){Z=aC(h)}}if(Z==q||Z==h){O(bh,Z)}}}else{Z=q;O(bh,Z)}if(bd===false){Z=q;O(bh,Z)}}function L(bb){var bc=bb.originalEvent;if(a){if(bc.touches.length>0){F();return true}}if(am()){W=ad}a2=at();ab=aM();if(ba()||!an()){Z=q;O(bc,Z)}else{if(av.triggerOnTouchEnd||(av.triggerOnTouchEnd==false&&Z===k)){bb.preventDefault();Z=h;O(bc,Z)}else{if(!av.triggerOnTouchEnd&&a6()){Z=h;aF(bc,Z,A)}else{if(Z===k){Z=q;O(bc,Z)}}}}ao(false);return null}function a9(){W=0;a2=0;T=0;a1=0;aZ=0;G=1;R();ao(false)}function K(bb){var bc=bb.originalEvent;if(av.triggerOnTouchLeave){Z=aC(h);O(bc,Z)}}function aK(){aR.unbind(J,aN);aR.unbind(aD,a9);aR.unbind(ay,a3);aR.unbind(U,L);if(S){aR.unbind(S,K)}ao(false)}function aC(bf){var be=bf;var bd=aA();var bc=an();var bb=ba();if(!bd||bb){be=q}else{if(bc&&bf==k&&(!av.triggerOnTouchEnd||av.triggerOnTouchLeave)){be=h}else{if(!bc&&bf==h&&av.triggerOnTouchLeave){be=q}}}return be}function O(bd,bb){var bc=undefined;if((I()||V())||(P()||aX())){if(I()||V()){bc=aF(bd,bb,l)}if((P()||aX())&&bc!==false){bc=aF(bd,bb,t)}}else{if(aG()&&bc!==false){bc=aF(bd,bb,j)}else{if(ap()&&bc!==false){bc=aF(bd,bb,b)}else{if(ah()&&bc!==false){bc=aF(bd,bb,A)}}}}if(bb===q){a9(bd)}if(bb===h){if(a){if(bd.touches.length==0){a9(bd)}}else{a9(bd)}}return bc}function aF(be,bb,bd){var bc=undefined;if(bd==l){aR.trigger("swipeStatus",[bb,aP||null,ag||0,ab||0,W,aQ]);if(av.swipeStatus){bc=av.swipeStatus.call(aR,be,bb,aP||null,ag||0,ab||0,W,aQ);if(bc===false){return false}}if(bb==h&&aV()){aR.trigger("swipe",[aP,ag,ab,W,aQ]);if(av.swipe){bc=av.swipe.call(aR,be,aP,ag,ab,W,aQ);if(bc===false){return false}}switch(aP){case p:aR.trigger("swipeLeft",[aP,ag,ab,W,aQ]);if(av.swipeLeft){bc=av.swipeLeft.call(aR,be,aP,ag,ab,W,aQ)}break;case o:aR.trigger("swipeRight",[aP,ag,ab,W,aQ]);if(av.swipeRight){bc=av.swipeRight.call(aR,be,aP,ag,ab,W,aQ)}break;case e:aR.trigger("swipeUp",[aP,ag,ab,W,aQ]);if(av.swipeUp){bc=av.swipeUp.call(aR,be,aP,ag,ab,W,aQ)}break;case x:aR.trigger("swipeDown",[aP,ag,ab,W,aQ]);if(av.swipeDown){bc=av.swipeDown.call(aR,be,aP,ag,ab,W,aQ)}break}}}if(bd==t){aR.trigger("pinchStatus",[bb,aJ||null,aq||0,ab||0,W,G,aQ]);if(av.pinchStatus){bc=av.pinchStatus.call(aR,be,bb,aJ||null,aq||0,ab||0,W,G,aQ);if(bc===false){return false}}if(bb==h&&a8()){switch(aJ){case c:aR.trigger("pinchIn",[aJ||null,aq||0,ab||0,W,G,aQ]);if(av.pinchIn){bc=av.pinchIn.call(aR,be,aJ||null,aq||0,ab||0,W,G,aQ)}break;case z:aR.trigger("pinchOut",[aJ||null,aq||0,ab||0,W,G,aQ]);if(av.pinchOut){bc=av.pinchOut.call(aR,be,aJ||null,aq||0,ab||0,W,G,aQ)}break}}}if(bd==A){if(bb===q||bb===h){clearTimeout(aW);clearTimeout(af);if(Y()&&!H()){N=at();aW=setTimeout(f.proxy(function(){N=null;aR.trigger("tap",[be.target]);if(av.tap){bc=av.tap.call(aR,be,be.target)}},this),av.doubleTapThreshold)}else{N=null;aR.trigger("tap",[be.target]);if(av.tap){bc=av.tap.call(aR,be,be.target)}}}}else{if(bd==j){if(bb===q||bb===h){clearTimeout(aW);N=null;aR.trigger("doubletap",[be.target]);if(av.doubleTap){bc=av.doubleTap.call(aR,be,be.target)}}}else{if(bd==b){if(bb===q||bb===h){clearTimeout(aW);N=null;aR.trigger("longtap",[be.target]);if(av.longTap){bc=av.longTap.call(aR,be,be.target)}}}}}return bc}function an(){var bb=true;if(av.threshold!==null){bb=ag>=av.threshold}return bb}function ba(){var bb=false;if(av.cancelThreshold!==null&&aP!==null){bb=(aT(aP)-ag)>=av.cancelThreshold}return bb}function ae(){if(av.pinchThreshold!==null){return aq>=av.pinchThreshold}return true}function aA(){var bb;if(av.maxTimeThreshold){if(ab>=av.maxTimeThreshold){bb=false}else{bb=true}}else{bb=true}return bb}function al(bb,bc){if(av.preventDefaultEvents===false){return}if(av.allowPageScroll===m){bb.preventDefault()}else{var bd=av.allowPageScroll===s;switch(bc){case p:if((av.swipeLeft&&bd)||(!bd&&av.allowPageScroll!=D)){bb.preventDefault()}break;case o:if((av.swipeRight&&bd)||(!bd&&av.allowPageScroll!=D)){bb.preventDefault()}break;case e:if((av.swipeUp&&bd)||(!bd&&av.allowPageScroll!=u)){bb.preventDefault()}break;case x:if((av.swipeDown&&bd)||(!bd&&av.allowPageScroll!=u)){bb.preventDefault()}break}}}function a8(){var bc=aO();var bb=X();var bd=ae();return bc&&bb&&bd}function aX(){return !!(av.pinchStatus||av.pinchIn||av.pinchOut)}function P(){return !!(a8()&&aX())}function aV(){var be=aA();var bg=an();var bd=aO();var bb=X();var bc=ba();var bf=!bc&&bb&&bd&&bg&&be;return bf}function V(){return !!(av.swipe||av.swipeStatus||av.swipeLeft||av.swipeRight||av.swipeUp||av.swipeDown)}function I(){return !!(aV()&&V())}function aO(){return((W===av.fingers||av.fingers===i)||!a)}function X(){return aQ[0].end.x!==0}function a6(){return !!(av.tap)}function Y(){return !!(av.doubleTap)}function aU(){return !!(av.longTap)}function Q(){if(N==null){return false}var bb=at();return(Y()&&((bb-N)<=av.doubleTapThreshold))}function H(){return Q()}function ax(){return((W===1||!a)&&(isNaN(ag)||ag<av.threshold))}function a0(){return((ab>av.longTapThreshold)&&(ag<r))}function ah(){return !!(ax()&&a6())}function aG(){return !!(Q()&&Y())}function ap(){return !!(a0()&&aU())}function F(){a5=at();ad=event.touches.length+1}function R(){a5=0;ad=0}function am(){var bb=false;if(a5){var bc=at()-a5;if(bc<=av.fingerReleaseThreshold){bb=true}}return bb}function aB(){return !!(aR.data(B+"_intouch")===true)}function ao(bb){if(bb===true){aR.bind(ay,a3);aR.bind(U,L);if(S){aR.bind(S,K)}}else{aR.unbind(ay,a3,false);aR.unbind(U,L,false);if(S){aR.unbind(S,K,false)}}aR.data(B+"_intouch",bb===true)}function ai(bc,bb){var bd=bb.identifier!==undefined?bb.identifier:0;aQ[bc].identifier=bd;aQ[bc].start.x=aQ[bc].end.x=bb.pageX||bb.clientX;aQ[bc].start.y=aQ[bc].end.y=bb.pageY||bb.clientY;return aQ[bc]}function aH(bb){var bd=bb.identifier!==undefined?bb.identifier:0;var bc=ac(bd);bc.end.x=bb.pageX||bb.clientX;bc.end.y=bb.pageY||bb.clientY;return bc}function ac(bc){for(var bb=0;bb<aQ.length;bb++){if(aQ[bb].identifier==bc){return aQ[bb]}}}function aj(){var bb=[];for(var bc=0;bc<=5;bc++){bb.push({start:{x:0,y:0},end:{x:0,y:0},identifier:0})}return bb}function aI(bb,bc){bc=Math.max(bc,aT(bb));M[bb].distance=bc}function aT(bb){if(M[bb]){return M[bb].distance}return undefined}function aa(){var bb={};bb[p]=aw(p);bb[o]=aw(o);bb[e]=aw(e);bb[x]=aw(x);return bb}function aw(bb){return{direction:bb,distance:0}}function aM(){return a2-T}function au(be,bd){var bc=Math.abs(be.x-bd.x);var bb=Math.abs(be.y-bd.y);return Math.round(Math.sqrt(bc*bc+bb*bb))}function a7(bb,bc){var bd=(bc/bb)*1;return bd.toFixed(2)}function ar(){if(G<1){return z}else{return c}}function aS(bc,bb){return Math.round(Math.sqrt(Math.pow(bb.x-bc.x,2)+Math.pow(bb.y-bc.y,2)))}function aE(be,bc){var bb=be.x-bc.x;var bg=bc.y-be.y;var bd=Math.atan2(bg,bb);var bf=Math.round(bd*180/Math.PI);if(bf<0){bf=360-Math.abs(bf)}return bf}function aL(bc,bb){var bd=aE(bc,bb);if((bd<=45)&&(bd>=0)){return p}else{if((bd<=360)&&(bd>=315)){return p}else{if((bd>=135)&&(bd<=225)){return o}else{if((bd>45)&&(bd<135)){return x}else{return e}}}}}function at(){var bb=new Date();return bb.getTime()}function aY(bb){bb=f(bb);var bd=bb.offset();var bc={left:bd.left,right:bd.left+bb.outerWidth(),top:bd.top,bottom:bd.top+bb.outerHeight()};return bc}function E(bb,bc){return(bb.x>bc.left&&bb.x<bc.right&&bb.y>bc.top&&bb.y<bc.bottom)}}}));

if (Modernizr) {
	// Apple devices & iOS
	Modernizr.addTest('ipad', function() {
		return !!navigator.userAgent.match(/iPad/i);
	});
	Modernizr.addTest('iphone', function() {
		return !!navigator.userAgent.match(/iPhone/i);
	});
	Modernizr.addTest('ipod', function() {
		return !!navigator.userAgent.match(/iPod/i);
	});
	Modernizr.addTest('ios', function() {
		return (Modernizr.ipad || Modernizr.ipod || Modernizr.iphone);
	});
	// IE10
	Modernizr.addTest('ie10', function() {
		var trident = !!navigator.userAgent.match(/Trident\/6.0/);
		var ie = !!navigator.userAgent.match(/MSIE 10/);
		return trident && ie;
	});
	// IE11
	Modernizr.addTest('ie11', function() {
		var trident = !!navigator.userAgent.match(/Trident\/7.0/);
		var net = !!navigator.userAgent.match(/.NET4.0C/ || /.NET4.0E/);
		return trident && net;
	});
	// Safari
	Modernizr.addTest('safari', function() {
		var safari = !!navigator.userAgent.match(/Safari\//);
		var chrome = !!navigator.userAgent.match(/Chrome\//);
		return safari && !chrome;
	});
	// Windows Phone
	Modernizr.addTest('windowsphone', function() {
		return !!navigator.userAgent.match(/(Windows Phone)/);
	});
	// Android OS
	Modernizr.addTest('android', function() {
		return !!navigator.userAgent.match(/(Android)/);
	});
	// Mac OS
	Modernizr.addTest('macos', function() {
		return !!navigator.userAgent.match(/(Mac OS)/);
	});
}

/*! picturefill - v3.0.2 - 2016-02-12
 * https://scottjehl.github.io/picturefill/
 * Copyright (c) 2016 https://github.com/scottjehl/picturefill/blob/master/Authors.txt; Licensed MIT
 */
!function(a){var b=navigator.userAgent;a.HTMLPictureElement&&/ecko/.test(b)&&b.match(/rv\:(\d+)/)&&RegExp.$1<45&&addEventListener("resize",function(){var b,c=document.createElement("source"),d=function(a){var b,d,e=a.parentNode;"PICTURE"===e.nodeName.toUpperCase()?(b=c.cloneNode(),e.insertBefore(b,e.firstElementChild),setTimeout(function(){e.removeChild(b)})):(!a._pfLastSize||a.offsetWidth>a._pfLastSize)&&(a._pfLastSize=a.offsetWidth,d=a.sizes,a.sizes+=",100vw",setTimeout(function(){a.sizes=d}))},e=function(){var a,b=document.querySelectorAll("picture > img, img[srcset][sizes]");for(a=0;a<b.length;a++)d(b[a])},f=function(){clearTimeout(b),b=setTimeout(e,99)},g=a.matchMedia&&matchMedia("(orientation: landscape)"),h=function(){f(),g&&g.addListener&&g.addListener(f)};return c.srcset="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",/^[c|i]|d$/.test(document.readyState||"")?h():document.addEventListener("DOMContentLoaded",h),f}())}(window),function(a,b,c){"use strict";function d(a){return" "===a||"	"===a||"\n"===a||"\f"===a||"\r"===a}function e(b,c){var d=new a.Image;return d.onerror=function(){A[b]=!1,ba()},d.onload=function(){A[b]=1===d.width,ba()},d.src=c,"pending"}function f(){M=!1,P=a.devicePixelRatio,N={},O={},s.DPR=P||1,Q.width=Math.max(a.innerWidth||0,z.clientWidth),Q.height=Math.max(a.innerHeight||0,z.clientHeight),Q.vw=Q.width/100,Q.vh=Q.height/100,r=[Q.height,Q.width,P].join("-"),Q.em=s.getEmValue(),Q.rem=Q.em}function g(a,b,c,d){var e,f,g,h;return"saveData"===B.algorithm?a>2.7?h=c+1:(f=b-c,e=Math.pow(a-.6,1.5),g=f*e,d&&(g+=.1*e),h=a+g):h=c>1?Math.sqrt(a*b):a,h>c}function h(a){var b,c=s.getSet(a),d=!1;"pending"!==c&&(d=r,c&&(b=s.setRes(c),s.applySetCandidate(b,a))),a[s.ns].evaled=d}function i(a,b){return a.res-b.res}function j(a,b,c){var d;return!c&&b&&(c=a[s.ns].sets,c=c&&c[c.length-1]),d=k(b,c),d&&(b=s.makeUrl(b),a[s.ns].curSrc=b,a[s.ns].curCan=d,d.res||aa(d,d.set.sizes)),d}function k(a,b){var c,d,e;if(a&&b)for(e=s.parseSet(b),a=s.makeUrl(a),c=0;c<e.length;c++)if(a===s.makeUrl(e[c].url)){d=e[c];break}return d}function l(a,b){var c,d,e,f,g=a.getElementsByTagName("source");for(c=0,d=g.length;d>c;c++)e=g[c],e[s.ns]=!0,f=e.getAttribute("srcset"),f&&b.push({srcset:f,media:e.getAttribute("media"),type:e.getAttribute("type"),sizes:e.getAttribute("sizes")})}function m(a,b){function c(b){var c,d=b.exec(a.substring(m));return d?(c=d[0],m+=c.length,c):void 0}function e(){var a,c,d,e,f,i,j,k,l,m=!1,o={};for(e=0;e<h.length;e++)f=h[e],i=f[f.length-1],j=f.substring(0,f.length-1),k=parseInt(j,10),l=parseFloat(j),X.test(j)&&"w"===i?((a||c)&&(m=!0),0===k?m=!0:a=k):Y.test(j)&&"x"===i?((a||c||d)&&(m=!0),0>l?m=!0:c=l):X.test(j)&&"h"===i?((d||c)&&(m=!0),0===k?m=!0:d=k):m=!0;m||(o.url=g,a&&(o.w=a),c&&(o.d=c),d&&(o.h=d),d||c||a||(o.d=1),1===o.d&&(b.has1x=!0),o.set=b,n.push(o))}function f(){for(c(T),i="",j="in descriptor";;){if(k=a.charAt(m),"in descriptor"===j)if(d(k))i&&(h.push(i),i="",j="after descriptor");else{if(","===k)return m+=1,i&&h.push(i),void e();if("("===k)i+=k,j="in parens";else{if(""===k)return i&&h.push(i),void e();i+=k}}else if("in parens"===j)if(")"===k)i+=k,j="in descriptor";else{if(""===k)return h.push(i),void e();i+=k}else if("after descriptor"===j)if(d(k));else{if(""===k)return void e();j="in descriptor",m-=1}m+=1}}for(var g,h,i,j,k,l=a.length,m=0,n=[];;){if(c(U),m>=l)return n;g=c(V),h=[],","===g.slice(-1)?(g=g.replace(W,""),e()):f()}}function n(a){function b(a){function b(){f&&(g.push(f),f="")}function c(){g[0]&&(h.push(g),g=[])}for(var e,f="",g=[],h=[],i=0,j=0,k=!1;;){if(e=a.charAt(j),""===e)return b(),c(),h;if(k){if("*"===e&&"/"===a[j+1]){k=!1,j+=2,b();continue}j+=1}else{if(d(e)){if(a.charAt(j-1)&&d(a.charAt(j-1))||!f){j+=1;continue}if(0===i){b(),j+=1;continue}e=" "}else if("("===e)i+=1;else if(")"===e)i-=1;else{if(","===e){b(),c(),j+=1;continue}if("/"===e&&"*"===a.charAt(j+1)){k=!0,j+=2;continue}}f+=e,j+=1}}}function c(a){return k.test(a)&&parseFloat(a)>=0?!0:l.test(a)?!0:"0"===a||"-0"===a||"+0"===a?!0:!1}var e,f,g,h,i,j,k=/^(?:[+-]?[0-9]+|[0-9]*\.[0-9]+)(?:[eE][+-]?[0-9]+)?(?:ch|cm|em|ex|in|mm|pc|pt|px|rem|vh|vmin|vmax|vw)$/i,l=/^calc\((?:[0-9a-z \.\+\-\*\/\(\)]+)\)$/i;for(f=b(a),g=f.length,e=0;g>e;e++)if(h=f[e],i=h[h.length-1],c(i)){if(j=i,h.pop(),0===h.length)return j;if(h=h.join(" "),s.matchesMedia(h))return j}return"100vw"}b.createElement("picture");var o,p,q,r,s={},t=!1,u=function(){},v=b.createElement("img"),w=v.getAttribute,x=v.setAttribute,y=v.removeAttribute,z=b.documentElement,A={},B={algorithm:""},C="data-pfsrc",D=C+"set",E=navigator.userAgent,F=/rident/.test(E)||/ecko/.test(E)&&E.match(/rv\:(\d+)/)&&RegExp.$1>35,G="currentSrc",H=/\s+\+?\d+(e\d+)?w/,I=/(\([^)]+\))?\s*(.+)/,J=a.picturefillCFG,K="position:absolute;left:0;visibility:hidden;display:block;padding:0;border:none;font-size:1em;width:1em;overflow:hidden;clip:rect(0px, 0px, 0px, 0px)",L="font-size:100%!important;",M=!0,N={},O={},P=a.devicePixelRatio,Q={px:1,"in":96},R=b.createElement("a"),S=!1,T=/^[ \t\n\r\u000c]+/,U=/^[, \t\n\r\u000c]+/,V=/^[^ \t\n\r\u000c]+/,W=/[,]+$/,X=/^\d+$/,Y=/^-?(?:[0-9]+|[0-9]*\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/,Z=function(a,b,c,d){a.addEventListener?a.addEventListener(b,c,d||!1):a.attachEvent&&a.attachEvent("on"+b,c)},$=function(a){var b={};return function(c){return c in b||(b[c]=a(c)),b[c]}},_=function(){var a=/^([\d\.]+)(em|vw|px)$/,b=function(){for(var a=arguments,b=0,c=a[0];++b in a;)c=c.replace(a[b],a[++b]);return c},c=$(function(a){return"return "+b((a||"").toLowerCase(),/\band\b/g,"&&",/,/g,"||",/min-([a-z-\s]+):/g,"e.$1>=",/max-([a-z-\s]+):/g,"e.$1<=",/calc([^)]+)/g,"($1)",/(\d+[\.]*[\d]*)([a-z]+)/g,"($1 * e.$2)",/^(?!(e.[a-z]|[0-9\.&=|><\+\-\*\(\)\/])).*/gi,"")+";"});return function(b,d){var e;if(!(b in N))if(N[b]=!1,d&&(e=b.match(a)))N[b]=e[1]*Q[e[2]];else try{N[b]=new Function("e",c(b))(Q)}catch(f){}return N[b]}}(),aa=function(a,b){return a.w?(a.cWidth=s.calcListLength(b||"100vw"),a.res=a.w/a.cWidth):a.res=a.d,a},ba=function(a){if(t){var c,d,e,f=a||{};if(f.elements&&1===f.elements.nodeType&&("IMG"===f.elements.nodeName.toUpperCase()?f.elements=[f.elements]:(f.context=f.elements,f.elements=null)),c=f.elements||s.qsa(f.context||b,f.reevaluate||f.reselect?s.sel:s.selShort),e=c.length){for(s.setupRun(f),S=!0,d=0;e>d;d++)s.fillImg(c[d],f);s.teardownRun(f)}}};o=a.console&&console.warn?function(a){console.warn(a)}:u,G in v||(G="src"),A["image/jpeg"]=!0,A["image/gif"]=!0,A["image/png"]=!0,A["image/svg+xml"]=b.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#Image","1.1"),s.ns=("pf"+(new Date).getTime()).substr(0,9),s.supSrcset="srcset"in v,s.supSizes="sizes"in v,s.supPicture=!!a.HTMLPictureElement,s.supSrcset&&s.supPicture&&!s.supSizes&&!function(a){v.srcset="data:,a",a.src="data:,a",s.supSrcset=v.complete===a.complete,s.supPicture=s.supSrcset&&s.supPicture}(b.createElement("img")),s.supSrcset&&!s.supSizes?!function(){var a="data:image/gif;base64,R0lGODlhAgABAPAAAP///wAAACH5BAAAAAAALAAAAAACAAEAAAICBAoAOw==",c="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",d=b.createElement("img"),e=function(){var a=d.width;2===a&&(s.supSizes=!0),q=s.supSrcset&&!s.supSizes,t=!0,setTimeout(ba)};d.onload=e,d.onerror=e,d.setAttribute("sizes","9px"),d.srcset=c+" 1w,"+a+" 9w",d.src=c}():t=!0,s.selShort="picture>img,img[srcset]",s.sel=s.selShort,s.cfg=B,s.DPR=P||1,s.u=Q,s.types=A,s.setSize=u,s.makeUrl=$(function(a){return R.href=a,R.href}),s.qsa=function(a,b){return"querySelector"in a?a.querySelectorAll(b):[]},s.matchesMedia=function(){return a.matchMedia&&(matchMedia("(min-width: 0.1em)")||{}).matches?s.matchesMedia=function(a){return!a||matchMedia(a).matches}:s.matchesMedia=s.mMQ,s.matchesMedia.apply(this,arguments)},s.mMQ=function(a){return a?_(a):!0},s.calcLength=function(a){var b=_(a,!0)||!1;return 0>b&&(b=!1),b},s.supportsType=function(a){return a?A[a]:!0},s.parseSize=$(function(a){var b=(a||"").match(I);return{media:b&&b[1],length:b&&b[2]}}),s.parseSet=function(a){return a.cands||(a.cands=m(a.srcset,a)),a.cands},s.getEmValue=function(){var a;if(!p&&(a=b.body)){var c=b.createElement("div"),d=z.style.cssText,e=a.style.cssText;c.style.cssText=K,z.style.cssText=L,a.style.cssText=L,a.appendChild(c),p=c.offsetWidth,a.removeChild(c),p=parseFloat(p,10),z.style.cssText=d,a.style.cssText=e}return p||16},s.calcListLength=function(a){if(!(a in O)||B.uT){var b=s.calcLength(n(a));O[a]=b?b:Q.width}return O[a]},s.setRes=function(a){var b;if(a){b=s.parseSet(a);for(var c=0,d=b.length;d>c;c++)aa(b[c],a.sizes)}return b},s.setRes.res=aa,s.applySetCandidate=function(a,b){if(a.length){var c,d,e,f,h,k,l,m,n,o=b[s.ns],p=s.DPR;if(k=o.curSrc||b[G],l=o.curCan||j(b,k,a[0].set),l&&l.set===a[0].set&&(n=F&&!b.complete&&l.res-.1>p,n||(l.cached=!0,l.res>=p&&(h=l))),!h)for(a.sort(i),f=a.length,h=a[f-1],d=0;f>d;d++)if(c=a[d],c.res>=p){e=d-1,h=a[e]&&(n||k!==s.makeUrl(c.url))&&g(a[e].res,c.res,p,a[e].cached)?a[e]:c;break}h&&(m=s.makeUrl(h.url),o.curSrc=m,o.curCan=h,m!==k&&s.setSrc(b,h),s.setSize(b))}},s.setSrc=function(a,b){var c;a.src=b.url,"image/svg+xml"===b.set.type&&(c=a.style.width,a.style.width=a.offsetWidth+1+"px",a.offsetWidth+1&&(a.style.width=c))},s.getSet=function(a){var b,c,d,e=!1,f=a[s.ns].sets;for(b=0;b<f.length&&!e;b++)if(c=f[b],c.srcset&&s.matchesMedia(c.media)&&(d=s.supportsType(c.type))){"pending"===d&&(c=d),e=c;break}return e},s.parseSets=function(a,b,d){var e,f,g,h,i=b&&"PICTURE"===b.nodeName.toUpperCase(),j=a[s.ns];(j.src===c||d.src)&&(j.src=w.call(a,"src"),j.src?x.call(a,C,j.src):y.call(a,C)),(j.srcset===c||d.srcset||!s.supSrcset||a.srcset)&&(e=w.call(a,"srcset"),j.srcset=e,h=!0),j.sets=[],i&&(j.pic=!0,l(b,j.sets)),j.srcset?(f={srcset:j.srcset,sizes:w.call(a,"sizes")},j.sets.push(f),g=(q||j.src)&&H.test(j.srcset||""),g||!j.src||k(j.src,f)||f.has1x||(f.srcset+=", "+j.src,f.cands.push({url:j.src,d:1,set:f}))):j.src&&j.sets.push({srcset:j.src,sizes:null}),j.curCan=null,j.curSrc=c,j.supported=!(i||f&&!s.supSrcset||g&&!s.supSizes),h&&s.supSrcset&&!j.supported&&(e?(x.call(a,D,e),a.srcset=""):y.call(a,D)),j.supported&&!j.srcset&&(!j.src&&a.src||a.src!==s.makeUrl(j.src))&&(null===j.src?a.removeAttribute("src"):a.src=j.src),j.parsed=!0},s.fillImg=function(a,b){var c,d=b.reselect||b.reevaluate;a[s.ns]||(a[s.ns]={}),c=a[s.ns],(d||c.evaled!==r)&&((!c.parsed||b.reevaluate)&&s.parseSets(a,a.parentNode,b),c.supported?c.evaled=r:h(a))},s.setupRun=function(){(!S||M||P!==a.devicePixelRatio)&&f()},s.supPicture?(ba=u,s.fillImg=u):!function(){var c,d=a.attachEvent?/d$|^c/:/d$|^c|^i/,e=function(){var a=b.readyState||"";f=setTimeout(e,"loading"===a?200:999),b.body&&(s.fillImgs(),c=c||d.test(a),c&&clearTimeout(f))},f=setTimeout(e,b.body?9:99),g=function(a,b){var c,d,e=function(){var f=new Date-d;b>f?c=setTimeout(e,b-f):(c=null,a())};return function(){d=new Date,c||(c=setTimeout(e,b))}},h=z.clientHeight,i=function(){M=Math.max(a.innerWidth||0,z.clientWidth)!==Q.width||z.clientHeight!==h,h=z.clientHeight,M&&s.fillImgs()};Z(a,"resize",g(i,99)),Z(b,"readystatechange",e)}(),s.picturefill=ba,s.fillImgs=ba,s.teardownRun=u,ba._=s,a.picturefillCFG={pf:s,push:function(a){var b=a.shift();"function"==typeof s[b]?s[b].apply(s,a):(B[b]=a[0],S&&s.fillImgs({reselect:!0}))}};for(;J&&J.length;)a.picturefillCFG.push(J.shift());a.picturefill=ba,"object"==typeof module&&"object"==typeof module.exports?module.exports=ba:"function"==typeof define&&define.amd&&define("picturefill",function(){return ba}),s.supPicture||(A["image/webp"]=e("image/webp","data:image/webp;base64,UklGRkoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAwAAAABBxAR/Q9ERP8DAABWUDggGAAAADABAJ0BKgEAAQADADQlpAADcAD++/1QAA=="))}(window,document);
/*
 * The MIT License
 *
 * Copyright (c) 2012 James Allardice
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

// Defines the global Placeholders object along with various utility methods
(function (global) {

    "use strict";

    // Cross-browser DOM event binding
    function addEventListener(elem, event, fn) {
        if (elem.addEventListener) {
            return elem.addEventListener(event, fn, false);
        }
        if (elem.attachEvent) {
            return elem.attachEvent("on" + event, fn);
        }
    }

    // Check whether an item is in an array (we don't use Array.prototype.indexOf so we don't clobber any existing polyfills - this is a really simple alternative)
    function inArray(arr, item) {
        var i, len;
        for (i = 0, len = arr.length; i < len; i++) {
            if (arr[i] === item) {
                return true;
            }
        }
        return false;
    }

    // Move the caret to the index position specified. Assumes that the element has focus
    function moveCaret(elem, index) {
        var range;
        if (elem.createTextRange) {
            range = elem.createTextRange();
            range.move("character", index);
            range.select();
        } else if (elem.selectionStart) {
            elem.focus();
            elem.setSelectionRange(index, index);
        }
    }

    // Attempt to change the type property of an input element
    function changeType(elem, type) {
        try {
            elem.type = type;
            return true;
        } catch (e) {
            // You can't change input type in IE8 and below
            return false;
        }
    }

    // Expose public methods
    global.Placeholders = {
        Utils: {
            addEventListener: addEventListener,
            inArray: inArray,
            moveCaret: moveCaret,
            changeType: changeType
        }
    };

}(this));

(function (global) {

    "use strict";

    var validTypes = [
            "text",
            "search",
            "url",
            "tel",
            "email",
            "password",
            "number",
            "textarea"
        ],

        // The list of keycodes that are not allowed when the polyfill is configured to hide-on-input
        badKeys = [

            // The following keys all cause the caret to jump to the end of the input value
            27, // Escape
            33, // Page up
            34, // Page down
            35, // End
            36, // Home

            // Arrow keys allow you to move the caret manually, which should be prevented when the placeholder is visible
            37, // Left
            38, // Up
            39, // Right
            40, // Down

            // The following keys allow you to modify the placeholder text by removing characters, which should be prevented when the placeholder is visible
            8, // Backspace
            46 // Delete
        ],

        // Styling variables
        placeholderStyleColor = "#ccc",
        placeholderClassName = "placeholdersjs",
        classNameRegExp = new RegExp("(?:^|\\s)" + placeholderClassName + "(?!\\S)"),

        // These will hold references to all elements that can be affected. NodeList objects are live, so we only need to get those references once
        inputs, textareas,

        // The various data-* attributes used by the polyfill
        ATTR_CURRENT_VAL = "data-placeholder-value",
        ATTR_ACTIVE = "data-placeholder-active",
        ATTR_INPUT_TYPE = "data-placeholder-type",
        ATTR_FORM_HANDLED = "data-placeholder-submit",
        ATTR_EVENTS_BOUND = "data-placeholder-bound",
        ATTR_OPTION_FOCUS = "data-placeholder-focus",
        ATTR_OPTION_LIVE = "data-placeholder-live",
        ATTR_MAXLENGTH = "data-placeholder-maxlength",

        // Various other variables used throughout the rest of the script
        test = document.createElement("input"),
        head = document.getElementsByTagName("head")[0],
        root = document.documentElement,
        Placeholders = global.Placeholders,
        Utils = Placeholders.Utils,
        hideOnInput, liveUpdates, keydownVal, styleElem, styleRules, placeholder, timer, form, elem, len, i;

    // No-op (used in place of public methods when native support is detected)
    function noop() {}

    // Avoid IE9 activeElement of death when an iframe is used.
    // More info:
    // http://bugs.jquery.com/ticket/13393
    // https://github.com/jquery/jquery/commit/85fc5878b3c6af73f42d61eedf73013e7faae408
    function safeActiveElement() {
        try {
            return document.activeElement;
        } catch (err) {}
    }

    // Hide the placeholder value on a single element. Returns true if the placeholder was hidden and false if it was not (because it wasn't visible in the first place)
    function hidePlaceholder(elem, keydownValue) {
        var type,
            maxLength,
            valueChanged = (!!keydownValue && elem.value !== keydownValue),
            isPlaceholderValue = (elem.value === elem.getAttribute(ATTR_CURRENT_VAL));

        if ((valueChanged || isPlaceholderValue) && elem.getAttribute(ATTR_ACTIVE) === "true") {
            elem.removeAttribute(ATTR_ACTIVE);
            elem.value = elem.value.replace(elem.getAttribute(ATTR_CURRENT_VAL), "");
            elem.className = elem.className.replace(classNameRegExp, "");

            // Restore the maxlength value
            maxLength = elem.getAttribute(ATTR_MAXLENGTH);
            if (parseInt(maxLength, 10) >= 0) { // Old FF returns -1 if attribute not set (see GH-56)
                elem.setAttribute("maxLength", maxLength);
                elem.removeAttribute(ATTR_MAXLENGTH);
            }

            // If the polyfill has changed the type of the element we need to change it back
            type = elem.getAttribute(ATTR_INPUT_TYPE);
            if (type) {
                elem.type = type;
            }
            return true;
        }
        return false;
    }

    // Show the placeholder value on a single element. Returns true if the placeholder was shown and false if it was not (because it was already visible)
    function showPlaceholder(elem) {
        var type,
            maxLength,
            val = elem.getAttribute(ATTR_CURRENT_VAL);
        if (elem.value === "" && val) {
            elem.setAttribute(ATTR_ACTIVE, "true");
            elem.value = val;
            elem.className += " " + placeholderClassName;

            // Store and remove the maxlength value
            maxLength = elem.getAttribute(ATTR_MAXLENGTH);
            if (!maxLength) {
                elem.setAttribute(ATTR_MAXLENGTH, elem.maxLength);
                elem.removeAttribute("maxLength");
            }

            // If the type of element needs to change, change it (e.g. password inputs)
            type = elem.getAttribute(ATTR_INPUT_TYPE);
            if (type) {
                elem.type = "text";
            } else if (elem.type === "password") {
                if (Utils.changeType(elem, "text")) {
                    elem.setAttribute(ATTR_INPUT_TYPE, "password");
                }
            }
            return true;
        }
        return false;
    }

    function handleElem(node, callback) {

        var handleInputsLength, handleTextareasLength, handleInputs, handleTextareas, elem, len, i;

        // Check if the passed in node is an input/textarea (in which case it can't have any affected descendants)
        if (node && node.getAttribute(ATTR_CURRENT_VAL)) {
            callback(node);
        } else {

            // If an element was passed in, get all affected descendants. Otherwise, get all affected elements in document
            handleInputs = node ? node.getElementsByTagName("input") : inputs;
            handleTextareas = node ? node.getElementsByTagName("textarea") : textareas;

            handleInputsLength = handleInputs ? handleInputs.length : 0;
            handleTextareasLength = handleTextareas ? handleTextareas.length : 0;

            // Run the callback for each element
            for (i = 0, len = handleInputsLength + handleTextareasLength; i < len; i++) {
                elem = i < handleInputsLength ? handleInputs[i] : handleTextareas[i - handleInputsLength];
                callback(elem);
            }
        }
    }

    // Return all affected elements to their normal state (remove placeholder value if present)
    function disablePlaceholders(node) {
        handleElem(node, hidePlaceholder);
    }

    // Show the placeholder value on all appropriate elements
    function enablePlaceholders(node) {
        handleElem(node, showPlaceholder);
    }

    // Returns a function that is used as a focus event handler
    function makeFocusHandler(elem) {
        return function () {

            // Only hide the placeholder value if the (default) hide-on-focus behaviour is enabled
            if (hideOnInput && elem.value === elem.getAttribute(ATTR_CURRENT_VAL) && elem.getAttribute(ATTR_ACTIVE) === "true") {

                // Move the caret to the start of the input (this mimics the behaviour of all browsers that do not hide the placeholder on focus)
                Utils.moveCaret(elem, 0);

            } else {

                // Remove the placeholder
                hidePlaceholder(elem);
            }
        };
    }

    // Returns a function that is used as a blur event handler
    function makeBlurHandler(elem) {
        return function () {
            showPlaceholder(elem);
        };
    }

    // Functions that are used as a event handlers when the hide-on-input behaviour has been activated - very basic implementation of the "input" event
    function makeKeydownHandler(elem) {
        return function (e) {
            keydownVal = elem.value;

            //Prevent the use of the arrow keys (try to keep the cursor before the placeholder)
            if (elem.getAttribute(ATTR_ACTIVE) === "true") {
                if (keydownVal === elem.getAttribute(ATTR_CURRENT_VAL) && Utils.inArray(badKeys, e.keyCode)) {
                    if (e.preventDefault) {
                        e.preventDefault();
                    }
                    return false;
                }
            }
        };
    }
    function makeKeyupHandler(elem) {
        return function () {
            hidePlaceholder(elem, keydownVal);

            // If the element is now empty we need to show the placeholder
            if (elem.value === "") {
                elem.blur();
                Utils.moveCaret(elem, 0);
            }
        };
    }
    function makeClickHandler(elem) {
        return function () {
            if (elem === safeActiveElement() && elem.value === elem.getAttribute(ATTR_CURRENT_VAL) && elem.getAttribute(ATTR_ACTIVE) === "true") {
                Utils.moveCaret(elem, 0);
            }
        };
    }

    // Returns a function that is used as a submit event handler on form elements that have children affected by this polyfill
    function makeSubmitHandler(form) {
        return function () {

            // Turn off placeholders on all appropriate descendant elements
            disablePlaceholders(form);
        };
    }

    // Bind event handlers to an element that we need to affect with the polyfill
    function newElement(elem) {

        // If the element is part of a form, make sure the placeholder string is not submitted as a value
        if (elem.form) {
            form = elem.form;

            // If the type of the property is a string then we have a "form" attribute and need to get the real form
            if (typeof form === "string") {
                form = document.getElementById(form);
            }

            // Set a flag on the form so we know it's been handled (forms can contain multiple inputs)
            if (!form.getAttribute(ATTR_FORM_HANDLED)) {
                Utils.addEventListener(form, "submit", makeSubmitHandler(form));
                form.setAttribute(ATTR_FORM_HANDLED, "true");
            }
        }

        // Bind event handlers to the element so we can hide/show the placeholder as appropriate
        Utils.addEventListener(elem, "focus", makeFocusHandler(elem));
        Utils.addEventListener(elem, "blur", makeBlurHandler(elem));

        // If the placeholder should hide on input rather than on focus we need additional event handlers
        if (hideOnInput) {
            Utils.addEventListener(elem, "keydown", makeKeydownHandler(elem));
            Utils.addEventListener(elem, "keyup", makeKeyupHandler(elem));
            Utils.addEventListener(elem, "click", makeClickHandler(elem));
        }

        // Remember that we've bound event handlers to this element
        elem.setAttribute(ATTR_EVENTS_BOUND, "true");
        elem.setAttribute(ATTR_CURRENT_VAL, placeholder);

        // If the element doesn't have a value and is not focussed, set it to the placeholder string
        if (hideOnInput || elem !== safeActiveElement()) {
            showPlaceholder(elem);
        }
    }

    Placeholders.nativeSupport = test.placeholder !== void 0;

    if (!Placeholders.nativeSupport) {

        // Get references to all the input and textarea elements currently in the DOM (live NodeList objects to we only need to do this once)
        inputs = document.getElementsByTagName("input");
        textareas = document.getElementsByTagName("textarea");

        // Get any settings declared as data-* attributes on the root element (currently the only options are whether to hide the placeholder on focus or input and whether to auto-update)
        hideOnInput = root.getAttribute(ATTR_OPTION_FOCUS) === "false";
        liveUpdates = root.getAttribute(ATTR_OPTION_LIVE) !== "false";

        // Create style element for placeholder styles (instead of directly setting style properties on elements - allows for better flexibility alongside user-defined styles)
        styleElem = document.createElement("style");
        styleElem.type = "text/css";

        // Create style rules as text node
        styleRules = document.createTextNode("." + placeholderClassName + " { color:" + placeholderStyleColor + "; }");

        // Append style rules to newly created stylesheet
        if (styleElem.styleSheet) {
            styleElem.styleSheet.cssText = styleRules.nodeValue;
        } else {
            styleElem.appendChild(styleRules);
        }

        // Prepend new style element to the head (before any existing stylesheets, so user-defined rules take precedence)
        head.insertBefore(styleElem, head.firstChild);

        // Set up the placeholders
        for (i = 0, len = inputs.length + textareas.length; i < len; i++) {
            elem = i < inputs.length ? inputs[i] : textareas[i - inputs.length];

            // Get the value of the placeholder attribute, if any. IE10 emulating IE7 fails with getAttribute, hence the use of the attributes node
            placeholder = elem.attributes.placeholder;
            if (placeholder) {

                // IE returns an empty object instead of undefined if the attribute is not present
                placeholder = placeholder.nodeValue;

                // Only apply the polyfill if this element is of a type that supports placeholders, and has a placeholder attribute with a non-empty value
                if (placeholder && Utils.inArray(validTypes, elem.type)) {
                    newElement(elem);
                }
            }
        }

        // If enabled, the polyfill will repeatedly check for changed/added elements and apply to those as well
        timer = setInterval(function () {
            for (i = 0, len = inputs.length + textareas.length; i < len; i++) {
                elem = i < inputs.length ? inputs[i] : textareas[i - inputs.length];

                // Only apply the polyfill if this element is of a type that supports placeholders, and has a placeholder attribute with a non-empty value
                placeholder = elem.attributes.placeholder;
                if (placeholder) {
                    placeholder = placeholder.nodeValue;
                    if (placeholder && Utils.inArray(validTypes, elem.type)) {

                        // If the element hasn't had event handlers bound to it then add them
                        if (!elem.getAttribute(ATTR_EVENTS_BOUND)) {
                            newElement(elem);
                        }

                        // If the placeholder value has changed or not been initialised yet we need to update the display
                        if (placeholder !== elem.getAttribute(ATTR_CURRENT_VAL) || (elem.type === "password" && !elem.getAttribute(ATTR_INPUT_TYPE))) {

                            // Attempt to change the type of password inputs (fails in IE < 9)
                            if (elem.type === "password" && !elem.getAttribute(ATTR_INPUT_TYPE) && Utils.changeType(elem, "text")) {
                                elem.setAttribute(ATTR_INPUT_TYPE, "password");
                            }

                            // If the placeholder value has changed and the placeholder is currently on display we need to change it
                            if (elem.value === elem.getAttribute(ATTR_CURRENT_VAL)) {
                                elem.value = placeholder;
                            }

                            // Keep a reference to the current placeholder value in case it changes via another script
                            elem.setAttribute(ATTR_CURRENT_VAL, placeholder);
                        }
                    }
                } else if (elem.getAttribute(ATTR_ACTIVE)) {
                    hidePlaceholder(elem);
                    elem.removeAttribute(ATTR_CURRENT_VAL);
                }
            }

            // If live updates are not enabled cancel the timer
            if (!liveUpdates) {
                clearInterval(timer);
            }
        }, 100);
    }

    Utils.addEventListener(global, "beforeunload", function () {
        Placeholders.disable();
    });

    // Expose public methods
    Placeholders.disable = Placeholders.nativeSupport ? noop : disablePlaceholders;
    Placeholders.enable = Placeholders.nativeSupport ? noop : enablePlaceholders;

}(this));

(function ($) {

    "use strict";

    var originalValFn = $.fn.val,
        originalPropFn = $.fn.prop;

    if (!Placeholders.nativeSupport) {

        $.fn.val = function (val) {
            var originalValue = originalValFn.apply(this, arguments),
                placeholder = this.eq(0).data("placeholder-value");
            if (val === undefined && this.eq(0).data("placeholder-active") && originalValue === placeholder) {
                return "";
            }
            return originalValue;
        };

        $.fn.prop = function (name, val) {
            if (val === undefined && this.eq(0).data("placeholder-active") && name === "value") {
                return "";
            }
            return originalPropFn.apply(this, arguments);
        };
    }

}(jQuery));
function iosVersion(version) {
	if (!version) {
		return;
	}
	var userOs = null;
	var userOsVersion = null;
	var ua = navigator.userAgent;
	var uaindex;
	// determine OS
	if (ua.match(/iPad/i) || ua.match(/iPhone/i)) {
		userOs = 'iOS';
		uaindex = ua.indexOf('OS ');
		userOsVersion = parseInt(ua.substr(uaindex + 3, 3).toString().slice(0, 1), 10);
	}
	if (userOsVersion === version) {
		return true;
	} else {
		return false;
	}
}

function androidVersion(version) {
	var ua = navigator.userAgent;
	if (ua.indexOf("Android") >= 0) {
		var androidversion = parseFloat(ua.slice(ua.indexOf("Android") + 8));
		if (androidversion === version) {
			return true;
		} else {
			return false;
		}
	}
}

if (Modernizr) {

	// Apple devices
	Modernizr.addTest('ipad', function() {
		return !!navigator.userAgent.match(/iPad/i);
	});
	Modernizr.addTest('iphone', function() {
		return !!navigator.userAgent.match(/iPhone/i);
	});
	Modernizr.addTest('ipod', function() {
		return !!navigator.userAgent.match(/iPod/i);
	});
	// IOS
	Modernizr.addTest('ios', function() {
		return (Modernizr.ipad || Modernizr.ipod || Modernizr.iphone);
	});
	Modernizr.addTest('ios6', function() {
		return iosVersion(6) ? true : false;
	});
	// IOS7
	Modernizr.addTest('ios7', function() {
		return iosVersion(7) ? true : false;
	});
	// IOS8
	Modernizr.addTest('ios8', function() {
		return iosVersion(8) ? true : false;
	});
	// IOS9
	Modernizr.addTest('ios9', function() {
		return iosVersion(9) ? true : false;
	});
	// Windows Phone
	Modernizr.addTest('windowsphone', function() {
		return !!navigator.userAgent.match(/(Windows Phone)/);
	});
	// Android OS
	Modernizr.addTest('android', function() {
		return !!navigator.userAgent.match(/(Android)/);
	});
	// Android OS 4.2
	Modernizr.addTest('android_4_2', function() {
		return androidVersion(4.2) ? true : false;
	});
	// Mac OS
	Modernizr.addTest('macos', function() {
		return !!navigator.userAgent.match(/(Mac OS)/);
	});
	// Mac OS
	Modernizr.addTest('macos', function() {
		return !!navigator.userAgent.match(/(Mac OS)/);
	});
	Modernizr.addTest('mobile', function() {
		return !!navigator.userAgent.match(/Android|BlackBerry|iPhone|Opera Mini|IEMobile/i);
	});
	// IE10
	Modernizr.addTest('ie10', function() {
		return !!navigator.userAgent.match(/MSIE 10/);
	});
	// IE11
	Modernizr.addTest('ie11', function() {
		var trident = !!navigator.userAgent.match(/Trident\/7.0/);
		var net = !!navigator.userAgent.match(/.NET4.0E/);
		return trident && net;
	});
	Modernizr.addTest('firefox', function() {
		return !!navigator.userAgent.match(/firefox/i);
	});
	// Safari
	Modernizr.addTest('safari', function() {
		return !!navigator.userAgent.match(/Safari/);
	});

	Modernizr.addTest('objectfit', Modernizr.testAllProps('maskRepeat'));

	Modernizr.addTest('videoautoplay', function() {
		// @todo need better test for this, we want to test for video autoplay not just OS']
		// @todo There is a new test for this in Modernizr v3 - we will either upgrade to v3 or steal the specific test.
		return (!Modernizr.ios && !Modernizr.android && !Modernizr.windowsphone);
	});
}

/**
 * @file bbActionMenu
 * @author {@link http://building-blocks.com Building Blocks}
 */
var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		bbActionMenu: function() {
			var self = this,
				$demoActions = $('.demo-actions'),
				menuIn = false,
				delayA = null,
				delayB = null,
				wait = false;

			if (!$demoActions.length) {
				return;
			}

			$('.action-demo-actions').on('click.bbActionMenu', function(event) {
				event.preventDefault();

				if (wait) {
					return;
				}

				wait = true;

				if (menuIn) {
					bb.settings.$html.removeClass('demo-actions-show');

					delayA = setTimeout(function() {
						bb.settings.$html.removeClass('demo-actions-out');
						menuIn = false;
						wait = false;
						clearTimeout(delayA);
					}, 250);

				} else {
					bb.settings.$html.addClass('demo-actions-out');

					delayB = setTimeout(function() {
						bb.settings.$html.addClass('demo-actions-show');
						menuIn = true;
						wait = false;
						clearTimeout(delayB);
					}, 250);
				}
			});
		}
	});
	$.subscribe('pageReady', function() {
		bb.bbActionMenu();
	});
}(jQuery));
/**
 * @file bbPageNav
 * @author {@link http://building-blocks.com Building Blocks}
 */
var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		bbPageNav: function() {
			var self = this,
				$pageNav = $('.bb-page-nav'),
				navOpen = false;

			if (!$pageNav.length) {
				return;
			}

			// create open nav btn
			var $btn = $('<button />', {
				'type': 'button',
				'class': 'action-bb-page-nav bb-page-nav-btn btn btn-small'
			}).text('view pages');
			var $demoActions = $('.demo-actions');
			if ($demoActions && $demoActions.length > 0) {
				$demoActions.append($btn);
			}

			// open nav on btn click
			$btn.on('click.bbPageNav', function(event) {
				bb.settings.$html.toggleClass('bb-page-nav-show');

				if (navOpen) {
					navOpen = false;
				} else {
					navOpen = true;
				}
			});

			// close nav on close button click
			$('.action-bb-page-nav-close').on('click.bbPageNav', function(event) {
				event.preventDefault();
				bb.settings.$html.removeClass('bb-page-nav-show');
				navOpen = false;
			});

			// close nav on body click
			bb.settings.$htmlbody.on('click.bbPageNav', function(event) {
				var $clickElement = $(event.target),
					$actionBtn = $clickElement.closest('.action-bb-page-nav'),
					$pageNav = $clickElement.closest('.bb-page-nav');

				if (($actionBtn && $actionBtn.length > 0) || ($pageNav && $pageNav.length > 0)) {
					return;
				}

				if (navOpen) {
					bb.settings.$html.removeClass('bb-page-nav-show');
					navOpen = false;
				} else {
					return;
				}
			});
		}
	});
	$.subscribe('pageReady', function() {
		bb.bbPageNav();
	});
}(jQuery));

/**
 * @file Events
 * @author {@link http://building-blocks.com Building Blocks}
 */
var bb = bb ? bb : {};
(function($) {
	/**
	 * Publish events using Pub/Sub
	 * @namespace events
	 * @see {@link https://github.com/cowboy/jquery-tiny-pubsub}
	 */
	$.extend(bb, {
		/**
		 * Publish event when the page is ready.
		 * @function pageReady
		 */
		pageReady: function() {
			var self = this;

			$.publish('pageReady_prioritize', self);
			$.publish('pageReady', self);

			self.pageLoaded();
		},
		/**
		 * Publish event when the page has loaded.
		 * @function pageLoaded
		 */
		pageLoaded: function() {
			var self = this;

			self.settings.$window.on('load', function() {

				$.publish('pageLoaded', self);
			});
		},
		/**
		 * Publish event when an AJAX request has finished.
		 * @function ajaxLoaded
		 */
		ajaxLoaded: function() {
			var self = this;

			$.publish('ajaxLoaded', self);
		}
	});
}(jQuery));

/**
 * @file Language
 * @author {@link http://building-blocks.com Building Blocks}
 */
var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		language: {}
	});
}(jQuery));

/**
 * @file Last Block
 * @author {@link http://building-blocks.com Building Blocks}
 */
var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		/**
		 * Last block in a row.
		 * @namespace lastBlock
		 */
		lastBlock: {
			// jQuery DOM objs
			$blockContainers: null,
			$currentBlockContainer: null,
			// CSS selectors
			blockSelector: '.block',
			containerSelector: '.region-inner',
			lastClass: 'block-last',
			ieLastClass: 'block-last-clear',
			// Configuration
			processing: false,
			roundingOffset: 3,
			/**
			 * Initialises last block module, caches jQuery DOM objects.
			 * @function init
			 * @memberOf lastBlock
			 */
			init: function() {
				var self = this;

				self.$blockContainers = $(self.containerSelector);

				if (!self.$blockContainers) {
					return false;
				}

				self.startProcessing(false);
			},
			/**
			 * Starts processing of blocks and logs start time.
			 * @function startProcessing
			 * @memberOf lastBlock
			 * @param {Boolean} [forceBuild] - whether or not to force a rebuild of blocks.
			 */
			startProcessing: function(forceBuild) {
				var self = this;

				// console.time('Processing last blocks');

				self.processing = true;

				if (self.processing || self.$blockContainers.length < 1) {
					self.stopProcessing();
				}

				if (forceBuild) {
					$(self.blockSelector).removeClass(self.lastClass);

					if (bb.ltIE(8)) {
						$('.' + self.ieLastClass).remove();
					}
				}

				self.$blockContainers.each(function() {
					var $blockContainer = $(this),
						$blocks = $blockContainer.find(self.blockSelector),
						blocksLength = $blocks.length,
						blockContainerWidth = null;

					if (blocksLength < 1) {
						self.stopProcessing();
					}

					blockContainerWidth = ($blockContainer.width() - self.roundingOffset);

					self.processBlocks($blocks, blockContainerWidth);
				});
			},
			/**
			 * Stops processing of blocks and logs end time.
			 * @function stopProcessing
			 * @memberOf lastBlock
			 */
			stopProcessing: function() {
				var self = this;

				// console.timeEnd('Processing last blocks');

				self.processing = false;

				return false;
			},
			/**
			 * Processes blocks, pushing the last block in a row into setLastBlock.
			 * @function processBlocks
			 * @memberOf lastBlock
			 * @param {Obj} $blocks - jQuery DOM objects of elements to calculate widths from.
			 * @param {Number} blockContainerWidth - max width of containing element to calculate widths from.
			 */
			processBlocks: function($blocks, blockContainerWidth) {
				var self = this;

				if (!$blocks || !blockContainerWidth) {
					self.stopProcessing();
				}

				$blocks.each(function() {
					var $block = $(this);

					if ($block.hasClass('pull-right') || $block.hasClass('block-alt')) {
						return true;
					}

					var outerWidth = parseInt($block.quickOuterWidth(true), 10);

					if (outerWidth >= blockContainerWidth) {
						self.setLastBlock($block);

						return true;
					}

					var positionLeft = parseInt($block.position().left, 10),
						positionRight = Math.round(blockContainerWidth - parseInt(positionLeft + outerWidth, 10));

					if (positionRight > self.roundingOffset) {
						return true;
					}

					self.setLastBlock($block);
				});

				self.stopProcessing();
			},
			/**
			 * Adds CSS class to last block, plus fallbackfor ltIE8.
			 * @function setLastBlock
			 * @memberOf lastBlock
			 * @param {Obj} $block - jQuery DOM object of element to add class to.
			 */
			setLastBlock: function($block) {
				var self = this;

				if (!$block) {
					return false;
				}

				$block.addClass(self.lastClass);

				if (bb.ltIE(8)) {
					$block.after('<div />', {
						'class': self.ieLastClass
					});
				}
			}
		}
	});
	// Subscribe to published events
	$.subscribe('pageReady ajaxLoaded', function() {
		bb.lastBlock.init();
	});
	$.subscribe('viewportResizeEnd', function() {
		bb.lastBlock.startProcessing(true);
	});
}(jQuery));

function iosVersion(version) {
	if (!version) {
		return;
	}
	var userOs = null;
	var userOsVersion = null;
	var ua = navigator.userAgent;
	var uaindex;
	// determine OS
	if (ua.match(/iPad/i) || ua.match(/iPhone/i)) {
		userOs = 'iOS';
		uaindex = ua.indexOf('OS ');
		userOsVersion = parseInt(ua.substr(uaindex + 3, 3).toString().slice(0, 1), 10);
	}
	if (userOsVersion === version) {
		return true;
	} else {
		return false;
	}
}

function androidVersion(version) {
	var ua = navigator.userAgent;
	if (ua.indexOf("Android") >= 0) {
		var androidversion = parseFloat(ua.slice(ua.indexOf("Android") + 8));
		if (androidversion === version) {
			return true;
		} else {
			return false;
		}
	}
}

if (Modernizr) {

	// Apple devices
	Modernizr.addTest('ipad', function() {
		return !!navigator.userAgent.match(/iPad/i);
	});
	Modernizr.addTest('iphone', function() {
		return !!navigator.userAgent.match(/iPhone/i);
	});
	Modernizr.addTest('ipod', function() {
		return !!navigator.userAgent.match(/iPod/i);
	});
	// IOS
	Modernizr.addTest('ios', function() {
		return (Modernizr.ipad || Modernizr.ipod || Modernizr.iphone);
	});
	Modernizr.addTest('ios6', function() {
		return iosVersion(6) ? true : false;
	});
	// IOS7
	Modernizr.addTest('ios7', function() {
		return iosVersion(7) ? true : false;
	});
	// IOS8
	Modernizr.addTest('ios8', function() {
		return iosVersion(8) ? true : false;
	});
	// IOS9
	Modernizr.addTest('ios9', function() {
		return iosVersion(9) ? true : false;
	});
	// Windows Phone
	Modernizr.addTest('windowsphone', function() {
		return !!navigator.userAgent.match(/(Windows Phone)/);
	});
	// Android OS
	Modernizr.addTest('android', function() {
		return !!navigator.userAgent.match(/(Android)/);
	});
	// Android OS 4.2
	Modernizr.addTest('android_4_2', function() {
		return androidVersion(4.2) ? true : false;
	});
	// Mac OS
	Modernizr.addTest('macos', function() {
		return !!navigator.userAgent.match(/(Mac OS)/);
	});
	// Mac OS
	Modernizr.addTest('macos', function() {
		return !!navigator.userAgent.match(/(Mac OS)/);
	});
	Modernizr.addTest('mobile', function() {
		return !!navigator.userAgent.match(/Android|BlackBerry|iPhone|Opera Mini|IEMobile/i);
	});
	// IE10
	Modernizr.addTest('ie10', function() {
		return !!navigator.userAgent.match(/MSIE 10/);
	});
	// IE11
	Modernizr.addTest('ie11', function() {
		var trident = !!navigator.userAgent.match(/Trident\/7.0/);
		var net = !!navigator.userAgent.match(/.NET4.0E/);
		return trident && net;
	});
	Modernizr.addTest('firefox', function() {
		return !!navigator.userAgent.match(/firefox/i);
	});
	// Safari
	Modernizr.addTest('safari', function() {
		return !!navigator.userAgent.match(/Safari/);
	});

	Modernizr.addTest('objectfit', Modernizr.testAllProps('maskRepeat'));


	Modernizr.addTest('videoautoplay', function() {
		// @todo need better test for this, we want to test for video autoplay not just OS']
		// @todo There is a new test for this in Modernizr v3 - we will either upgrade to v3 or steal the specific test.
		return (!Modernizr.ios && !Modernizr.android && !Modernizr.windowsphone);
	});
}

/**
 * @file Monitor Media Queries
 * @author {@link http://building-blocks.com Building Blocks}
 */
var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		/**
		 * Monitor media queries related methods.
		 * @namespace monitorMq
		 */
		monitorMq: {
			// jQuery DOM caching
			$detector: null,
			// CSS selectors
			detectorClass: 'monitor-mq',
			detectorId: 'monitor_mq',
			// Configuration
			detectorWidth: 0,
			currentBreakpoint: 0,
			previousBreakpoint: 0,
			/**
			 * Initialises monitor media queries module. Caches jQuery DOM objects, calls monitor() on pageReady.
			 * @function init
			 * @memberof monitorMq
			 */
			init: function() {
				var self = this;
				self.$detector = $('#' + self.detectorId);
				self.monitor();
			},
			/**
			 * Creates detector <div> if not present. Updates the comparison variable when a change in screen size occurs.
			 * @function monitor
			 * @memberof monitorMq
			 */
			monitor: function() {
				var self = this;
				if (!self.$detector.length) {
					self.$detector = $('<div />', {
						id: self.detectorId,
						class: self.detectorClass
					});
					bb.settings.$body.append(self.$detector);
				}
				self.detectorWidth = self.$detector.width();
				if (self.detectorWidth !== self.currentBreakpoint) {
					self.previousBreakpoint = self.currentBreakpoint;
					self.currentBreakpoint = self.detectorWidth;
				}
			}
		}
	});
	$.subscribe('pageReady', function() {
		bb.monitorMq.init();
	});
	$.subscribe('viewportResizeEnd', function() {
		bb.monitorMq.monitor();
	});
}(jQuery));

/**
 * @file No transitions
 * @author {@link http://building-blocks.com Building Blocks}
 */
var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		/**
		 * Toggle transitions related methods.
		 * @namespace toggleTransitions
		 */
		toggleTransitions: {
			// CSS selectors
			noTransitionsClass: 'no-transitions',
			/**
			 * Adds CSS class to <html>, disabling transitions.
			 * @function disableTransitions
			 * @memberof toggleTransitions
			 */
			disableTransitions: function() {
				var self = this;

				bb.settings.$html.addClass(self.noTransitionsClass);
			},
			/**
			 * Removes CSS class from <html>, re-enabling transitions.
			 * @function enableTransitions
			 * @memberof toggleTransitions
			 */
			enableTransitions: function() {
				var self = this;

				bb.settings.$html.removeClass(self.noTransitionsClass);
			}
		}
	});
	$.subscribe('pageReady', function() {
		bb.toggleTransitions.disableTransitions();
	});
	$.subscribe('pageLoaded', function() {
		bb.toggleTransitions.enableTransitions();
	});
	$.subscribe('viewportResizeStart', function() {
		bb.toggleTransitions.disableTransitions();
	});
	$.subscribe('viewportResizeEnd', function() {
		bb.toggleTransitions.enableTransitions();
	});
}(jQuery));

var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		pageReadyClass: function() {
			var self = this;
			self.settings.$html.addClass('page-ready');
		},
		pageLoadedClass: function() {
			var self = this;
			self.settings.$html.addClass('page-loaded');
		}
	});
	$.subscribe('pageReady', function() {
		bb.pageReadyClass();
	});
	$.subscribe('pageLoaded', function() {
		bb.pageLoadedClass();
	});
}(jQuery));

var bb = bb ? bb : {};
(function($) {
	$.subscribe('pageReady ajaxLoaded', function() {
		if (typeof picturefill === 'function') {
			// console.log('picturefill');
			picturefill();
		}
	});
}(jQuery));
/**
 * @file Checkbox replace
 * @author {@link http://building-blocks.com Building Blocks}
 */
var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		/**
		 * Checkbox replace related methods.
		 * @namespace replaceCheckbox
		 */
		replaceCheckbox: {
			// CSS Selectors
			processedClass: 'checkbox--replace-input',
			ignoreClass: 'checkbox--replace-ignore',
			/**
			 * Initialises checkbox replace module. Processes <inout type="checkbox">s. Creates `.checkbox-replace` markup.
			 * @function init
			 * @memberof replaceCheckbox
			 */
			init: function() {
				var self = this;

				if (bb.ltIE(9)) {
					return;
				}

				var $inputs = $('input[type=checkbox]:not(.' + self.processedClass + '):not(.' + self.ignoreClass + ')');

				$inputs.each(function() {
					var $input = $(this),
						$placeholder = $('<label />', {
							'class': 'checkbox--replace',
							'for': $input.attr('id'),
							'role': 'presentation'
						});

					$input.addClass(self.processedClass).after($placeholder);
				});
			}
		}
	});
	$.subscribe('pageReady ajaxLoaded', function() {
		bb.replaceCheckbox.init();
	});
}(jQuery));

/**
 * @file Radio replace
 * @author {@link http://building-blocks.com Building Blocks}
 */
var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		/**
		 * Select replace related methods.
		 * @namespace replaceRadio
		 */
		replaceRadio: {
			// CSS Selectors
			processedClass: 'radio--replace-input',
			ignoreClass: 'radio--replace-ignore',
			/**
			 * Initialises radio replace module. Processes <input type="radio">s. Creates `.radio--replace` markup.
			 * @function init
			 * @memberof replaceRadio
			 */
			init: function() {
				var self = this;

				if (bb.ltIE(9)) {
					return;
				}

				var $inputs = $('input[type=radio]:not(.' + self.processedClass + '):not(.' + self.ignoreClass + '), .checkbox-radio-style:not(.' + self.processedClass + '):not(.' + self.ignoreClass + ')');

				$inputs.each(function() {
					var $input = $(this),
						$placeholder = $('<label />', {
							'for': $input.attr('id'),
							'class': 'radio--replace'
						});

					$input.addClass(self.processedClass).after($placeholder);
				});
			}
		}
	});
	$.subscribe('pageReady ajaxLoaded', function() {
		bb.replaceRadio.init();
	});
}(jQuery));

/**
 * @file Select replace
 * @author {@link http://building-blocks.com Building Blocks}
 */
var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		/**
		 * Select replace related methods.
		 * @namespace replaceSelect
		 */
		replaceSelect: {
			// CSS Selectors
			processedClass: 'processed',
			numberSpinnerSelector: '.number-spinner',
			/**
			 * Initialises select replace module. Processes <select>s. Creates `.select-replace` markup. Binds events.
			 * @function init
			 * @memberof replaceSelect
			 */
			init: function() {
				var self = this;

				if (bb.ltIE(9)) {
					return;
				}

				var $selects = $('select:not(.' + self.processedClass + '):not([multiple])');

				$selects.each(function() {
					var $select = $(this),
						$numberSpinner = $select.closest(self.numberSpinnerSelector),
						id = $select.attr('id');

					if ($numberSpinner.length) {
						var $numberLabel = $('<span />', {
							'for': $select.attr('id'),
							'class': 'number-spinner-label'
						});

						$select.before($numberLabel);

						var val = $select.find('option:selected').text();

						$numberLabel.text(val);

						$select.on('change.replaceSelect', function() {
							var val = $select.find('option:selected').text();
							$numberLabel.text(val);
						});
					} else {
						var classes = $select.attr('class') ? $select.attr('class') : '',
							$wrapper = $('<span />', {
								'class': 'select-replace ' + classes
							});

						$select.removeAttr('class').wrap($wrapper);
					}

					if (id) {
						var $label = $('label[for="' + id + '"]');

						if ($label) {
							$label.on('click.selects', function(event) {
								$select.trigger('click');
								event.preventDefault();
							});
						}
					}

					$select.addClass(self.processedClass);
				});
			}
		}
	});
	$.subscribe('pageReady ajaxLoaded', function() {
		bb.replaceSelect.init();
	});
}(jQuery));

/**
 * @file Settings
 * @author {@link http://building-blocks.com Building Blocks}
 */
var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		settings: {
			// cache some common variables
			$window: $(window),
			$document: $(document),
			$html: $('html'),
			$body: $('body'),
			$htmlbody: $('html,body'),
			$page: $('#page'),
			$header: $('#header'),
			$main: $('#main'),
			$mainInner: $('.main-inner'),
			$footer: $('#footer'),
            _HTML: document.querySelector('html'),
            _Body: document.querySelector('body'),
			// stored URL params (empty to begin with)
			urlParams: {},
			// class to use on
			processedClass: 'processed',
            scrollLockedClass: 'scroll-locked',
			browserPrefix: null,
			transitionEnd: null,
			animationEnd: null,
			transitionAnimationEnd: null,
			// store processing of last component globally
			processinglastBlock: false,
			// breakpoint variables (should match variables.less)
			breakPointA: 320,
			breakPointB: 480,
			breakPointC: 600,
			breakPointD: 768,
			breakPointE: 980,
			breakPointF: 1200,
			breakPointG: 1400,
			breakPointH: 1820,
			mustache: {
				templateRoot: '/_templates/'
			},
			geoLatitude: null,
			geoLongitude: null,
			// store scripts directory
			scriptsDirectory: './_scripts/',
			dynamicScriptsPath: null,
			// is this a RTL site?
			rtl: false,
			keys: {
                key_return: 13,
				key_esc: 27,
				key_up: 38,
				key_down: 40,
				key_space: 32
			},
			// global timeout for ajax requests
			globalTimeout: $('[data-name=ajax-timeout]') ? $('[data-name=ajax-timeout]').data('content') : 10000,
		}
	});
}(jQuery));

/**
 * @file Toggle grid
 * @author {@link http://building-blocks.com Building Blocks}
 */
var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		toggleGrid: function($object) {
			var self = this,
				$visibleGrid = $('.visible-grid');

			if (!$visibleGrid.length) {
				return;
			}

			var $btn = $('<button />', {
				'type': 'button',
				'class': 'visible-grid-btn btn-no-style'
			}).text('Grid on/off');

			var $demoActions = $('.demo-links');
			if ($demoActions && $demoActions.length > 0) {
				$demoActions.append($btn);
			} else {
				bb.settings.$body.append($btn);
			}

			$btn.on('click', function(event) {
				bb.settings.$body.toggleClass('visible-grid-in');
			});
		}
	});
	$.subscribe('pageReady', function() {
		bb.toggleGrid();
	});
}(jQuery));
/**
 * @file Viewport Resize
 * @author {@link http://building-blocks.com Building Blocks}
 */
var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		/**
		 * Reusable site resize function.
		 * @namespace viewportResize
		 */
		viewportResize: {
			// Configuration
			resizeTimeout: null,
			timeoutDuration: 200,
			/**
			 * Initialises viewport resize module, binds event to window resize.
			 * @function init
			 * @memberOf viewportResize
			 */
			init: function() {
				var self = this;

				bb.settings.$window.on('resize.viewportResize', function() {
					if (self.resizeTimeout) {
						clearTimeout(self.resizeTimeout);
					}

					$.publish('viewportResizeStart');

					self.resizeTimeout = setTimeout(function() {
						$.publish('viewportResizeEnd_prioritize');
						$.publish('viewportResizeEnd');
					}, self.timeoutDuration);
				});
			}
		}
	});
	$.subscribe('pageReady', function() {
		bb.viewportResize.init();
	});
}(jQuery));

/**
 * @file Utilities
 * @author {@link http://building-blocks.com Building Blocks}
 */
var bb = bb ? bb : {};
(function($) {
	/**
	 * Generic utility methods
	 * @namespace utilities
	 */
	$.extend(bb, {
		/**
		 * Returns a query string parameter’s value if specified, object of query string parameters if not.
		 * @function getUrlParams
		 * @memberof utilities
		 * @param {String} [parameter] Parameter passed in to retrieve from query string
		 * @returns {Obj} [params] | {String} [param]
		 */
		getUrlParams: function(parameter) {
			var queryString = window.location.search;

			if (queryString !== undefined) {
				queryString = window.location.search.replace('?', '');

				var params = {},
					queryStringArray = queryString.split('&');

				for (var index in queryStringArray) {
					var query = queryStringArray[index].split('=');

					params[decodeURIComponent(query[0])] = decodeURIComponent(query[1]);
				}

				if (parameter) {
					return params[parameter];
				} else {
					return params;
				}
			}
		},
		/**
		 *
		 * @function setUrlParams
		 * @memberof utilities
		 */
		setUrlParams: function() {
			var self = this;

			self.settings.urlParams = self.getUrlParams();
		},
		/*
		 * Updates URL in the browser using history API if supported, polyfill if not.
		 * @function updateUrl
		 * @memberof utilities
		 * @param {String} [fragment] fragment to push into URL.
		 * @see {@link https://github.com/browserstate/history.js}
		 */
		/*
				updateUrl: function(fragment, baseUrl) {
					var currentUrl = window.location.href,
						url;

					if (fragment !== undefined && !baseUrl) {
						// Update URL
						url = currentUrl + fragment;
					} else if (fragment !== undefined && baseUrl) {
						url = bb.settings.currentUrl + fragment;
					} else {
						// Reset URL to stored value
						url = bb.settings.currentUrl;
					}

					if (Modernizr.history) {
						// Use History API if supported
						window.history.pushState(null, '', url);
					} else {
						// Else use polyfill
						History.pushState(null, '', url);
					}
				},
		*/

		/*
		 * Safely logs message to browser console.
		 * @function log
		 * @memberof utilities
		 * @param {String|Object} content - Content to log to browser console.
		 * @param {String} styles - CSS style to apply to text logged to browser console.
		 * @example
		 * bb.log('Hello, World!', 'color:#F00;');
		 */
		log: function(content, style) {
			if (typeof(console) !== 'undefined') {
				if (style) {
					console.log('%c' + content, style);
				} else {
					console.log(content);
				}
			}
		},
		htmlEncode: function(value) {
			if (value) {
				return $('<div />').text(value).html();
			} else {
				return '';
			}
		},
		htmlDecode: function(value) {
			if (value) {
				return $('<div />').html(value).text();
			} else {
				return '';
			}
		},
		/**
		 * Get IE version from <html> classname (acceptable values: 10|9|8|7).
		 * @function ltIE
		 * @memberof utilities
		 * @param {String} version IE version to check for.
		 * @example
		 * // returns true || false
		 * bb.ltIE('10');
		 * @returns {Bool} Returns if <html> tag has lt-ie CSS class.
		 */
		ltIE: function(version) {
			var self = this;
			if (self.settings.$html.hasClass('lt-ie' + version)) {
				return true;
			} else {
				return false;
			}
		},
		browserPrefix: function() {
			if (window.getComputedStyle) {
				var self = this,
					styles = window.getComputedStyle(window.document.documentElement, ''),
					prefix = (Array.prototype.slice.call(styles).join('').match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o']))[1];
				self.settings.browserPrefix = '-' + prefix + '-';
			}
		},
		textDirection: function() {
			var self = this,
				direction = self.settings.$html.attr('dir');

			if (direction === 'rtl') {
				self.settings.rtl = true;
			}
		},
		/*
		 * Prevents dead links in the prototype website from being used.
		 * @function dummyLinks
		 * @memberof utilities
		 */
		dummyLinks: function() {
			bb.settings.$body.on('click.dummyLinks', '[href="#"]', function(event) {
				event.preventDefault();
			});
		},
		/**
		 * @function webGLDetect
		 * @memberOf utilities
		 * @return {Bool} If device supports WebGL and it is turned on
		 * @see {@link http://www.browserleaks.com/webgl#howto-detect-webgl}
		 */
		webGLDetect: function() {
			if (!!window.WebGLRenderingContext) {
				var canvas = document.createElement('canvas'),
					names = ['webgl', 'experimental-webgl', 'moz-webgl'],
					gl = false;

				for (var i in names) {
					try {
						gl = canvas.getContext(names[i]);
						if (gl && typeof gl.getParameter === 'function') {
							// WebGL is enabled
							// return true;
							return names[i];
						}
					} catch (e) {}
				}

				// WebGL is supported, but disabled
				return false;
			}

			// WebGL not supported
			return false;
		},
        closestClass: function(el, className) {
			while (el) {
				if (bb.hasClass(el, className)) {
					break;
				}
				el = el.parentElement;
			}
			return el;
		},
		hasClass: function(el, className) {
			if (el.classList) {
				return el.classList.contains(className);
			} else {
				if (el.className) {
					var classArray = el.className.split(' ');
					for (var i = 0; i < classArray.length; i++) {
						if (classArray[i] === className) {
							return true;
						}
					}
				}
			}
			//return el.classList ? el.classList.contains(className) : new RegExp('\\b' + className + '\\b').test(el.className);
		},
		addClass: function(el, className) {
			var classNames = className.split(' ');
			var i;

			for (i = 0; i < classNames.length; i++) {
				if (el.classList) {
					el.classList.add(classNames[i]);
				} else if (!bb.hasClass(el, classNames[i])) {
					el.className += ' ' + classNames[i];
				}
			}
		},
		removeClass: function(el, className) {
			var classNames = className.split(' ');
			var i;

			for (i = 0; i < classNames.length; i++) {
				if (el.classList) {
					el.classList.remove(classNames[i]);
				} else {
					el.className = el.className.replace(new RegExp('\\b' + classNames[i] + '\\b', 'g'), '');
				}
			}
		},
		getFormData: function (_Form) {
			// NEED TO EXTEND THIS (multi selects, etc)

			if (!_Form) {
				return;
			}

			var _Inputs = _Form.elements;
			var inputArray = [];

			for (var i = 0; i < _Inputs.length; i++) {
				var _Input = _Inputs[i];
				var tag = _Input.tagName;
				var type = _Input.type;
				var name = _Input.name;
				var val = null;

				if (tag === 'INPUT') {
					if (type === 'text') {
						val = _Input.value;
					} else if (type === 'radio' || type === 'checkbox') {
						if (_Input.checked) {
							val = _Input.value;
						}
					}
				} else if (tag === 'SELECT') {
					if (_Input.selectedOptions) {
						val = _Input.value;
					}
				}

				if (val) {
					var obj = {
						name: name,
						value: val
					};

					inputArray.push(obj);
				}
			}

			return inputArray;
		}
	});
	$.subscribe('pageReady', function() {
		bb.textDirection();
		bb.browserPrefix();
		bb.setUrlParams();
		bb.dummyLinks();
	});
}(jQuery));

/**
 * @file Ajax Load HTML
 * @author Andy Blackledge <a.blackledge@building-blocks.com>
 * module: ajaxLoadHTML
 * purpose: This module will load html into a target container via ajax
 * date created: 10 Mar 2015
 */
var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		ajaxLoadHTML: {
			$ajaxLoadHandle: null,
			ajaxLoadHandleSelector: '.ajax-load-handle',
			ajaxReplaceTimeout: null,
			loadingHTML: false,
			init: function() {
				var self = this;

				self.$ajaxLoadHandle = $(self.ajaxLoadHandleSelector);

				if (self.$ajaxLoadHandle.length < 1) {
					return;
				}

				bb.settings.$body.on('click.ajaxLoadHTML', self.ajaxLoadHandleSelector, function(event) {
					event.preventDefault();
					clearTimeout(self.ajaxReplaceTimeout);

					if (self.loadingHTML) {
						return;
					} else {
						self.loadingHTML = true;
					}

					var $this = $(this),
						endpoint = $this.data('ajax-load-endpoint'),
						target = $this.data('ajax-load-target'),
						$target = $('*[data-ajax-load-recipient="' + target + '"]');

					if (endpoint && $target.length > 0) {
						self.getHTML(endpoint, $target);
					}
				});
			},
			/**
			 * Get html via ajax from endpoint
			 * @function getHTML
			 * @memberOf ajaxLoadHTML
			 */
			getHTML: function(endpoint, $target) {
				var self = this;

				if (endpoint && $target.length > 0) {
					bb.loader.showLoader();

					$.ajax({
						url: endpoint,
						dataType: 'html',
						cache: false,
						success: function(html) {
							self.addHTML($target, html);
						},
						error: function() {},
						complete: function() {
							bb.loader.hideLoader();
						}
					});
				}
			},
			/**
			 * add the html to the page inplace of the old html
			 * @function addHTML
			 * @memberOf ajaxLoadHTML
			 */
			addHTML: function($target, html) {
				var self = this,
					$parent = $target.closest('.ajax-load-parent');

				if ($parent.length > 0) {
					$parent.addClass('ajax-load-out');
				}

				self.ajaxReplaceTimeout = setTimeout(function() {
					$target.replaceWith(html);
					$.publish('ajaxLoaded');
					bb.headerWidget.init();

					if ($parent.length > 0) {
						$parent.removeClass('ajax-load-out');
					}
					clearTimeout(self.ajaxReplaceTimeout);
					self.loadingHTML = false;
				}, 300);
			},
			/**
			 * initiate unobtrusive validation to include new html
			 * @function reparseForms
			 * @memberOf ajaxLoadHTML
			 */
			reparseForms: function() {
				if ($.validator.unobtrusive) {
					$.validator.unobtrusive.parse(bb.settings.$body);
				}
			}
		}
	});
	$.subscribe('pageReady', function() {
		bb.ajaxLoadHTML.init();
	});
	$.subscribe('ajaxLoaded', function() {
		bb.ajaxLoadHTML.init();
	});
}(jQuery));

/**
 * @file Ajax Update Area - This module is used to load html via ajax into areas that can be updated by the
 * user to allow new or different content to be loaded
 * @author Andy Blackledge <a.blackledge@building-blocks.com>
 * @author Daniel Furze <d.furze@building-blocks.com>
 */
var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		/**
		 * Implements AJAX updating/replacing of an area.
		 * @namespace ajaxUpdateArea
		 */
		ajaxUpdateArea: {
			// jQuery DOM objs
			$ajaxUpdate: null,
			$ajaxUpdateControl: null,
			$ajaxUpdateSubmit: null,
			// CSS selectors
			ajaxUpdateSelector: '.ajax-update-area',
			ajaxUpdateControlSelector: '.ajax-update-area-control',
			ajaxUpdateSubmitSelector: '.ajax-update-area-submit',
			ajaxUpdateRemoveSelector: '.ajax-update-area-remove',
			ajaxUpdateTargetSelector: '.ajax-update-area-target',
			ajaxUpdateFormSelector: '.ajax-update-area-form',
			// Configuration
			ajaxWait: null,
			desktop: true,
			ajaxReplaceTimeout: null,
			contentCount: 1,
			/**
			 * Initialises ajaxUpdateArea module. Caches jQuery DOM objects.
			 * @function init
			 * @memberOf ajaxUpdateArea
			 */
			init: function() {
				var self = this;

				self.$ajaxUpdate = $(self.ajaxUpdateSelector);
				self.$ajaxUpdateControl = $(self.ajaxUpdateControlSelector);
				self.$ajaxUpdateSubmit = $(self.ajaxUpdateSubmitSelector);
				self.$ajaxUpdateRemove = $(self.ajaxUpdateRemoveSelector);

				if (self.$ajaxUpdate.length < 1) {
					return;
				}

				self.bindEvents();
			},
			/**
			 * Binds all ajaxUpdateArea related events.
			 * @function bindEvents
			 * @memberof ajaxUpdateArea
			 */
			bindEvents: function() {
				var self = this;

				self.$ajaxUpdateControl.on('change.ajaxUpdateArea', function() {
					var $this = $(this),
						$container = $this.closest(self.ajaxUpdateSelector);

					self.getContent($container, true, $this);
				});

				self.$ajaxUpdateSubmit.on('click.ajaxUpdateArea', function() {
					var $this = $(this),
						$container = $this.closest(self.ajaxUpdateSelector),
						dataReplace = $this.data('ajax-replace-content'),
						dataLimit = $this.data('ajax-update-limit'),
						dataCount = $container.data('ajax-update-count');

					if (dataLimit !== undefined) {
						// If there’s a limit defined and it’s less than the count on the page
						if (dataCount < dataLimit) {
							if (dataReplace) {
								self.getContent($container, true, $this);
							} else {
								self.getContent($container, false, $this);
							}

							// Store attr on DOM element for when there’s more than 1 on a page
							$container.data('ajax-update-count', dataCount + 1);

							if ($container.data('ajax-update-count') === dataLimit) {
								// Hide button if not needed anymore…
								$this.hide();
								// …and show alternative button
								$this.parents('.promo-flip-footer').find(self.ajaxUpdateRemoveSelector).show();
								$this.parents('.ajax-update-footer').find(self.ajaxUpdateRemoveSelector).show();
							}
						}
					} else {
						// @todo clean up the duplication
						if (dataReplace) {
							self.getContent($container, true, $this);
						} else {
							self.getContent($container, false, $this);
						}
					}
				});

				self.$ajaxUpdateRemove.on('click.ajaxUpdateArea', function() {
					var $this = $(this),
						$container = $this.parents(self.ajaxUpdateSelector),
						$target = $container.find(self.ajaxUpdateTargetSelector),
						// @todo figure out why .closest() didn’t work
						dataCount = $container.data('ajax-update-count');

					if (dataCount > 1) {
						bb.loader.showLoader();

						self.removeContent($target);

						$container.data('ajax-update-count', $container.data('ajax-update-count') - 1);

						if ($container.data('ajax-update-count') === 1) {
							// switch buttons again
							$this.hide();
							$this.parents('.promo-flip-footer').find(self.ajaxUpdateSubmitSelector).show();
							$this.parents('.ajax-update-footer').find(self.ajaxUpdateSubmitSelector).show();

						}
					}
				});
			},
			/**
			 * Gets the data needed for the AJAX call and then makes the call.
			 * @function getContent
			 * @memberOf ajaxUpdateArea
			 */
			getContent: function($container, replaceContent, $btn) {
				var self = this;

				if (!$container) {
					return;
				}

				bb.loader.showLoader();

				var $target = $container.find(self.ajaxUpdateTargetSelector),
					url = $container.data('ajax-endpoint'),
					method = $container.data('ajax-form-method'),
					$form = $container.find(self.ajaxUpdateFormSelector),
					//formData = $form.serializeArray(), // not needed as sdl mobile will know this already
					formData = $form.serialize(),
					errorModal = $container.data('error-modal');

				// not needed as sdl mobile will know this already
				/*if (bb.monitorMq.currentBreakpoint <= bb.settings.breakPointD) {
					self.desktop = false;
				} else {
					self.desktop = true;
				}*/

				// not needed as sdl mobile will know this already
				/*formData.push({
					name: 'desktop',
					value: self.desktop
				});*/

				// bb.log(formData);

				if ($target.length < 1 || !url) {
					$.ajax({
						type: 'GET',
						url: errorModal,
						dataType: 'html',
						success: function(html) {
							bb.loader.hideLoader();
							bb.genericError.showError(html);
						},
						error: function(xhr) {
							bb.loader.hideLoader();
							bb.genericError.showError(xhr.responseText);
						}
					});
					return;
				}

				if (self.ajaxWait) {
					clearTimeout(self.ajaxWait);
				}

				self.ajaxWait = setTimeout(function() {
					$.ajax({
						type: method || 'GET',
						url: url,
						data: formData,
						dataType: 'html',
						cache: false,
						timeout: bb.settings.globalTimeout,
						success: function(html) {
							self.addContent(html, $target, replaceContent, $btn);
							clearTimeout(self.ajaxWait);
						},
						error: function(xhr) {
							bb.loader.hideLoader();
							bb.genericError.showError(xhr.responseText);
						}
					});
				}, 300);
			},
			/**
			 * Adds the HTML to the page and calls any other functions that need to run after updating page.
			 * @function addContent
			 * @memberOf ajaxUpdateArea
			 * @param {String} html - HTML string, data from AJAX call
			 * @param {Obj} $target - jQuery DOM obj to replace content in/append to
			 * @param {Bool} replaceContent - whether to replace content (or append it)
			 */
			addContent: function(html, $target, replaceContent) {
				var self = this;

				if (!html || !$target) {
					bb.loader.hideLoader();
					return;
				}

				$target.addClass('ajax-update-area-out');

				self.ajaxReplaceTimeout = setTimeout(function() {
					if (replaceContent) {
						$target.html(html);
					} else {
						$target.append(html);
					}
					$target.removeClass('ajax-update-area-out');

					$.publish('ajaxLoaded');
				}, 300);

				bb.loader.hideLoader();
			},
			/**
			 * Removes content from the content area defined, if allowed to by the content count.
			 * @function removeContent
			 * @memberOf ajaxUpdateArea
			 * @param {Obj} $target - jQuery DOM obj to find content with
			 */
			removeContent: function($target) {
				var self = this;

				$target.addClass('ajax-update-area-out');

				self.ajaxReplaceTimeout = setTimeout(function() {
					$target.find('.ajax-update-area-target-content').last().remove();

					$target.removeClass('ajax-update-area-out');
				}, 300);

				bb.loader.hideLoader();
			},
			/**
			 * [checkRemainingContent description]
			 * @function checkRemainingContent
			 * @memberOf ajaxUpdateArea
			 * @param  {Obj} $btn - jQuery DOM obj of button to check against
			 */
			/*checkRemainingContent: function ($btn) {
				if (!$btn) {
					return;
				}

				var	$container = $btn.closest('.ajax-update-area');

				if ($container.length < 1) {
					return;
				}

				var $content = $container.find('.ajax-update-area-target-content');

				if ($content.length < 1) {
					return;
				}

				var dataContentRemaining = $content.data('ajax-content-remaining');

				if (!dataContentRemaining) {
					$container.addClass('ajax-update-area-no-more-content');
				} else {
					$container.removeClass('ajax-update-area-no-more-content');
				}
			}*/
		}
	});
	$.subscribe('pageReady', function() {
		bb.ajaxUpdateArea.init();
	});
}(jQuery));

/**
 * @file autocomplete module
 * @author {@link http://building-blocks.com Building Blocks}
 */
var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		/**
		 * autocomplete related methods.
		 * @namespace autocomplete
		 */
		autocomplete: {
			// jQuery DOM caching
			$autocomplete: null,
			$input: null,
			$item: null,
			// selectors
			autocompleteSelector: '.autocomplete',
			inputSelector: '.autocomplete__input',
			targetSelector: '.autocomplete__target',
			itemSelector: '.autocomplete__item',
			itemActiveSelector: '.autocomplete--active',
			// Classes
			itemActiveClass: 'autocomplete--active',
			listInClass: 'autocomplete__list--in',
			searchOnlyClass: 'autocomplete__search-only',
			// Misc
            dataMinCharacters: 'data-autocomplete-min-characters',
            dataTypingDelay: 'data-autocomplete-typing-delay',
            typingDelay: null,
            typing: false,
			/**
			 * Initialises autocomplete module. Caches jQuery DOM objects.
			 * @function init
			 * @memberof autocomplete
			 */
			init: function() {
				var self = this;

				self.$autocomplete = $(self.autocompleteSelector);
				if (self.$autocomplete.length < 1) {
					return;
				}

				self.bindEvents();
			},
			bindEvents: function () {
				var self = this;

				self.$input = $(self.inputSelector);
				self.$input.on('keyup.autocomplete', function (e) {
					var $this = $(this);
					var $container = $this.closest(self.autocompleteSelector);
					var $target = $container.find(self.targetSelector);
					var val = $this.val();
					var valLength = val.length;
                    var dataCharacters = parseInt($this.attr(self.dataMinCharacters), 10) || 2;
                    var dataTypingDelay = parseInt($this.attr(self.dataTypingDelay), 10) || 500;
                    clearTimeout(self.typingDelay);

					switch (e.keyCode) {
						// case bb.settings.keys.key_return:
						case bb.settings.keys.key_esc:
						case bb.settings.keys.key_down:
						case bb.settings.keys.key_up:
							e.preventDefault();
							return;
					}

                    self.typingDelay = setTimeout(function () {
                        if (valLength >= dataCharacters) {
                            self.sendData($this);
                        } else {
                            var $search = $container.closest('.search');
                            if ($search && $search.length > 0) {
                                $search.removeClass('search-results--in');
                            }
                            $target.empty();
                            $target.removeClass(self.listInClass);
                        }

                        clearTimeout(self.typingDelay);
                    }, dataTypingDelay);
				});

				self.$input.on('keydown.autocomplete', function (e) {
					var $this = $(this);

					self.keyDownHandler(e, $this);
				});

                bb.settings.$window.on('keyup.autocomplete', function (e) {
                    var $this = $(this);

                    if (e.keyCode === bb.settings.keys.KEY_ESC) {
                        self.closeSearch();
                    }
                });

                // bb.settings.$body.on('click.autocomplete', function(event) {
				// 	var $target = $(event.target);

				// 	if ($target.parents(self.autocompleteSelector).length) {
				// 		return;
				// 	}

				// 	self.closeSearch();
				// });
			},
            closeSearch: function (retainInputVal) {
                var self = this;
                var $container = $(self.autocompleteSelector);
                var $target = $container.find(self.targetSelector);
                var $input = $container.find(self.inputSelector);

                var $search = $container.closest(bb.searchExpand.searchSelector);
                if ($search && $search.length > 0) {
                    $search.removeClass('search-results--in');
                }

                bb.searchExpand.contract($search);
                self.clearResults($target, $input, retainInputVal);
            },
			bindItemEvents: function () {
				var self = this;

				self.$item = $(self.itemSelector);
				self.$item.off('click.autocomplete');
				self.$item.on('click.autocomplete', function () {
					var $this = $(this);
					var $autocomplete = $this.closest(self.autocompleteSelector);
					var $input = $autocomplete.find(self.inputSelector);

					var dataTerm = $this.attr('data-search-term');
					$input.val(dataTerm);

                    var $filterResults = $autocomplete.closest(bb.filterResults.filterSelector);
                    if ($filterResults && $filterResults.length) {
                        var _Filter = document.querySelector(bb.filterResults.filterSelector);
                        var _Input = _Filter.querySelector('.autocomplete__input');
                        bb.filterResults.getResults(_Input, _Filter);
                        bb.autocomplete.closeSearch();
                        return;
                    }

					var $form = $input.closest('form');
					if ($form.length) {
						$form.submit();
					}
				});
			},
			keyDownHandler: function (e, $input) {
				var self = this;

				if (!e || !$input) {
					return;
				}

				var $container = $input.closest(self.autocompleteSelector);
				var $target = $container.find(self.targetSelector);
				var $items = $target.find(self.itemSelector);
				var $activeItem = $target.find(self.itemActiveSelector);
				var itemsLength = $items.length;
				var $nextItem = null;
				var $prevItem = null;

				if (itemsLength < 1) {
					return;
				}

				switch (e.keyCode) {
					case bb.settings.keys.key_esc:
						self.clearResults($target, $input);
						return;

					case bb.settings.keys.key_down:
						if ($activeItem.length < 1) {
							$items.first(self.itemSelector).addClass(self.itemActiveClass);
						} else {
							self.getActiveIndex($items, $activeItem, true);
						}
						return;

					case bb.settings.keys.key_up:
						if ($activeItem.length < 1) {
							$items.last().addClass(self.itemActiveClass);
						} else {
							self.getActiveIndex($items, $activeItem, false);
						}
						return;

					case bb.settings.keys.key_return:
						var $form = $input.closest('form');
						var $header = $form.closest('.header');

						if ($activeItem.length) {
							var dataTerm = $activeItem.attr('data-search-term');
							$input.val(dataTerm);

							if ($form && $form.length) {
								if ($header && $header.length) {
									$form.submit();
								}
							}
							return;
						} else {
                            if ($form && $form.length) {
								if ($header && $header.length) {
									$form.submit();
								}
							}
                        }
				}
			},
			getActiveIndex: function ($items, $activeItem, next) {
				var self = this;
				var activeIndex = null;
				var found = false;

				if (!$items || !$activeItem) {
					return;
				}

				$.each($items, function (i) {
					var $this = $(this);

					if (found) {
						return;
					}

					if ($this.hasClass(self.itemActiveClass)) {
						found = true;
						activeIndex = i;

						self.changeActive($items, $activeItem, activeIndex, next);
					}
				});
			},
			changeActive: function ($items, $activeItem, activeIndex, next) {
				var self = this;

				if (!$items || !$activeItem || activeIndex === null) {
					return;
				}

				var itemsLength = $items.length;
				itemsLength = itemsLength - 1;

				if (next) {
					if (activeIndex === itemsLength) {
						activeIndex = 0;
					} else {
						activeIndex++;
					}
				} else {
					if (activeIndex === 0) {
						activeIndex = itemsLength;
					} else {
						activeIndex--;
					}
				}

				$.each($items, function (i) {
					var $this = $(this);

					if (i === activeIndex) {
						$activeItem.removeClass(self.itemActiveClass);
						$this.addClass(self.itemActiveClass);
					}
				});

			},
			clearResults: function ($target, $input, retainInputVal) {
				var self = this;

				if (!$target || !$input) {
					return;
				}

                var $search = $input.closest('.search');
                if ($search && $search.length > 0) {
                    $search.removeClass('search-results--in');
                }

				$target.empty();
				$target.removeClass(self.listInClass);

				if (!retainInputVal) {
					$input.val('');
				}
			},
			sendData: function ($input) {
				var self = this;

				if (!$input) {
					return;
				}

				var $container = $input.closest(self.autocompleteSelector);
				var $target = $container.find(self.targetSelector);
				var dataEndpoint = $container.data('autocomplete-endpoint');
                var inputVal = $input.val();
				var val = {q: inputVal};
                var $search = $container.closest('.search');

				if (!$target || $target.length < 1) {
					console.log('autocomplete - no target found');
					return;
				}

				if (!dataEndpoint || dataEndpoint.length < 1) {
					console.log('autocomplete - no data endpoint');
					return;
				}

				$.ajax({
					url: dataEndpoint,
					type: 'GET',
					data: val,
					dataType: 'html',
					cache: false,
					timeout: bb.settings.globalTimeout,
					success: function(response, textStatus, xhr) {
                        // console.log(response);
                        // console.log(xhr);
                        console.log('autocomplete success: ' + inputVal);

                        if (xhr.status === 200) {
                            self.appendResponse($target, response, $search, inputVal);
                        } else {
                            if ($search && $search.length > 0) {
                                $search.removeClass('search-results--in');
                            }
                            $target.empty();
                            $target.removeClass(self.listInClass);
                        }
					},
					error: function(xhr) {
						console.log('ajax error');
						console.log(xhr);
                        $target.empty();
                        if ($search && $search.length > 0) {
                            $search.removeClass('search-results--in');
                        }
                        $target.removeClass(self.listInClass);
					}
				});
			},
            appendResponse: function ($target, response, $search, inputVal) {
                var self = this;

                if (!$target || !response || !inputVal) {
                    return;
                }

                inputVal = inputVal.toLowerCase();
                var $response = $.parseHTML(response);
                $.each($response, function (i) {
                    var $this = $(this);
                    if ($this.hasClass('autocomplete__item')) {
                        var text = $this.text().toLowerCase();
                        var newText = text.replace(new RegExp(inputVal, 'g'), '<span>' + inputVal +  '</span>');
                        $this.html(newText);
                    }
                });

                $target.html($response);
                $target.addClass(self.listInClass);

                if ($search && $search.length > 0) {
                    $search.addClass('search-results--in');
                }
                self.bindItemEvents();
            }
		}
	});
	$.subscribe('pageReady', function() {
		bb.autocomplete.init();
	});
}(jQuery));
var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		backTop: {
			init: function() {
				var self = this;
				$('.action-back-to-top').on('click', function(event) {
					//bb.settings.$window.scrollTop(0);
					event.preventDefault();
					bb.settings.$htmlbody.animate({
						scrollTop: 0
					}, 400);
				});
			}
		}
	});
	$.subscribe('pageReady', function() {
		bb.backTop.init();
	});
}(jQuery));

var bb = bb ? bb : {};
(function($) {
	$.extend(bb,{
		carousel : {
			bb : bb,
			$carousel : null,
			$callback : null,
	        maxSlidesValue : 0,
	        slideWidth : 0,
	        slideMarginValue : 0,
	        carouselControls : true,
	        numberOfItems : 0,
	        setGlobal: function (bb) {
				var self = this;
				self.bb = bb;
			},
			init : function () {
				var self = this;
				self.$carousel = $('.carousel');

				self.$carousel.each(function () {
					var $this = $(this),
						$carouselInner = $this.find('.carousel__inner');
					self.defaultCarousel($this, $carouselInner);
				});
			},
	        defaultCarousel: function($carousel, $carouselInner) {
	            var self = this,
	                carouselItems = $carousel.find('.carousel__items .carousel__item'),
	                pagerValue = true,
	                swipe = true;
	                var speed = self.$carousel.attr('data-carousel-speed');
	                var autoRotate = self.$carousel.attr('data-carousel-auto');

	            if (carouselItems.length <= 1) {
	            	pagerValue = false;
	            }

	            if (carouselItems.length > 1) {
	            	swipe = true;
	            }

	            $carousel.find('.carousel__items').bxSlider({
					auto: autoRotate,
					autoStart: true,
					autoControls: false,
	                useCSS: false,
					pagerType: 'full',
	                nextSelector: '.carousel__next',
                    prevSelector: '.carousel__prev',
                    nextText: '',
                    prevText: '',
                    mode: 'fade',
	                infiniteLoop: true,
	                speed: 0,
					pause: 8000,
					autoHover: false,
	                touchEnabled: swipe,
					stopAuto: false,
        			oneToOneTouch: false,
                    pagerCustom: '#carousel__pager',
					onSlideAfter: function ($slideElement, oldIndex, newIndex) {        
            			$('.carousel__slide--active').removeClass('carousel__slide--active');
            			$('.carousel__slide').eq(newIndex).addClass('carousel__slide--active');
        			},
					onSliderLoad: function () {				
						$('.carousel__slide').eq(0).addClass('carousel__slide--active');					            			
					}
	            });
	        }
		}
	});
	$.subscribe('pageReady', function () {
		bb.carousel.init();
	});
}(jQuery));

var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		cardGrid: {
            // DOM Objects
            _CardGrid: null,
            // Selectors
            cardGridSelector: '.card-grid',
            // Classes
            // Misc
			init: function() {
				var self = this;

                self._CardGrid = document.querySelectorAll(self.cardGridSelector);
                if (!self._CardGrid) {
                    return;
                }

                for (var i = 0; i < self._CardGrid.length; i++) {
                    var _CardGrid = self._CardGrid[i];
                    self.processGrid(_CardGrid);
                }
			},
            processGrid: function (_CardGrid) {
                var self = this;

                if (!_CardGrid) {
                    return;
                }

                var _Cards = _CardGrid.querySelectorAll('.card');
                var cardLength = _Cards.length;

                if (cardLength) {
                    _CardGrid.classList.add('card-grid--' + cardLength);
                    if (cardLength === 1) {
                        imagesLoaded(_CardGrid, function() {
                            self.setMinHeight(_CardGrid);
                        });
                    }
                }
            },
            setMinHeight: function (_CardGrid) {
                var self = this;

                if (!_CardGrid) {
                    return;
                }

                var _Card = _CardGrid.querySelector('.card');
                var _Image = _Card.querySelector('.card__image');
                var _Inner = _Card.querySelector('.card__inner');

                if (!_Image) {
                    return;
                }

                if (bb.monitorMq.currentBreakpoint < bb.settings.breakPointD) {
                    _Inner.removeAttribute('style');
                    return;
                }

                var paddingTop = window.getComputedStyle(_Inner, null).getPropertyValue('padding-top');
                paddingTop = paddingTop.replace('px', '');
                paddingTop = parseInt(paddingTop, 10);
                var imageHeight = _Image.clientHeight;
                var newHeight = imageHeight + (paddingTop * 2);

                _Inner.style.minHeight = newHeight + 'px';
            },
            resizeEvent: function () {
                var self = this;

                if (!self._CardGrid) {
                    return;
                }

                for (var i = 0; i < self._CardGrid.length; i++) {
                    var _CardGrid = self._CardGrid[i];

                    imagesLoaded(_CardGrid, function() {
                        var _Cards = _CardGrid.querySelectorAll('.card');
                        var cardLength = _Cards.length;

                        if (cardLength && cardLength === 1) {
                            self.setMinHeight(_CardGrid);
                        }
                    });
                }
            }
		}
	});
	$.subscribe('pageReady', function() {
		bb.cardGrid.init(); // this is a fallback incase BE can't do what we need to fulfill the design
	});
    $.subscribe('viewportResizeEnd', function() {
		bb.cardGrid.resizeEvent();
	});
}(jQuery));

/**
 * @file Disable until loaded
 * @author Andy Blackledge <a.blackledge@building-blocks.com>
 */
var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		/**
		 * Removes a disabling CSS class when JS is loaded
		 * @namespace disableUntilLoaded
		 */
		disableUntilLoaded: {
			// jQuery DOM objs
			$disableUntilLoaded: null,
			// CSS selectors
			disableUntilLoadedSelector: '.disabled-until-loaded',
			// Classes
			disableUntilLoadedClass: 'disabled-until-loaded',
			disableUntilLoadedOutClass: 'disabled-until-loaded-out',
			// Misc
			removeDisabledTimeout: null,
			/**
			 * Initialises disableUntilLoaded module. Caches jQuery DOM objects.
			 * @function init
			 * @memberOf disableUntilLoaded
			 */
			init: function() {
				var self = this;

				self.$disableUntilLoaded = $(self.disableUntilLoadedSelector);

				if (self.$disableUntilLoaded.length < 1) {
					return;
				}

				self.removeDisabledTimeout = setTimeout(function() {
					self.removeDisabledClass();
					clearTimeout(self.removeDisabledTimeout);
				}, 500);

			},
			/**
			 * Will remove disabled class from all elements that have it
			 * @function removeDisabledClass
			 * @memberof disableUntilLoaded
			 */
			removeDisabledClass: function() {
				var self = this;

				//self.$disableUntilLoaded.each(function () {
				//var $this = $(this);
				//$this.addClass(self.disableUntilLoadedOutClass);
				self.$disableUntilLoaded.addClass(self.disableUntilLoadedOutClass);

				var removeClassTimeout = setTimeout(function() {
					//$this.removeClass(self.disableUntilLoadedClass);
					//$this.removeClass(self.disableUntilLoadedOutClass);
					self.$disableUntilLoaded.removeClass(self.disableUntilLoadedClass);
					self.$disableUntilLoaded.removeClass(self.disableUntilLoadedOutClass);
					self.$disableUntilLoaded.remove();

					clearTimeout(removeClassTimeout);
				}, 400);
				//});
			}
		}
	});
	$.subscribe('pageLoaded', function() {
		bb.disableUntilLoaded.init();
	});
}(jQuery));

/**
 * @file EqualHeights
 * @author {@link http://building-blocks.com Building Blocks}
 */
var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		/**
		 * Set Equal Height on selected container
		 * @namespace equalHeights
		 */
		equalHeights: {
			bb: null,
			$containers: null,
			init: function() {
				var self = this;

				self.$containers = $('[data-equal-height]');
				if (self.$containers.length > 0) {
					self.setEqualHeight();
				}
			},
			setEqualHeight: function() {
				var self = this;
				if (!self.$containers) {
					return;
				}

				bb.settings.$html.removeClass('equal-heights-added');

				// we're setting a height on certain article-body's in setBodyHeight() and need to remove before recalcing the heights
				self.$containers.find('.equal-heights-body').removeAttr('style');

				if (bb.monitorMq.currentBreakpoint >= bb.settings.breakPointC) {
					self.$containers.conformity({
						'mode': 'height'
					});
				} else {
					// If small screen remove any previously added styles
					self.$containers.each(function() {
						var $this = $(this);
						$this.removeAttr('style');
					});
				}

				// adding a class as a precaution so that if equal-heights/conformity doesn't work doesn't mess up styles that are reliant on it when js is on
				bb.settings.$html.addClass('equal-heights-added');
			}
		}
	});
	$.subscribe('pageLoaded toggled tabs', function() {
		bb.equalHeights.init();
	});
	$.subscribe('viewportResizeEnd', function() {
		bb.equalHeights.setEqualHeight();
	});
}(jQuery));

var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		filterResults: {
            // DOM Objects
            _Filter: null,
            _Selects: null,
            // Selectors
            filterSelector: '.filter-results',
            selectSelector: '.filter-results__select',
            targetSelector: '.filter-results__target',
            actionSelector: '.filter-results__action',
            // Classes
            filterClass: 'filter-results',
            // Misc
            result: null,
			init: function() {
				var self = this;

                self._Filter = document.querySelector(self.filterSelector);
                if (!self._Filter) {
                    return;
                }

                self.bindEvents();
			},
            bindEvents: function () {
                var self = this;

                if (!self._Filter) {
                    return;
                }

                var _Form = self._Filter.querySelector('form');
                _Form.removeEventListener('keydown', self.keydownHandler);
                _Form.addEventListener('keydown', self.keydownHandler);

                var _Actions = document.querySelectorAll(self.actionSelector);
                if (_Actions.length) {
                    for (var i = 0; i < _Actions.length; i++) {
                        var _Action = _Actions[i];
                        _Action.removeEventListener('click', self.actionHandler);
                        _Action.addEventListener('click', self.actionHandler);
                    }
                }

                self._Selects = document.querySelectorAll(self.selectSelector, self.selectSelector + ' select');
                if (self._Selects.length) {
                    for (var j = 0; j < self._Selects.length; j++) {
                        var _Select = self._Selects[j];
                        _Select.removeEventListener('change', self.actionHandler);
                        _Select.addEventListener('change', self.actionHandler);
                    }
                }
            },
            keydownHandler: function (event) {
                var retainInputVal = true;

                if (!event) {
                    return;
                }

                if (event.keyCode === bb.settings.keys.key_return) {
                    event.preventDefault();
                    bb.filterResults.actionHandler(null, this);
                    bb.autocomplete.closeSearch(retainInputVal);
                    return false;
                }
            },
            actionHandler: function (event, _Form) {

                var _This = event ? event.target : _Form;
                if (!_This) {
                    return;
                }

                var _Filter = bb.closestClass(_This, bb.filterResults.filterClass);
                if (!_Filter) {
                    return;
                }

                bb.filterResults.getResults(_This, _Filter);
            },
            getResults: function (_Input, _Filter) {
                var self = this;

                if (!_Input || !_Filter) {
                    return;
                }

                var _Form = _Filter.querySelector('form');
                var dataEndpoint = _Filter.getAttribute('data-filter-results-endpoint');
                var dataMethod = _Filter.getAttribute('data-filter-results-method');

                var formData = bb.getFormData(_Form);
                // console.log(formData);

                if (!formData) {
                    return;
                }

                $.ajax({
                    type: dataMethod,
                    url: dataEndpoint,
                    data: formData,
                    dataType: 'html',
                    cache: false,
                    timeout: bb.settings.globalTimeout,
                    success: function(response) {

                        if (!response) {
                            return;
                        }
                        
                        var parser = new DOMParser();
                        var _HTML = parser.parseFromString(response, "text/html");
                        var _Results = _HTML.querySelector(self.targetSelector);
                        self.response = _Results;
                        if (_Results) {
                            self.appendHTML(_Filter, _Results);
                        }
                    },
                    error: function(xhr) {
                        console.log(xhr.responseText);
                    },
                    complete: function() {
                        clearTimeout(self.ajaxWait);
                    }
                });
            },
            appendHTML: function (_Filter, _Results) {
                var self = this;

                if (!_Filter || !_Results) {
                    return;
                }

                var _Target = _Filter.querySelector(self.targetSelector);
                if (!_Target) {
                    return;
                }

                _Target.innerHTML = '';
                _Target.appendChild(_Results);
                $.publish('ajaxLoaded');
            }
		}
	});
	$.subscribe('pageReady', function() {
		bb.filterResults.init();
	});
}(jQuery));

var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		fixedHeader: {
            // DOM Objects
            _Header: null,
            // Selectors
            headerSelector: '.header',
            // Classes
            // Misc
            headeroom: null,
            headroomOptions: null,
			init: function() {
				var self = this;
                
                self._Header = document.querySelector(self.headerSelector);
                if (!self._Header) {
                    return;
                }

                if (bb.settings.$html.hasClass('sitecore-editor-mode')) {
                    return;
                }

                self.fixHeader();
                // self.setContentMargin();
			},
            setContentMargin: function () {
                var self = this;

                if (!self._Header) {
                    return;
                }

                var headerHeight = self._Header.offsetHeight;
                var _Page = document.querySelector('.page');
                if (!_Page) {
                    return;
                }

                _Page.style.marginTop = headerHeight + 'px';
            },
            fixHeader: function () {
                var self = this;

                if (!self._Header) {
                    return;
                }

                self.headroom = new Headroom(self._Header, {
                    offset: 90,
                    tolerance: {
                        down: 10,
                        up: 10
                    },
                    onPin : function() {
                        // console.log('pin');
                    },
                    onBottom : function() {
                        // console.log('bottom');
                    },
                    onNotTop : function() {
                        // console.log('not top');

                        var timer = setTimeout(function () {
                            bb.stickyHero.rebindElements();
                            clearTimeout(timer);
                        }, 300);
                    }
                });
                self.headroom.init();

                bb.stickyHero.rebindElements();
            }
		}
	});
	$.subscribe('pageReady', function() {
		bb.fixedHeader.init();
	});
    $.subscribe('viewportResizeEnd', function() {
		// bb.fixedHeader.setContentMargin();
	});
}(jQuery));

/**
 * @file Alerts
 * @author {@link http://building-blocks.com Building Blocks}
 */
var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		/**
		 * Show and hide alerts
		 * @namespace alerts
		 */
		alerts: {
			alertWaitTime: 300,
			alertsInClass: 'flash-alerts--in',
			alertInClass: 'alert--in',
			alertOutClass: 'alert--out',
			alertShowClass: 'alert--show',
			alertHideShowClass: 'alert-hide-show',
			$alertsContainer: $('.flash-alerts'),
			/**
			 * Initialises alerts module.
			 * @function init
			 * @memberof alert
			 */
			init: function() {
				var self = this;

				self.$alertsContainer = $('.flash-alerts');

				var $alerts = self.$alertsContainer.find('.alert:not(.' + self.alertInClass + ')');
				if ($alerts.length > 0 && !$alerts.hasClass(self.alertHideShowClass)) {
					self.showAlerts();
				}
				self.$alertsContainer.on('click.alerts', '.alert--dismiss', function(event) {
					self.hideAlert($(this).closest('.alert'));
					event.preventDefault();
				});
				self.formAlerts();
			},
			showContainer: function() {
				var self = this;
				self.$alertsContainer.addClass(self.alertsInClass);
			},
			hideContainer: function() {
				var self = this;
				self.$alertsContainer.removeClass(self.alertsInClass);
			},
			addAlert: function(alertID) {
				var self = this,
					$alert = $('#' + alertID),
					$clone = $alert.clone().removeAttr('id').attr('data-id', alertID);
				if (self.$alertsContainer.find('[data-id=' + alertID + ']').length < 1) {
					self.hideAlerts();
					self.$alertsContainer.find('.flash-alerts-inner').prepend($clone);
					self.showAlerts();
				}
			},
			hideAlerts: function() {
				var self = this,
					$alerts = self.$alertsContainer.find('.alert');
				if ($alerts.length === 0) {
					return false;
				}
				$alerts.each(function(index) {
					var $alert = $(this),
						alertWait;
					alertWait = window.setTimeout(function() {
						self.hideAlert($alert);
						window.clearTimeout(alertWait);
					}, self.alertWaitTime * index);
				});
			},
			hideAlert: function($alert) {
				var self = this;
				if ($alert.length > 0) {

					if (Modernizr.cssanimations) {
						if ($alert.hasClass(self.alertHideShowClass)) {
							$alert.removeClass(self.alertInClass).addClass(self.alertOutClass);
						} else {
							$alert.on(bb.settings.animationEnd, function() {
								$(this).remove();
							}).removeClass(self.alertInClass).addClass(self.alertOutClass);
						}
					} else {
						if ($alert.hasClass(self.alertHideShowClass)) {
							$alert.removeClass(self.alertInClass).addClass(self.alertOutClass);
						} else {
							$alert.removeClass(self.alertInClass).addClass(self.alertOutClass);
							$alert.each(function() {
								$(this).remove();
							});
						}
					}
					if (self.$alertsContainer.find('.alert').length < 1) {
						self.$alertsContainer.removeClass(self.alertsInClass);
					}
				}
			},
			showAlerts: function() {
				var self = this,
					$alerts = self.$alertsContainer.find('.alert:not(.' + self.alertInClass + ')'),
					$hideShowAlerts = self.$alertsContainer.find('.' + self.alertHideShowClass);

				if ($hideShowAlerts.length > 0) {
					$hideShowAlerts.removeClass(self.alertOutClass).addClass(self.alertInClass);
				}

				if ($alerts.length === 0) {
					return false;
				}
				self.showContainer();

				$alerts.reverse().each(function(i) {
					var $alert = $(this),
						timeout = $alert.data('timeout'),
						//in seconds
						alertWait, timeoutWait;
					$alert.addClass(self.alertShowClass);
					alertWait = window.setTimeout(function() {
						$alert.addClass(self.alertInClass);
						if (timeout && timeout > 0) {
							timeoutWait = window.setTimeout(function() {
								self.hideAlert($alert);
								window.clearTimeout(timeoutWait);
							}, timeout * 1000); //convert to miliseconds
						}
						window.clearTimeout(alertWait);
					}, self.alertWaitTime * i);
				});
			},
			formAlerts: function() {
				var self = this,
					$forms = $('[data-alert]:not(.processed)');
				$forms.each(function() {
					var $this = $(this),
						alertID = $this.data('alert'),
						$inputs = $this.find('select,input,textarea').not('[data-alert-ignore]'),
						inputs = 'select,input,textarea';
					$this.addClass('processed');
					$this.on('change.alerts remove.alerts', $inputs, function() {
						var $input = $(this);
						if ($input.is('[data-alert-ignore]')) {
							return false;
						}
						self.addAlert(alertID);
					});
				});
			},
			showAlert: function(type, message, alertUrl) {
				var self = this;
				var flashUrl = alertUrl + '?type=' + encodeURIComponent(type) + '&text=' + encodeURIComponent(message);

				var flashContent = $.get(flashUrl, function(data) {
					self.$alertsContainer.find('.flash-alerts-inner').append(data);
					self.showAlerts();
					self.showContainer();
				});
			}
		}
	});
	$.subscribe('pageReady', function() {
		bb.alerts.init();
	});
	$.subscribe('ajaxLoaded', function() {
		bb.alerts.init();
	});
}(jQuery));

var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		ajaxForms: {
			ajaxWait: null,
			init: function() {
				var self = this;
				bb.settings.$body.on('click.ajaxForms', '.action-form-submit', function(event) {
					var $btn = $(this);
					if ($btn.data('modal')) {
						return true;
					}
					self.eventAction($btn);
					event.preventDefault();
					event.stopPropagation();
				});
				bb.settings.$body.on('change.ajaxForms', '.action-form-refresh, .action-form-refresh select', function(event) {
					var $element = $(this);
					self.eventAction($element);
					event.stopPropagation();
				});
			},
			eventAction: function($element) {
				var self = this,
					$form = $element.closest('form'),
					endpoint = $element.data('endpoint') ? $element.data('endpoint') : $form.data('endpoint'),
					closeModal = $element.data('form-modal-close'),
					validateForm = $element.data('form-validate'),
					targets = $element.data('targets'),
					$targets = $(targets),
					formData = targets ? $targets.serializeArray() : $form.serializeArray(),
					$container = null,
					dataUpdateCart = $element.data('update-cart'),
					updateCart = false;

				//$container = $element.data('container') ? $($element.data('container')) : $form,
				// First check for data-container on button, then on form and finally if no data-container
				// then just use the $form
				if ($element.data('container')) {
					$container = $($element.data('container'));
				} else if ($form.data('container')) {
					$container = $($form.data('container'));
				} else {
					$container = $form;
				}

				if (dataUpdateCart) {
					updateCart = true;
				}

				if ($element.is('button,[type=submit]')) {
					formData.push({
						name: $element.attr('name'),
						value: $element.val()
					});
				}
				$targets.filter('button,[type=submit]').each(function() {
					formData.push({
						name: this.name,
						value: this.value
					});
				});
				console.log(formData);
				if (!self.validateTargets(targets, validateForm, $form)) {
					self.submitForm(endpoint, formData, $container, closeModal, updateCart);
				}
			},
			validateTargets: function(targets, validateForm, $form) {
				var invalid = false;
				if (validateForm) {
					var $targets = targets ? $(targets) : $form.find('[data-val=true]');

					$targets.each(function() {
						var $target = $(this);
						if ($target.css('display') !== 'none' && !$target.valid()) {
							invalid = true;
						}
					});
				}
				return invalid;
			},
			submitForm: function(endpoint, formData, $container, closeModal, updateCart) {
				var self = this;
				if (self.ajaxWait) {
					clearTimeout(self.ajaxWait);
				}
				bb.loader.showLoader();
				if (endpoint) {
					self.ajaxWait = setTimeout(function() {
						$.ajax({
							type: 'POST',
							url: endpoint,
							data: formData,
							dataType: 'html',
							cache: false,
							timeout: bb.settings.globalTimeout,
							success: function(html) {
								$container.replaceWith(html);
								$.publish('ajaxLoaded');
								if (updateCart) {
									self.updateCartNumber(html);
									bb.cart.openCart();
								}
								if (closeModal) {
									bb.modals.closeModal();
								}
							},
							error: function(xhr) {
								bb.genericError.showError(xhr.responseText);
							},
							complete: function() {
								bb.loader.hideLoader();
								clearTimeout(self.ajaxWait);
							}
						});
					}, 300);
				}
			},
			updateCartNumber: function(html) {
				// parse returned ajax html as an object, get the new cart count & replace existing
				var $cartCount = $(html).find('[data-cart-count]'),
					cartCount = $cartCount.data('cart-count');
				if (typeof(cartCount) !== 'undefined') {
					if (bb.cart.$headerCartCount.length > 0) {
						bb.cart.$headerCartCount.empty();
						bb.cart.$headerCartCount.append(cartCount);
					}
				}
			},
			reparseForms: function() {
				if ($.validator.unobtrusive) {
					$.validator.unobtrusive.parse(bb.settings.$body);
				}
			}
		}
	});
	$.subscribe('pageLoaded', function() {
		bb.ajaxForms.init();
	});
	$.subscribe('ajaxLoaded', function() {
		bb.ajaxForms.reparseForms();
	});
}(jQuery));

var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		genericError: {
			init: function() {
				var self = this;
				var $optionMetatag = $('[data-name=modal-error]');
				self.option = $optionMetatag.length ? $optionMetatag.data('content') : false;
			},
			showError: function(html) {
				var self = this;
				if (self.option) {
					// relies on modals.js
					var content = $(html).find(bb.modals.modalFilter).html();
					bb.overlay.openOverlay();
					bb.scrollLock.lock();
					bb.modals.modalIn = true;
					bb.modals.showModal(content);
				}
			}
		}
	});
	$.subscribe('pageReady', function() {
		bb.genericError.init();
	});
}(jQuery));

var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		imgToBg: {
            // DOM Objects
            _ImgToBg: null,
            // Selectors
            imgToBgSelector: '.img-to-bg',
            // Classes
            processedClass: 'img-to-bg-complete',
            // Misc
			init: function() {
				var self = this;
                
                self._ImgToBg = document.querySelectorAll(self.imgToBgSelector);
                if (!self._ImgToBg) {
                    return;
                }

                for (var i = 0; i < self._ImgToBg.length; i++) {
                    var _ImgContainer = self._ImgToBg[i];
                    self.processImg(_ImgContainer);
                }
			},
            processImg: function (_ImgContainer) {
                var self = this;

                if (!_ImgContainer) {
                    return;
                }

                var width = self.getImgSML();
                var dataLrg = _ImgContainer.getAttribute('data-background-image-lrg');
                var dataMed = _ImgContainer.getAttribute('data-background-image-med');
                var dataSmall = _ImgContainer.getAttribute('data-background-image-small');
                var img = null;

                if (!dataLrg || !dataMed || !dataSmall || !width) {
                    return;
                }

                switch (width) {
                    case 'S':
                        img = dataSmall;
                        break;
                    case 'M':
                        img = dataMed;
                        break;
                    case 'L':
                        img = dataLrg;
                        break;
                    default:
                        console.log('imgToBg - something went wrong');
                        return;
                }

                _ImgContainer.style.backgroundImage = 'url(' + img + ')';
                _ImgContainer.classList.add(self.processedClass);
            },
            getImgSML: function () {
                var self = this;

                var currentBP = bb.monitorMq.currentBreakpoint;
                if (currentBP < bb.settings.breakPointD) {
                    return 'S';
                } else if (currentBP < bb.settings.breakPointF && currentBP >= bb.settings.breakPointD) {
                    return 'M';
                } else {
                    return 'L';
                }
            },
            resizeEvent: function () {
                var self = this;

                self._ImgToBg = document.querySelectorAll(self.imgToBgSelector);
                if (!self._ImgToBg) {
                    return;
                }

                for (var i = 0; i < self._ImgToBg.length; i++) {
                    var _ImgContainer = self._ImgToBg[i];
                    _ImgContainer.classList.remove(self.processedClass);
                    self.processImg(_ImgContainer);
                }
            }
		}
	});
	$.subscribe('pageReady', function() {
		bb.imgToBg.init();
	});
    $.subscribe('viewportResizeEnd', function() {
		bb.imgToBg.resizeEvent();
	});
    $.subscribe('ajaxLoaded', function() {
		bb.imgToBg.resizeEvent();
	});
}(jQuery));

var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		loadMore: {
            // DOM Objects
            _Loadmore: null,
            _Actions: null,
            // Selectors
            loadMoreSelector: '.load-more',
            actionSelector: '.load-more__action',
            targetSelector: '.load-more__target',
            // Classes
            loadMoreClass: 'load-more',
            // Misc
            ajaxWait: null,
            result: null,
			init: function() {
				var self = this;
                
                self._Loadmore = document.querySelector(self.loadMoreSelector);
                if (!self._Loadmore) {
                    return;
                }

                self.bindEvents();
			},
            bindEvents: function () {
                var self = this;

                self._Actions = document.querySelectorAll(self.actionSelector);
                if (self._Actions.length) {
                    for (var i = 0; i < self._Actions.length; i++) {
                        var _Action = self._Actions[i];
                        _Action.removeEventListener('click', self.actionHandler);
                        _Action.addEventListener('click', self.actionHandler);
                    }
                }
            },
            actionHandler: function (event) {
                var _This = event.target;
                var _LoadMore = bb.closestClass(_This, bb.loadMore.loadMoreClass);
                if (!_LoadMore) {
                    return;
                }

                bb.loadMore.getMore(_This, _LoadMore);
            },
            getMore: function (_Action, _LoadMore) {
                var self = this;

                if (!_Action || !_LoadMore) {
                    return;
                }

                var _Form = _LoadMore.querySelector('form');
                var dataEndpoint = _LoadMore.getAttribute('data-load-more-endpoint');
                var dataMethod = _LoadMore.getAttribute('data-load-more-method');
                var dataDemoOnly = _Action.getAttribute('data-demo-use-only-please-delete-jordan-or-dave-theres-no-way-you-can-not-see-an-attribute-this-long');
                var dataTake = _Action.getAttribute('data-load-more-take');
                var dataSkip = _Action.getAttribute('data-load-more-skip');

                if (dataDemoOnly) {
                    dataEndpoint = dataDemoOnly;
                }

                var formData = bb.getFormData(_Form);
                formData.push({
                    name: 'take',
                    value: dataTake
                });

                formData.push({
                    name: 'skip',
                    value: dataSkip
                });

                console.log(formData);

                if (!formData) {
                    return;
                }

                $.ajax({
                    type: dataMethod,
                    url: dataEndpoint,
                    data: formData,
                    dataType: 'html',
                    cache: false,
                    timeout: bb.settings.globalTimeout,
                    success: function(response) {

                        if (!response) {
                            return;
                        }

                        var _Parent = _Action.parentNode;
                        _Parent.removeChild(_Action);
                        var parser = new DOMParser();
                        var _HTML = parser.parseFromString(response, "text/html");
                        var _Results = _HTML.querySelector(self.targetSelector);
                        self.response = _Results;
                        if (_Results) {
                            self.appendHTML(_LoadMore, _Results);
                        }
                    },
                    error: function(xhr) {
                        console.log(xhr.responseText);
                    },
                    complete: function() {
                        clearTimeout(self.ajaxWait);
                    }
                });
            },
            appendHTML: function (_LoadMore, _Results) {
                var self = this;

                if (!_LoadMore || !_Results) {
                    return;
                }

                var _Target = _LoadMore.querySelector(self.targetSelector);
                if (!_Target) {
                    return;
                }

                var _Children = _Results.children;
                for (var i = 0; i < _Children.length; i++) {
                    if (!bb.hasClass(_Children[i], 'search__results-count')) {
                        var _HTML = _Children[i].cloneNode(true);
                        _Target.appendChild(_HTML);
                    }
                }

                // _Target.appendChild(_Results);
                $.publish('ajaxLoaded');
            }
		}
	});
	$.subscribe('pageReady', function() {
		bb.loadMore.init();
	});
    $.subscribe('ajaxLoaded', function() {
		bb.loadMore.bindEvents();
	});
}(jQuery));

var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		scrollLock: {
			$fixedItems: null,
			$measure: null,
			$measureRuler: null,
			measureClass: 'scroll-measure',
			storedScrollPos: 0,
			isLocked: false,
			shiftWait: null,
			hasScrollbar: false,
			scrollableSelectors: '.modal-container, .modal-inline-container, .mobile-nav__levels',
			fixedSelectors: 'body, #header, #page',
			init: function() {
				var self = this;
				// list of fixed items to apply width to
				self.$fixedItems = $(self.fixedSelectors);
				// self.$fixedItems = $('*').filter( function () {
				// 	return this.style && this.style.position === 'fixed';
				// });
				self.$measure = $('<div />', {
					'class': self.measureClass
				});
				// we need a paren with a scroll bar
				self.$measureRuler = $('<div />');
				//bb.settings.$body.append(self.$measure.html(self.$measureRuler));
				self.testScrollbar();
			},
			testScrollbar: function() {
				var self = this,
					width1 = 0,
					width2 = 0;
				self.$measure.addClass('scroll');
				width1 = self.$measureRuler.width();
				//window.alert(width1);
				setTimeout(function() {
					width1 = self.$measureRuler.width();
					self.$measure.removeClass('scroll');
					setTimeout(function() {
						width2 = self.$measureRuler.width();
						//window.alert(width2);
						if (width2 > width1) {
							//window.alert('has scrollbars');
							self.hasScrollbar = true;
						}
					}, 30);
				}, 30);
			},
			lock: function() {
				var self = this;
				if (self.isLocked) {
					return;
				}
				self.isLocked = true;
				self.storedScrollPos = bb.settings.$window.scrollTop();
				//window.alert(self.storedScrollPos);
				self.fixWidths(true);
				bb.settings.$body.on('touchmove.scrollLock', function(event) {
					event.stopPropagation();
					event.preventDefault();
				});
				$(self.scrollableSelectors).on('touchmove.scrollLock', function(event) { // @todo add all scrollable overlays
					event.stopPropagation();
				});
				setTimeout(function() {
					if (Modernizr.android) {
						//bb.settings.$body.css({
						//'position': 'fixed',
						//'overflow': 'hidden',
						//'top': self.storedScrollPos * -1
						//});
					}
					bb.settings.$html.addClass('scroll-locked');
				}, 10);
				setTimeout(function() {
					if (Modernizr.ios) {
						bb.settings.$html.addClass('scroll-locked-ios');
					}
				}, 100);
			},
			unlock: function() {
				var self = this;
				if (!self.isLocked) {
					return;
				}
				bb.settings.$body.off('touchmove.scrollLock');
				bb.settings.$html.removeClass('scroll-locked').removeClass('scroll-locked-ios');
				setTimeout(function() {
					if (Modernizr.android) {
						//window.alert(self.storedScrollPos);
						//bb.settings.$htmlbody.scrollTop(self.storedScrollPos);
					}
				}, 10);
				setTimeout(function() {

					self.unfixWidths();
					self.storedScrollPos = null;
					self.isLocked = false;
				}, 100);
			},
			fixWidths: function(force) {
				var self = this;
				if (!self.isLocked && !force) {
					return;
				}
				self.unfixWidths();
				//self.$fixedItems.css('width', self.$measureRuler.innerWidth());
			},
			unfixWidths: function() {
				var self = this;
				//self.$fixedItems.css('width', '');
			}
		}
	});
	$.subscribe('pageReady', function() {
		bb.scrollLock.init();
	});
	$.subscribe('viewportResizeEnd', function() {
		bb.scrollLock.fixWidths();
	});
}(jQuery));

/**
 * @file megaMenu
 * @author Andy Blackledge <a.blackledge@building-blocks.com>
 * @author Richie Coss <r.coss@building-blocks.com>
 */
var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		/**
		 * Controls any megaMenu related functionality
		 * @namespace megaMenu
		 */
		megaMenu: {
			// jQuery DOM objs
			$megaMenu: null,
			$megaMenuAction: null,
			$megaMenuMenu: null,
			$navMenu: null,
			$activeSubMenu: null,
			$activeLi: null,
			// CSS selectors
			megaMenuSelector: '.mega__menu',
			megaMenuActionSelector: '.mega__menu-action',
			megaMenuMenuSelector: '.mega__menu-section',
			navMenuSelector: '.navigation__menu',
			megaMenuInClass: 'mega__menu-in',
			megaMenuMenuInClass: 'mega__menu-section-in',
			megaMenuHoverClass: 'mega__menu-hover',
			// Configuration
			megaMenuOpen: false,
			hovering: false,
			hoverTimeout: null,
			megaMenuCloseTimeout: null,
			menuCloseTimeoutDuration: 1000000,
			/**
			 * Initialises megaMenu module, caches jQuery DOM objs and calls to bind events.
			 * @function init
			 * @memberOf megaMenu
			 */
			init: function() {
				var self = this;

				self.$megaMenu = $(self.megaMenuSelector);

				if (self.$megaMenu.length < 1) {
					return;
				}

				self.$megaMenuMenu = $(self.megaMenuMenuSelector);
				self.$navMenu = $(self.navMenuSelector);

				self.bindEvents(self);
			},
			/**
			 * Binds all megaMenu module events
			 * @function bindEvents
			 * @memberOf megaMenu
			 */
			bindEvents: function() {
				var self = this;

				self.$megaMenu.on('mouseenter.megaMenuIn', function() {
					self.hovering = true;
				});

				self.$navMenu.on('mouseenter.megaMenuIn', function() {
					self.hovering = true;
				});

				bb.settings.$body.on('click.megaMenu', self.megaMenuActionSelector, function(event) {
					event.preventDefault();

					clearTimeout(self.megaMenuCloseTimeout);

					var $this = $(this),
						href = $this.attr('href'),
						$megaMenuMenu = $(href);

					self.$activeLi = $('.mega__menu-action-links .active');

					if (self.$activeLi && self.$activeLi.length > 0) {
						self.$activeLi.removeClass('active');
					}

					if ($megaMenuMenu.hasClass(self.megaMenuMenuInClass)) {
						self.closeMenu($megaMenuMenu);
					} else {
						self.openMenu($this);
					}
				});

				// Close if click anywhere else
				bb.settings.$body.on('click.megaMenu', function(e) {
					if (bb.monitorMq.currentBreakpoint >= bb.settings.breakPointD) {
						var $clickElement = $(e.target),
							$megaMenuContent = $clickElement.closest(self.megaMenuSelector);

						// Check if the header widget handle or widget content has been clicked and don't close if so
						if ($clickElement.hasClass(self.megaMenuActionSelector) || $clickElement.closest(self.megaMenuActionSelector).length > 0 || $megaMenuContent.length > 0 || !self.megaMenuOpen) {
							return;
						}

						self.closeMenu(self.$activeSubMenu);
					}
				});
			},
			/**
			 * Locks scroll if needed, adds CSS classes and styles, hiding menu. Closes menu after timeout.
			 * @function openMenu
			 * @memberOf megaMenu
			 * @param  {[type]} $menuBtn [description]
			 */
			openMenu: function($menuBtn) {
				var self = this;


				var $this = $menuBtn,
					href = $this.attr('href'),
					$closestLi = $this.closest('li'),
					$megaMenuMenu = $(href),
					$activemegaMenuMenu = $('.' + self.megaMenuMenuInClass);

				self.$activeSubMenu = $megaMenuMenu;

				// stop page from scrolling in background
				bb.scrollLock.lock();

				$closestLi.addClass('active');
				self.$activeLi = $closestLi;

				if ($activemegaMenuMenu.length > 0) {
					$activemegaMenuMenu.removeClass(self.megaMenuMenuInClass);
				}

				$megaMenuMenu.addClass(self.megaMenuMenuInClass);

				if (!bb.settings.$html.hasClass(self.megaMenuInClass)) {
					bb.settings.$html.addClass(self.megaMenuInClass);
				}

				self.$megaMenu.removeAttr('style');

				var windowHeight = bb.settings.$window.height(),
					headerHeight = bb.settings.$header.height(),
					visibleBodyHeight = windowHeight - headerHeight,
					megaMenuHeight = self.$megaMenu.height(),
					offset = bb.settings.$header.offset(),
					posY = offset.top - bb.settings.$window.scrollTop();

				// if megaMenu height is more than then visible body height then we need to apply the height to the megaMenu
				// so we can scroll and view the content
				if (megaMenuHeight > visibleBodyHeight) {
					//self.$megaMenu.height(visibleBodyHeight);
				}

				self.$megaMenu.css({
					//top: posY + headerHeight
				});

				self.megaMenuOpen = true;

				self.megaMenuCloseTimeout = setTimeout(function() {
					self.closeMenu($megaMenuMenu);
					clearTimeout(self.megaMenuCloseTimeout);
				}, self.menuCloseTimeoutDuration);
			},
			/**
			 * Removes CSS classes and styles, hiding menu.
			 * @function closeMenu
			 * @memberOf megaMenu
			 * @param  {[type]} $megaMenuMenu [description]
			 */
			closeMenu: function($megaMenuMenu) {
				var self = this;

				if (self.$activeLi && self.$activeLi.length > 0) {
					self.$activeLi.removeClass('active');
				}

				bb.scrollLock.unlock();

				$megaMenuMenu.removeClass(self.megaMenuMenuInClass);
				bb.settings.$html.removeClass(self.megaMenuInClass);
				//self.$megaMenu.removeAttr('style');
				self.megaMenuOpen = false;
			}
		}
	});
	$.subscribe('pageReady', function() {
		bb.megaMenu.init();
	});
}(jQuery));

var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		mobileNav: {
			mobileNavShowClass: 'mobile-nav-show',
			mobileNavInClass: 'mobile-nav-in',
			mobileNavScrollClass: 'mobile-nav-scroll',
			mobileNavLevelOpenClass: 'mobile-nav__level--{0}-in',
			levelInClass: 'mobile-nav__level-in',
			scroll: false,
			$mobileNav: null,
			$levelsContainer: null,
			$levels: null,
			$levelsInner: null,
			transitionSpeed: 400,
			closeTimeout: null,
			openTimeout: null,
			backTimeout: null,
			storedHeight: 0,
			levelOpen: 0,
			scrollPosition: null,
			init: function() {
				var self = this;
				self.$mobileNav = $('.mobile-nav');
				if (!self.$mobileNav.length) {
					self.$mobileNav = null;
					return;
				}
				self.$levelsContainer = $('.mobile-nav__levels');
				self.$levelsInner = $('.mobile-nav__levels-inner');
				self.$levels = $('.mobile-nav__level');

				$('.mobile-nav__levels, .mobile-nav__menu a').swipe({
					// swipe handler for left to right swipe
					swipeRight: function() {
						var $this = $(this),
							$navAltBack = $this.find('.mobile-nav-back');

						if (self.backTimeout) {
							clearTimeout(self.backTimeout);
						}
						var $link = $navAltBack,
							href = $link.attr('href'),
							$target = $(href);
						if ($target.length) {
							// remove
							var currLevelOpenClass = self.mobileNavLevelOpenClass.replace('{0}', self.levelOpen);
							bb.settings.$html.removeClass(currLevelOpenClass);
							// add
							var level = $target.data('level'),
								levelOpenClass = self.mobileNavLevelOpenClass.replace('{0}', level);
							bb.settings.$html.addClass(levelOpenClass);
							$target.addClass(self.levelInClass);
							self.levelOpen = level;
							// hide prev
							self.backTimeout = setTimeout(function() {
								$('.' + self.levelInClass).removeClass(self.levelInClass);
							}, self.transitionSpeed + 30);
						}
						self.setHeight();
					},
					//Default is 75px
					threshold: 75
				});

				bb.settings.$body.on('click.mobileNav', '.mobile-nav-action', function(event) {
					if (bb.settings.$html.hasClass(self.mobileNavInClass)) {
						self.closeMenu();
					} else {
						self.openMenu();
					}
					event.preventDefault();
					// Level 0 parents
				}).on('click.mobileNav', '.mobile-nav-parent', function(event) {
					if (self.backTimeout) {
						clearTimeout(self.backTimeout);
					}
					var $link = $(this),
						href = $link.attr('href'),
						$target = $(href),
						level = $target.data('level'),
						levelOpenClass = self.mobileNavLevelOpenClass.replace('{0}', level);
					bb.settings.$html.addClass(levelOpenClass);
					$target.addClass(self.levelInClass);
					self.levelOpen = level;
					self.setHeight();
					event.preventDefault();
					// Level 1 Parents
				}).on('click.mobileNav', '.mobile-nav-toggle', function(event) {
					var $link = $(this),
						href = $link.attr('href'),
						$target = $(href),
						$parent = $link.closest('li'),
						$menu = $target.find('.mobile-nav__menu');
					self.setHeight();
					event.preventDefault();
					// Level back Links
				}).on('click.mobileNav', '.mobile-nav-back', function(event) {
					if (self.backTimeout) {
						clearTimeout(self.backTimeout);
					}
					var $link = $(this),
						href = $link.attr('href'),
						$target = $(href);
					if ($target.length) {
						// remove
						var currLevelOpenClass = self.mobileNavLevelOpenClass.replace('{0}', self.levelOpen);
						bb.settings.$html.removeClass(currLevelOpenClass);
						// add
						var level = $target.data('level'),
							levelOpenClass = self.mobileNavLevelOpenClass.replace('{0}', level);
						bb.settings.$html.addClass(levelOpenClass);
						$target.addClass(self.levelInClass);
						self.levelOpen = level;
						// hide prev
						self.backTimeout = setTimeout(function() {
							$('.' + self.levelInClass).removeClass(self.levelInClass);
						}, self.transitionSpeed + 30);
					}
					self.setHeight();
					event.preventDefault();
				});

				bb.settings.$page.on('click.mobileNav', function() {
					if (bb.settings.$html.hasClass(self.mobileNavInClass)) {
						self.closeMenu();
					}
				});
				// monitor the scroll of
				self.$levelsContainer.on('scroll.mobileNav', function() {
					self.checkScroll();
				});
				self.$levelsContainer.on('scroll.mobileNav', function() {
					self.checkScroll();
				});
				bb.settings.$page.swipe({
					// swipe handler for left to right swipe
					swipeRight: function() {
						if (bb.settings.$html.hasClass(self.mobileNavInClass)) {
							self.closeMenu();
						}
					},
					//Default is 75px
					threshold: 75
				});
				bb.settings.$page.swipe('disable');
			},
			openMenu: function() {
				var self = this;
				bb.scrollLock.lock();
				if (self.closeTimeout) {
					clearTimeout(self.closeTimeout);
				}
				if (self.openTimeout) {
					clearTimeout(self.openTimeout);
				}
				bb.settings.$html.addClass(self.mobileNavShowClass);
				self.openTimeout = setTimeout(function() {
					self.setHeight();
					self.getScrollPosition();
					bb.settings.$html.addClass(self.mobileNavInClass);
					clearTimeout(self.openTimeout);
				}, 30);

				bb.settings.$page.swipe('enable');
			},
			closeMenu: function() {
				var self = this;
				bb.scrollLock.unlock();
				bb.settings.$html.removeClass(self.mobileNavInClass);
				self.scrollPositionReturn();
				self.closeTimeout = setTimeout(function() {
					bb.settings.$html.removeClass(self.mobileNavShowClass);
					clearTimeout(self.closeTimeout);
				}, self.transitionSpeed + 10);
				bb.settings.$page.swipe('disable');
			},
			checkScroll: function() {
				var self = this,
					navScrollPosition = self.$levelsContainer.scrollTop();
				if (navScrollPosition > 0 && self.scroll) {
					return;
				} else if (navScrollPosition > 0 && !self.scroll) {
					bb.settings.$html.addClass(self.mobileNavScrollClass);
					self.scroll = true;
				} else if (navScrollPosition < 1) {
					bb.settings.$html.removeClass(self.mobileNavScrollClass);
					self.scroll = false;
				}
			},
			setHeight: function() {
				var self = this;
				if (!self.$mobileNav) {
					return;
				}
				self.$levels.filter(':visible').each(function() {
					var $level = $(this),
						levelHeight = $level.outerHeight();
					if (levelHeight > self.storedHeight) {
						self.storedHeight = levelHeight;
					}
					self.$levelsInner.height(self.storedHeight);
				});

			},
			getScrollPosition: function() {
				var self = this;
				self.scrollPosition = bb.settings.$window.scrollTop();
			},
			scrollPositionReturn: function() {
				var self = this;
				bb.settings.$window.scrollTop(self.scrollPosition);
			}
		}
	});
	$.subscribe('pageReady', function() {
		bb.mobileNav.init();
		bb.mobileNav.setHeight();
	});
	$.subscribe('viewportResizeEnd', function() {
		bb.mobileNav.setHeight();
	});
}(jQuery));

var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		modals: {
            // DOM Objects
            _ModalContainer: null,
            _Open: null,
            _Close: null,
            // Selectors
            actionOpenSelector: '.modal-open-action',
            actionCloseSelector: '.modal-close-action',
            modalInnerSelector: '.modal__inner',
            modalTargetSelector: '.modal__target',
            // Classes
            modalInClass: 'modal--in',
            modalShowClass: 'modal--show',
            // Misc
            delay: null,
			init: function() {
				var self = this;

                self._ModalContainer = document.querySelector('.modal-container');
                if (!self._ModalContainer) {
                    console.log('modals: init - no _ModalContainer');
                    return;
                }

                self.bindEvents();
            },
            bindEvents: function () {
                var self = this;

                self._Open = document.querySelectorAll(self.actionOpenSelector);
                if (self._Open.length) {
                    for (var i = 0; i < self._Open.length; i++) {
                        self._Open[i].removeEventListener('click', self.openHandler);
                        self._Open[i].addEventListener('click', self.openHandler);
                    }
                }

                self._Close = self._ModalContainer.querySelector(self.actionCloseSelector);
                if (self._Close) {
                    self._Close.removeEventListener('click', self.closeHandler);
                    self._Close.addEventListener('click', self.closeHandler);
                }

                // modal bg click event
                var _ModalBg = document.querySelector('.modal-container');
                _ModalBg.addEventListener('click', self.modalBgClickHandler);
			},
            openHandler: function (event) {
                var _Btn = event.currentTarget;
                console.log(_Btn);

                var dataClone = _Btn.getAttribute('data-modal-clone');
                if (!dataClone) {
                    console.log('modals: openHandler - no data-modal-clone');
                    return;
                }

                bb.modals.cloneToModal(dataClone);
            },
            closeHandler: function (event) {
                var _Btn = event.currentTarget;
                console.log(_Btn);

                bb.modals.closeModal();
            },
            modalBgClickHandler: function (event) {
                var _Target = event.target;
                if (!_Target) {
                    return;
                }

                if (bb.closestClass(_Target, 'modal__inner')) {
                    return;
                }

                // video click will remove the DOM elements we need before we get to the .modal, so need this to check
                if (bb.closestClass(_Target, 'media-container__video-placeholder')) {
                    return;
                }

                bb.modals.closeModal();
            },
            cloneToModal: function (selector) {
                var self = this;

                if (!selector || !self._ModalContainer) {
                    console.log('modals: cloneToModal - no selector or _ModalContainer');
                    return;
                }

                var _Content = document.querySelector(selector);
                if (!_Content) {
                    console.log('modals: cloneToModal - no _Content');
                    return;
                }
                var _ClonedContent = _Content.cloneNode(true);

                var _Target = self._ModalContainer.querySelector(self.modalTargetSelector);
                if (!_Target) {
                    console.log('modals: cloneToModal - no _Target');
                    return;
                }

                _Target.innerHTML = '';
                _Target.appendChild(_ClonedContent);

                bb.overlay.showOverlay();
                self.openModal();
            },
            openModal: function () {
                var self = this;

                bb.settings._HTML.classList.add(self.modalInClass);

                self.delay = setTimeout(function () {
                    bb.settings._HTML.classList.add(self.modalShowClass);
                    clearTimeout(self.delay);
                }, 50);
                
                $.publish('modalLoaded');
            },
            closeModal: function () {
                var self = this;

                bb.settings._HTML.classList.remove(self.modalShowClass);
                bb.settings._HTML.addEventListener('transitionend', self.removeInClass);
            },
            removeInClass: function (event) {
                bb.settings._HTML.classList.remove(bb.modals.modalInClass);
                bb.settings._HTML.removeEventListener('transitionend', bb.modals.removeInClass);
                bb.overlay.hideOverlay();

                var _Target = bb.modals._ModalContainer.querySelector(bb.modals.modalTargetSelector);
                if (!_Target) {
                    console.log('modals: removeInClass - no _Target');
                    return;
                }

                _Target.innerHTML = '';
            }
		}
	});
	$.subscribe('pageReady', function() {
		bb.modals.init();
	});
    $.subscribe('modalLoaded', function() {
		bb.modals.bindEvents();
	});
}(jQuery));

var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		overlay: {
            // DOM Objects
            _Overlay: null,
            // Selectors
            // Classes
            overlayInClass: 'overlay--in',
            overlayShowClass: 'overlay--show',
            // Misc
            delay: null,
			init: function() {
				var self = this;

                self._Overlay = document.querySelector('.overlay');
			},
            showOverlay: function () {
                var self = this;

                if (!self._Overlay) {
                    return;
                }

                self._Overlay.classList.add(self.overlayInClass);
                bb.settings._HTML.classList.add(bb.settings.scrollLockedClass);
                
                self.delay = setTimeout(function () {
                    self._Overlay.classList.add(self.overlayShowClass);
                    clearTimeout(self.delay);
                }, 50);
            },
            hideOverlay: function () {
                var self = this;

                if (!self._Overlay) {
                    return;
                }

                self._Overlay.classList.remove(self.overlayShowClass);
                bb.settings._HTML.classList.remove(bb.settings.scrollLockedClass);
                self._Overlay.addEventListener('transitionend', self.removeInClass);
            },
            removeInClass: function  (event) {
                var _Overlay = event.target;
                _Overlay.classList.remove(bb.overlay.overlayInClass);
                bb.overlay._Overlay.removeEventListener('transitionend', bb.overlay.removeInClass);
            }
		}
	});
	$.subscribe('pageReady', function() {
		bb.overlay.init();
	});
}(jQuery));

var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		podcast: {
            // DOM Objects
            _Podcasts: null,
            // Selectors
            podcastSelector: '.podcast',
            // Classes
            podcastProcessedClass: 'podcast--processed',
            // Misc
            baseUrl: '//www.podbean.com/media/player/',
			init: function() {
				var self = this;

                self._Podcasts = document.querySelectorAll(self.podcastSelector);
                if (!self._Podcasts) {
                    return;
                }

                for (var i = 0; i < self._Podcasts.length; i++) {
                    var _Podcast = self._Podcasts[i];
                    self.addPodcast(_Podcast);
                }
			},
            addPodcast: function (_Podcast) {
                var self = this;

                if (!_Podcast) {
                    return;
                }

                if (bb.hasClass(_Podcast, self.podcastProcessedClass)) {
                    return;
                }

                var _Target = _Podcast.querySelector('.podcast-target');
                var dataId = _Podcast.getAttribute('data-podcast-id');
                var dataSkin = _Podcast.getAttribute('data-podcast-skin');
                var dataAutoplay = _Podcast.getAttribute('data-podcast-autoplay');
                var dataDownload = _Podcast.getAttribute('data-podcast-download');
                var dataHeight = _Podcast.getAttribute('data-podcast-height');
                var url = self.baseUrl;

                if (!dataId || !_Target) {
                    return;
                }
                
                var skin = dataSkin ? dataSkin : '4';
                var autoplay = dataAutoplay === 'true' ? '1' : '0';
                var download = dataDownload === 'true' ? '1' : '0';
                var _Iframe = document.createElement('iframe');
                var height = dataHeight ? dataHeight : 100;

                url = url + dataId + '?from=site&fonts=Helvetica' + '&skin=' + skin + '&auto=' + autoplay + '&download=' + download;
                _Iframe.src = url;
                _Iframe.height = height;
                _Iframe.width = '100%';
                _Iframe.frameBorder = '0';
                _Iframe.scrolling = 'no';
                _Iframe.setAttribute('data-name', 'pb-iframe-player');

                _Target.appendChild(_Iframe);
                _Podcast.classList.add(self.podcastProcessedClass);
            }
		}
	});
	$.subscribe('pageReady', function() {
		bb.podcast.init();
	});
}(jQuery));

/**
 * @file Remove element module
 * @author {@link mailto:r.coss@building-blocks.com Richie Coss}
 */
var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		/**
		 * Remove an elements parent.
		 * @namespace removeElement
		 */
		removeElement: {
			// CSS selectors
			input: '.remove-item',
			item: '.remove-container',
			/**
			 * Initialises removeElement module. Caches jQuery DOM objects.
			 * @function init
			 * @memberof removeElement
			 */
			init: function() {
				var self = this;

				self.$input = $(self.input);

				self.bindEvents();
			},
			/**
			 * Binds all removeElement related events.
			 * @function bindEvents
			 * @memberof removeElement
			 */
			bindEvents: function() {
				var self = this;

				self.$input.on('click', function() {
					var $link = $(this),
						$wrapper = $link.closest(self.list);

					$link.closest(self.item).remove();
				});
			}
		}
	});
	$.subscribe('pageReady', function() {
		bb.removeElement.init();
	});
}(jQuery));

/**
 * @file searchExpand module
 * @author {@link http://building-blocks.com Building Blocks}
 */
var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		/**
		 * searchExpand related methods.
		 * @namespace searchExpand
		 */
		searchExpand: {
			// jQuery DOM caching
			$search: null,
			$action: null,
			// selectors
			searchSelector: '.search',
			actionSelector: '.search__action',
			inputContainerSelector: '.search__input-container',
			searchInputSelector: '.search__input',
			// Classes
			searchInClass: 'search--in',
            searchShowClass: 'search--show',
			// Misc
			/**
			 * Initialises searchExpand module. Caches jQuery DOM objects.
			 * @function init
			 * @memberof searchExpand
			 */
			init: function() {
				var self = this;

				self.$search = $(self.searchSelector);
				if (self.$search.length < 1) {
					return;
				}

				self.bindEvents();
			},
			bindEvents: function () {
				var self = this;

				self.$action = $(self.actionSelector);
				self.$action.on('click.searchExpand', function (e) {
					e.preventDefault();
					var $this = $(this);
					var $container = $this.closest(self.searchSelector);

					if ($container.hasClass(self.searchInClass)) {
						self.contract($container);
					} else {
						self.expand($container);
					}
				});
			},
			expand: function ($container) {
				var self = this;

				if (!$container) {
					return;
				}

                if (bb.monitorMq.currentBreakpoint >= bb.settings.breakPointF) {
                    return;
                }

				var $inputContainer = $container.find(self.inputContainerSelector);
				var $input = null;
				if ($inputContainer && $inputContainer.length > 0) {
					$input = $inputContainer.find(self.searchInputSelector);

					if ($input && $input.length > 0) {
						var inputWidth = $input.outerWidth(true);
						$input.focus();
					}
				}

				$container.addClass(self.searchInClass);
			},
			contract: function ($container) {
				var self = this;

				if (!$container) {
					return;
				}

				var $inputContainer = $container.find(self.inputContainerSelector);
				if ($inputContainer && $inputContainer.length > 0) {
					$inputContainer.removeAttr('style');
				}

				$container.removeClass(self.searchInClass);
			}
		}
	});
	$.subscribe('pageReady', function() {
		bb.searchExpand.init();
	});
}(jQuery));
var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		searchFilters: {
            // DOM Objects
            _SearchFilters: null,
            // Selectors
            searchFiltersSelector: '.search-filters',
            resultsHeadingSelector: '.search__results-heading',
            resultsSelector: '.search__results',
            checkboxSelector: '.filter-checkbox',
            // Classes
            // Misc
			init: function() {
				var self = this;
                
                self._SearchFilters = document.querySelectorAll(self.searchFiltersSelector);
                if (!self._SearchFilters) {
                    return;
                }
                
                self.bindEvents();
			},
            bindEvents: function () {
                var self = this;

                var _Checkboxes = document.querySelectorAll(self.checkboxSelector);
                for (var i = 0; i < _Checkboxes.length; i++) {
                    var _Checkbox = _Checkboxes[i];
                    _Checkbox.addEventListener('change', self.handleCheckbox);
                }

                var _Selects = document.querySelectorAll('.filter-select select');
                for (var j = 0; j < _Selects.length; j++) {
                    var _Select = _Selects[j];
                    _Select.addEventListener('change', self.handleSelect);
                }

                var _Clears = document.querySelectorAll('.clear-filters-action');
                for (var k = 0; k < _Clears.length; k++) {
                    var _Clear = _Clears[k];
                    _Clear.addEventListener('click', self.handleClear);
                }

                var _Applys = document.querySelectorAll('.apply-filters-action');
                for (var l = 0; l < _Applys.length; l++) {
                    var _Apply = _Applys[l];
                    _Apply.addEventListener('click', self.handleApply);
                }
            },
            handleCheckbox: function (event) {
                if (!event) {
                    return;
                }

                var _Container = bb.closestClass(event.target, 'search-filter');
                if (!_Container) {
                    return;
                }

                var _Target = event.target;
                bb.searchFilters.updateUrl(_Target, _Container);

                var currentBreakpoint = bb.monitorMq.currentBreakpoint;
                var largescreenBP = bb.settings.breakPointF;

                if (currentBreakpoint >= largescreenBP) {
                    bb.searchFilters.updateFilterCount(_Container);
                    bb.searchFilters.getFormValues(_Container);
                }
            },
            handleSelect: function (event) {
                if (!event) {
                    return;
                }

                var _Container = bb.closestClass(event.target, 'search-filter');
                if (!_Container) {
                    return;
                }

                var _Target = event.target;
                bb.searchFilters.updateUrl(_Target, _Container);
                bb.searchFilters.getFormValues(_Container);
            },
            handleClear: function (event) {
                if (!event) {
                    return;
                }
                event.preventDefault();

                var _FilterContainer = bb.closestClass(event.target, 'search__filters');
                if (!_FilterContainer) {
                    return;
                }
                bb.searchFilters.clearCheckboxes(_FilterContainer);
            },
            handleApply: function (event) {
                var self = this;

                if (!event) {
                    return;
                }
                event.preventDefault();

                var _Container = bb.closestClass(event.target, 'search-filter');
                if (!_Container) {
                    return;
                }

                bb.showHide.closeAll(_Container);
                bb.searchFilters.updateFilterCount(_Container);
                bb.searchFilters.getFormValues(_Container);
            },
            updateUrl: function (_Target, _Container) {
                var self = this;
                var updatedUrl = null;
                var queryString = null;

                if (!_Target || !_Container) {
                    return;
                }
                
                // get current url minus query string
                var currentUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
                // console.log(currentUrl);

                // get search term
                var searchTerm = _Container.getAttribute('data-search-filter-term');
                queryString = '?q=' + encodeURIComponent(searchTerm);

                // get sort value
                var _Sort = _Container.querySelector('.search__results-sort select');
                var sortVal = _Sort.value;
                queryString = queryString + '&sort=' + sortVal;

                // get facets values
                var _Facets = _Container.querySelectorAll('.search__filters-facets input');
                for (var i = 0; i < _Facets.length; i++) {
                    var input = _Facets[i];

                    if (input.checked) {
                        queryString = queryString + '&tag=' + input.id;
                    }
                }

                updatedUrl = currentUrl + queryString;
                window.history.pushState({path: updatedUrl}, '', updatedUrl);
            },
            clearCheckboxes: function (_FilterContainer) {
                var self = this;

                if (!_FilterContainer) {
                    return;
                }

                var _Checkboxes = _FilterContainer.querySelectorAll(self.checkboxSelector);
                for (var i = 0; i < _Checkboxes.length; i++) {
                    var _Checkbox = _Checkboxes[i];
                    _Checkbox.checked = false;
                }

                var _Container = bb.closestClass(_FilterContainer, 'search-filter');
                if (!_Container) {
                    return;
                }

                bb.showHide.closeAll(_Container);
                bb.searchFilters.updateFilterCount(_Container);
                bb.searchFilters.getFormValues(_Container);          
            },
            countCheckboxes: function (_Container) {
                var self = this;

                if (!_Container) {
                    return;
                }

                var count = 0;
                var _Checkboxes = _Container.querySelectorAll(self.checkboxSelector);
                for (var i = 0; i < _Checkboxes.length; i++) {
                    var _Checkbox = _Checkboxes[i];
                    if (_Checkbox.checked) {
                        count++;
                    }
                }
                // console.log(count);
                return count;
            },
            updateFilterCount: function (_Container) {
                var self = this;

                if (!_Container) {
                    return;
                }

                var _CountContainer = _Container.querySelector('.search__filters-title');

                var _Count = _Container.querySelector('.search__filters-title-amount');
                if (!_CountContainer || !_Count) {
                    return;
                }
                
                var count = self.countCheckboxes(_Container);

                if (count < 1) {
                    _CountContainer.classList.add('search__filters-title-amount--out');
                } else {
                    _CountContainer.classList.remove('search__filters-title-amount--out');
                }

                _Count.innerHTML = count;
            },
            getFormValues: function (_Container, returnValues) {
                var self = this;

                if (!_Container) {
                    return;
                }
                
                var _Form = _Container.querySelector('form');
                var formData = bb.getFormData(_Form);

                if (!formData) {
                    return;
                }
                // console.log(formData);

                if (returnValues) {
                    return formData;
                } else {
                    self.sendData(_Container, formData);
                }
            },
            sendData: function (_Container, formData) {
                var self = this;

                if (!_Container || !formData) {
                    return;
                }

                var dataEndpoint = _Container.getAttribute('data-search-filter-endpoint');
                var dataMethod = _Container.getAttribute('data-search-filter-method');
                var dataSearchTerm = _Container.getAttribute('data-search-filter-term');
                var _AmountsTarget = _Container.querySelector('.search__results-amount-target');
                var _ResultsTarget = _Container.querySelector('.search__results-target');

                formData.push({
                    name: 'searchTerm',
                    value: dataSearchTerm
                });

                $.ajax({
                    type: dataMethod,
                    url: dataEndpoint,
                    data: formData,
                    dataType: 'html',
                    cache: false,
                    timeout: bb.settings.globalTimeout,
                    success: function(response) {

                        if (!response) {
                            return;
                        }
                        
                        var parser = new DOMParser();
                        var _HTML = parser.parseFromString(response, "text/html");
                        var _Amounts = _HTML.querySelector('.search__results-amount');
                        var _Results = _HTML.querySelector('.search__results');
                        // self.response = _Results;
                        if (_Amounts) {
                            self.appendHTML(_AmountsTarget, _Amounts);
                        }

                        if (_Results) {
                            self.appendHTML(_ResultsTarget, _Results);
                        }
                    },
                    error: function(xhr) {
                        console.log(xhr.responseText);
                    },
                    complete: function() {
                        clearTimeout(self.ajaxWait);
                    }
                });
            },
            appendHTML: function (_Target, _HTML) {
                var self = this;

                if (!_Target || !_HTML) {
                    return;
                }

                _Target.innerHTML = '';
                _Target.appendChild(_HTML);
                $.publish('ajaxLoaded');
            }
		}
	});
	$.subscribe('pageReady', function() {
		bb.searchFilters.init();
	});
}(jQuery));

var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		showHide: {
            // DOM Objects
            _ShowHide: null,
            // Selectors
            showHideSelector: '.show-hide',
            actionSelector: '.show-hide__action',
            // Classes
            showHideInClass: 'show-hide--in',
            // Misc
			init: function() {
				var self = this;
                
                self._ShowHide = document.querySelectorAll(self.showHideSelector);
                if (!self._ShowHide) {
                    return;
                }
                
                self.bindEvents();
                self.pageResize();
			},
            bindEvents: function () {
                var self = this;

                var _Actions = document.querySelectorAll(self.actionSelector);
                for (var i = 0; i < _Actions.length; i++) {
                    var _Action = _Actions[i];
                    _Action.addEventListener('click', self.handleClick);
                }
            },
            handleClick: function (event) {
                if (!event) {
                    return;
                }

                var _Target = event.target;
                var _ShowHide = bb.closestClass(_Target, 'show-hide');
                if (_ShowHide) {
                    bb.showHide.toggleShowHide(_ShowHide);
                }
            },
            toggleShowHide: function (_ShowHide) {
                var self = this;
                
                if (!_ShowHide) {
                    return;
                }

                var isIn = bb.hasClass(_ShowHide, self.showHideInClass);
                if (isIn) {
                    _ShowHide.classList.remove(self.showHideInClass);
                } else {
                    _ShowHide.classList.add(self.showHideInClass);
                }
            },
            closeAll: function (_Container) {
                var self = this;

                if (!_Container) {
                    return;
                }

                var _ShowHides = _Container.querySelectorAll(self.showHideSelector);
                for (var i = 0; i < _ShowHides.length; i++) {
                    var _ShowHide = _ShowHides[i];
                    _ShowHide.classList.remove(self.showHideInClass);
                }
            },
            pageResize: function () {
                var self = this;

                if (bb.monitorMq.currentBreakpoint >= bb.settings.breakPointF) {
                    return;
                }

                if (!self._ShowHide) {
                    return;
                }

                for (var i = 0; i < self._ShowHide.length; i++) {
                    var _Container = self._ShowHide[i].parentElement;
                    self.closeAll(_Container);
                }
            }
		}
	});
	$.subscribe('pageReady', function() {
		bb.showHide.init();
	});
    $.subscribe('viewportResizeEnd', function() {
		// bb.showHide.pageResize();
	});
}(jQuery));

/**
 * @file social-share module
 * @author {@link http://building-blocks.com Building Blocks}
 */
var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		/**
		 * socialShare related methods.
		 * @namespace socialShare
		 */
		socialShare: {
			// DOM caching
			_Socialshare: null,
			_SocialAction: null,
			// CSS selectors
			socialShareSelector: '.social-share__item',
			socialActionSelector: '.social-share__action',
			// Misc
			test: null,
			width: 0,
			height: 0,
			top: 0,
			left: 0,
			options: null,
			/**
			 * Initialises socialShare module. Caches jQuery DOM objects.
			 * @function init
			 * @memberof socialShare
			 */
			init: function() {
				var self = this;

				self._Socialshare = document.querySelectorAll(self.socialShareSelector);
				if (self._Socialshare.length < 1) {
					return;
				}

				self.bindEvents();
				self.getWindowDims();
			},
			bindEvents: function() {
				var self = this;

				self._SocialAction = document.querySelectorAll(self.socialActionSelector);
				for (var i = 0; i < self._SocialAction.length; i++) {
					self._SocialAction[i].addEventListener('click', self.socialActionHandler);
				}
			},
			socialActionHandler: function(event) {
				// In here 'this' is the button that was clicked on
				// to reference other functions in this module the whole path will need to be used - bb.socialShare
				event.preventDefault();

				if (!this) {
					return;
				}
				var url = this.getAttribute('href');

				if (url) {
					bb.socialShare.openWindow(url);
					return;
				}
			},
			openWindow: function(url) {
				var self = this;

				if (!url) {
					return;
				}

				window.open(url, 'Share', self.options);
			},
			getWindowDims: function() {
				var self = this;

				// set default window options
				self.width = Math.round(window.screen.width / 2);
				self.height = Math.round(window.screen.height / 2);
				self.top = Math.round(self.height * 0.5);
				self.left = Math.round(self.width * 0.5);
				self.options = 'top=' + self.top + ',left=' + self.left + ',toolbar=0,status=0,width=' + self.width + ',height=' + self.height;
			},
		}
	});
	$.subscribe('pageReady', function() {
		bb.socialShare.init();
	});
	$.subscribe('viewportResizeEnd', function() {
		bb.socialShare.getWindowDims();
	});
}(jQuery));
/**
 * @file Sticky hero
 * @author {@link https://github.com/buildingblocks Building Blocks}
 */
var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		/**
		 * stickyhero related methods.
		 * @namespace stickyhero
		 */
		stickyHero: {
			headerSelector: '.header',
			headerStickySelector: '.header--sticky',
			heroSelector: '.hero--sticky',
			heroContentSelector: '.hero--sticky .hero__inner',
			fixedClass: 'hero--fixed',
			headerFixedStatus: false,
			/**
			 * Initialises stickyhero module. Caches jQuery DOM objects.
			 * @function init
			 * @memberof stickyhero
			 */
			init: function() {
				var self = this;

				self.$header = $(self.headerSelector);
				self.$headerSticky = $(self.headerStickySelector);
				self.$hero = $(self.heroSelector);
				self.$heroContent = $(self.heroContentSelector);

				// If hero isn't present then return
				// from function
				if (self.$hero.length < 1) {
					return;
				}

				// If Header sticky element is present
				// set fixed status to true
				if (self.$headerSticky.length > 0) {
					self.headerFixedStatus = true;
				}

				// bind events
				self.bindEvents();
			},
            rebindElements: function () {
                var self = this;
                
                self.$header = $(self.headerSelector);
				self.$headerSticky = $(self.headerStickySelector);
				self.$hero = $(self.heroSelector);
				self.$heroContent = $(self.heroContentSelector);
                self.checkScroll();
            },
			/**
			 * Binds all events.
			 * @function bindEvents
			 * @memberof stickyhero
			 */
			bindEvents: function() {
				var self = this;

				self.checkScroll();

				bb.settings.$window.on('scroll.stickyhero', function() {
					self.checkScroll();
				});
			},
			checkScroll: function() {
                var self = this;

                if (!self.$hero || self.$hero.length < 1) {
                    return;
                }

				var scrollPosition = bb.settings.$window.scrollTop(),
					heroFixed = $('.hero--fixed'),
					heroBottom = $('.hero--bottom'),
					headerHeight = self.$header.outerHeight(),
					heroWidth = self.$hero.width(),
					heroOffset = self.$hero.offset().top,
					heroHeight = self.$heroContent.outerHeight(),
					contentHeight = bb.settings.$main.outerHeight(),
					documentHeight = bb.settings.$body.outerHeight(),
					scrollLimit = contentHeight;
                
                var heroHeightB = self.$hero.height();
                var heroTop = self.$hero.offset().top;
                var heroBottomB = heroTop + heroHeightB;

                var $headerPinned = $('.headroom--pinned');
                if ($headerPinned && $headerPinned.length > 0) {
                    var pinnedHeight = $headerPinned.height();
                    heroBottomB = heroBottomB - pinnedHeight;
                }

				// IF header fixed:
				if (self.$headerSticky.length > 0) {
					self.headerFixedStatus = true;
				}
				// Take header height from offsets/heights
				// due to header element/height being out of
				// document flow/height
				if (self.headerFixedStatus === true) {

					// If header info element is present
					// AND at desktop
					// Add height of header info element to
					// header height for accurate offset

					scrollLimit = scrollLimit - headerHeight - heroHeight;
					heroOffset = (heroOffset + heroHeight) - headerHeight;
				}

				if (scrollPosition >= heroOffset && heroBottom.length < 1) {
					self.stickhero(headerHeight, heroWidth);
				}

				// if (scrollPosition < heroOffset && heroFixed.length) {
                if (scrollPosition <= heroBottomB) {
					self.unstickhero();
				}

				// If BP is at Desktop
				// Return from function to
				// preventing fixing hero
				if (bb.monitorMq.currentBreakpoint < bb.settings.breakPointE) {
					return;
				}

				if (scrollPosition < scrollLimit && heroBottom.length) {
					self.fixhero(headerHeight);
				}

				// if (scrollPosition >= scrollLimit && heroFixed.length) {
                if (scrollPosition <= heroBottomB) {
					self.unfixhero(scrollLimit, headerHeight, heroOffset);
				}
			},
			stickhero: function(headerHeight, heroWidth) {
				var self = this;
                
                if (bb.monitorMq.currentBreakpoint < bb.settings.breakPointF) {
                    var heroHeight = self.$hero.height();
                    self.$hero.height(heroHeight);
                }
				self.$heroContent.addClass(self.fixedClass);

				if (bb.monitorMq.currentBreakpoint < bb.settings.breakPointE) {
					// self.$heroContent.css('width', '100%');
				}

				if (bb.monitorMq.currentBreakpoint > bb.settings.breakPointD) {
					// self.$heroContent.css('width', heroWidth);
				}

				// We need to know if the header is currently fixed/pinned to the top of the screen
                // The original logic was checking to see if the class 'header-sticky' was on the pageReady, not whether the header/nav was pinned
                // if (self.headerFixedStatus === true) {
                var $headerPinned = $('.headroom--pinned, .headroom--not-top:not(.headroom--unpinned)');
                if ($headerPinned && $headerPinned.length > 0) {
                    var pinnedHeight = $headerPinned.height();
					self.$heroContent.css('top', pinnedHeight);
				} else {
                    if (bb.monitorMq.currentBreakpoint >= bb.settings.breakPointF) {
                        self.$heroContent.css('top', 0);
                    } else {
                        var $header = $('.header');
                        var headerHeightB = $header.height();
                        self.$heroContent.css('top', headerHeight);
                    }
                }
			},
			unstickhero: function() {
				var self = this;

                if (bb.monitorMq.currentBreakpoint < bb.settings.breakPointF) {
                    // self.$hero.height('auto');
                    self.$hero.removeAttr('style');
                }
				self.$heroContent.removeClass(self.fixedClass);
			},
			fixhero: function(headerHeight) {
				var self = this,
					top = self.headerFixedStatus === true ? headerHeight : 0;
                
                if (bb.monitorMq.currentBreakpoint < bb.settings.breakPointF) {
                    var heroHeight = self.$hero.height();
                    self.$hero.height(heroHeight);
                }

				self.$heroContent.addClass(self.fixedClass);
				self.$heroContent.css('top', top);
			},
			unfixhero: function(scrollLimit, headerHeight, heroOffset) {
				var self = this,
					top = scrollLimit - heroOffset;

                if (bb.monitorMq.currentBreakpoint < bb.settings.breakPointF) {
                    // self.$hero.height('auto');
                    self.$hero.removeAttr('style');
                }

				// console.log('unfix: ' + top);
				self.$heroContent.removeClass(self.fixedClass);
				self.$heroContent.css('top', top);
			}
		}
	});
	$.subscribe('pageReady', function() {
		bb.stickyHero.init();
	});

	$.subscribe('viewportResizeEnd', function() {
		bb.stickyHero.init();
	});
}(jQuery));

/**
 * @file videoContainer
 * @author {@link http://building-blocks.com Building Blocks}
 */
var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		/**
		 * Menu related methods.
		 * @namespace videoContainer
		 */
		videoContainer: {
			// CSS selectors
			videoContainerSelector: '.media-container__video',
			videoPlaceholderSelector: '.media-container__video-placeholder',
			// jQuery DOM caching
			$videoContainer: null,
			$videoPlaceholder: null,

			/**
			 * Initialises videoContainer module. Caches jQuery DOM objects.
			 * @function init
			 * @memberof videoContainer
			 */
			init: function() {
				var self = this;

				self.$videoContainer = $(self.videoContainerSelector);
				self.$videoPlaceholder = $(self.videoPlaceholderSelector);

				if (!self.$videoContainer) {
					return;
				}

				if (!Modernizr.videoautoplay) {
					$.each(self.$videoPlaceholder, function(key, value) {
						self.$videoPlaceholder = $(this);
						var videoID = $(this).attr('data-video');
						var $videoPlaceholder = $(this);
						self.loadVideoPlayer(videoID, $videoPlaceholder);
					});
				}

				self.bindEvents();
			},
			/**
			 * binds videoContainer events
			 * @function bindEvents
			 * @memberOf videoContainer
			 */
			bindEvents: function() {
				var self = this;

				self.$videoPlaceholder.on('click.videoContainer', function(event) {
					event.preventDefault();

					var videoID = $(this).attr('data-video');
					var $videoPlaceholder = $(this);
					self.loadVideoPlayer(videoID, $videoPlaceholder);
				});
			},
			loadVideoPlayer: function(videoID, $videoPlaceholder) {
				var self = this;

				var videoReplace = '<iframe src="' + videoID + '" allowfullscreen></iframe>';
				$videoPlaceholder.replaceWith(videoReplace);
			}
		}
	});
	$.subscribe('pageReady', function() {
		bb.videoContainer.init();
	});
    $.subscribe('modalLoaded', function() {
		bb.videoContainer.init();
	});
}(jQuery));

// uses https://andrz.me/magnificent.js/examples/demo/
var bb = bb ? bb : {};
(function($) {
	$.extend(bb, {
		zoomImage: {
            // DOM Objects
            $zoom: null,
            $modalZoom: null,
            // Selectors
            modalZoomSelector: '.modal .zoom',
            zoomSelector: '.zoom',
            actionInSelector: '.zoom__action-in',
            actionOutSelector: '.zoom__action-out',
            // Classes
            zoomBtnHiddenClass: 'zoom__btn--hidden',
            // Misc
            maxZoom: 3,
            preinit: function () {
                var self = this;

                self.$zoom = $(self.zoomSelector);
                if (!self.$zoom) {
                    return;
                }

                var script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = '/_scripts/magnificent-zoom-combined.js';
                document.body.appendChild(script);
            },
			init: function() {
				var self = this;

                self.$modalZoom = $(self.modalZoomSelector);
                if (!self.$modalZoom) {
                    return;
                }

                self.$modalZoom.each(function () {
                    var $modalZoom = $(this);
                    $modalZoom.imagesLoaded(function () {
                        self.processZoom($modalZoom);
                    });
                });
			},
            processZoom: function ($zoom) {
                var self = this;

                if (!$zoom) {
                    return;
                }

                var $zoomInAction = $zoom.find('.zoom__action-in');
                var $zoomOutAction = $zoom.find('.zoom__action-out');
                var $zoomThumb = $zoom.find('.zoom__thumb');
                var $controls = $zoom.find('.zoom__controls');

                $zoomThumb.mag({
                    position: 'drag',
                    toggle: false,
                    positionEvent: 'hold',
                    zoomMin: 1,
                    zoomMax: 10,
                    initial: {
                        zoom: 3,
                        focus: {
                            x: 0.5,
                            y: 0.2
                        }
                    }
                });

                $controls.magCtrl({
                    mag: $zoomThumb
                });

                self.bindEvents($zoom, $zoomThumb);
            },
            bindEvents: function ($zoom, $zoomThumb) {
                var self = this;

                if (!$zoom || !$zoomThumb) {
                    return;
                }

                var $actionIn = $zoom.find(self.actionInSelector);
                $actionIn.on('click', function () {
                    var $this = $(this);
                    self.zoomHandler($this, 'zoom-in');
                });

                var $actionOut = $zoom.find(self.actionOutSelector);
                $actionOut.on('click', function () {
                    var $this = $(this);
                    self.zoomHandler($this, 'zoom-out');
                });

                $zoomThumb.on('compute', function (e) {
                    var mag = $(this).data('mag');
                    var model = mag.model;
                    var $zoomLevel = $zoom.find('.zoom__zoom-level');
                    var zoomNumber = model.zoom.toFixed(1) - 2;

                    $zoomLevel.html(
                        '<span>' + zoomNumber + 'x</span>'
                    );
                });
            },
            zoomHandler: function ($btn, zoom) {
                var self = this;

                if (!$btn || !zoom) {
                    return;
                }

                var $zoom = $btn.closest(self.zoomSelector);
                if (!$zoom) {
                    return;
                }
                var $zoomInAction = $zoom.find(self.actionInSelector);
                var $zoomOutAction = $zoom.find(self.actionOutSelector);

                var dataZoom = $zoom.attr('data-zoom-level');
                var zoomInt = parseInt(dataZoom, 10);

                if (zoom === 'zoom-out') {
                    if (zoomInt > 0) {
                        zoomInt = zoomInt - 1;
                    }

                    if (zoomInt === 0) {
                        $zoomOutAction.addClass(self.zoomBtnHiddenClass);
                    }

                    $zoomInAction.removeClass(self.zoomBtnHiddenClass);
                    $zoom.attr('data-zoom-level', zoomInt);
                } else if (zoom === 'zoom-in') {
                    if (zoomInt < self.maxZoom) {
                        zoomInt = zoomInt + 1;
                    }

                    if (zoomInt === self.maxZoom) {
                        $zoomInAction.addClass(self.zoomBtnHiddenClass);
                    }

                    $zoomOutAction.removeClass(self.zoomBtnHiddenClass);
                    $zoom.attr('data-zoom-level', zoomInt);
                }

            }
		}
	});
    $.subscribe('pageReady', function() {
		bb.zoomImage.preinit();
	});
	$.subscribe('modalLoaded', function() {
		bb.zoomImage.init();
	});
}(jQuery));

(function() {
	var init = (bb !== undefined) ? bb.pageReady() : null;
}());
