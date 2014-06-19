var express = require('express');
var router = express.Router();
var noodle = require('noodlejs');

/* GET home page. */
router.post('/', function(req, res) {
  noodle.query({
      url: decodeURI(req.param('url')),
      type: 'html',
      selector: decodeURIComponent(req.param('selector')),
      extract: 'html'
    }).then(function(results){
    res.send(results);
  });
});

module.exports = router;
