
/***
*    ______           _     _                  
*    | ___ \         (_)   | |                 
*    | |_/ /___  __ _ _ ___| |_ _ __ __ _ _ __ 
*    |    // _ \/ _` | / __| __| '__/ _` | '__|
*    | |\ \  __/ (_| | \__ \ |_| | | (_| | |   
*    \_| \_\___|\__, |_|___/\__|_|  \__,_|_|   
*                __/ |                         
*               |___/                          
*/
/*
  Expose functions that create and monitor tests.
*/

/*
The hotel simply changes the attributes on each web component
 */
var hotel = {
  occupiedSuites: [],
  createSuite: function (rawSuite) {
    var suite = new Suite(rawSuite);

    // pass the whole suite to the testResults so you can modify it there later.
    suite.element = testResults.buildSuiteElement(suite);
    this.occupiedSuites.push(suite);
    return suite;
  }
};

Object.defineProperties(hotel, {
  numberOfPassedSuites: {
    get: function () {
      var numberPassed = 0;
      this.occupiedSuites.forEach(function (suite, index, arr) {
        if (suite.suitePassed) {
          numberPassed += 1;
        }
      })
      return numberPassed;
    }
  },
  numberOfSuites: {
    get: function () {
      return this.occupiedSuites.length;
    }
  },
  allCorrect: {
    get: function () {
      var allCorrect = false;
      (this.numberOfSuites === this.numberOfPassedSuites) ? allCorrect = true : allCorrect = false;
      // TODO: maybe emit an event if all of them pass?
      return allCorrect;
    }
  }
})

/**
 * Register a suite of tests with the grading engine.
 * @param  {Object} _suite - contains a test's name and code to display upon completion.
 * @return {Function} registerTest - a method to register a single test with the grading engine.
 */
function registerSuite(rawSuite) {
  var self = this;

  var newSuite = hotel.createSuite(rawSuite);

  /**
   * Register a new test on a specific suite. The test will contain an activeTest. Each active test much return a boolean called isCorrect and an array of the targets in question.
   * @param  {Object} _test - contains a description, activeTest and flags.
   * @return {Object} self - for chaining tests registrations together (if you're into that sort of syntax.)
   */
  function registerTest(_test) {
    newSuite.createTest({
      description: _test.description,
      activeTest: _test.active_test || _test.activeTest, // accounts for old API
      flags: _test.flags,
      iwant: new TA()
    })
    return self;
  }
  return {
    registerTest: registerTest
  }
}

function createWorkerPayload (type, data) {
  return {
    type: type,
    activeTest: data,
    methods: taAvailableMethods
  }
};

var sanitizer = new Worker('/frontend-grading-engine/src/js/sanitizerWorker.js');

// basically for use only when loading a new JSON with suites
function registerSuites(suitesJSON) {
  var suites = JSON.parse(suitesJSON);
  suites.forEach(function (suite, index, arr) {
    var newSuite = registerSuite({
      name: suite.name,
      code: suite.code
    });

    suite.tests.forEach(function (test) {
      var promise = new Promise(function (resolve, reject) {
        var payload = createWorkerPayload('activeTestString', test.activeTest || test.active_test);
        sanitizer.postMessage(payload);
        sanitizer.onmessage = function (e) {
          resolve(e.data.activeTest/*, suite*/); // TODO: might be able to do without suite here
        };
      }).then(function (resolve) {
        console.log(resolve);
        newSuite.registerTest({
          description: test.description,
          activeTest: resolve, // TODO: resolve should be the clean test component array?
          flags: test.flags
        });
      });
    });
  });
};

exports.registerSuite = registerSuite;
exports.registerSuites = registerSuites;