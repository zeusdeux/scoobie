var fs = require('fs');
var assert = require('assert');

var express = require('express');
var router = express.Router();
var jsdom = require('jsdom');
var debug = require('debug')('scraper');
var jquery = fs.readFileSync('/Users/zeusdeux/Work/Synup/scoobie/public/js/jquery.min.js').toString();

function clicker($, sel, pgSel, endWhen, res) {
  var endKey = Object.keys(endWhen)[0];
  var endVal = endWhen[endKey];
  var $pgSel = $(pgSel);
  var $sel;
  var result = {};
  var temp;
  var noPaginationNeeded = true;
  result.results = [];

  debug('End key: %s', endKey);
  debug('End val: %s', endVal);
  debug('Pagination el: %s', $pgSel.html());
  debug('End key value on page: %s', $pgSel.css(endKey));

  while ($pgSel.css(endKey) !== endVal) {
    noPaginationNeeded = false;
    $sel = $(sel);
    temp = pipeResponse($, $sel, res);
    if (temp.length) {
      debug('temp: ', temp);
      result.results = result.results.concat(temp);
      debug('result content: ', result.results);
    }
    assert($(sel).length === 0, 'iterable still contains elements');
    if (temp.length) {
      $pgSel.click();
    }
  }

  if (noPaginationNeeded) {
    result.results = pipeResponse($, $(sel), res);
  }

  debug('result: %s', JSON.stringify(result));
  res.send(result);
  /*res.end({
    done: true
  });*/
}

function pipeResponse($, iterable, res) {
  var store = [];
  $.each(iterable, function(i, v) {
    debug('currentHTML: %s', this.outerHTML);
    store.push(this.outerHTML);
    $(this).remove();
  });
  //res.pipe(JSON.stringify(store));
  return store;
}

/* GET home page. */
router.post('/', function(req, res) {
  var url = decodeURI(req.param('url'));
  var selector = decodeURIComponent(req.param('selector'));
  var paginationSelector = decodeURIComponent(req.param('pgSel'));
  var endCondition = JSON.parse(decodeURIComponent(req.param('endWhen'))); //needs to be an object with a css prop as key
  //example {'display': 'none'}

  debug('url: %s', url);
  debug('selector: %s', selector);
  debug('paginationSelector: %s', paginationSelector);
  debug('endCondition: %s', JSON.stringify(endCondition));

  jsdom.env({
    url: url,
    src: [jquery],
    done: function(errors, window) {
      var $ = window.$;
      clicker($, selector, paginationSelector, endCondition, res);
    }
  });
});

module.exports = router;
