var express = require("express");
var morgan = require('morgan');
var bodyParser = require('body-parser')
//var ping = require("./ping")();
var ping = require ("net-ping");
var app = express();
var port;
var sync = require('sync');
var Sequelize = require('sequelize');
var sequelize;
var servers = {};
//var froutes = require("./froutes")

if (process.env.NODE_MODE === 'prod') {
  sequelize = new Sequelize(process.env.DATABASE, process.env.USERNAME, process.env.PASSWORD);
  port = process.env.port;
} else {
  var config = require("./config")
  sequelize = new Sequelize(config.db.DATABASE, config.db.USERNAME, config.db.PASSWORD);
  port = config.port;
}

var time = 1 * 60 * 1000
var Watching = sequelize.define('watching', {
  ip: Sequelize.STRING,
  percent: Sequelize.STRING,
});

var Results = sequelize.define("results", {
  status: Sequelize.STRING,
})

Results.belongsTo(Watching);
Watching.hasMany(Results)

sequelize.sync().then(function() {
  Watching.findAll({include:[Results]}).then(function(models) {
    for(var i = 0; i < models.length; i++) {
      var watch = models[i];
      //Calc uptime
      var percent = 0;
      for(var x = 0; x < watch.results.length; x++) {
        if(watch.results[x].status === "Alive") {
          percent++;
        }
      }
      percent = percent / watch.results.length  * 100;
      watch.percent = ""+percent;
      watch.save().then(function(newmodel) {
        schedulePing(newmodel.ip);
      })
      console.log(percent) 
      
    }
    
  }) 
});

var session = ping.createSession();
app.listen(port, function() {
  console.log("Listening on " + port)

})
app.use(morgan('dev'));
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static("client/"));

app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
})

app.get("/", function(req, res) {
  res.send("client/index.html")
})

//app.options()

app.get('/update/*', function(req, res) {
  var ip = getIP(req.path)
  sync(updatePing(ip));
  sync(getStatus(getIP(req.path)).then(function(result) {
    res.send(result);
  }));

})

app.post("/status/*", function(req, res) {
  console.log(req.body)
  var q = req.body.q;
  console.log(q)
  var ip = getIP(req.path)
  if(!q) {
    getStatus(getIP(req.path)).then(function(result) {
      res.send(result);
    });
  } else {
    getWatcheeWithResults(ip,function(results) {
      if(!results) {
        res.send({"ip":ip, "error": "not tracked"})
      }
      var result;
      if(results.results.length) {
        console.log(results.percent)
        result = {
          "ip": ip,
          "percent": results.percent,
          "status": {
            "message": results.results[results.results.length - 1].status,
            "time": results.results[results.results.length - 1].createdAt
          },
          "results": [],
        };

        for(var i = results.results.length - 1 - q; i < results.results.length; i++){
          var current = results.results[i];
          if(current !== undefined) {
            result.results.push({"message": current.status, "time": current.createdAt});            
          }
        }

      } else {
        result = {"ip": ip, "status": {"message": "pending", "time": new Date()}}
      }
      res.send(result)
    })  
  }
  

});

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
      Watching.findOne({where: {"ip": ip}, include: [Results]}).then(function(watchee) {
        var length = watchee.results.length;
        var percent = parseFloat(watchee.percent);
        if(percent === NaN) {
          percent = 0;
        }
        if(status === "Alive") {
          //Calc new percent
          watchee.percent = "" + ((((length * percent) / 100)+ 1) / (1 + length)) * 100;
        } else {
          watchee.percent = "" + ((((length * percent) / 100)) / (1 + length)) * 100;
        }
        watchee.save();
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
            "percent": results.percent,
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