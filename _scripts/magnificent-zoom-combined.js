/* The Magnificent jQuery plugin is modified from the original  */
/* ZOOM 01 - BRIDGET */
/**
 * Bridget makes jQuery widgets
 * v1.1.0
 * MIT license
 */

( function( window ) {

'use strict';

// -------------------------- utils -------------------------- //

var slice = Array.prototype.slice;

function noop() {}

// -------------------------- definition -------------------------- //

function defineBridget( $ ) {

// bail if no jQuery
if ( !$ ) {
  return;
}

// -------------------------- addOptionMethod -------------------------- //

/**
 * adds option method -> $().plugin('option', {...})
 * @param {Function} PluginClass - constructor class
 */
function addOptionMethod( PluginClass ) {
  // don't overwrite original option method
  if ( PluginClass.prototype.option ) {
    return;
  }

  // option setter
  PluginClass.prototype.option = function( opts ) {
    // bail out if not an object
    if ( !$.isPlainObject( opts ) ){
      return;
    }
    this.options = $.extend( true, this.options, opts );
  };
}

// -------------------------- plugin bridge -------------------------- //

// helper function for logging errors
// $.error breaks jQuery chaining
var logError = typeof console === 'undefined' ? noop :
  function( message ) {
    console.error( message );
  };

/**
 * jQuery plugin bridge, access methods like $elem.plugin('method')
 * @param {String} namespace - plugin name
 * @param {Function} PluginClass - constructor class
 */
function bridge( namespace, PluginClass ) {
  // add to jQuery fn namespace
  $.fn[ namespace ] = function( options ) {
    if ( typeof options === 'string' ) {
      // call plugin method when first argument is a string
      // get arguments for method
      var args = slice.call( arguments, 1 );

      for ( var i=0, len = this.length; i < len; i++ ) {
        var elem = this[i];
        var instance = $.data( elem, namespace );
        if ( !instance ) {
          logError( "cannot call methods on " + namespace + " prior to initialization; " +
            "attempted to call '" + options + "'" );
          continue;
        }
        if ( !$.isFunction( instance[options] ) || options.charAt(0) === '_' ) {
          logError( "no such method '" + options + "' for " + namespace + " instance" );
          continue;
        }

        // trigger method with arguments
        var returnValue = instance[ options ].apply( instance, args );

        // break look and return first value if provided
        if ( returnValue !== undefined ) {
          return returnValue;
        }
      }
      // return this if no return value
      return this;
    } else {
      return this.each( function() {
        var instance = $.data( this, namespace );
        if ( instance ) {
          // apply options & init
          instance.option( options );
          instance._init();
        } else {
          // initialize new instance
          instance = new PluginClass( this, options );
          $.data( this, namespace, instance );
        }
      });
    }
  };

}

// -------------------------- bridget -------------------------- //

/**
 * converts a Prototypical class into a proper jQuery plugin
 *   the class must have a ._init method
 * @param {String} namespace - plugin name, used in $().pluginName
 * @param {Function} PluginClass - constructor class
 */
$.bridget = function( namespace, PluginClass ) {
  addOptionMethod( PluginClass );
  bridge( namespace, PluginClass );
};

return $.bridget;

}

// transport
if ( typeof define === 'function' && define.amd ) {
  // AMD
  define( [ 'jquery' ], defineBridget );
} else if ( typeof exports === 'object' ) {
  defineBridget( require('jquery') );
} else {
  // get jquery from browser global
  defineBridget( window.jQuery );
}

})( window );

/* ZOOM 02 mousewheel */
/*!
 * jQuery Mousewheel 3.1.13
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 */

(function (factory) {
    if ( typeof define === 'function' && define.amd ) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        // Node/CommonJS style for Browserify
        module.exports = factory;
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function ($) {

    var toFix  = ['wheel', 'mousewheel', 'DOMMouseScroll', 'MozMousePixelScroll'],
        toBind = ( 'onwheel' in document || document.documentMode >= 9 ) ?
                    ['wheel'] : ['mousewheel', 'DomMouseScroll', 'MozMousePixelScroll'],
        slice  = Array.prototype.slice,
        nullLowestDeltaTimeout, lowestDelta;

    if ( $.event.fixHooks ) {
        for ( var i = toFix.length; i; ) {
            $.event.fixHooks[ toFix[--i] ] = $.event.mouseHooks;
        }
    }

    var special = $.event.special.mousewheel = {
        version: '3.1.12',

        setup: function() {
            if ( this.addEventListener ) {
                for ( var i = toBind.length; i; ) {
                    this.addEventListener( toBind[--i], handler, false );
                }
            } else {
                this.onmousewheel = handler;
            }
            // Store the line height and page height for this particular element
            $.data(this, 'mousewheel-line-height', special.getLineHeight(this));
            $.data(this, 'mousewheel-page-height', special.getPageHeight(this));
        },

        teardown: function() {
            if ( this.removeEventListener ) {
                for ( var i = toBind.length; i; ) {
                    this.removeEventListener( toBind[--i], handler, false );
                }
            } else {
                this.onmousewheel = null;
            }
            // Clean up the data we added to the element
            $.removeData(this, 'mousewheel-line-height');
            $.removeData(this, 'mousewheel-page-height');
        },

        getLineHeight: function(elem) {
            var $elem = $(elem),
                $parent = $elem['offsetParent' in $.fn ? 'offsetParent' : 'parent']();
            if (!$parent.length) {
                $parent = $('body');
            }
            return parseInt($parent.css('fontSize'), 10) || parseInt($elem.css('fontSize'), 10) || 16;
        },

        getPageHeight: function(elem) {
            return $(elem).height();
        },

        settings: {
            adjustOldDeltas: true, // see shouldAdjustOldDeltas() below
            normalizeOffset: true  // calls getBoundingClientRect for each event
        }
    };

    $.fn.extend({
        mousewheel: function(fn) {
            return fn ? this.bind('mousewheel', fn) : this.trigger('mousewheel');
        },

        unmousewheel: function(fn) {
            return this.unbind('mousewheel', fn);
        }
    });


    function handler(event) {
        var orgEvent   = event || window.event,
            args       = slice.call(arguments, 1),
            delta      = 0,
            deltaX     = 0,
            deltaY     = 0,
            absDelta   = 0,
            offsetX    = 0,
            offsetY    = 0;
        event = $.event.fix(orgEvent);
        event.type = 'mousewheel';

        // Old school scrollwheel delta
        if ( 'detail'      in orgEvent ) { deltaY = orgEvent.detail * -1;      }
        if ( 'wheelDelta'  in orgEvent ) { deltaY = orgEvent.wheelDelta;       }
        if ( 'wheelDeltaY' in orgEvent ) { deltaY = orgEvent.wheelDeltaY;      }
        if ( 'wheelDeltaX' in orgEvent ) { deltaX = orgEvent.wheelDeltaX * -1; }

        // Firefox < 17 horizontal scrolling related to DOMMouseScroll event
        if ( 'axis' in orgEvent && orgEvent.axis === orgEvent.HORIZONTAL_AXIS ) {
            deltaX = deltaY * -1;
            deltaY = 0;
        }

        // Set delta to be deltaY or deltaX if deltaY is 0 for backwards compatabilitiy
        delta = deltaY === 0 ? deltaX : deltaY;

        // New school wheel delta (wheel event)
        if ( 'deltaY' in orgEvent ) {
            deltaY = orgEvent.deltaY * -1;
            delta  = deltaY;
        }
        if ( 'deltaX' in orgEvent ) {
            deltaX = orgEvent.deltaX;
            if ( deltaY === 0 ) { delta  = deltaX * -1; }
        }

        // No change actually happened, no reason to go any further
        if ( deltaY === 0 && deltaX === 0 ) { return; }

        // Need to convert lines and pages to pixels if we aren't already in pixels
        // There are three delta modes:
        //   * deltaMode 0 is by pixels, nothing to do
        //   * deltaMode 1 is by lines
        //   * deltaMode 2 is by pages
        if ( orgEvent.deltaMode === 1 ) {
            var lineHeight = $.data(this, 'mousewheel-line-height');
            delta  *= lineHeight;
            deltaY *= lineHeight;
            deltaX *= lineHeight;
        } else if ( orgEvent.deltaMode === 2 ) {
            var pageHeight = $.data(this, 'mousewheel-page-height');
            delta  *= pageHeight;
            deltaY *= pageHeight;
            deltaX *= pageHeight;
        }

        // Store lowest absolute delta to normalize the delta values
        absDelta = Math.max( Math.abs(deltaY), Math.abs(deltaX) );

        if ( !lowestDelta || absDelta < lowestDelta ) {
            lowestDelta = absDelta;

            // Adjust older deltas if necessary
            if ( shouldAdjustOldDeltas(orgEvent, absDelta) ) {
                lowestDelta /= 40;
            }
        }

        // Adjust older deltas if necessary
        if ( shouldAdjustOldDeltas(orgEvent, absDelta) ) {
            // Divide all the things by 40!
            delta  /= 40;
            deltaX /= 40;
            deltaY /= 40;
        }

        // Get a whole, normalized value for the deltas
        delta  = Math[ delta  >= 1 ? 'floor' : 'ceil' ](delta  / lowestDelta);
        deltaX = Math[ deltaX >= 1 ? 'floor' : 'ceil' ](deltaX / lowestDelta);
        deltaY = Math[ deltaY >= 1 ? 'floor' : 'ceil' ](deltaY / lowestDelta);

        // Normalise offsetX and offsetY properties
        if ( special.settings.normalizeOffset && this.getBoundingClientRect ) {
            var boundingRect = this.getBoundingClientRect();
            offsetX = event.clientX - boundingRect.left;
            offsetY = event.clientY - boundingRect.top;
        }

        // Add information to the event object
        event.deltaX = deltaX;
        event.deltaY = deltaY;
        event.deltaFactor = lowestDelta;
        event.offsetX = offsetX;
        event.offsetY = offsetY;
        // Go ahead and set deltaMode to 0 since we converted to pixels
        // Although this is a little odd since we overwrite the deltaX/Y
        // properties with normalized deltas.
        event.deltaMode = 0;

        // Add event and delta to the front of the arguments
        args.unshift(event, delta, deltaX, deltaY);

        // Clearout lowestDelta after sometime to better
        // handle multiple device types that give different
        // a different lowestDelta
        // Ex: trackpad = 3 and mouse wheel = 120
        if (nullLowestDeltaTimeout) { clearTimeout(nullLowestDeltaTimeout); }
        nullLowestDeltaTimeout = setTimeout(nullLowestDelta, 200);

        return ($.event.dispatch || $.event.handle).apply(this, args);
    }

    function nullLowestDelta() {
        lowestDelta = null;
    }

    function shouldAdjustOldDeltas(orgEvent, absDelta) {
        // If this is an older event and the delta is divisable by 120,
        // then we are assuming that the browser is treating this as an
        // older mouse wheel event and that we should divide the deltas
        // by 40 to try and get a more usable deltaFactor.
        // Side note, this actually impacts the reported scroll distance
        // in older browsers and can cause scrolling to be slower than native.
        // Turn this off by setting $.event.special.mousewheel.settings.adjustOldDeltas to false.
        return special.settings.adjustOldDeltas && orgEvent.type === 'mousewheel' && absDelta % 120 === 0;
    }

}));

/* ZOOM 03 DRAG */
/*!
 * jquery.event.drag - v 2.2
 * Copyright (c) 2010 Three Dub Media - http://threedubmedia.com
 * Open Source MIT License - http://threedubmedia.com/code/license
 */
// Created: 2008-06-04
// Updated: 2012-05-21
// REQUIRES: jquery 1.7.x

