var config = require("./config")
var express = require("express");
//var ping = require("./ping")();
var ping = require ("net-ping");
var app = express();
var port = process.env.port || config.port;

var Sequelize = require('sequelize');
var sequelize = new Sequelize(config.db.DATABASE, config.db.USERNAME, config.db.PASSWORD);

var session = ping.createSession();
app.listen(port, function() {
  console.log("Listening on " + port)
})


app.get('/update/*', function(req, res) {
  var ip = getIP(req.path)
  updatePing(ip);

})

app.get('/add/*', function(req,res) {
  var ip = getIP(req.path)

});


function updatePing(ip) {
    session.pingHost(ip, function (error, target) {
    if (error)
        res.send(target + ": " + error.toString());
    else
        res.send(target + ": Alive");
  });
}


function getIP(path) {
  return path.split("/")[2]
}