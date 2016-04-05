var express = require("express"),
    mixin = require("object-mixin");

var resource = function(name, Model, options) {
    var router = express.Router();
    
    var path = "/" + name;
    
    var success = function(res, data) {
        if (options && options.filter && typeof (options.filter) === "function") {
            if (data) {
                if (data.items && data.items.length > 0) {
                    // array
                    data.items = data.items.map((item) => options.filter(item));
                } else {
                    // single object
                    data = options.filter(data);
                }
            }
        }
        res.json(data);
    };

    // LIST
    router.get(path, function(req, res) {
        Model.find({}, function(err, items) {
            if (err) {
                res.status(500).json({error: err});
            } else { 
                success(res, {items: items});
            }
        })
    });
    // RETRIEVE
    router.get(path + "/:id", function(req, res) {
        Model.findById(req.params.id, function(err, item) {
            if (err) {
                res.status(404).json({error: err});
            } else {
                success(res, item);    
            }
        });
    });
    
    // CREATE
    router.post(path, function(req, res) {
        var item = new Model(req.body);
        item.save(function(err) {
            if (err) {
                json.status(500).json({error: err});
            } else {
                success(res, item);
            }
        });
    });
    
    // UPDATE
    router.put(path + "/:id", function(req, res) {
        Model.findByIdAndUpdate(req.params.id, {$set: req.body}, function(err, item) {
            if (err) {
                res.status(404).json({error: err});
            } else {
                success(res, item);
            }
        });
    });
    
    // DELETE
    router["delete"](path + "/:id", function(req, res) {
        Model.findByIdAndRemove(req.params.id, function(err) {
            if (err) {
                res.status(404).json({error: err});
            } else {
                success(res, {});
            }
        });
    });
    return router;    
}

module.exports = resource;