;(function( $ ){

// add the jquery instance method
$.fn.drag = function( str, arg, opts ){
  // figure out the event type
  var type = typeof str == "string" ? str : "",
  // figure out the event handler...
  fn = $.isFunction( str ) ? str : $.isFunction( arg ) ? arg : null;
  // fix the event type
  if ( type.indexOf("drag") !== 0 )
    type = "drag"+ type;
  // were options passed
  opts = ( str == fn ? arg : opts ) || {};
  // trigger or bind event handler
  return fn ? this.bind( type, opts, fn ) : this.trigger( type );
};

// local refs (increase compression)
var $event = $.event,
$special = $event.special,
// configure the drag special event
drag = $special.drag = {

  // these are the default settings
  defaults: {
    which: 1, // mouse button pressed to start drag sequence
    distance: 0, // distance dragged before dragstart
    not: ':input', // selector to suppress dragging on target elements
    handle: null, // selector to match handle target elements
    relative: false, // true to use "position", false to use "offset"
    drop: true, // false to suppress drop events, true or selector to allow
    click: false // false to suppress click events after dragend (no proxy)
  },

  // the key name for stored drag data
  datakey: "dragdata",

  // prevent bubbling for better performance
  noBubble: true,

  // count bound related events
  add: function( obj ){
    // read the interaction data
    var data = $.data( this, drag.datakey ),
    // read any passed options
    opts = obj.data || {};
    // count another realted event
    data.related += 1;
    // extend data options bound with this event
    // don't iterate "opts" in case it is a node
    $.each( drag.defaults, function( key, def ){
      if ( opts[ key ] !== undefined )
        data[ key ] = opts[ key ];
    });
  },

  // forget unbound related events
  remove: function(){
    $.data( this, drag.datakey ).related -= 1;
  },

  // configure interaction, capture settings
  setup: function(){
    // check for related events
    if ( $.data( this, drag.datakey ) )
      return;
    // initialize the drag data with copied defaults
    var data = $.extend({ related:0 }, drag.defaults );
    // store the interaction data
    $.data( this, drag.datakey, data );
    // bind the mousedown event, which starts drag interactions
    $event.add( this, "touchstart mousedown", drag.init, data );
    // prevent image dragging in IE...
    if ( this.attachEvent )
      this.attachEvent("ondragstart", drag.dontstart );
  },

  // destroy configured interaction
  teardown: function(){
    var data = $.data( this, drag.datakey ) || {};
    // check for related events
    if ( data.related )
      return;
    // remove the stored data
    $.removeData( this, drag.datakey );
    // remove the mousedown event
    $event.remove( this, "touchstart mousedown", drag.init );
    // enable text selection
    drag.textselect( true );
    // un-prevent image dragging in IE...
    if ( this.detachEvent )
      this.detachEvent("ondragstart", drag.dontstart );
  },

  // initialize the interaction
  init: function( event ){
    // sorry, only one touch at a time
    if ( drag.touched )
      return;
    // the drag/drop interaction data
    var dd = event.data, results;
    // check the which directive
    if ( event.which != 0 && dd.which > 0 && event.which != dd.which )
      return;
    // check for suppressed selector
    if ( $( event.target ).is( dd.not ) )
      return;
    // check for handle selector
    if ( dd.handle && !$( event.target ).closest( dd.handle, event.currentTarget ).length )
      return;

    drag.touched = event.type == 'touchstart' ? this : null;
    dd.propagates = 1;
    dd.mousedown = this;
    dd.interactions = [ drag.interaction( this, dd ) ];
    dd.target = event.target;
    dd.pageX = event.pageX;
    dd.pageY = event.pageY;
    dd.dragging = null;
    // handle draginit event...
    results = drag.hijack( event, "draginit", dd );
    // early cancel
    if ( !dd.propagates )
      return;
    // flatten the result set
    results = drag.flatten( results );
    // insert new interaction elements
    if ( results && results.length ){
      dd.interactions = [];
      $.each( results, function(){
        dd.interactions.push( drag.interaction( this, dd ) );
      });
    }
    // remember how many interactions are propagating
    dd.propagates = dd.interactions.length;
    // locate and init the drop targets
    if ( dd.drop !== false && $special.drop )
      $special.drop.handler( event, dd );
    // disable text selection
    drag.textselect( false );
    // bind additional events...
    if ( drag.touched )
      $event.add( drag.touched, "touchmove touchend", drag.handler, dd );
    else
      $event.add( document, "mousemove mouseup", drag.handler, dd );
    // helps prevent text selection or scrolling
    if ( !drag.touched || dd.live )
      return false;
  },

  // returns an interaction object
  interaction: function( elem, dd ){
    var offset = $( elem )[ dd.relative ? "position" : "offset" ]() || { top:0, left:0 };
    return {
      drag: elem,
      callback: new drag.callback(),
      droppable: [],
      offset: offset
    };
  },

  // handle drag-releatd DOM events
  handler: function( event ){
    // read the data before hijacking anything
    var dd = event.data;
    // handle various events
    switch ( event.type ){
      // mousemove, check distance, start dragging
      case !dd.dragging && 'touchmove':
        event.preventDefault();
      case !dd.dragging && 'mousemove':
        //  drag tolerance, x² + y² = distance²
        if ( Math.pow(  event.pageX-dd.pageX, 2 ) + Math.pow(  event.pageY-dd.pageY, 2 ) < Math.pow( dd.distance, 2 ) )
          break; // distance tolerance not reached
        event.target = dd.target; // force target from "mousedown" event (fix distance issue)
        drag.hijack( event, "dragstart", dd ); // trigger "dragstart"
        if ( dd.propagates ) // "dragstart" not rejected
          dd.dragging = true; // activate interaction
      // mousemove, dragging
      case 'touchmove':
        event.preventDefault();
      case 'mousemove':
        if ( dd.dragging ){
          // trigger "drag"
          drag.hijack( event, "drag", dd );
          if ( dd.propagates ){
            // manage drop events
            if ( dd.drop !== false && $special.drop )
              $special.drop.handler( event, dd ); // "dropstart", "dropend"
            break; // "drag" not rejected, stop
          }
          event.type = "mouseup"; // helps "drop" handler behave
        }
      // mouseup, stop dragging
      case 'touchend':
      case 'mouseup':
      default:
        if ( drag.touched )
          $event.remove( drag.touched, "touchmove touchend", drag.handler ); // remove touch events
        else
          $event.remove( document, "mousemove mouseup", drag.handler ); // remove page events
        if ( dd.dragging ){
          if ( dd.drop !== false && $special.drop )
            $special.drop.handler( event, dd ); // "drop"
          drag.hijack( event, "dragend", dd ); // trigger "dragend"
        }
        drag.textselect( true ); // enable text selection
        // if suppressing click events...
        if ( dd.click === false && dd.dragging )
          $.data( dd.mousedown, "suppress.click", new Date().getTime() + 5 );
        dd.dragging = drag.touched = false; // deactivate element
        break;
    }
  },

  // re-use event object for custom events
  hijack: function( event, type, dd, x, elem ){
    // not configured
    if ( !dd )
      return;
    // remember the original event and type
    var orig = { event:event.originalEvent, type:event.type },
    // is the event drag related or drog related?
    mode = type.indexOf("drop") ? "drag" : "drop",
    // iteration vars
    result, i = x || 0, ia, $elems, callback,
    len = !isNaN( x ) ? x : dd.interactions.length;
    // modify the event type
    event.type = type;
    // remove the original event
    event.originalEvent = null;
    // initialize the results
    dd.results = [];
    // handle each interacted element
    do if ( ia = dd.interactions[ i ] ){
      // validate the interaction
      if ( type !== "dragend" && ia.cancelled )
        continue;
      // set the dragdrop properties on the event object
      callback = drag.properties( event, dd, ia );
      // prepare for more results
      ia.results = [];
      // handle each element
      $( elem || ia[ mode ] || dd.droppable ).each(function( p, subject ){
        // identify drag or drop targets individually
        callback.target = subject;
        // force propagtion of the custom event
        event.isPropagationStopped = function(){ return false; };
        // handle the event
        result = subject ? $event.dispatch.call( subject, event, callback ) : null;
        // stop the drag interaction for this element
        if ( result === false ){
          if ( mode == "drag" ){
            ia.cancelled = true;
            dd.propagates -= 1;
          }
          if ( type == "drop" ){
            ia[ mode ][p] = null;
          }
        }
        // assign any dropinit elements
        else if ( type == "dropinit" )
          ia.droppable.push( drag.element( result ) || subject );
        // accept a returned proxy element
        if ( type == "dragstart" )
          ia.proxy = $( drag.element( result ) || ia.drag )[0];
        // remember this result
        ia.results.push( result );
        // forget the event result, for recycling
        delete event.result;
        // break on cancelled handler
        if ( type !== "dropinit" )
          return result;
      });
      // flatten the results
      dd.results[ i ] = drag.flatten( ia.results );
      // accept a set of valid drop targets
      if ( type == "dropinit" )
        ia.droppable = drag.flatten( ia.droppable );
      // locate drop targets
      if ( type == "dragstart" && !ia.cancelled )
        callback.update();
    }
    while ( ++i < len )
    // restore the original event & type
    event.type = orig.type;
    event.originalEvent = orig.event;
    // return all handler results
    return drag.flatten( dd.results );
  },

  // extend the callback object with drag/drop properties...
  properties: function( event, dd, ia ){
    var obj = ia.callback;
    // elements
    obj.drag = ia.drag;
    obj.proxy = ia.proxy || ia.drag;
    // starting mouse position
    obj.startX = dd.pageX;
    obj.startY = dd.pageY;
    // current distance dragged
    obj.deltaX = event.pageX - dd.pageX;
    obj.deltaY = event.pageY - dd.pageY;
    // original element position
    obj.originalX = ia.offset.left;
    obj.originalY = ia.offset.top;
    // adjusted element position
    obj.offsetX = obj.originalX + obj.deltaX;
    obj.offsetY = obj.originalY + obj.deltaY;
    // assign the drop targets information
    obj.drop = drag.flatten( ( ia.drop || [] ).slice() );
    obj.available = drag.flatten( ( ia.droppable || [] ).slice() );
    return obj;
  },

  // determine is the argument is an element or jquery instance
  element: function( arg ){
    if ( arg && ( arg.jquery || arg.nodeType == 1 ) )
      return arg;
  },

  // flatten nested jquery objects and arrays into a single dimension array
  flatten: function( arr ){
    return $.map( arr, function( member ){
      return member && member.jquery ? $.makeArray( member ) :
        member && member.length ? drag.flatten( member ) : member;
    });
  },

  // toggles text selection attributes ON (true) or OFF (false)
  textselect: function( bool ){
    $( document )[ bool ? "unbind" : "bind" ]("selectstart", drag.dontstart )
      .css("MozUserSelect", bool ? "" : "none" );
    // .attr("unselectable", bool ? "off" : "on" )
    document.unselectable = bool ? "off" : "on";
  },

  // suppress "selectstart" and "ondragstart" events
  dontstart: function(){
    return false;
  },

  // a callback instance contructor
  callback: function(){}

};

// callback methods
drag.callback.prototype = {
  update: function(){
    if ( $special.drop && this.available.length )
      $.each( this.available, function( i ){
        $special.drop.locate( this, i );
      });
  }
};

// patch $.event.$dispatch to allow suppressing clicks
var $dispatch = $event.dispatch;
$event.dispatch = function( event ){
  if ( $.data( this, "suppress."+ event.type ) - new Date().getTime() > 0 ){
    $.removeData( this, "suppress."+ event.type );
    return;
  }
  return $dispatch.apply( this, arguments );
};

// event fix hooks for touch events...
var touchHooks =
$event.fixHooks.touchstart =
$event.fixHooks.touchmove =
$event.fixHooks.touchend =
$event.fixHooks.touchcancel = {
  props: "clientX clientY pageX pageY screenX screenY".split( " " ),
  filter: function( event, orig ) {
    if ( orig ){
      var touched = ( orig.touches && orig.touches[0] )
        || ( orig.changedTouches && orig.changedTouches[0] )
        || null;
      // iOS webkit: touchstart, touchmove, touchend
      if ( touched )
        $.each( touchHooks.props, function( i, prop ){
          event[ prop ] = touched[ prop ];
        });
    }
    return event;
  }
};

// share the same special event configuration with related events...
$special.draginit = $special.dragstart = $special.dragend = drag;

})( jQuery );

/* ZOOM 04 hammer */
/*! Hammer.JS - v2.0.7 - 2016-04-22
 * http://hammerjs.github.io/
 *
 * Copyright (c) 2016 Jorik Tangelder;
 * Licensed under the MIT license */
