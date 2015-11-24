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
var time = 5 * 60 * 1000
var Watching = sequelize.define('watching', {
  ip: Sequelize.STRING,
});

var Results = sequelize.define("results", {
  status: Sequelize.STRING,
})

Results.belongsTo(Watching);
Watching.hasMany(Results)

sequelize.sync().then(function() {
  Watching.findAll({}).then(function(models) {
    for(var i = 0; i < models.length; i++) {
      schedulePing(models[i].ip);
    }
    
  }) 
});

var session = ping.createSession();
app.listen(port, function() {
  console.log("Listening on " + port)
})

app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
})

//app.options()

app.get('/update/*', function(req, res) {
  var ip = getIP(req.path)
  sync(updatePing(ip));
  sync(getStatus(getIP(req.path)).then(function(result) {
    res.send(result);
  }));

})

app.get("/status/*", function(req, res) {
  getStatus(getIP(req.path)).then(function(result) {
    res.send(result);
  });
})

app.get('/add/*', function(req,res) {
  var ip = getIP(req.path)  
  Watching.findOrCreate({where: {ip: ip}}).then(function(watchee) {
    schedulePing(ip)
    getStatus(ip).then(function(status) {
      res.send(status);
    });
    
  });
});



function updatePing(ip) {
    session.pingHost(ip, function (error, target) {
      var status = "";
      if (error) {
        status = error.toString();
      } else {
        status = "Alive";
      }
      Watching.findOne({where: {"ip": ip}}).then(function(watchee) {
        Results.create({"status": status}).then(function(result) {
          result.setWatching(watchee);
          result.save();
        })
      })
  });
}

function getStatus(ip) {
  return new Promise(function(resolve, reject) {
    getWatcheeWithResults(ip,function(results) {
      if(!results) {
        resolve({"ip":ip, "error": "not tracked"})
      }
      var result;
      if(results.results.length) {
        result = {"ip": ip,
          "status": {
            "message": results.results[results.results.length - 1].status,
            "time": results.results[results.results.length - 1].createdAt
          }
        };
      } else {
        result = {"ip": ip, "status": {"message": "pending", "time": new Date()}}
      }
      resolve(result)
    })  
  })
  
}

function getWatcheeWithResults(ip, cb) {
  Watching.find({where: {"ip": ip}, include: [Results]}).then(function(watchee) {
    cb && cb(watchee);
  });
}

function schedulePing(ip) {
  updatePing(ip);
  servers[ip] = setInterval(function() {
    updatePing(ip);
  }, time)
}


function getIP(path) {
  return path.split("/")[2]
}






function runAsync(array) {

}