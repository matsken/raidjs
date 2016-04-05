var express = require('express');
var config = require("../../config");
var router = express.Router();
// index
router.get('/', function(req, res) {
  res.redirect("/events");
});

module.exports = router;