(function(window, document, exportName, undefined) {
  'use strict';

var VENDOR_PREFIXES = ['', 'webkit', 'Moz', 'MS', 'ms', 'o'];
var TEST_ELEMENT = document.createElement('div');

var TYPE_FUNCTION = 'function';

var round = Math.round;
var abs = Math.abs;
var now = Date.now;

/**
 * set a timeout with a given scope
 * @param {Function} fn
 * @param {Number} timeout
 * @param {Object} context
 * @returns {number}
 */
function setTimeoutContext(fn, timeout, context) {
    return setTimeout(bindFn(fn, context), timeout);
}

/**
 * if the argument is an array, we want to execute the fn on each entry
 * if it aint an array we don't want to do a thing.
 * this is used by all the methods that accept a single and array argument.
 * @param {*|Array} arg
 * @param {String} fn
 * @param {Object} [context]
 * @returns {Boolean}
 */
function invokeArrayArg(arg, fn, context) {
    if (Array.isArray(arg)) {
        each(arg, context[fn], context);
        return true;
    }
    return false;
}

/**
 * walk objects and arrays
 * @param {Object} obj
 * @param {Function} iterator
 * @param {Object} context
 */
function each(obj, iterator, context) {
    var i;

    if (!obj) {
        return;
    }

    if (obj.forEach) {
        obj.forEach(iterator, context);
    } else if (obj.length !== undefined) {
        i = 0;
        while (i < obj.length) {
            iterator.call(context, obj[i], i, obj);
            i++;
        }
    } else {
        for (i in obj) {
            obj.hasOwnProperty(i) && iterator.call(context, obj[i], i, obj);
        }
    }
}

/**
 * wrap a method with a deprecation warning and stack trace
 * @param {Function} method
 * @param {String} name
 * @param {String} message
 * @returns {Function} A new function wrapping the supplied method.
 */
function deprecate(method, name, message) {
    var deprecationMessage = 'DEPRECATED METHOD: ' + name + '\n' + message + ' AT \n';
    return function() {
        var e = new Error('get-stack-trace');
        var stack = e && e.stack ? e.stack.replace(/^[^\(]+?[\n$]/gm, '')
            .replace(/^\s+at\s+/gm, '')
            .replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@') : 'Unknown Stack Trace';

        var log = window.console && (window.console.warn || window.console.log);
        if (log) {
            log.call(window.console, deprecationMessage, stack);
        }
        return method.apply(this, arguments);
    };
}

/**
 * extend object.
 * means that properties in dest will be overwritten by the ones in src.
 * @param {Object} target
 * @param {...Object} objects_to_assign
 * @returns {Object} target
 */
var assign;
if (typeof Object.assign !== 'function') {
    assign = function assign(target) {
        if (target === undefined || target === null) {
            throw new TypeError('Cannot convert undefined or null to object');
        }

        var output = Object(target);
        for (var index = 1; index < arguments.length; index++) {
            var source = arguments[index];
            if (source !== undefined && source !== null) {
                for (var nextKey in source) {
                    if (source.hasOwnProperty(nextKey)) {
                        output[nextKey] = source[nextKey];
                    }
                }
            }
        }
        return output;
    };
} else {
    assign = Object.assign;
}

/**
 * extend object.
 * means that properties in dest will be overwritten by the ones in src.
 * @param {Object} dest
 * @param {Object} src
 * @param {Boolean} [merge=false]
 * @returns {Object} dest
 */
var extend = deprecate(function extend(dest, src, merge) {
    var keys = Object.keys(src);
    var i = 0;
    while (i < keys.length) {
        if (!merge || (merge && dest[keys[i]] === undefined)) {
            dest[keys[i]] = src[keys[i]];
        }
        i++;
    }
    return dest;
}, 'extend', 'Use `assign`.');

/**
 * merge the values from src in the dest.
 * means that properties that exist in dest will not be overwritten by src
 * @param {Object} dest
 * @param {Object} src
 * @returns {Object} dest
 */
var merge = deprecate(function merge(dest, src) {
    return extend(dest, src, true);
}, 'merge', 'Use `assign`.');

/**
 * simple class inheritance
 * @param {Function} child
 * @param {Function} base
 * @param {Object} [properties]
 */
function inherit(child, base, properties) {
    var baseP = base.prototype,
        childP;

    childP = child.prototype = Object.create(baseP);
    childP.constructor = child;
    childP._super = baseP;

    if (properties) {
        assign(childP, properties);
    }
}

/**
 * simple function bind
 * @param {Function} fn
 * @param {Object} context
 * @returns {Function}
 */
function bindFn(fn, context) {
    return function boundFn() {
        return fn.apply(context, arguments);
    };
}

/**
 * let a boolean value also be a function that must return a boolean
 * this first item in args will be used as the context
 * @param {Boolean|Function} val
 * @param {Array} [args]
 * @returns {Boolean}
 */
function boolOrFn(val, args) {
    if (typeof val == TYPE_FUNCTION) {
        return val.apply(args ? args[0] || undefined : undefined, args);
    }
    return val;
}

/**
 * use the val2 when val1 is undefined
 * @param {*} val1
 * @param {*} val2
 * @returns {*}
 */
function ifUndefined(val1, val2) {
    return (val1 === undefined) ? val2 : val1;
}

/**
 * addEventListener with multiple events at once
 * @param {EventTarget} target
 * @param {String} types
 * @param {Function} handler
 */
function addEventListeners(target, types, handler) {
    each(splitStr(types), function(type) {
        target.addEventListener(type, handler, false);
    });
}

/**
 * removeEventListener with multiple events at once
 * @param {EventTarget} target
 * @param {String} types
 * @param {Function} handler
 */
function removeEventListeners(target, types, handler) {
    each(splitStr(types), function(type) {
        target.removeEventListener(type, handler, false);
    });
}

/**
 * find if a node is in the given parent
 * @method hasParent
 * @param {HTMLElement} node
 * @param {HTMLElement} parent
 * @return {Boolean} found
 */
function hasParent(node, parent) {
    while (node) {
        if (node == parent) {
            return true;
        }
        node = node.parentNode;
    }
    return false;
}

/**
 * small indexOf wrapper
 * @param {String} str
 * @param {String} find
 * @returns {Boolean} found
 */
function inStr(str, find) {
    return str.indexOf(find) > -1;
}

/**
 * split string on whitespace
 * @param {String} str
 * @returns {Array} words
 */
function splitStr(str) {
    return str.trim().split(/\s+/g);
}

/**
 * find if a array contains the object using indexOf or a simple polyFill
 * @param {Array} src
 * @param {String} find
 * @param {String} [findByKey]
 * @return {Boolean|Number} false when not found, or the index
 */
function inArray(src, find, findByKey) {
    if (src.indexOf && !findByKey) {
        return src.indexOf(find);
    } else {
        var i = 0;
        while (i < src.length) {
            if ((findByKey && src[i][findByKey] == find) || (!findByKey && src[i] === find)) {
                return i;
            }
            i++;
        }
        return -1;
    }
}

/**
 * convert array-like objects to real arrays
 * @param {Object} obj
 * @returns {Array}
 */
function toArray(obj) {
    return Array.prototype.slice.call(obj, 0);
}

/**
 * unique array with objects based on a key (like 'id') or just by the array's value
 * @param {Array} src [{id:1},{id:2},{id:1}]
 * @param {String} [key]
 * @param {Boolean} [sort=False]
 * @returns {Array} [{id:1},{id:2}]
 */
function uniqueArray(src, key, sort) {
    var results = [];
    var values = [];
    var i = 0;

    while (i < src.length) {
        var val = key ? src[i][key] : src[i];
        if (inArray(values, val) < 0) {
            results.push(src[i]);
        }
        values[i] = val;
        i++;
    }

    if (sort) {
        if (!key) {
            results = results.sort();
        } else {
            results = results.sort(function sortUniqueArray(a, b) {
                return a[key] > b[key];
            });
        }
    }

    return results;
}

/**
 * get the prefixed property
 * @param {Object} obj
 * @param {String} property
 * @returns {String|Undefined} prefixed
 */
function prefixed(obj, property) {
    var prefix, prop;
    var camelProp = property[0].toUpperCase() + property.slice(1);

    var i = 0;
    while (i < VENDOR_PREFIXES.length) {
        prefix = VENDOR_PREFIXES[i];
        prop = (prefix) ? prefix + camelProp : property;

        if (prop in obj) {
            return prop;
        }
        i++;
    }
    return undefined;
}

/**
 * get a unique id
 * @returns {number} uniqueId
 */
var _uniqueId = 1;
function uniqueId() {
    return _uniqueId++;
}

/**
 * get the window object of an element
 * @param {HTMLElement} element
 * @returns {DocumentView|Window}
 */
function getWindowForElement(element) {
    var doc = element.ownerDocument || element;
    return (doc.defaultView || doc.parentWindow || window);
}

var MOBILE_REGEX = /mobile|tablet|ip(ad|hone|od)|android/i;

var SUPPORT_TOUCH = ('ontouchstart' in window);
var SUPPORT_POINTER_EVENTS = prefixed(window, 'PointerEvent') !== undefined;
var SUPPORT_ONLY_TOUCH = SUPPORT_TOUCH && MOBILE_REGEX.test(navigator.userAgent);

var INPUT_TYPE_TOUCH = 'touch';
var INPUT_TYPE_PEN = 'pen';
var INPUT_TYPE_MOUSE = 'mouse';
var INPUT_TYPE_KINECT = 'kinect';

var COMPUTE_INTERVAL = 25;

var INPUT_START = 1;
var INPUT_MOVE = 2;
var INPUT_END = 4;
var INPUT_CANCEL = 8;

var DIRECTION_NONE = 1;
var DIRECTION_LEFT = 2;
var DIRECTION_RIGHT = 4;
var DIRECTION_UP = 8;
var DIRECTION_DOWN = 16;

var DIRECTION_HORIZONTAL = DIRECTION_LEFT | DIRECTION_RIGHT;
var DIRECTION_VERTICAL = DIRECTION_UP | DIRECTION_DOWN;
var DIRECTION_ALL = DIRECTION_HORIZONTAL | DIRECTION_VERTICAL;

var PROPS_XY = ['x', 'y'];
var PROPS_CLIENT_XY = ['clientX', 'clientY'];

/**
 * create new input type manager
 * @param {Manager} manager
 * @param {Function} callback
 * @returns {Input}
 * @constructor
 */
function Input(manager, callback) {
    var self = this;
    this.manager = manager;
    this.callback = callback;
    this.element = manager.element;
    this.target = manager.options.inputTarget;

    // smaller wrapper around the handler, for the scope and the enabled state of the manager,
    // so when disabled the input events are completely bypassed.
    this.domHandler = function(ev) {
        if (boolOrFn(manager.options.enable, [manager])) {
            self.handler(ev);
        }
    };

    this.init();

}

Input.prototype = {
    /**
     * should handle the inputEvent data and trigger the callback
     * @virtual
     */
    handler: function() { },

    /**
     * bind the events
     */
    init: function() {
        this.evEl && addEventListeners(this.element, this.evEl, this.domHandler);
        this.evTarget && addEventListeners(this.target, this.evTarget, this.domHandler);
        this.evWin && addEventListeners(getWindowForElement(this.element), this.evWin, this.domHandler);
    },

    /**
     * unbind the events
     */
    destroy: function() {
        this.evEl && removeEventListeners(this.element, this.evEl, this.domHandler);
        this.evTarget && removeEventListeners(this.target, this.evTarget, this.domHandler);
        this.evWin && removeEventListeners(getWindowForElement(this.element), this.evWin, this.domHandler);
    }
};

/**
 * create new input type manager
 * called by the Manager constructor
 * @param {Hammer} manager
 * @returns {Input}
 */
function createInputInstance(manager) {
    var Type;
    var inputClass = manager.options.inputClass;

    if (inputClass) {
        Type = inputClass;
    } else if (SUPPORT_POINTER_EVENTS) {
        Type = PointerEventInput;
    } else if (SUPPORT_ONLY_TOUCH) {
        Type = TouchInput;
    } else if (!SUPPORT_TOUCH) {
        Type = MouseInput;
    } else {
        Type = TouchMouseInput;
    }
    return new (Type)(manager, inputHandler);
}

/**
 * handle input events
 * @param {Manager} manager
 * @param {String} eventType
 * @param {Object} input
 */
function inputHandler(manager, eventType, input) {
    var pointersLen = input.pointers.length;
    var changedPointersLen = input.changedPointers.length;
    var isFirst = (eventType & INPUT_START && (pointersLen - changedPointersLen === 0));
    var isFinal = (eventType & (INPUT_END | INPUT_CANCEL) && (pointersLen - changedPointersLen === 0));

    input.isFirst = !!isFirst;
    input.isFinal = !!isFinal;

    if (isFirst) {
        manager.session = {};
    }

    // source event is the normalized value of the domEvents
    // like 'touchstart, mouseup, pointerdown'
    input.eventType = eventType;

    // compute scale, rotation etc
    computeInputData(manager, input);

    // emit secret event
    manager.emit('hammer.input', input);

    manager.recognize(input);
    manager.session.prevInput = input;
}

/**
 * extend the data with some usable properties like scale, rotate, velocity etc
 * @param {Object} manager
 * @param {Object} input
 */
function computeInputData(manager, input) {
    var session = manager.session;
    var pointers = input.pointers;
    var pointersLength = pointers.length;

    // store the first input to calculate the distance and direction
    if (!session.firstInput) {
        session.firstInput = simpleCloneInputData(input);
    }

    // to compute scale and rotation we need to store the multiple touches
    if (pointersLength > 1 && !session.firstMultiple) {
        session.firstMultiple = simpleCloneInputData(input);
    } else if (pointersLength === 1) {
        session.firstMultiple = false;
    }

    var firstInput = session.firstInput;
    var firstMultiple = session.firstMultiple;
    var offsetCenter = firstMultiple ? firstMultiple.center : firstInput.center;

    var center = input.center = getCenter(pointers);
    input.timeStamp = now();
    input.deltaTime = input.timeStamp - firstInput.timeStamp;

    input.angle = getAngle(offsetCenter, center);
    input.distance = getDistance(offsetCenter, center);

    computeDeltaXY(session, input);
    input.offsetDirection = getDirection(input.deltaX, input.deltaY);

    var overallVelocity = getVelocity(input.deltaTime, input.deltaX, input.deltaY);
    input.overallVelocityX = overallVelocity.x;
    input.overallVelocityY = overallVelocity.y;
    input.overallVelocity = (abs(overallVelocity.x) > abs(overallVelocity.y)) ? overallVelocity.x : overallVelocity.y;

    input.scale = firstMultiple ? getScale(firstMultiple.pointers, pointers) : 1;
    input.rotation = firstMultiple ? getRotation(firstMultiple.pointers, pointers) : 0;

    input.maxPointers = !session.prevInput ? input.pointers.length : ((input.pointers.length >
        session.prevInput.maxPointers) ? input.pointers.length : session.prevInput.maxPointers);

    computeIntervalInputData(session, input);

    // find the correct target
    var target = manager.element;
    if (hasParent(input.srcEvent.target, target)) {
        target = input.srcEvent.target;
    }
    input.target = target;
}

function computeDeltaXY(session, input) {
    var center = input.center;
    var offset = session.offsetDelta || {};
    var prevDelta = session.prevDelta || {};
    var prevInput = session.prevInput || {};

    if (input.eventType === INPUT_START || prevInput.eventType === INPUT_END) {
        prevDelta = session.prevDelta = {
            x: prevInput.deltaX || 0,
            y: prevInput.deltaY || 0
        };

        offset = session.offsetDelta = {
            x: center.x,
            y: center.y
        };
    }

    input.deltaX = prevDelta.x + (center.x - offset.x);
    input.deltaY = prevDelta.y + (center.y - offset.y);
}

/**
 * velocity is calculated every x ms
 * @param {Object} session
 * @param {Object} input
 */
function computeIntervalInputData(session, input) {
    var last = session.lastInterval || input,
        deltaTime = input.timeStamp - last.timeStamp,
        velocity, velocityX, velocityY, direction;

    if (input.eventType != INPUT_CANCEL && (deltaTime > COMPUTE_INTERVAL || last.velocity === undefined)) {
        var deltaX = input.deltaX - last.deltaX;
        var deltaY = input.deltaY - last.deltaY;

        var v = getVelocity(deltaTime, deltaX, deltaY);
        velocityX = v.x;
        velocityY = v.y;
        velocity = (abs(v.x) > abs(v.y)) ? v.x : v.y;
        direction = getDirection(deltaX, deltaY);

        session.lastInterval = input;
    } else {
        // use latest velocity info if it doesn't overtake a minimum period
        velocity = last.velocity;
        velocityX = last.velocityX;
        velocityY = last.velocityY;
        direction = last.direction;
    }

    input.velocity = velocity;
    input.velocityX = velocityX;
    input.velocityY = velocityY;
    input.direction = direction;
}

/**
 * create a simple clone from the input used for storage of firstInput and firstMultiple
 * @param {Object} input
 * @returns {Object} clonedInputData
 */
function simpleCloneInputData(input) {
    // make a simple copy of the pointers because we will get a reference if we don't
    // we only need clientXY for the calculations
    var pointers = [];
    var i = 0;
    while (i < input.pointers.length) {
        pointers[i] = {
            clientX: round(input.pointers[i].clientX),
            clientY: round(input.pointers[i].clientY)
        };
        i++;
    }

    return {
        timeStamp: now(),
        pointers: pointers,
        center: getCenter(pointers),
        deltaX: input.deltaX,
        deltaY: input.deltaY
    };
}

/**
 * get the center of all the pointers
 * @param {Array} pointers
 * @return {Object} center contains `x` and `y` properties
 */
function getCenter(pointers) {
    var pointersLength = pointers.length;

    // no need to loop when only one touch
    if (pointersLength === 1) {
        return {
            x: round(pointers[0].clientX),
            y: round(pointers[0].clientY)
        };
    }

    var x = 0, y = 0, i = 0;
    while (i < pointersLength) {
        x += pointers[i].clientX;
        y += pointers[i].clientY;
        i++;
    }

    return {
        x: round(x / pointersLength),
        y: round(y / pointersLength)
    };
}

/**
 * calculate the velocity between two points. unit is in px per ms.
 * @param {Number} deltaTime
 * @param {Number} x
 * @param {Number} y
 * @return {Object} velocity `x` and `y`
 */
function getVelocity(deltaTime, x, y) {
    return {
        x: x / deltaTime || 0,
        y: y / deltaTime || 0
    };
}

/**
 * get the direction between two points
 * @param {Number} x
 * @param {Number} y
 * @return {Number} direction
 */
function getDirection(x, y) {
    if (x === y) {
        return DIRECTION_NONE;
    }

    if (abs(x) >= abs(y)) {
        return x < 0 ? DIRECTION_LEFT : DIRECTION_RIGHT;
    }
    return y < 0 ? DIRECTION_UP : DIRECTION_DOWN;
}

/**
 * calculate the absolute distance between two points
 * @param {Object} p1 {x, y}
 * @param {Object} p2 {x, y}
 * @param {Array} [props] containing x and y keys
 * @return {Number} distance
 */
function getDistance(p1, p2, props) {
    if (!props) {
        props = PROPS_XY;
    }
    var x = p2[props[0]] - p1[props[0]],
        y = p2[props[1]] - p1[props[1]];

    return Math.sqrt((x * x) + (y * y));
}

/**
 * calculate the angle between two coordinates
 * @param {Object} p1
 * @param {Object} p2
 * @param {Array} [props] containing x and y keys
 * @return {Number} angle
 */
function getAngle(p1, p2, props) {
    if (!props) {
        props = PROPS_XY;
    }
    var x = p2[props[0]] - p1[props[0]],
        y = p2[props[1]] - p1[props[1]];
    return Math.atan2(y, x) * 180 / Math.PI;
}

/**
 * calculate the rotation degrees between two pointersets
 * @param {Array} start array of pointers
 * @param {Array} end array of pointers
 * @return {Number} rotation
 */
function getRotation(start, end) {
    return getAngle(end[1], end[0], PROPS_CLIENT_XY) + getAngle(start[1], start[0], PROPS_CLIENT_XY);
}

/**
 * calculate the scale factor between two pointersets
 * no scale is 1, and goes down to 0 when pinched together, and bigger when pinched out
 * @param {Array} start array of pointers
 * @param {Array} end array of pointers
 * @return {Number} scale
 */
function getScale(start, end) {
    return getDistance(end[0], end[1], PROPS_CLIENT_XY) / getDistance(start[0], start[1], PROPS_CLIENT_XY);
}

var MOUSE_INPUT_MAP = {
    mousedown: INPUT_START,
    mousemove: INPUT_MOVE,
    mouseup: INPUT_END
};

var MOUSE_ELEMENT_EVENTS = 'mousedown';
var MOUSE_WINDOW_EVENTS = 'mousemove mouseup';

/**
 * Mouse events input
 * @constructor
 * @extends Input
 */
function MouseInput() {
    this.evEl = MOUSE_ELEMENT_EVENTS;
    this.evWin = MOUSE_WINDOW_EVENTS;

    this.pressed = false; // mousedown state

    Input.apply(this, arguments);
}

inherit(MouseInput, Input, {
    /**
     * handle mouse events
     * @param {Object} ev
     */
    handler: function MEhandler(ev) {
        var eventType = MOUSE_INPUT_MAP[ev.type];

        // on start we want to have the left mouse button down
        if (eventType & INPUT_START && ev.button === 0) {
            this.pressed = true;
        }

        if (eventType & INPUT_MOVE && ev.which !== 1) {
            eventType = INPUT_END;
        }

        // mouse must be down
        if (!this.pressed) {
            return;
        }

        if (eventType & INPUT_END) {
            this.pressed = false;
        }

        this.callback(this.manager, eventType, {
            pointers: [ev],
            changedPointers: [ev],
            pointerType: INPUT_TYPE_MOUSE,
            srcEvent: ev
        });
    }
});

var POINTER_INPUT_MAP = {
    pointerdown: INPUT_START,
    pointermove: INPUT_MOVE,
    pointerup: INPUT_END,
    pointercancel: INPUT_CANCEL,
    pointerout: INPUT_CANCEL
};

// in IE10 the pointer types is defined as an enum
var IE10_POINTER_TYPE_ENUM = {
    2: INPUT_TYPE_TOUCH,
    3: INPUT_TYPE_PEN,
    4: INPUT_TYPE_MOUSE,
    5: INPUT_TYPE_KINECT // see https://twitter.com/jacobrossi/status/480596438489890816
};

var POINTER_ELEMENT_EVENTS = 'pointerdown';
var POINTER_WINDOW_EVENTS = 'pointermove pointerup pointercancel';

// IE10 has prefixed support, and case-sensitive
if (window.MSPointerEvent && !window.PointerEvent) {
    POINTER_ELEMENT_EVENTS = 'MSPointerDown';
    POINTER_WINDOW_EVENTS = 'MSPointerMove MSPointerUp MSPointerCancel';
}

/**
 * Pointer events input
 * @constructor
 * @extends Input
 */
function PointerEventInput() {
    this.evEl = POINTER_ELEMENT_EVENTS;
    this.evWin = POINTER_WINDOW_EVENTS;

    Input.apply(this, arguments);

    this.store = (this.manager.session.pointerEvents = []);
}

inherit(PointerEventInput, Input, {
    /**
     * handle mouse events
     * @param {Object} ev
     */
    handler: function PEhandler(ev) {
        var store = this.store;
        var removePointer = false;

        var eventTypeNormalized = ev.type.toLowerCase().replace('ms', '');
        var eventType = POINTER_INPUT_MAP[eventTypeNormalized];
        var pointerType = IE10_POINTER_TYPE_ENUM[ev.pointerType] || ev.pointerType;

        var isTouch = (pointerType == INPUT_TYPE_TOUCH);

        // get index of the event in the store
        var storeIndex = inArray(store, ev.pointerId, 'pointerId');

        // start and mouse must be down
        if (eventType & INPUT_START && (ev.button === 0 || isTouch)) {
            if (storeIndex < 0) {
                store.push(ev);
                storeIndex = store.length - 1;
            }
        } else if (eventType & (INPUT_END | INPUT_CANCEL)) {
            removePointer = true;
        }

        // it not found, so the pointer hasn't been down (so it's probably a hover)
        if (storeIndex < 0) {
            return;
        }

        // update the event in the store
        store[storeIndex] = ev;

        this.callback(this.manager, eventType, {
            pointers: store,
            changedPointers: [ev],
            pointerType: pointerType,
            srcEvent: ev
        });

        if (removePointer) {
            // remove from the store
            store.splice(storeIndex, 1);
        }
    }
});

var SINGLE_TOUCH_INPUT_MAP = {
    touchstart: INPUT_START,
    touchmove: INPUT_MOVE,
    touchend: INPUT_END,
    touchcancel: INPUT_CANCEL
};

var SINGLE_TOUCH_TARGET_EVENTS = 'touchstart';
var SINGLE_TOUCH_WINDOW_EVENTS = 'touchstart touchmove touchend touchcancel';

/**
 * Touch events input
 * @constructor
 * @extends Input
 */
function SingleTouchInput() {
    this.evTarget = SINGLE_TOUCH_TARGET_EVENTS;
    this.evWin = SINGLE_TOUCH_WINDOW_EVENTS;
    this.started = false;

    Input.apply(this, arguments);
}

inherit(SingleTouchInput, Input, {
    handler: function TEhandler(ev) {
        var type = SINGLE_TOUCH_INPUT_MAP[ev.type];

        // should we handle the touch events?
        if (type === INPUT_START) {
            this.started = true;
        }

        if (!this.started) {
            return;
        }

        var touches = normalizeSingleTouches.call(this, ev, type);

        // when done, reset the started state
        if (type & (INPUT_END | INPUT_CANCEL) && touches[0].length - touches[1].length === 0) {
            this.started = false;
        }

        this.callback(this.manager, type, {
            pointers: touches[0],
            changedPointers: touches[1],
            pointerType: INPUT_TYPE_TOUCH,
            srcEvent: ev
        });
    }
});

/**
 * @this {TouchInput}
 * @param {Object} ev
 * @param {Number} type flag
 * @returns {undefined|Array} [all, changed]
 */
function normalizeSingleTouches(ev, type) {
    var all = toArray(ev.touches);
    var changed = toArray(ev.changedTouches);

    if (type & (INPUT_END | INPUT_CANCEL)) {
        all = uniqueArray(all.concat(changed), 'identifier', true);
    }

    return [all, changed];
}

var TOUCH_INPUT_MAP = {
    touchstart: INPUT_START,
    touchmove: INPUT_MOVE,
    touchend: INPUT_END,
    touchcancel: INPUT_CANCEL
};

var TOUCH_TARGET_EVENTS = 'touchstart touchmove touchend touchcancel';

/**
 * Multi-user touch events input
 * @constructor
 * @extends Input
 */
function TouchInput() {
    this.evTarget = TOUCH_TARGET_EVENTS;
    this.targetIds = {};

    Input.apply(this, arguments);
}

inherit(TouchInput, Input, {
    handler: function MTEhandler(ev) {
        var type = TOUCH_INPUT_MAP[ev.type];
        var touches = getTouches.call(this, ev, type);
        if (!touches) {
            return;
        }

        this.callback(this.manager, type, {
            pointers: touches[0],
            changedPointers: touches[1],
            pointerType: INPUT_TYPE_TOUCH,
            srcEvent: ev
        });
    }
});

/**
 * @this {TouchInput}
 * @param {Object} ev
 * @param {Number} type flag
 * @returns {undefined|Array} [all, changed]
 */
function getTouches(ev, type) {
    var allTouches = toArray(ev.touches);
    var targetIds = this.targetIds;

    // when there is only one touch, the process can be simplified
    if (type & (INPUT_START | INPUT_MOVE) && allTouches.length === 1) {
        targetIds[allTouches[0].identifier] = true;
        return [allTouches, allTouches];
    }

    var i,
        targetTouches,
        changedTouches = toArray(ev.changedTouches),
        changedTargetTouches = [],
        target = this.target;

    // get target touches from touches
    targetTouches = allTouches.filter(function(touch) {
        return hasParent(touch.target, target);
    });

    // collect touches
    if (type === INPUT_START) {
        i = 0;
        while (i < targetTouches.length) {
            targetIds[targetTouches[i].identifier] = true;
            i++;
        }
    }

    // filter changed touches to only contain touches that exist in the collected target ids
    i = 0;
    while (i < changedTouches.length) {
        if (targetIds[changedTouches[i].identifier]) {
            changedTargetTouches.push(changedTouches[i]);
        }

        // cleanup removed touches
        if (type & (INPUT_END | INPUT_CANCEL)) {
            delete targetIds[changedTouches[i].identifier];
        }
        i++;
    }

    if (!changedTargetTouches.length) {
        return;
    }

    return [
        // merge targetTouches with changedTargetTouches so it contains ALL touches, including 'end' and 'cancel'
        uniqueArray(targetTouches.concat(changedTargetTouches), 'identifier', true),
        changedTargetTouches
    ];
}

/**
 * Combined touch and mouse input
 *
 * Touch has a higher priority then mouse, and while touching no mouse events are allowed.
 * This because touch devices also emit mouse events while doing a touch.
 *
 * @constructor
 * @extends Input
 */

var DEDUP_TIMEOUT = 2500;
var DEDUP_DISTANCE = 25;

function TouchMouseInput() {
    Input.apply(this, arguments);

    var handler = bindFn(this.handler, this);
    this.touch = new TouchInput(this.manager, handler);
    this.mouse = new MouseInput(this.manager, handler);

    this.primaryTouch = null;
    this.lastTouches = [];
}

inherit(TouchMouseInput, Input, {
    /**
     * handle mouse and touch events
     * @param {Hammer} manager
     * @param {String} inputEvent
     * @param {Object} inputData
     */
    handler: function TMEhandler(manager, inputEvent, inputData) {
        var isTouch = (inputData.pointerType == INPUT_TYPE_TOUCH),
            isMouse = (inputData.pointerType == INPUT_TYPE_MOUSE);

        if (isMouse && inputData.sourceCapabilities && inputData.sourceCapabilities.firesTouchEvents) {
            return;
        }

        // when we're in a touch event, record touches to  de-dupe synthetic mouse event
        if (isTouch) {
            recordTouches.call(this, inputEvent, inputData);
        } else if (isMouse && isSyntheticEvent.call(this, inputData)) {
            return;
        }

        this.callback(manager, inputEvent, inputData);
    },

    /**
     * remove the event listeners
     */
    destroy: function destroy() {
        this.touch.destroy();
        this.mouse.destroy();
    }
});

function recordTouches(eventType, eventData) {
    if (eventType & INPUT_START) {
        this.primaryTouch = eventData.changedPointers[0].identifier;
        setLastTouch.call(this, eventData);
    } else if (eventType & (INPUT_END | INPUT_CANCEL)) {
        setLastTouch.call(this, eventData);
    }
}

function setLastTouch(eventData) {
    var touch = eventData.changedPointers[0];

    if (touch.identifier === this.primaryTouch) {
        var lastTouch = {x: touch.clientX, y: touch.clientY};
        this.lastTouches.push(lastTouch);
        var lts = this.lastTouches;
        var removeLastTouch = function() {
            var i = lts.indexOf(lastTouch);
            if (i > -1) {
                lts.splice(i, 1);
            }
        };
        setTimeout(removeLastTouch, DEDUP_TIMEOUT);
    }
}

function isSyntheticEvent(eventData) {
    var x = eventData.srcEvent.clientX, y = eventData.srcEvent.clientY;
    for (var i = 0; i < this.lastTouches.length; i++) {
        var t = this.lastTouches[i];
        var dx = Math.abs(x - t.x), dy = Math.abs(y - t.y);
        if (dx <= DEDUP_DISTANCE && dy <= DEDUP_DISTANCE) {
            return true;
        }
    }
    return false;
}

var PREFIXED_TOUCH_ACTION = prefixed(TEST_ELEMENT.style, 'touchAction');
var NATIVE_TOUCH_ACTION = PREFIXED_TOUCH_ACTION !== undefined;

// magical touchAction value
var TOUCH_ACTION_COMPUTE = 'compute';
var TOUCH_ACTION_AUTO = 'auto';
var TOUCH_ACTION_MANIPULATION = 'manipulation'; // not implemented
var TOUCH_ACTION_NONE = 'none';
var TOUCH_ACTION_PAN_X = 'pan-x';
var TOUCH_ACTION_PAN_Y = 'pan-y';
var TOUCH_ACTION_MAP = getTouchActionProps();

/**
 * Touch Action
 * sets the touchAction property or uses the js alternative
 * @param {Manager} manager
 * @param {String} value
 * @constructor
 */
function TouchAction(manager, value) {
    this.manager = manager;
    this.set(value);
}

TouchAction.prototype = {
    /**
     * set the touchAction value on the element or enable the polyfill
     * @param {String} value
     */
    set: function(value) {
        // find out the touch-action by the event handlers
        if (value == TOUCH_ACTION_COMPUTE) {
            value = this.compute();
        }

        if (NATIVE_TOUCH_ACTION && this.manager.element.style && TOUCH_ACTION_MAP[value]) {
            this.manager.element.style[PREFIXED_TOUCH_ACTION] = value;
        }
        this.actions = value.toLowerCase().trim();
    },

    /**
     * just re-set the touchAction value
     */
    update: function() {
        this.set(this.manager.options.touchAction);
    },

    /**
     * compute the value for the touchAction property based on the recognizer's settings
     * @returns {String} value
     */
    compute: function() {
        var actions = [];
        each(this.manager.recognizers, function(recognizer) {
            if (boolOrFn(recognizer.options.enable, [recognizer])) {
                actions = actions.concat(recognizer.getTouchAction());
            }
        });
        return cleanTouchActions(actions.join(' '));
    },

    /**
     * this method is called on each input cycle and provides the preventing of the browser behavior
     * @param {Object} input
     */
    preventDefaults: function(input) {
        var srcEvent = input.srcEvent;
        var direction = input.offsetDirection;

        // if the touch action did prevented once this session
        if (this.manager.session.prevented) {
            srcEvent.preventDefault();
            return;
        }

        var actions = this.actions;
        var hasNone = inStr(actions, TOUCH_ACTION_NONE) && !TOUCH_ACTION_MAP[TOUCH_ACTION_NONE];
        var hasPanY = inStr(actions, TOUCH_ACTION_PAN_Y) && !TOUCH_ACTION_MAP[TOUCH_ACTION_PAN_Y];
        var hasPanX = inStr(actions, TOUCH_ACTION_PAN_X) && !TOUCH_ACTION_MAP[TOUCH_ACTION_PAN_X];

        if (hasNone) {
            //do not prevent defaults if this is a tap gesture

            var isTapPointer = input.pointers.length === 1;
            var isTapMovement = input.distance < 2;
            var isTapTouchTime = input.deltaTime < 250;

            if (isTapPointer && isTapMovement && isTapTouchTime) {
                return;
            }
        }

        if (hasPanX && hasPanY) {
            // `pan-x pan-y` means browser handles all scrolling/panning, do not prevent
            return;
        }

        if (hasNone ||
            (hasPanY && direction & DIRECTION_HORIZONTAL) ||
            (hasPanX && direction & DIRECTION_VERTICAL)) {
            return this.preventSrc(srcEvent);
        }
    },

    /**
     * call preventDefault to prevent the browser's default behavior (scrolling in most cases)
     * @param {Object} srcEvent
     */
    preventSrc: function(srcEvent) {
        this.manager.session.prevented = true;
        srcEvent.preventDefault();
    }
};

/**
 * when the touchActions are collected they are not a valid value, so we need to clean things up. *
 * @param {String} actions
 * @returns {*}
 */
function cleanTouchActions(actions) {
    // none
    if (inStr(actions, TOUCH_ACTION_NONE)) {
        return TOUCH_ACTION_NONE;
    }

    var hasPanX = inStr(actions, TOUCH_ACTION_PAN_X);
    var hasPanY = inStr(actions, TOUCH_ACTION_PAN_Y);

    // if both pan-x and pan-y are set (different recognizers
    // for different directions, e.g. horizontal pan but vertical swipe?)
    // we need none (as otherwise with pan-x pan-y combined none of these
    // recognizers will work, since the browser would handle all panning
    if (hasPanX && hasPanY) {
        return TOUCH_ACTION_NONE;
    }

    // pan-x OR pan-y
    if (hasPanX || hasPanY) {
        return hasPanX ? TOUCH_ACTION_PAN_X : TOUCH_ACTION_PAN_Y;
    }

    // manipulation
    if (inStr(actions, TOUCH_ACTION_MANIPULATION)) {
        return TOUCH_ACTION_MANIPULATION;
    }

    return TOUCH_ACTION_AUTO;
}

function getTouchActionProps() {
    if (!NATIVE_TOUCH_ACTION) {
        return false;
    }
    var touchMap = {};
    var cssSupports = window.CSS && window.CSS.supports;
    ['auto', 'manipulation', 'pan-y', 'pan-x', 'pan-x pan-y', 'none'].forEach(function(val) {

        // If css.supports is not supported but there is native touch-action assume it supports
        // all values. This is the case for IE 10 and 11.
        touchMap[val] = cssSupports ? window.CSS.supports('touch-action', val) : true;
    });
    return touchMap;
}

/**
 * Recognizer flow explained; *
 * All recognizers have the initial state of POSSIBLE when a input session starts.
 * The definition of a input session is from the first input until the last input, with all it's movement in it. *
 * Example session for mouse-input: mousedown -> mousemove -> mouseup
 *
 * On each recognizing cycle (see Manager.recognize) the .recognize() method is executed
 * which determines with state it should be.
 *
 * If the recognizer has the state FAILED, CANCELLED or RECOGNIZED (equals ENDED), it is reset to
 * POSSIBLE to give it another change on the next cycle.
 *
 *               Possible
 *                  |
 *            +-----+---------------+
 *            |                     |
 *      +-----+-----+               |
 *      |           |               |
 *   Failed      Cancelled          |
 *                          +-------+------+
 *                          |              |
 *                      Recognized       Began
 *                                         |
 *                                      Changed
 *                                         |
 *                                  Ended/Recognized
 */
var STATE_POSSIBLE = 1;
var STATE_BEGAN = 2;
var STATE_CHANGED = 4;
var STATE_ENDED = 8;
var STATE_RECOGNIZED = STATE_ENDED;
var STATE_CANCELLED = 16;
var STATE_FAILED = 32;

/**
 * Recognizer
 * Every recognizer needs to extend from this class.
 * @constructor
 * @param {Object} options
 */
function Recognizer(options) {
    this.options = assign({}, this.defaults, options || {});

    this.id = uniqueId();

    this.manager = null;

    // default is enable true
    this.options.enable = ifUndefined(this.options.enable, true);

    this.state = STATE_POSSIBLE;

    this.simultaneous = {};
    this.requireFail = [];
}

Recognizer.prototype = {
    /**
     * @virtual
     * @type {Object}
     */
    defaults: {},

    /**
     * set options
     * @param {Object} options
     * @return {Recognizer}
     */
    set: function(options) {
        assign(this.options, options);

        // also update the touchAction, in case something changed about the directions/enabled state
        this.manager && this.manager.touchAction.update();
        return this;
    },

    /**
     * recognize simultaneous with an other recognizer.
     * @param {Recognizer} otherRecognizer
     * @returns {Recognizer} this
     */
    recognizeWith: function(otherRecognizer) {
        if (invokeArrayArg(otherRecognizer, 'recognizeWith', this)) {
            return this;
        }

        var simultaneous = this.simultaneous;
        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
        if (!simultaneous[otherRecognizer.id]) {
            simultaneous[otherRecognizer.id] = otherRecognizer;
            otherRecognizer.recognizeWith(this);
        }
        return this;
    },

    /**
     * drop the simultaneous link. it doesnt remove the link on the other recognizer.
     * @param {Recognizer} otherRecognizer
     * @returns {Recognizer} this
     */
    dropRecognizeWith: function(otherRecognizer) {
        if (invokeArrayArg(otherRecognizer, 'dropRecognizeWith', this)) {
            return this;
        }

        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
        delete this.simultaneous[otherRecognizer.id];
        return this;
    },

    /**
     * recognizer can only run when an other is failing
     * @param {Recognizer} otherRecognizer
     * @returns {Recognizer} this
     */
    requireFailure: function(otherRecognizer) {
        if (invokeArrayArg(otherRecognizer, 'requireFailure', this)) {
            return this;
        }

        var requireFail = this.requireFail;
        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
        if (inArray(requireFail, otherRecognizer) === -1) {
            requireFail.push(otherRecognizer);
            otherRecognizer.requireFailure(this);
        }
        return this;
    },

    /**
     * drop the requireFailure link. it does not remove the link on the other recognizer.
     * @param {Recognizer} otherRecognizer
     * @returns {Recognizer} this
     */
    dropRequireFailure: function(otherRecognizer) {
        if (invokeArrayArg(otherRecognizer, 'dropRequireFailure', this)) {
            return this;
        }

        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
        var index = inArray(this.requireFail, otherRecognizer);
        if (index > -1) {
            this.requireFail.splice(index, 1);
        }
        return this;
    },

    /**
     * has require failures boolean
     * @returns {boolean}
     */
    hasRequireFailures: function() {
        return this.requireFail.length > 0;
    },

    /**
     * if the recognizer can recognize simultaneous with an other recognizer
     * @param {Recognizer} otherRecognizer
     * @returns {Boolean}
     */
    canRecognizeWith: function(otherRecognizer) {
        return !!this.simultaneous[otherRecognizer.id];
    },

    /**
     * You should use `tryEmit` instead of `emit` directly to check
     * that all the needed recognizers has failed before emitting.
     * @param {Object} input
     */
    emit: function(input) {
        var self = this;
        var state = this.state;

        function emit(event) {
            self.manager.emit(event, input);
        }

        // 'panstart' and 'panmove'
        if (state < STATE_ENDED) {
            emit(self.options.event + stateStr(state));
        }

        emit(self.options.event); // simple 'eventName' events

        if (input.additionalEvent) { // additional event(panleft, panright, pinchin, pinchout...)
            emit(input.additionalEvent);
        }

        // panend and pancancel
        if (state >= STATE_ENDED) {
            emit(self.options.event + stateStr(state));
        }
    },

    /**
     * Check that all the require failure recognizers has failed,
     * if true, it emits a gesture event,
     * otherwise, setup the state to FAILED.
     * @param {Object} input
     */
    tryEmit: function(input) {
        if (this.canEmit()) {
            return this.emit(input);
        }
        // it's failing anyway
        this.state = STATE_FAILED;
    },

    /**
     * can we emit?
     * @returns {boolean}
     */
    canEmit: function() {
        var i = 0;
        while (i < this.requireFail.length) {
            if (!(this.requireFail[i].state & (STATE_FAILED | STATE_POSSIBLE))) {
                return false;
            }
            i++;
        }
        return true;
    },

    /**
     * update the recognizer
     * @param {Object} inputData
     */
    recognize: function(inputData) {
        // make a new copy of the inputData
        // so we can change the inputData without messing up the other recognizers
        var inputDataClone = assign({}, inputData);

        // is is enabled and allow recognizing?
        if (!boolOrFn(this.options.enable, [this, inputDataClone])) {
            this.reset();
            this.state = STATE_FAILED;
            return;
        }

        // reset when we've reached the end
        if (this.state & (STATE_RECOGNIZED | STATE_CANCELLED | STATE_FAILED)) {
            this.state = STATE_POSSIBLE;
        }

        this.state = this.process(inputDataClone);

        // the recognizer has recognized a gesture
        // so trigger an event
        if (this.state & (STATE_BEGAN | STATE_CHANGED | STATE_ENDED | STATE_CANCELLED)) {
            this.tryEmit(inputDataClone);
        }
    },

    /**
     * return the state of the recognizer
     * the actual recognizing happens in this method
     * @virtual
     * @param {Object} inputData
     * @returns {Const} STATE
     */
    process: function(inputData) { }, // jshint ignore:line

    /**
     * return the preferred touch-action
     * @virtual
     * @returns {Array}
     */
    getTouchAction: function() { },

    /**
     * called when the gesture isn't allowed to recognize
     * like when another is being recognized or it is disabled
     * @virtual
     */
    reset: function() { }
};

/**
 * get a usable string, used as event postfix
 * @param {Const} state
 * @returns {String} state
 */
function stateStr(state) {
    if (state & STATE_CANCELLED) {
        return 'cancel';
    } else if (state & STATE_ENDED) {
        return 'end';
    } else if (state & STATE_CHANGED) {
        return 'move';
    } else if (state & STATE_BEGAN) {
        return 'start';
    }
    return '';
}

/**
 * direction cons to string
 * @param {Const} direction
 * @returns {String}
 */
function directionStr(direction) {
    if (direction == DIRECTION_DOWN) {
        return 'down';
    } else if (direction == DIRECTION_UP) {
        return 'up';
    } else if (direction == DIRECTION_LEFT) {
        return 'left';
    } else if (direction == DIRECTION_RIGHT) {
        return 'right';
    }
    return '';
}

/**
 * get a recognizer by name if it is bound to a manager
 * @param {Recognizer|String} otherRecognizer
 * @param {Recognizer} recognizer
 * @returns {Recognizer}
 */
function getRecognizerByNameIfManager(otherRecognizer, recognizer) {
    var manager = recognizer.manager;
    if (manager) {
        return manager.get(otherRecognizer);
    }
    return otherRecognizer;
}

/**
 * This recognizer is just used as a base for the simple attribute recognizers.
 * @constructor
 * @extends Recognizer
 */
function AttrRecognizer() {
    Recognizer.apply(this, arguments);
}

inherit(AttrRecognizer, Recognizer, {
    /**
     * @namespace
     * @memberof AttrRecognizer
     */
    defaults: {
        /**
         * @type {Number}
         * @default 1
         */
        pointers: 1
    },

    /**
     * Used to check if it the recognizer receives valid input, like input.distance > 10.
     * @memberof AttrRecognizer
     * @param {Object} input
     * @returns {Boolean} recognized
     */
    attrTest: function(input) {
        var optionPointers = this.options.pointers;
        return optionPointers === 0 || input.pointers.length === optionPointers;
    },

    /**
     * Process the input and return the state for the recognizer
     * @memberof AttrRecognizer
     * @param {Object} input
     * @returns {*} State
     */
    process: function(input) {
        var state = this.state;
        var eventType = input.eventType;

        var isRecognized = state & (STATE_BEGAN | STATE_CHANGED);
        var isValid = this.attrTest(input);

        // on cancel input and we've recognized before, return STATE_CANCELLED
        if (isRecognized && (eventType & INPUT_CANCEL || !isValid)) {
            return state | STATE_CANCELLED;
        } else if (isRecognized || isValid) {
            if (eventType & INPUT_END) {
                return state | STATE_ENDED;
            } else if (!(state & STATE_BEGAN)) {
                return STATE_BEGAN;
            }
            return state | STATE_CHANGED;
        }
        return STATE_FAILED;
    }
});

/**
 * Pan
 * Recognized when the pointer is down and moved in the allowed direction.
 * @constructor
 * @extends AttrRecognizer
 */
function PanRecognizer() {
    AttrRecognizer.apply(this, arguments);

    this.pX = null;
    this.pY = null;
}

inherit(PanRecognizer, AttrRecognizer, {
    /**
     * @namespace
     * @memberof PanRecognizer
     */
    defaults: {
        event: 'pan',
        threshold: 10,
        pointers: 1,
        direction: DIRECTION_ALL
    },

    getTouchAction: function() {
        var direction = this.options.direction;
        var actions = [];
        if (direction & DIRECTION_HORIZONTAL) {
            actions.push(TOUCH_ACTION_PAN_Y);
        }
        if (direction & DIRECTION_VERTICAL) {
            actions.push(TOUCH_ACTION_PAN_X);
        }
        return actions;
    },

    directionTest: function(input) {
        var options = this.options;
        var hasMoved = true;
        var distance = input.distance;
        var direction = input.direction;
        var x = input.deltaX;
        var y = input.deltaY;

        // lock to axis?
        if (!(direction & options.direction)) {
            if (options.direction & DIRECTION_HORIZONTAL) {
                direction = (x === 0) ? DIRECTION_NONE : (x < 0) ? DIRECTION_LEFT : DIRECTION_RIGHT;
                hasMoved = x != this.pX;
                distance = Math.abs(input.deltaX);
            } else {
                direction = (y === 0) ? DIRECTION_NONE : (y < 0) ? DIRECTION_UP : DIRECTION_DOWN;
                hasMoved = y != this.pY;
                distance = Math.abs(input.deltaY);
            }
        }
        input.direction = direction;
        return hasMoved && distance > options.threshold && direction & options.direction;
    },

    attrTest: function(input) {
        return AttrRecognizer.prototype.attrTest.call(this, input) &&
            (this.state & STATE_BEGAN || (!(this.state & STATE_BEGAN) && this.directionTest(input)));
    },

    emit: function(input) {

        this.pX = input.deltaX;
        this.pY = input.deltaY;

        var direction = directionStr(input.direction);

        if (direction) {
            input.additionalEvent = this.options.event + direction;
        }
        this._super.emit.call(this, input);
    }
});

/**
 * Pinch
 * Recognized when two or more pointers are moving toward (zoom-in) or away from each other (zoom-out).
 * @constructor
 * @extends AttrRecognizer
 */
function PinchRecognizer() {
    AttrRecognizer.apply(this, arguments);
}

inherit(PinchRecognizer, AttrRecognizer, {
    /**
     * @namespace
     * @memberof PinchRecognizer
     */
    defaults: {
        event: 'pinch',
        threshold: 0,
        pointers: 2
    },

    getTouchAction: function() {
        return [TOUCH_ACTION_NONE];
    },

    attrTest: function(input) {
        return this._super.attrTest.call(this, input) &&
            (Math.abs(input.scale - 1) > this.options.threshold || this.state & STATE_BEGAN);
    },

    emit: function(input) {
        if (input.scale !== 1) {
            var inOut = input.scale < 1 ? 'in' : 'out';
            input.additionalEvent = this.options.event + inOut;
        }
        this._super.emit.call(this, input);
    }
});

/**
 * Press
 * Recognized when the pointer is down for x ms without any movement.
 * @constructor
 * @extends Recognizer
 */
function PressRecognizer() {
    Recognizer.apply(this, arguments);

    this._timer = null;
    this._input = null;
}

inherit(PressRecognizer, Recognizer, {
    /**
     * @namespace
     * @memberof PressRecognizer
     */
    defaults: {
        event: 'press',
        pointers: 1,
        time: 251, // minimal time of the pointer to be pressed
        threshold: 9 // a minimal movement is ok, but keep it low
    },

    getTouchAction: function() {
        return [TOUCH_ACTION_AUTO];
    },

    process: function(input) {
        var options = this.options;
        var validPointers = input.pointers.length === options.pointers;
        var validMovement = input.distance < options.threshold;
        var validTime = input.deltaTime > options.time;

        this._input = input;

        // we only allow little movement
        // and we've reached an end event, so a tap is possible
        if (!validMovement || !validPointers || (input.eventType & (INPUT_END | INPUT_CANCEL) && !validTime)) {
            this.reset();
        } else if (input.eventType & INPUT_START) {
            this.reset();
            this._timer = setTimeoutContext(function() {
                this.state = STATE_RECOGNIZED;
                this.tryEmit();
            }, options.time, this);
        } else if (input.eventType & INPUT_END) {
            return STATE_RECOGNIZED;
        }
        return STATE_FAILED;
    },

    reset: function() {
        clearTimeout(this._timer);
    },

    emit: function(input) {
        if (this.state !== STATE_RECOGNIZED) {
            return;
        }

        if (input && (input.eventType & INPUT_END)) {
            this.manager.emit(this.options.event + 'up', input);
        } else {
            this._input.timeStamp = now();
            this.manager.emit(this.options.event, this._input);
        }
    }
});

/**
 * Rotate
 * Recognized when two or more pointer are moving in a circular motion.
 * @constructor
 * @extends AttrRecognizer
 */
function RotateRecognizer() {
    AttrRecognizer.apply(this, arguments);
}

inherit(RotateRecognizer, AttrRecognizer, {
    /**
     * @namespace
     * @memberof RotateRecognizer
     */
    defaults: {
        event: 'rotate',
        threshold: 0,
        pointers: 2
    },

    getTouchAction: function() {
        return [TOUCH_ACTION_NONE];
    },

    attrTest: function(input) {
        return this._super.attrTest.call(this, input) &&
            (Math.abs(input.rotation) > this.options.threshold || this.state & STATE_BEGAN);
    }
});

/**
 * Swipe
 * Recognized when the pointer is moving fast (velocity), with enough distance in the allowed direction.
 * @constructor
 * @extends AttrRecognizer
 */
function SwipeRecognizer() {
    AttrRecognizer.apply(this, arguments);
}

inherit(SwipeRecognizer, AttrRecognizer, {
    /**
     * @namespace
     * @memberof SwipeRecognizer
     */
    defaults: {
        event: 'swipe',
        threshold: 10,
        velocity: 0.3,
        direction: DIRECTION_HORIZONTAL | DIRECTION_VERTICAL,
        pointers: 1
    },

    getTouchAction: function() {
        return PanRecognizer.prototype.getTouchAction.call(this);
    },

    attrTest: function(input) {
        var direction = this.options.direction;
        var velocity;

        if (direction & (DIRECTION_HORIZONTAL | DIRECTION_VERTICAL)) {
            velocity = input.overallVelocity;
        } else if (direction & DIRECTION_HORIZONTAL) {
            velocity = input.overallVelocityX;
        } else if (direction & DIRECTION_VERTICAL) {
            velocity = input.overallVelocityY;
        }

        return this._super.attrTest.call(this, input) &&
            direction & input.offsetDirection &&
            input.distance > this.options.threshold &&
            input.maxPointers == this.options.pointers &&
            abs(velocity) > this.options.velocity && input.eventType & INPUT_END;
    },

    emit: function(input) {
        var direction = directionStr(input.offsetDirection);
        if (direction) {
            this.manager.emit(this.options.event + direction, input);
        }

        this.manager.emit(this.options.event, input);
    }
});

/**
 * A tap is ecognized when the pointer is doing a small tap/click. Multiple taps are recognized if they occur
 * between the given interval and position. The delay option can be used to recognize multi-taps without firing
 * a single tap.
 *
 * The eventData from the emitted event contains the property `tapCount`, which contains the amount of
 * multi-taps being recognized.
 * @constructor
 * @extends Recognizer
 */
function TapRecognizer() {
    Recognizer.apply(this, arguments);

    // previous time and center,
    // used for tap counting
    this.pTime = false;
    this.pCenter = false;

    this._timer = null;
    this._input = null;
    this.count = 0;
}

inherit(TapRecognizer, Recognizer, {
    /**
     * @namespace
     * @memberof PinchRecognizer
     */
    defaults: {
        event: 'tap',
        pointers: 1,
        taps: 1,
        interval: 300, // max time between the multi-tap taps
        time: 250, // max time of the pointer to be down (like finger on the screen)
        threshold: 9, // a minimal movement is ok, but keep it low
        posThreshold: 10 // a multi-tap can be a bit off the initial position
    },

    getTouchAction: function() {
        return [TOUCH_ACTION_MANIPULATION];
    },

    process: function(input) {
        var options = this.options;

        var validPointers = input.pointers.length === options.pointers;
        var validMovement = input.distance < options.threshold;
        var validTouchTime = input.deltaTime < options.time;

        this.reset();

        if ((input.eventType & INPUT_START) && (this.count === 0)) {
            return this.failTimeout();
        }

        // we only allow little movement
        // and we've reached an end event, so a tap is possible
        if (validMovement && validTouchTime && validPointers) {
            if (input.eventType != INPUT_END) {
                return this.failTimeout();
            }

            var validInterval = this.pTime ? (input.timeStamp - this.pTime < options.interval) : true;
            var validMultiTap = !this.pCenter || getDistance(this.pCenter, input.center) < options.posThreshold;

            this.pTime = input.timeStamp;
            this.pCenter = input.center;

            if (!validMultiTap || !validInterval) {
                this.count = 1;
            } else {
                this.count += 1;
            }

            this._input = input;

            // if tap count matches we have recognized it,
            // else it has began recognizing...
            var tapCount = this.count % options.taps;
            if (tapCount === 0) {
                // no failing requirements, immediately trigger the tap event
                // or wait as long as the multitap interval to trigger
                if (!this.hasRequireFailures()) {
                    return STATE_RECOGNIZED;
                } else {
                    this._timer = setTimeoutContext(function() {
                        this.state = STATE_RECOGNIZED;
                        this.tryEmit();
                    }, options.interval, this);
                    return STATE_BEGAN;
                }
            }
        }
        return STATE_FAILED;
    },

    failTimeout: function() {
        this._timer = setTimeoutContext(function() {
            this.state = STATE_FAILED;
        }, this.options.interval, this);
        return STATE_FAILED;
    },

    reset: function() {
        clearTimeout(this._timer);
    },

    emit: function() {
        if (this.state == STATE_RECOGNIZED) {
            this._input.tapCount = this.count;
            this.manager.emit(this.options.event, this._input);
        }
    }
});

/**
 * Simple way to create a manager with a default set of recognizers.
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @constructor
 */
function Hammer(element, options) {
    options = options || {};
    options.recognizers = ifUndefined(options.recognizers, Hammer.defaults.preset);
    return new Manager(element, options);
}

/**
 * @const {string}
 */
Hammer.VERSION = '2.0.7';

/**
 * default settings
 * @namespace
 */
Hammer.defaults = {
    /**
     * set if DOM events are being triggered.
     * But this is slower and unused by simple implementations, so disabled by default.
     * @type {Boolean}
     * @default false
     */
    domEvents: false,

    /**
     * The value for the touchAction property/fallback.
     * When set to `compute` it will magically set the correct value based on the added recognizers.
     * @type {String}
     * @default compute
     */
    touchAction: TOUCH_ACTION_COMPUTE,

    /**
     * @type {Boolean}
     * @default true
     */
    enable: true,

    /**
     * EXPERIMENTAL FEATURE -- can be removed/changed
     * Change the parent input target element.
     * If Null, then it is being set the to main element.
     * @type {Null|EventTarget}
     * @default null
     */
    inputTarget: null,

    /**
     * force an input class
     * @type {Null|Function}
     * @default null
     */
    inputClass: null,

    /**
     * Default recognizer setup when calling `Hammer()`
     * When creating a new Manager these will be skipped.
     * @type {Array}
     */
    preset: [
        // RecognizerClass, options, [recognizeWith, ...], [requireFailure, ...]
        [RotateRecognizer, {enable: false}],
        [PinchRecognizer, {enable: false}, ['rotate']],
        [SwipeRecognizer, {direction: DIRECTION_HORIZONTAL}],
        [PanRecognizer, {direction: DIRECTION_HORIZONTAL}, ['swipe']],
        [TapRecognizer],
        [TapRecognizer, {event: 'doubletap', taps: 2}, ['tap']],
        [PressRecognizer]
    ],

    /**
     * Some CSS properties can be used to improve the working of Hammer.
     * Add them to this method and they will be set when creating a new Manager.
     * @namespace
     */
    cssProps: {
        /**
         * Disables text selection to improve the dragging gesture. Mainly for desktop browsers.
         * @type {String}
         * @default 'none'
         */
        userSelect: 'none',

        /**
         * Disable the Windows Phone grippers when pressing an element.
         * @type {String}
         * @default 'none'
         */
        touchSelect: 'none',

        /**
         * Disables the default callout shown when you touch and hold a touch target.
         * On iOS, when you touch and hold a touch target such as a link, Safari displays
         * a callout containing information about the link. This property allows you to disable that callout.
         * @type {String}
         * @default 'none'
         */
        touchCallout: 'none',

        /**
         * Specifies whether zooming is enabled. Used by IE10>
         * @type {String}
         * @default 'none'
         */
        contentZooming: 'none',

        /**
         * Specifies that an entire element should be draggable instead of its contents. Mainly for desktop browsers.
         * @type {String}
         * @default 'none'
         */
        userDrag: 'none',

        /**
         * Overrides the highlight color shown when the user taps a link or a JavaScript
         * clickable element in iOS. This property obeys the alpha value, if specified.
         * @type {String}
         * @default 'rgba(0,0,0,0)'
         */
        tapHighlightColor: 'rgba(0,0,0,0)'
    }
};

var STOP = 1;
var FORCED_STOP = 2;

/**
 * Manager
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @constructor
 */
function Manager(element, options) {
    this.options = assign({}, Hammer.defaults, options || {});

    this.options.inputTarget = this.options.inputTarget || element;

    this.handlers = {};
    this.session = {};
    this.recognizers = [];
    this.oldCssProps = {};

    this.element = element;
    this.input = createInputInstance(this);
    this.touchAction = new TouchAction(this, this.options.touchAction);

    toggleCssProps(this, true);

    each(this.options.recognizers, function(item) {
        var recognizer = this.add(new (item[0])(item[1]));
        item[2] && recognizer.recognizeWith(item[2]);
        item[3] && recognizer.requireFailure(item[3]);
    }, this);
}

Manager.prototype = {
    /**
     * set options
     * @param {Object} options
     * @returns {Manager}
     */
    set: function(options) {
        assign(this.options, options);

        // Options that need a little more setup
        if (options.touchAction) {
            this.touchAction.update();
        }
        if (options.inputTarget) {
            // Clean up existing event listeners and reinitialize
            this.input.destroy();
            this.input.target = options.inputTarget;
            this.input.init();
        }
        return this;
    },

    /**
     * stop recognizing for this session.
     * This session will be discarded, when a new [input]start event is fired.
     * When forced, the recognizer cycle is stopped immediately.
     * @param {Boolean} [force]
     */
    stop: function(force) {
        this.session.stopped = force ? FORCED_STOP : STOP;
    },

    /**
     * run the recognizers!
     * called by the inputHandler function on every movement of the pointers (touches)
     * it walks through all the recognizers and tries to detect the gesture that is being made
     * @param {Object} inputData
     */
    recognize: function(inputData) {
        var session = this.session;
        if (session.stopped) {
            return;
        }

        // run the touch-action polyfill
        this.touchAction.preventDefaults(inputData);

        var recognizer;
        var recognizers = this.recognizers;

        // this holds the recognizer that is being recognized.
        // so the recognizer's state needs to be BEGAN, CHANGED, ENDED or RECOGNIZED
        // if no recognizer is detecting a thing, it is set to `null`
        var curRecognizer = session.curRecognizer;

        // reset when the last recognizer is recognized
        // or when we're in a new session
        if (!curRecognizer || (curRecognizer && curRecognizer.state & STATE_RECOGNIZED)) {
            curRecognizer = session.curRecognizer = null;
        }

        var i = 0;
        while (i < recognizers.length) {
            recognizer = recognizers[i];

            // find out if we are allowed try to recognize the input for this one.
            // 1.   allow if the session is NOT forced stopped (see the .stop() method)
            // 2.   allow if we still haven't recognized a gesture in this session, or the this recognizer is the one
            //      that is being recognized.
            // 3.   allow if the recognizer is allowed to run simultaneous with the current recognized recognizer.
            //      this can be setup with the `recognizeWith()` method on the recognizer.
            if (session.stopped !== FORCED_STOP && ( // 1
                    !curRecognizer || recognizer == curRecognizer || // 2
                    recognizer.canRecognizeWith(curRecognizer))) { // 3
                recognizer.recognize(inputData);
            } else {
                recognizer.reset();
            }

            // if the recognizer has been recognizing the input as a valid gesture, we want to store this one as the
            // current active recognizer. but only if we don't already have an active recognizer
            if (!curRecognizer && recognizer.state & (STATE_BEGAN | STATE_CHANGED | STATE_ENDED)) {
                curRecognizer = session.curRecognizer = recognizer;
            }
            i++;
        }
    },

    /**
     * get a recognizer by its event name.
     * @param {Recognizer|String} recognizer
     * @returns {Recognizer|Null}
     */
    get: function(recognizer) {
        if (recognizer instanceof Recognizer) {
            return recognizer;
        }

        var recognizers = this.recognizers;
        for (var i = 0; i < recognizers.length; i++) {
            if (recognizers[i].options.event == recognizer) {
                return recognizers[i];
            }
        }
        return null;
    },

    /**
     * add a recognizer to the manager
     * existing recognizers with the same event name will be removed
     * @param {Recognizer} recognizer
     * @returns {Recognizer|Manager}
     */
    add: function(recognizer) {
        if (invokeArrayArg(recognizer, 'add', this)) {
            return this;
        }

        // remove existing
        var existing = this.get(recognizer.options.event);
        if (existing) {
            this.remove(existing);
        }

        this.recognizers.push(recognizer);
        recognizer.manager = this;

        this.touchAction.update();
        return recognizer;
    },

    /**
     * remove a recognizer by name or instance
     * @param {Recognizer|String} recognizer
     * @returns {Manager}
     */
    remove: function(recognizer) {
        if (invokeArrayArg(recognizer, 'remove', this)) {
            return this;
        }

        recognizer = this.get(recognizer);

        // let's make sure this recognizer exists
        if (recognizer) {
            var recognizers = this.recognizers;
            var index = inArray(recognizers, recognizer);

            if (index !== -1) {
                recognizers.splice(index, 1);
                this.touchAction.update();
            }
        }

        return this;
    },

    /**
     * bind event
     * @param {String} events
     * @param {Function} handler
     * @returns {EventEmitter} this
     */
    on: function(events, handler) {
        if (events === undefined) {
            return;
        }
        if (handler === undefined) {
            return;
        }

        var handlers = this.handlers;
        each(splitStr(events), function(event) {
            handlers[event] = handlers[event] || [];
            handlers[event].push(handler);
        });
        return this;
    },

    /**
     * unbind event, leave emit blank to remove all handlers
     * @param {String} events
     * @param {Function} [handler]
     * @returns {EventEmitter} this
     */
    off: function(events, handler) {
        if (events === undefined) {
            return;
        }

        var handlers = this.handlers;
        each(splitStr(events), function(event) {
            if (!handler) {
                delete handlers[event];
            } else {
                handlers[event] && handlers[event].splice(inArray(handlers[event], handler), 1);
            }
        });
        return this;
    },

    /**
     * emit event to the listeners
     * @param {String} event
     * @param {Object} data
     */
    emit: function(event, data) {
        // we also want to trigger dom events
        if (this.options.domEvents) {
            triggerDomEvent(event, data);
        }

        // no handlers, so skip it all
        var handlers = this.handlers[event] && this.handlers[event].slice();
        if (!handlers || !handlers.length) {
            return;
        }

        data.type = event;
        data.preventDefault = function() {
            data.srcEvent.preventDefault();
        };

        var i = 0;
        while (i < handlers.length) {
            handlers[i](data);
            i++;
        }
    },

    /**
     * destroy the manager and unbinds all events
     * it doesn't unbind dom events, that is the user own responsibility
     */
    destroy: function() {
        this.element && toggleCssProps(this, false);

        this.handlers = {};
        this.session = {};
        this.input.destroy();
        this.element = null;
    }
};

/**
 * add/remove the css properties as defined in manager.options.cssProps
 * @param {Manager} manager
 * @param {Boolean} add
 */
function toggleCssProps(manager, add) {
    var element = manager.element;
    if (!element.style) {
        return;
    }
    var prop;
    each(manager.options.cssProps, function(value, name) {
        prop = prefixed(element.style, name);
        if (add) {
            manager.oldCssProps[prop] = element.style[prop];
            element.style[prop] = value;
        } else {
            element.style[prop] = manager.oldCssProps[prop] || '';
        }
    });
    if (!add) {
        manager.oldCssProps = {};
    }
}

/**
 * trigger dom event
 * @param {String} event
 * @param {Object} data
 */
function triggerDomEvent(event, data) {
    var gestureEvent = document.createEvent('Event');
    gestureEvent.initEvent(event, true, true);
    gestureEvent.gesture = data;
    data.target.dispatchEvent(gestureEvent);
}

assign(Hammer, {
    INPUT_START: INPUT_START,
    INPUT_MOVE: INPUT_MOVE,
    INPUT_END: INPUT_END,
    INPUT_CANCEL: INPUT_CANCEL,

    STATE_POSSIBLE: STATE_POSSIBLE,
    STATE_BEGAN: STATE_BEGAN,
    STATE_CHANGED: STATE_CHANGED,
    STATE_ENDED: STATE_ENDED,
    STATE_RECOGNIZED: STATE_RECOGNIZED,
    STATE_CANCELLED: STATE_CANCELLED,
    STATE_FAILED: STATE_FAILED,

    DIRECTION_NONE: DIRECTION_NONE,
    DIRECTION_LEFT: DIRECTION_LEFT,
    DIRECTION_RIGHT: DIRECTION_RIGHT,
    DIRECTION_UP: DIRECTION_UP,
    DIRECTION_DOWN: DIRECTION_DOWN,
    DIRECTION_HORIZONTAL: DIRECTION_HORIZONTAL,
    DIRECTION_VERTICAL: DIRECTION_VERTICAL,
    DIRECTION_ALL: DIRECTION_ALL,

    Manager: Manager,
    Input: Input,
    TouchAction: TouchAction,

    TouchInput: TouchInput,
    MouseInput: MouseInput,
    PointerEventInput: PointerEventInput,
    TouchMouseInput: TouchMouseInput,
    SingleTouchInput: SingleTouchInput,

    Recognizer: Recognizer,
    AttrRecognizer: AttrRecognizer,
    Tap: TapRecognizer,
    Pan: PanRecognizer,
    Swipe: SwipeRecognizer,
    Pinch: PinchRecognizer,
    Rotate: RotateRecognizer,
    Press: PressRecognizer,

    on: addEventListeners,
    off: removeEventListeners,
    each: each,
    merge: merge,
    extend: extend,
    assign: assign,
    inherit: inherit,
    bindFn: bindFn,
    prefixed: prefixed
});

// this prevents errors when Hammer is loaded in the presence of an AMD
//  style loader but by script tag, not by the loader.
var freeGlobal = (typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : {})); // jshint ignore:line
freeGlobal.Hammer = Hammer;

if (typeof define === 'function' && define.amd) {
    define(function() {
        return Hammer;
    });
} else if (typeof module != 'undefined' && module.exports) {
    module.exports = Hammer;
} else {
    window[exportName] = Hammer;
}

})(window, document, 'Hammer');


