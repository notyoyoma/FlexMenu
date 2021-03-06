/*global jQuery */
/*!
* FlexMenu 0.1
*
* Copyright 2015, Marty Naselli http://martynaselli.com
* Released under the WTFPL license
*
* Date: 3/18/2015
*/

(function($) {
  var FlexMenu = function() {},
      defaults = {
        NS: 'FM',
        flexibleAttrs: {
          // Which attributes should flex?
          a: ['padding-left', 'padding-right'],
          li: ['margin-right'],
        },
        staticAttrs: {
          // Which attributes should never flex?
          li: {
            // Use a selector to target elements that will not be flexed
            // pass a single attribute or an array of attributes not to flex
            ':last-child': 'margin-right',
          }
        },
        disableBelow: false,
        finishedEvent: "nsFlexFinished"
      };

  var helpers = {
    removeValuesFromArray: function( arr, values ) {
      if (typeof values == "object") {
        for ( var i=0; i < arr.length; i+=1 ) {
          helpers.removeValuesFromArray(values[i]);
        }
      } else {
        arr.splice(arr.indexOf(values), 1);
      }
    },
    removeInlineStyles: function( $obj, prop ) {
      if (typeof prop == "object") {
        for ( var i=0; i < prop.length; i+=1 ) {
          helpers.removeInlineStyles($obj, prop[i]);
        }
      } else {
        var reg = new RegExp( prop + "[^;]+;?", '');
        $obj.each(function() {
          // If nothing has been initialized, attr('style') can be undefined
          var style = $(this).attr('style');
          if (style) {
            $(this).attr('style', style.replace(reg, ''));
          }
        });
      }
    }
  };

  FlexMenu.prototype = {
    init: function(el, settings) {
      this.settings = settings;
      this.el = el;
      this.initElements();
      this.initEvents();
    },
    initElements: function() {
      this._initUl();
      this._initEls();
      this._initAttrs();

      // Allow the user to add / remove properties to flex
      this._countAttrs();
    },
    initEvents: function() {
      var self = this;
      // Do the flex immediately when called. We don't need to wait for $document.ready,
      // because the element already exists.
      self.doFlex()
      $(window).resize(function() {
        // if the size of the window has actually changed, run
        if ( $(self.ul).width() != self.ul.savedWidth ) {
          if (self.running) {
            self.runAgain = true;
          } else {
            self.running = true;
            self.doFlex();
          }
        }
      });
      self.ul.on(self.settings.finishedEvent, function() {
        self.running = false;
        if (self.runAgain) {
          self.runAgain = false;
          self.doFlex();
        }
      });
    },
    doFlex: function() {
      if (this.settings.disableBelow && ($(window).width() < this.settings.disableBelow)) {
        this.disable();
        this.ul.trigger(this.settings.finishedEvent);
        return;
      } else {
        this.enable();
      }
      this.ul.savedWidth = parseInt(this.ul.css('width'));
      this._resetCSS();
      var lastLi = this.ul.children('li').last(),
          menuWidth = lastLi.position().left + lastLi.outerWidth(),
          flexAmt = this.ul.savedWidth - menuWidth,
          amtPerAttr = Math.floor(flexAmt / this.attrCount),
          leftOver = flexAmt - (amtPerAttr * this.attrCount);
      this._flexEls(amtPerAttr, leftOver);
      this.ul.trigger(this.settings.finishedEvent);
    },
    disable: function() {
      if (this.enabled === false) return;
      helpers.removeInlineStyles(this.ul, ['font-size', 'white-space', 'position']);
      helpers.removeInlineStyles(this.ul.children('li'), ['font-size', 'display', 'float']);
      helpers.removeInlineStyles(this.ul.find(' > li > a'), ['display']);
      for ( var i=0; i < this.els.length; i+=1) {
        helpers.removeInlineStyles(this.els[i], this.els[i].attrs);
      }
      this.enabled = false;
    },
    enable: function() {
      if (this.enabled === true) return;
      this.ul.css({
        'font-size': 0, // 0 spacing between li elements
        'white-space': 'nowrap', // force overflow, so we can measure how much we need to flex
        'position': 'relative', // we need relative position, so we can use li.position()
      });
      this.ul.children('li').css({
        'font-size': this.ul.parent().css('font-size'),
        'display': 'inline-block',
        'float': 'none',
      });
      this.ul.find(' > li > a').css({
        'display': 'inline-block',
      });
      this.enabled = true;
    },
    _resetCSS: function(removeInlineStyles) {
      for ( var i=0; i < this.els.length; i+=1) {
        for ( var j=0; j < this.els[i].attrs.length; j+=1) {
          this.els[i].css(this.els[i].attrs[j], 0);
        }
      }
    },
    _initUl: function() {
      // if el is a <ul>, use it. else grab the first descendant <ul>
      this.ul = (this.el.prop('tagName') === 'UL') ? this.el : this.el.find('ul').first();
    },
    _initEls: function() {
      var self = this;
      this.els = [this.ul];
      // loop through all types of elements and push all onto this.els
      for ( var key in this.settings.flexibleAttrs ) {
        this.ul.find( ' > ' + key + ', > li > ' + key).each(function() {
          self.els.push($(this));
        });
      }
    },
    _initAttrs: function() {
      for (var i=0; i < this.els.length; i+=1) {
        var curEl   = this.els[i],
            elTag   = curEl.prop('tagName').toLowerCase();
        if (this.settings.flexibleAttrs[elTag] && this.settings.flexibleAttrs[elTag].length) {
          var elAttrs = this.settings.flexibleAttrs[elTag].slice(0);
        } else {
          // if there aren't any applicable flexible attributes, just skip this element
          curEl.flexEl = function(){};
          curEl.attrs = [];
          continue;
        }
        if (this.settings.staticAttrs[elTag]) {
          for ( var key in this.settings.staticAttrs[elTag] ) {
            if ( curEl.is(key) ) {
              helpers.removeValuesFromArray(elAttrs, this.settings.staticAttrs[elTag].key);
            }
          }
        }
        curEl.attrs = elAttrs;
      }
    },
    _countAttrs: function() {
      this.attrCount = 0;
      for (var i=0; i < this.els.length; i+=1) {
        this.attrCount += this.els[i].attrs.length;
      }
    },
    _flexEls: function(amtPerAttr, cheatAmt) {
      var attrItter = 0;
      for (var i=0; i < this.els.length; i+=1) {
        var curEl = this.els[i],
            attrs = curEl.attrs,
            cssObj = {};
        for (var j=0; j < attrs.length; j+=1) {
          cssObj[attrs[j]] = amtPerAttr;
          if (attrItter < cheatAmt) {
            cssObj[attrs[j]] += 1;
          }
          attrItter += 1;
        }
        curEl.css(cssObj);
      }
    },
  };
  
  $.fn.FlexMenu = function(options) {
    // Initialize FlexMenu, and store it on $this.data('FM-class')
    // If FM-class interferes with another plugin, simply override settings.NS
    return this.each(function() {
      var $this = $(this),
          settings = $.extend({}, defaults, options),
          flexer = new FlexMenu();
      flexer.init($this, settings);
      $this.data(settings.NS + '-class', flexer);
    });
  };
})(jQuery);
