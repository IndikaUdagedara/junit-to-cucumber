#!/usr/bin/env node

// Inspired from https://www.npmjs.com/package/cucumber-junit-convert which does the reverse of this 

const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const fs = require("fs/promises");
const xml2js = require("xml2js");

(async () => {
  let argv = yargs(hideBin(process.argv))
    .usage("$0 inputfile outputfile")
    .demandCommand(
      2,
      "Pass JUnit file (inputfile) to convert to Cucumber format (outputfile)"
    ).argv;

  input = argv._[0];
  output = argv._[1];

  await convert(input, output);
})();

// Cucumber:  Scenario > Feature > Steps
// JUnit:     TestSuite > TestCase > Steps

async function convert(input, output) {
  let data = await fs.readFile(input);
  let cucumberScenarios = [];
  let testSuites = (await xml2js.parseStringPromise(data)).testsuites.testsuite;
  testSuites.forEach((ts) => {
    console.log(ts)
    let scenario = {
      name: ts.$.package,
      uri: `${ts.$.package}/${ts.$.name === undefined ? "": ts.$.name}`,
      elements: [],
    };

    let testCases = ts.testcase;
    testCases.forEach((tc) => {
      console.log(tc);
      let steps = tc.steps;
      let feature = {
        id: `${tc.$.classname}/${tc.$.name}`,
        name: tc.$.name,
        steps: [],
      };

      if (steps === undefined) return;

      steps.forEach((s) => {
        let testSteps = s.testSteps;
        if (testSteps === undefined) {
          console.log(`Malformed input(?): ${ts.$.package}/${tc.$.name}`);
        } else {
          testSteps.forEach((ts) => {
            console.log(ts);
            let status = "passed";
            if (ts.failure !== undefined) {
              status = "failed";
            }
            feature.steps.push({
              name: ts.assertion.join(" AND "),
              status: status,
            });
            //console.log(s)
          });
        }
      });

      scenario.elements.push(feature);
    });
    cucumberScenarios.push(scenario);
  });

  await fs.writeFile(
    output,
    JSON.stringify(cucumberScenarios, null, 2),
    "utf8"
  );
}