/* ZOOM 05 preventghostclick */
/**
 * Prevent click events after a touchend.
 *
 * Inspired/copy-paste from this article of Google by Ryan Fioravanti
 * https://developers.google.com/mobile/articles/fast_buttons#ghost
 *
 * USAGE:
 * Prevent the click event for an certain element
 * ````
 *  PreventGhostClick(myElement);
 * ````
 *
 * Prevent clicks on the whole document (not recommended!!) *
 * ````
 *  PreventGhostClick(document);
 * ````
 *
 */
(function(window, document, exportName) {
    var coordinates = [];
    var threshold = 25;
    var timeout = 2500;

    // no touch support
    if(!("ontouchstart" in window)) {
        window[exportName] = function(){};
        return;
    }

    /**
     * prevent clicks if they're in a registered XY region
     * @param {MouseEvent} ev
     */
    function preventGhostClick(ev) {
        for (var i = 0; i < coordinates.length; i++) {
            var x = coordinates[i][0];
            var y = coordinates[i][1];

            // within the range, so prevent the click
            if (Math.abs(ev.clientX - x) < threshold && Math.abs(ev.clientY - y) < threshold) {
                ev.stopPropagation();
                ev.preventDefault();
                break;
            }
        }
    }

    /**
     * reset the coordinates array
     */
    function resetCoordinates() {
        coordinates = [];
    }

    /**
     * remove the first coordinates set from the array
     */
    function popCoordinates() {
        coordinates.splice(0, 1);
    }

    /**
     * if it is an final touchend, we want to register it's place
     * @param {TouchEvent} ev
     */
    function registerCoordinates(ev) {
        // touchend is triggered on every releasing finger
        // changed touches always contain the removed touches on a touchend
        // the touches object might contain these also at some browsers (firefox os)
        // so touches - changedTouches will be 0 or lower, like -1, on the final touchend
        if(ev.touches.length - ev.changedTouches.length <= 0) {
            var touch = ev.changedTouches[0];
            coordinates.push([touch.clientX, touch.clientY]);

            setTimeout(popCoordinates, timeout);
        }
    }

    /**
     * prevent click events for the given element
     * @param {EventTarget} el
     */
    window[exportName] = function(el) {
        el.addEventListener("touchstart", resetCoordinates, true);
        el.addEventListener("touchend", registerCoordinates, true);
    };

    document.addEventListener("click", preventGhostClick, true);
})(window, document, 'PreventGhostClick');

