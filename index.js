var config = require("./config")
var express = require("express");
//var ping = require("./ping")();
var ping = require ("net-ping");
var app = express();
var port = process.env.port || config.port;
var sync = require('sync');
var Sequelize = require('sequelize');
var sequelize = new Sequelize(config.db.DATABASE, config.db.USERNAME, config.db.PASSWORD);
var servers = {};

var Watching = sequelize.define('watching', {
  ip: Sequelize.STRING,
});

sequelize.sync().then(function() {
  Watching.findAll({}).then(function(models) {
    schedulePing(models[0].ip);
  }) 
});

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
  Watching.create({ip: ip}).then(function(watchee) {

    
    sync(schedulePing(watchee.ip))
    sync(res.send(getStatus(watchee.ip)));
  });
});



function updatePing(ip) {
    session.pingHost(ip, function (error, target) {
    if (error)
        console.log(target + ": " + error.toString());
    else
        console.log(target + ": Alive");
  });
}

function getStatus(ip) {
    return "Fin"
}

function schedulePing(ip) {
  updatePing(ip);
  servers[ip] = setInterval(function() {
    updatePing(ip);
  }, 60000)
}


function getIP(path) {
  return path.split("/")[2]
}






function runAsync(array) {

}