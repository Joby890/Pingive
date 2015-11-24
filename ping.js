'use strict'
class Ping { 
    constructor(newIp) {
      this.ip = newIp;
      console.log(newIp)
    }


    ping() {
      
    }
}

module.exports = function() {
  return {createPing : Ping};
}