/* ZOOM 06 Mag */
/**
 * mag
 */

(function (root, factory) {
  'use strict'; // eslint-disable-line semi

  var name = 'Mag'
  if (typeof define === 'function' && define.amd) {
    define(['./mag-analytics'], function (MagnificentAnalytics) {
      return (root[name] = factory(MagnificentAnalytics))
    })
  } else if (typeof exports === 'object') {
    module.exports = factory(require('./mag-analytics'))
  } else {
    root[name] = factory(root.MagnificentAnalytics)
  }
}(this, function (MagnificentAnalytics) {
  'use strict'; // eslint-disable-line semi

  /**
   * @typedef {Object} MagModelFocus
   * @property {number} x - X position, from [0,1].
   * @property {number} y - Y position, from [0,1].
   */

  /**
   * @typedef {Object} MagModelLens
   * @property {number} w - Width, from (0,∞).
   * @property {number} h - Height, from (0,∞).
   */

  /**
   * @typedef {Object} MagModel
   * @property {number} zoom - Zoom level, from (0,∞).
   * @property {MagModelFocus} focus - Focus object.
   * @property {MagModelLens} lens - Lens object.
   */

  /**
   * @typedef {Object} MagOptions
   * @property {MagModel} model - A model.
   * @property {number} zoomMin - Minimum zoom level allowed, from (0,∞).
   * @property {number} zoomMax - Maximum zoom level allowed, from (0,∞).
   * @property {boolean} constrainLens - Whether lens position is constrained.
   * @property {boolean} constrainZoomed - Whether zoomed position is constrained.
   */

  /**
   * Mag constructor.
   *
   * @alias module:mag
   *
   * @class
   *
   * @param {MagOptions} options - Options.
   */
  var Mag = function (options) {
    options = options || {}
    options.model = options.model || {}
    options.zoomMin = options.zoomMin || 1
    options.zoomMax = options.zoomMax || 10
    options.constrainLens = options.constrainLens !== false
    options.constrainZoomed = options.constrainZoomed !== false

    this.id = options.id

    this.model = options.model
    this.options = options

    this.fillModel()
  }

  Mag.prototype.fillXY = function (r) {
    r = r || {}
    r.x = r.x || 0
    r.y = r.y || 0
    return r
  }

  Mag.prototype.fillWH = function (r) {
    r = r || {}
    r.w = r.w || 0
    r.h = r.h || 0
    return r
  }

  Mag.prototype.fillModel = function () {
    var model = this.model
    model.mode = model.mode || 'lag'
    model.focus = this.fillXY(model.focus)
    model.lens = this.fillXY(this.fillWH(model.lens))
    model.zoomed = this.fillXY(this.fillWH(model.zoomed))
    model.boundedLens = this.fillXY(this.fillWH(model.boundedLens))
    model.zoom = model.zoom || 1
    model.ratio = model.ratio || 1
  }

  /**
   * Update computed model state, especially lens and zoomed.
   */
  Mag.prototype.compute = function () {
    var lens, focus, zoomed, zoom, dw, dh
    var options = this.options
    var model = this.model
    lens = model.lens
    focus = model.focus
    zoomed = model.zoomed
    zoom = model.zoom

    zoom = this.minMax(zoom, options.zoomMin, options.zoomMax)

    focus.x = this.minMax(focus.x, 0, 1)
    focus.y = this.minMax(focus.y, 0, 1)

    dw = 1 / zoom
    dh = 1 / zoom
    dh = dh / model.ratio

    lens.w = dw
    lens.h = dh

    if (options.constrainLens) {
      lens = this.constrainLensWH(lens)
    }
    lens.x = focus.x - (lens.w / 2)
    lens.y = focus.y - (lens.h / 2)
    if (options.constrainLens) {
      lens = this.constrainLensXY(lens)
    }

    zoomed.w = 1 / dw
    zoomed.h = 1 / dh

    var z = this.constrainZoomed(zoomed, options)
    if (z.w !== zoomed.w) {
      zoom *= z.w / zoomed.w
    }
    zoomed = z

    zoomed.x = 0.5 - focus.x * zoomed.w
    zoomed.y = 0.5 - focus.y * zoomed.h

    // the following is better equation for constrained zoom
    // zoomed.x = focus.x * (1 - zoom)
    // zoomed.y = focus.y * (1 - zoom)

    if (options.constrainZoomed) {
      zoomed.x = this.minMax(zoomed.x, 1 - zoom, 0)
      zoomed.y = this.minMax(zoomed.y, 1 - zoom, 0)
    }

    model.lens = lens
    model.focus = focus
    model.zoomed = zoomed
    model.zoom = zoom
  }

  Mag.prototype.minMax = function (val, min, max) {
    return val < min ? min : (val > max ? max : val)
  }

  Mag.prototype.minMax1 = function (val, min) {
    return this.minMax(val, min, 1)
  }

  Mag.prototype.constrainZoomed = function (r, options) {
    var wm
    var hm
    wm = this.minMax(r.w, options.zoomMin, options.zoomMax)
    if (wm !== r.w) {
      hm *= wm / r.w
      hm = this.minMax(hm, options.zoomMin, options.zoomMax)
    } else {
      hm = this.minMax(r.h, options.zoomMin, options.zoomMax)
      if (hm !== r.h) {
        wm *= hm / r.h
        wm = this.minMax(wm, options.zoomMin, options.zoomMax)
      }
    }
    return {
      w: wm,
      h: hm,
      x: r.x,
      y: r.y
    }
  }

  Mag.prototype.constrainLensWH = function (r) {
    var wm
    var hm
    wm = this.minMax1(r.w, 0.1)
    if (wm !== r.w) {
      hm *= wm / r.w
      hm = this.minMax1(hm, 0.1)
    } else {
      hm = this.minMax1(r.h, 0.1)
      if (hm !== r.h) {
        wm *= hm / r.h
        wm = this.minMax1(wm, 0.1)
      }
    }
    return {
      w: wm,
      h: hm,
      x: r.x,
      y: r.y
    }
  }

  Mag.prototype.constrainLensXY = function (r) {
    return {
      x: this.minMax(r.x, 0, 1 - r.w),
      y: this.minMax(r.y, 0, 1 - r.h),
      w: r.w,
      h: r.h
    }
  }

  Mag.prototype.constrainLens = function (r) {
    var c = this.constrainLensXY(this.constrainLensWH(r))
    if (((c.w + c.x) > 1)) {
      c.x = Math.max(0, 1 - c.w)
    }
    if (((c.h + c.y) > 1)) {
      c.y = Math.max(0, 1 - c.h)
    }
    return c
  }

  Mag.prototype.project = function (frame) {
    var model = this.model
    var lens = model.lens
    return {
      x: lens.x * frame.w,
      y: lens.y * frame.h,
      w: lens.w * frame.w,
      h: lens.h * frame.h
    }
  }

  if (MagnificentAnalytics) {
    MagnificentAnalytics.track('mag.js')
  }

  return Mag
}));

