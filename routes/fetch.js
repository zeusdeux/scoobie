var assert = require('assert');
var Readable = require('stream').Readable;
var u = require('util');

var express = require('express');
var router = express.Router();
var jsdom = require('jsdom');
var debug = require('debug')('scraper');

u.inherits(Scraper, Readable);

function Scraper(opts, doc, sel, pgSel, endWhen) {
  Readable.call(this, opts);
  try {
    this._doc = doc;
    this._sel = sel;
    this._paginationNode = doc.querySelector(pgSel);
    this._endWhen = endWhen;
    this._clickEvent = doc.createEvent('MouseEvents');
    this._clickEvent.initEvent('click', true, true);

    debug('Pagination el: %s', this._paginationNode.outerHTML);
  }
  catch (e) {
    this._error = true;
    this._errorMsg = e.message;
  }
}

Scraper.prototype._read = function() {
  var iterable;

  if (this._error) {
    this.push(this._errorMsg);
    this.push(null);
  }

  iterable = this._doc.querySelectorAll(this._sel);

  if (iterable.length) {
    debug('pushing html');
    this.push(htmlpl0x(iterable));
    assert(this._doc.querySelectorAll(this._sel).length === 0, 'iterable still contains elements');
    this._paginationNode.dispatchEvent(this._clickEvent);
  }

  if (isPaginationDone(this._doc, this._endWhen)) {
    iterable = this._doc.querySelectorAll(this._sel);
    this.push(htmlpl0x(iterable));
    this.push(null);
  }
};

function isPaginationDone(doc, endWhen) {
  var key = Object.keys(endWhen.condition)[0];
  var val = endWhen.condition[key];
  var el = doc.querySelector(endWhen.selector);
  var doneFlag = false;

  debug('End selector: %s', endWhen.selector);
  debug('End condition type: %s', endWhen.type);
  debug('End condition key: %s', key);
  debug('End condition expected value: %s', val);

  switch (endWhen.type) {
    case 'css':
      debug('End condition current value: %s', el.style[key]);
      doneFlag = el.style[key] === val;
      break;
    case 'text':
      debug('End condition current value: %s', el.textContent.trim());
      doneFlag = el.textContent.trim() === val;
      break;
  }

  debug('End condition met? ', doneFlag);
  return doneFlag;
}

function htmlpl0x(iterable) {
  var store = [];
  assert(iterable.length > 0, 'Empty iterable coming into htmlpl0x');
  for (var i = 0; i < iterable.length; i++) {
    var el = iterable[i];
    debug('currentHTML: %s', el.outerHTML);
    store.push(el.outerHTML);
    el.parentNode.removeChild(el);
  }
  debug('store: ', store);
  return JSON.stringify(store);
}

/* Did someone say, HTML?! */
router.post('/', function(req, res, next) {
  var url = decodeURI(req.param('url'));
  var selector = decodeURIComponent(req.param('selector'));
  var paginationSelector = decodeURIComponent(req.param('pgSel'));
  var paginationType = decodeURIComponent(req.param('pgType')); //ajax or href
  var endWhen = JSON.parse(decodeURIComponent(req.param('endWhen')));
  //---------------------------------
  //endWhen structure:
  // {
  //   selector: <jQuery like selector>,
  //   type: <'css' or 'text'>,
  //   endWhen: { key: val }
  // }
  //Example:
  //{
  //   selector: 'span.d-s.L5.r0',
  //   type: 'css',
  //   condition: { display: 'none' }
  // }
  //---------------------------------

  debug('url: %s', url);
  debug('selector: %s', selector);
  debug('paginationSelector: %s', paginationSelector);
  debug('endWhen: %s', JSON.stringify(endWhen));

  jsdom.env({
    url: url,
    features: {
      FetchExternalResources: ['script'],
      ProcessExternalResources: ['script'],
      MutationEvents: '2.0'
    },
    done: function(err, window) {
      if (err) next(err);
      var doc = window.document;
      new Scraper({
        highWaterMark: 128 * 1024
      }, doc, selector, paginationSelector, endWhen).pipe(res);
    }
  });
});

module.exports = router;
