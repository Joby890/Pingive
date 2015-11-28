var app = angular.module("pinGive",['ui.router','n3-line-chart'])
  .controller("Home", ["$rootScope", "$scope", "$http", "$state", function($rootScope, $scope, $http, state) {
    $scope.trackIP = function() {
      var ip = $scope.ip;
      $http({url: "/add/"+ip}).then(function(result) {
        $rootScope.ip = ip;
        state.go("^.tracker")
      });
    }
  }]);

  app.config(function($stateProvider, $urlRouterProvider) {
  //
  // For any unmatched url, redirect to /state1
  $urlRouterProvider.otherwise("/");
  //
  // Now set up the states
  $stateProvider
    .state('home', {
      url: "/",
      templateUrl: "views/home.html",
      controller: "Home",
    })
    .state('tracker', {
      url: "/tracker",
      templateUrl: "views/tracker.html",
      controller: ["$rootScope", "$scope", function($rootScope, $scope) {
          $scope.options = {
            axes: {
              x: {
                key: "x",
                labelFunction: function (v) {return 'Na';}
              },
              y: {type: "log"}
            },
            margin: {
              left: 100
            },
            series: [
              {y: 'value', color: 'steelblue', thickness: '2px',  striped: true, label: 'Ping Time'},
              {y: 'up', axis: 'y2', color: 'lightsteelblue', visible: true, drawDots: true, dotSize: 2, label: "Status"}
            ],
            lineMode: 'linear',
            tension: 0.7,
            tooltip: {mode: 'scrubber', formatter: function(x, y, series) {if(series.y === "up") { return y === 1 ? "up" : "down" } else {return y;}}},
            drawLegend: true,
            drawDots: true,
            hideOverflow: false,
            columnsHGap: 5
          }


      }],
      onEnter: ["$rootScope", "$http", function($rootScope, $http) {
        $http({
          url:"/status/"+$rootScope.ip,
          "method": "POST",
          data: {q: 1000},
        }).then(function(result) {
          $rootScope.result = result.data;
          var past = result.data.results;
          var percent = 0;
          $rootScope.data = [];
          for(var i = 0; i < past.length; i++) {
            if(past[i].message === "Alive") {
              percent++;
              $rootScope.data.push({x:i, value:past[i].pong, up:1})
            }  else {
              $rootScope.data.push({x:i, value:past[i].pong, up:0})
            }
          }
          $rootScope.percent = result.data.percent;
          $rootScope.calc_percent = percent / past.length * 100;
        });
      }]
    })
  });