/* ZOOM 07 Mag Jquery */
/**
 * mag-jquery
 */

/**
 * @external jQuery
 * @see {@link https://api.jquery.com/jQuery/}
 */

/**
 * @external HTMLElement
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement}
 */

(function (root, factory) {
  'use strict'; // eslint-disable-line semi

  var name = 'Magnificent'
  if (typeof define === 'function' && define.amd) {
    define(['./mag', './mag-analytics', 'jquery', 'hammerjs', 'prevent-ghost-click', 'jquery-bridget'],
      function (mag, MagnificentAnalytics, jQuery, Hammer) {
        return (root[name] = factory(mag, MagnificentAnalytics, jQuery, Hammer, root.PreventGhostClick))
      }
    )
  } else if (typeof exports === 'object') {
    module.exports = factory(require('./mag'), require('./mag-analytics'),
      require('jquery'), require('hammerjs'), require('prevent-ghost-click'),
      require('jquery-bridget')
    )
  } else {
    root[name] = factory(root.Mag, root.MagnificentAnalytics,
      root.jQuery, root.Hammer, root.PreventGhostClick
    )
  }
}(this, function (Mag, MagnificentAnalytics, $, Hammer, PreventGhostClick) {
  'use strict'; // eslint-disable-line semi

  $(':root').addClass('mag-js')

  var normalizeOffsets = function (e, $target) {
    $target = $target || $(e.target)
    var offset = $target.offset()
    return {
      x: e.pageX - offset.left,
      y: e.pageY - offset.top
    }
  }

  var ratioOffsets = function (e, $target) {
    $target = $target || $(e.target)
    var normOff = normalizeOffsets(e, $target)
    return {
      x: normOff.x / $target.width(),
      y: normOff.y / $target.height()
    }
  }

  var ratioOffsetsFor = function ($target, x, y) {
    return {
      x: x / $target.width(),
      y: y / $target.height()
    }
  }

  var cssPerc = function (frac) {
    return (frac * 100) + '%'
  }

  var toCSS = function (pt, mode, id) {
    if (mode === '3d') {
      return toCSSTransform3d(pt, id)
    }

    if (mode === '2d') {
      return toCSSTransform2d(pt, id)
    }

    // mode === 'position'
    return toCSSPosition(pt, id)
  }

  var toCSSPosition = function (pt, id) {
    var css = {}

    if (pt.x !== undefined) css.left = cssPerc(pt.x)
    if (pt.y !== undefined) css.top = cssPerc(pt.y)
    if (pt.w !== undefined) css.width = cssPerc(pt.w)
    if (pt.h !== undefined) css.height = cssPerc(pt.h)

    return css
  }

  var toCSSTransform2d = function (pt, id) {
    var css = {}
    var left
    var top
    var width
    var height

    var x = pt.x
    var y = pt.y
    var w = pt.w
    var h = pt.h

    x += (w - 1) * (0.5 - x) / w
    y += (h - 1) * (0.5 - y) / h

    if (x !== undefined) left = cssPerc(x)
    if (y !== undefined) top = cssPerc(y)
    if (w !== undefined) width = w
    if (h !== undefined) height = h

    var transform = ''

    if (width) transform += ' scaleX(' + width + ')'
    if (height) transform += ' scaleY(' + height + ')'
    if (left) transform += ' translateX(' + left + ')'
    if (top) transform += ' translateY(' + top + ')'

    css['-webkit-transform'] = transform
    css['-moz-transform'] = transform
    css['-ms-transform'] = transform
    css['-o-transform'] = transform
    css.transform = transform

    return css
  }

  var toCSSTransform3d = function (pt, id) {
    var css = {}
    var left
    var top
    var width
    var height

    var x = pt.x
    var y = pt.y
    var w = pt.w
    var h = pt.h

    x += (w - 1) * (0.5 - x) / w
    y += (h - 1) * (0.5 - y) / h

    if (x !== undefined) left = cssPerc(x)
    if (y !== undefined) top = cssPerc(y)
    if (w !== undefined) width = w
    if (h !== undefined) height = h

    var transform = ''
    transform += ' scale3d(' +
      (width !== undefined ? width : 0) + ',' +
      (height !== undefined ? height : 0) +
      ',1)'
    transform += ' translate3d(' +
      (left !== undefined ? left : 0) + ',' +
      (top !== undefined ? top : 0) +
      ',0)'

    css['-webkit-transform'] = transform
    css['-moz-transform'] = transform
    css['-ms-transform'] = transform
    css['-o-transform'] = transform
    css.transform = transform

    css.width = '100%'
    css.height = '100%'
    css.position = 'absolute'
    css.top = '0'
    css.left = '0'

    return css
  }

  /**
   * Magnificent constructor.
   *
   * @alias module:mag-jquery
   *
   * @class
   * @param {external:HTMLElement|external:jQuery} element - DOM element to embellish.
   * @param {MagnificentOptions} options - Options to override defaults.
   */
  var Magnificent = function (element, options) {
    this.element = $(element)
    this.options = $.extend(true, {}, this.options, options)
    this._init()
  }

  /**
   * Default options.
   *
   * @typedef MagnificentOptions
   *
   *  Mode:<br>
   * @property {string} mode
   *  <dl>
   *    <dt>"inner"</dt><dd><i>(default)</i> Zoom region embedded in thumbnail.</dd>
   *    <dt>"outer"</dt><dd>Zoom region independent of thumbnail.</dd>
   *  </dl>
   * @property {string|boolean} position - What interaction(s) position zoomed region.
   *  <dl>
   *    <dt>"mirror"</dt><dd><i>(default)</i> Zoomed region follows mouse/pointer.</dd>
   *    <dt>"drag"</dt><dd>Drag to move.</dd>
   *    <dt>"joystick"</dt><dd>Weird joystick interaction to move.</dd>
   *    <dt>false</dt><dd>No mouse/touch.</dd>
   *  </dl>
   * @property {string} positionEvent - Controls what event(s) cause positioning.
   *  <dl>
   *    <dt>"move"</dt><dd><i>(default)</i> On move (e.g. mouseover).</dd>
   *    <dt>"hold"</dt><dd>On hold (e.g. while mousedown).</dd>
   *  </dl>
   * @property {string} theme - Themes apply a style to the widgets.
   *  <dl>
   *    <dt>"default"</dt><dd><i>(default)</i> Default theme.</dd>
   *  </dl>
   * @property {string} initialShow
   *  <dl>
   *    <dt>"thumb"</dt><dd><i>(default)</i> Whether to show thumbnail or zoomed first,
   *      e.g. in "inner" mode.</dd>
   *  </dl>
   * @property {number} zoomRate - Rate at which to adjust zoom, from (0,∞). Default = 0.2.
   * @property {number} zoomMin - Minimum zoom level allowed, from (0,∞). Default = 2.
   * @property {number} zoomMax - Maximum zoom level allowed, from (0,∞). Default = 10.
   * @property {number} dragRate - Rate at which to drag, from (0,∞). Default = 0.2.
   * @property {number} ratio - Ratio of outer (w/h) to inner (w/h) container ratios. Default = 1.
   * @property {boolean} constrainLens - Whether lens position is constrained. Default = true.
   * @property {boolean} constrainZoomed - Whether zoomed position is constrained. Default = false.
   * @property {boolean} toggle - Whether toggle display of zoomed vs. thumbnail upon interaction. Default = true.
   * @property {boolean} smooth - Whether the zoomed region should gradually approach target, rather than immediately. Default = true.
   * @property {string} cssMode - CSS mode to use for scaling and translating. Either '3d', '2d', or 'position'. Default = '3d'.
   * @property {number} renderIntervalTime - Milliseconds for render loop interval. Adjust for performance vs. frame rate. Default = 20.
   * @property {MagModel} initial - Initial settings for model - focus, lens, zoom, etc.
   */
  Magnificent.prototype.options = {
    mode: 'inner',
    position: 'mirror',
    positionEvent: 'move',
    theme: 'default',
    initialShow: 'thumb',
    constrainLens: true,
    constrainZoomed: false,
    zoomMin: 1,
    zoomMax: 10,
    zoomRate: 0.2,
    dragRate: 0.2,
    ratio: 1,
    toggle: true,
    smooth: true,
    renderIntervalTime: 20,
    cssMode: '3d',
    eventNamespace: 'magnificent',
    dataNamespace: 'magnificent'
  }

  /**
   * Default toggle implementation.
   *
   * @param {boolean} enter - Whether entering, rather leaving.
   */
  Magnificent.prototype.toggle = function (enter) {
    if (enter) {
      this.$zoomedContainer.fadeIn()
      if (this.$lens) {
        this.$lens.fadeIn()
      }
    } else {
      this.$zoomedContainer.fadeOut()
      if (this.$lens) {
        this.$lens.fadeOut()
      }
    }
  }

  Magnificent.prototype.compute = function () {
    var that = this
    that.mag.compute()
    that.$el.trigger('compute', that)
  }

  Magnificent.prototype.render = function () {
    var that = this
    var lens, zoomed
    var $lens = this.$lens
    var $zoomed = this.$zoomed
    if ($lens) {
      lens = this.modelLazy.lens
      var lensCSS = toCSS(lens, that.options.cssMode, that.id)
      $lens.css(lensCSS)
    }
    zoomed = this.modelLazy.zoomed
    var zoomedCSS = toCSS(zoomed, that.options.cssMode, that.id)
    $zoomed.css(zoomedCSS)

    this.$el.trigger('render', that)
  }

  Magnificent.prototype.eventName = function (name) {
    name = name || ''
    var namespace = this.options.eventNamespace
    return name + (namespace ? ('.' + namespace) : '')
  }

  Magnificent.prototype.dataName = function (name) {
    name = name || ''
    var namespace = this.options.dataNamespace
    return (namespace ? (namespace + '.') : '') + name
  }

  Magnificent.prototype._init = function () {
    var that = this

    that.intervals = {}

    var $el = this.$el = this.element

    this.$originalEl = $el.clone()

    var options = this.options

    var id = $el.attr('mag-thumb') || $el.attr('data-mag-thumb')
    this.id = id

    if ($.isFunction(options.toggle)) {
      this.toggle = options.toggle
    }

    var $lens = this.$lens

    var ratio = options.ratio

    var initial = options.initial || {}
    var zoom = typeof initial.zoom !== 'undefined' ? initial.zoom : 2
    var focus = typeof initial.focus !== 'undefined' ? initial.focus : {
      x: 0.5,
      y: 0.5
    }
    var lens = typeof initial.lens !== 'undefined' ? initial.lens : {
      w: 0,
      h: 0
    }

    var model = this.model = {
      focus: focus,
      zoom: zoom,
      lens: lens,
      ratio: ratio
    }

    var mag = this.mag = new Mag({
      zoomMin: options.zoomMin,
      zoomMax: options.zoomMax,
      constrainLens: options.constrainLens,
      constrainZoomed: options.constrainZoomed,
      model: model
    })

    var modelLazy = this.modelLazy = {
      focus: {
        x: model.focus.x,
        y: model.focus.y
      },
      zoom: model.zoom,
      lens: {
        w: model.lens.w,
        h: model.lens.h
      },
      ratio: ratio
    }

    var magLazy = this.magLazy = new Mag({
      zoomMin: options.zoomMin,
      zoomMax: options.zoomMax,
      constrainLens: options.constrainLens,
      constrainZoomed: options.constrainZoomed,
      model: modelLazy
    })

    mag.compute()
    magLazy.compute()

    var $zoomedChildren
    var $thumbChildren
    var $zoomed
    var $zoomedContainer

    $thumbChildren = $el.children()

    $el.empty()
    $el.addClass('mag-host')
    var $parent = $el.closest('.zoom')

    if (!options.zoomedContainer) {
      options.zoomedContainer = $parent.find('[mag-zoom="' + that.id + '"], [data-mag-zoom="' + that.id + '"]')
    }

    if (options.zoomedContainer) {
      $zoomedContainer = $(options.zoomedContainer)

      that.$originalZoomedContainer = $zoomedContainer.clone()

      $zoomedChildren = $zoomedContainer.children()
      $zoomedContainer.empty()

      if (options.mode === 'inner') {
        $zoomedContainer.remove()
      }
    }

    if (options.mode === 'outer' && typeof options.showLens === 'undefined') {
      options.showLens = true
    }

    if (!$zoomedChildren || !$zoomedChildren.length) {
      $zoomedChildren = $thumbChildren.clone()
    }

    if (options.mode) {
      $el.attr('mag-mode', options.mode)
      $el.attr('data-mag-mode', options.mode)
    }

    if (options.theme) {
      $el.attr('mag-theme', 'default')
      $el.attr('data-mag-theme', 'default')
    }

    if (options.position) {
      $el.attr('mag-position', options.position)
      $el.attr('data-mag-position', options.position)
    } else if (options.position === false) {
      options.positionEvent = false
    }

    if (options.positionEvent) {
      $el.attr('mag-position-event', options.positionEvent)
      $el.attr('data-mag-position-event', options.positionEvent)
    }

    $el.attr('mag-toggle', options.toggle)
    $el.attr('data-mag-toggle', options.toggle)

    if (options.showLens) {
      $lens = this.$lens = $('<div class="mag-lens"></div>')
      $el.append($lens)
    }

    var $noflow = $('<div class="mag-noflow" mag-theme="' + options.theme + '"></div>')
    $el.append($noflow)

    if (options.mode === 'inner') {
      $zoomedContainer = $noflow
    } else if (options.mode === 'outer') {
      if (!options.zoomedContainer) {
        throw new Error("Required 'zoomedContainer' option.")
      }
      $zoomedContainer = $(options.zoomedContainer)
    } else {
      throw new Error("Invalid 'mode' option.")
    }

    $zoomedContainer.attr('mag-theme', options.theme)
    $zoomedContainer.attr('data-mag-theme', options.theme)
    $zoomedContainer.addClass('mag-zoomed-container')
    $zoomedContainer.addClass('mag-zoomed-bg')

    var $thumb = $('<div class="mag-thumb"></div>')
    $thumb.html($thumbChildren)
    $el.append($thumb)

    $zoomed = this.$zoomed = $('<div class="mag-zoomed"></div>')
    $zoomed.html($zoomedChildren)
    $zoomedContainer.append($zoomed)

    $zoomedContainer.attr('mag-toggle', options.toggle)
    $zoomedContainer.attr('data-mag-toggle', options.toggle)

    var $zone = $('<div class="mag-zone"></div>')
    var zone = $zone.get(0)
    $el.append($zone)

    this.$el = $el
    this.$zone = $zone
    this.$noflow = $noflow
    this.$thumb = $thumb
    this.$zoomed = $zoomed
    this.$zoomedContainer = $zoomedContainer

    that.proxyToZone($zoomedContainer)
    if (options.mode === 'outer') {
      that.proxyToZone($thumb)
    }

    if (options.toggle) {
      if (options.initialShow === 'thumb') {
        $zoomedContainer.hide()
        if ($lens) {
          $lens.hide()
        }
      } else if (options.initialShow === 'zoomed') {
        //
      } else {
        throw new Error("Invalid 'initialShow' option.")
      }

      $el.on(that.eventName('mouseenter'), function () {
        that.toggle(true)
      })

      $el.on(that.eventName('mouseleave'), function () {
        that.toggle(false)
      })
    }

    that.render()

    var lazyRate = 0.25
    var renderIntervalTime = options.renderIntervalTime
    var dragRate = options.dragRate
    var zoomRate = options.zoomRate

    var approach = function (enabled, thresh, rate, dest, src, props, srcProps) {
      srcProps = srcProps || props
      if (!$.isArray(props)) {
        props = [props]
        srcProps = [srcProps]
      }
      for (var i = 0, m = props.length; i < m; ++i) {
        var prop = props[i]
        var srcProp = srcProps[i]
        var diff = src[srcProp] - dest[prop]
        if (enabled && Math.abs(diff) > thresh) {
          dest[prop] += diff * rate
        } else {
          dest[prop] += diff
        }
      }
    }

    var renderLoop = function () {
      approach(options.smooth, 0.01, lazyRate, modelLazy.focus, model.focus, 'x')
      approach(options.smooth, 0.01, lazyRate, modelLazy.focus, model.focus, 'y')
      approach(options.smooth, 0.05, lazyRate, modelLazy, model, 'zoom')

      that.magLazy.compute()

      that.render()
    }

    var adjustForMirror = function (focus) {
      model.focus.x = focus.x
      model.focus.y = focus.y
      that.compute()
    }

    if (options.position === 'mirror') {
      if (options.positionEvent === 'move') {
        lazyRate = 0.2

        $zone.on(that.eventName('mousemove'), function (e, e2) {
          e = typeof e2 === 'object' ? e2 : e
          var ratios = ratioOffsets(e, $zone)
          adjustForMirror(ratios)
        })
      } else if (options.positionEvent === 'hold') {
        lazyRate = 0.2

        $zone.on(that.eventName('dragstart'), function (e, dd, e2) {
          e = typeof e2 === 'object' ? e2 : e
          dragging = true
          $el.addClass('mag--dragging')
        })

        $zone.on(that.eventName('dragend'), function (e, dd, e2) {
          e = typeof e2 === 'object' ? e2 : e
          dragging = false
          $el.removeClass('mag--dragging')
        })

        $zone.on(that.eventName('drag'), function (e, dd, e2) {
          // console.log('drag', arguments, JSON.stringify(dd))
          e = typeof e2 === 'object' ? e2 : e
          var offset = $zone.offset()
          var ratios = ratioOffsetsFor($zone, e.pageX - offset.left, e.pageY - offset.top)
          adjustForMirror(ratios)
        })
      } else {
        throw new Error("Invalid 'positionEvent' option.")
      }
    } else if (options.position === 'drag') {
      var startFocus

      if (options.mode === 'inner') {
        $zone.on(that.eventName('dragstart'), function (e, dd, e2) {
          e = typeof e2 === 'object' ? e2 : e
          e.preventDefault()
          dragging = true
          $el.addClass('mag--dragging')
          startFocus = {
            x: model.focus.x,
            y: model.focus.y
          }
        })

        $zone.on(that.eventName('dragend'), function (e, dd, e2) {
          e = typeof e2 === 'object' ? e2 : e
          dragging = false
          $el.removeClass('mag--dragging')
          startFocus = undefined
        })

        $zone.on(that.eventName('drag'), function (e, dd, e2) {
          // console.log('drag', arguments, JSON.stringify(dd))
          e = typeof e2 === 'object' ? e2 : e

          // Modified plugin to improve touch functionality
          if (e.originalEvent) {
            if (e.originalEvent.scale !== 1) {
              return
            }
          }
          // End of modification

          ratios = ratioOffsetsFor($zone, dd.originalX - dd.offsetX, dd.originalY - dd.offsetY)

          ratios = {
            x: ratios.x / model.zoom,
            y: ratios.y / model.zoom
          }

          var focus = model.focus

          focus.x = startFocus.x + ratios.x
          focus.y = startFocus.y + ratios.y

          that.compute()
        })
      } else {
        $zone.on(that.eventName('dragstart'), function (e, dd, e2) {
          e = typeof e2 === 'object' ? e2 : e
          dragging = true
          $el.addClass('mag--dragging')
          startFocus = {
            x: model.focus.x,
            y: model.focus.y
          }
        })

        $zone.on(that.eventName('dragend'), function (e, dd, e2) {
          e = typeof e2 === 'object' ? e2 : e
          dragging = false
          $el.removeClass('mag--dragging')
          startFocus = undefined
        })

        $zone.on(that.eventName('drag'), function (e, dd, e2) {
          // console.log('drag', arguments, JSON.stringify(dd))
          var offset = $zone.offset()
          ratios = ratioOffsetsFor($zone, e.pageX - offset.left, e.pageY - offset.top)

          var focus = model.focus

          focus.x = ratios.x
          focus.y = ratios.y

          that.compute()
        })

        $zone.on(that.eventName('click'), function (e) {
          var offset = $zone.offset()
          ratios = ratioOffsetsFor($zone, e.pageX - offset.left, e.pageY - offset.top)

          var focus = model.focus

          focus.x = ratios.x
          focus.y = ratios.y

          that.compute()
        })
      }
    } else if (options.position === 'joystick') {
      var joystickIntervalTime = 50

      var dragging = false

      var ratios = {
        x: model.focus.x,
        y: model.focus.y
      }

      if (options.positionEvent === 'move') {
        dragging = true
        lazyRate = 0.5

        $zone.on(that.eventName('mousemove'), function (e) {
          ratios = ratioOffsets(e, $zone)
        })
      } else if (options.positionEvent === 'hold') {
        lazyRate = 0.5

        $zone.drag('start', function () {
          dragging = true
          $el.addClass('mag--dragging')
        })

        $zone.drag('end', function () {
          dragging = false
          $el.removeClass('mag--dragging')
        })

        $zone.drag(function (e, dd) {
          var offset = $zone.offset()
          ratios = ratioOffsetsFor($zone, e.pageX - offset.left, e.pageY - offset.top)
        })
      } else {
        throw new Error("Invalid 'positionEvent' option.")
      }

      that.intervals.joystick = setInterval(function () {
        if (!dragging) return

        var focus = model.focus

        var adjustedDragRate = dragRate
        focus.x += (ratios.x - 0.5) * adjustedDragRate
        focus.y += (ratios.y - 0.5) * adjustedDragRate
        that.compute()
      }, joystickIntervalTime)
    } else if (options.position === false) {
      // assume manual programmatic positioning
    } else {
      throw new Error("Invalid 'position' option.")
    }

    if (options.position) {
    //   $zone.on(that.eventName('mousewheel'), function (e, e2) {
    //     e = typeof e2 === 'object' ? e2 : e
    //     // console.log('mousewheel', {
    //     //   deltaX: e.deltaX,
    //     //   deltaY: e.deltaY,
    //     //   deltaFactor: e.deltaFactor
    //     // })
    //     e.preventDefault()

    //     var rate = zoomRate
    //     var zoom = model.zoom
    //     var delta = (e.deltaY + e.deltaX) / 2
    //     // if (e.deltaFactor) {
    //     //   delta *= e.deltaFactor
    //     // }
    //     delta *= rate
    //     delta += 1
    //     zoom *= delta
    //     model.zoom = zoom
    //     that.compute()
    //   })

      if (PreventGhostClick) {
        PreventGhostClick(zone)
      }

      if (Hammer) {
        var hammerEl = zone
        var $hammerEl = $zone
        var hammerOptions = {}
        var hammertime = new Hammer(hammerEl, hammerOptions)

        // Register custom destroy event listener to queue Hammer destroy.
        that.$el.on(that.eventName('destroy'), function () {
          hammertime.destroy()
        })

        $hammerEl.data(that.dataName('hammer'))

        hammertime.get('pinch').set({ enable: true })

        hammertime.on('pinch', function (e) {
          e.preventDefault()

          that.toggle(true)

          var zoom = model.zoom
          var scale = e.scale || (e.originalEvent && e.originalEvent.scale)
          zoom *= scale
          model.zoom = zoom
          that.compute()
        })

        // if (options.position === 'mirror') {
        if (options.mode === 'inner') {
          var pinch = hammertime.get('pinch')
          var pan = hammertime.get('pan')

          pinch.recognizeWith(pan)

          hammertime.on('pan', function (e) {
            e.preventDefault()
            // console.log('pan', e)

            that.toggle(true)

            var rate = -0.0005

            model.focus.x += rate * e.deltaX
            model.focus.y += rate * e.deltaY
          })
        }
      }
    }

    that.intervals.renderLoop = setInterval(renderLoop, renderIntervalTime)
  }

  Magnificent.prototype.proxyToZone = function ($el) {
    var that = this
    var $zone = that.$zone
    /*
      Proxy events from container to zone for weird IE 9-10 behavior despite z-index.
     */
    var proxyEvents = [
      'mousemove',
      // 'mouseenter',
      // 'mouseleave',
      // 'mouseover',
      // 'mouseout',
      'click',
      'touchstart',
      'touchend',
      'touchmove',
      'touchcancel',
      'mousewheel',
      'draginit',
      'dragstart',
      'drag',
      'dragend'
    ]
    var nsProxyEvents = $.map(proxyEvents, function (name) {
      return that.eventName(name)
    })
    $el.on(nsProxyEvents.join(' '), function (e) {
      var args = Array.prototype.slice.call(arguments)
      // console.log(['a', args[0], args[1], args[2], args[3], args[4], args[5]])
      e.triggered = true
      args.push(e)
      args.unshift(that.eventName(e.type))
      // console.log(['b', args[0], args[1], args[2], args[3], args[4], args[5]])
      $zone.trigger.apply($zone, args)
    })
  }

  Magnificent.prototype.destroy = function () {
    var that = this
    // Trigger custom destroy event for any listeners.
    that.$el.trigger(that.eventName('destroy'))

    $.each(that.intervals, function (key, interval) {
      clearInterval(interval)
    })

    // Unbind and replace elements with originals.

    that.off()

    if (that.$originalZoomedContainer && that.$zoomedContainer) {
      // Replace
      that.$zoomedContainer.after(that.$originalZoomedContainer)
      that.$zoomedContainer.remove()
    }

    // Replace
    that.$el.after(that.$originalEl)
    that.$el.remove()
  }

  Magnificent.prototype.off = function () {
    var that = this

    if (that.$originalZoomedContainer && that.$zoomedContainer) {
      // Turn off all events.
      that.$zoomedContainer.off(that.eventName())
    }

    // Turn off all events.
    that.$el.off(that.eventName())

    return this
  }

  Magnificent.prototype.zoomBy = function (factor) {
    // this.model.zoom *= 1 + factor
    if (factor < 0) {
        this.model.zoom = this.model.zoom - Math.abs(factor);
    } else {
        this.model.zoom = this.model.zoom + factor
    }
    this.compute()
  }

  Magnificent.prototype.zoomTo = function (zoom) {
    this.model.zoom = zoom
    this.compute()
  }

  Magnificent.prototype.moveBy = function (shift) {
    if (typeof shift.x !== 'undefined') {
      if (!shift.absolute) {
        shift.x /= this.model.zoom
      }
      this.model.focus.x += shift.x
    }
    if (typeof shift.y !== 'undefined') {
      if (!shift.absolute) {
        shift.y /= this.model.zoom
      }
      this.model.focus.y += shift.y
    }
    this.compute()
  }

  Magnificent.prototype.moveTo = function (coords) {
    if (typeof coords.x !== 'undefined') {
      this.model.focus.x = coords.x
    }
    if (typeof coords.y !== 'undefined') {
      this.model.focus.y = coords.y
    }
    this.compute()
  }

  $.bridget('mag', Magnificent)

  if (MagnificentAnalytics) {
    MagnificentAnalytics.track('mag-jquery.js')
  }

  return Magnificent
}));


