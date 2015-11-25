var app = angular.module("pinGive",['ui.router'])
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
      controller: ["$rootScope", function($rootScope) {
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
          for(var i = 0; i < past.length; i++) {
            if(past[i].message === "Alive") {
              percent++;
            } 
          }
          console.log(result.data)
          $rootScope.percent = result.data.percent;
          $rootScope.calc_percent = percent / past.length * 100;
        })
      }]
    })
  });