/* ZOOM 08 Mag Control */
(function (root, factory) {
  'use strict'; // eslint-disable-line semi

  var name = 'MagnificentControl'
  if (typeof define === 'function' && define.amd) {
    define(['jquery', './mag-analytics', 'jquery-bridget'], function (jQuery, MagnificentAnalytics) {
      return (root[name] = factory(jQuery, MagnificentAnalytics, root.screenfull))
    })
  } else if (typeof exports === 'object') {
    module.exports = factory(require('jquery'), require('./mag-analytics'), require('jquery-bridget'), require('screenfull'))
  } else {
    root[name] = factory(root.jQuery, root.MagnificentAnalytic, root.screenfull)
  }
}(this, function ($, MagnificentAnalytics, screenfull) {
  'use strict'; // eslint-disable-line semi

  var MagnificentControl = function (element, options) {
    this.element = $(element)
    this.options = $.extend(true, {}, this.options, options)
    this._init()
  }

  MagnificentControl.prototype._init = function () {
    var $el = this.element

    this.$mag = $(this.options.mag)
    this.mag = this.$mag.get(0)
    this.magInst = this.$mag.data('mag')

    var mag = this.mag
    var magInst = this.magInst

    $el.find('[mag-ctrl-zoom-by], [data-mag-ctrl-zoom-by]')
    .on('click', function () {
      var attr = $(this).attr('mag-ctrl-zoom-by') || $(this).attr('data-mag-ctrl-zoom-by')
      var zoomBy = $.parseJSON(attr)
      magInst.zoomBy(zoomBy)
    })

    $el.find('[mag-ctrl-move-by-x], [mag-ctrl-move-by-y], [data-mag-ctrl-move-by-x], [data-mag-ctrl-move-by-y]')
    .on('click', function () {
      var attr = $(this).attr('mag-ctrl-move-by-x') || $(this).attr('data-mag-ctrl-move-by-x')
      var x = attr
      if (x) {
        x = $.parseJSON(x)
      }
      attr = $(this).attr('mag-ctrl-move-by-y') || $(this).attr('data-mag-ctrl-move-by-y')
      var y = attr
      if (y) {
        y = $.parseJSON(y)
      }
      var moveBy = {
        x: x,
        y: y
      }
      magInst.moveBy(moveBy)
    })

    $el.find('[mag-ctrl-fullscreen], [data-mag-ctrl-fullscreen]')
    .on('click', function () {
      if (screenfull) {
        if (screenfull.enabled) {
          screenfull.request(mag)
        }
      }
    })

    $el.find('[mag-ctrl-destroy], [data-mag-ctrl-destroy]')
    .on('click', function () {
      magInst.destroy()
    })
  }

  $.bridget('magCtrl', MagnificentControl)

  if (MagnificentAnalytics) {
    MagnificentAnalytics.track('mag-control.js')
  }

  return MagnificentControl
}))


