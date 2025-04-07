import vm from "node:vm";
import * as readline from 'node:readline/promises';
import {stdin as input, stdout as output} from 'node:process';

import "./JetStreamDriver.js";

JetStream.runCode = function (scripts) {
    let globalObject;

    globalObject = vm.createContext({globalThis});

    globalObject.loadString = function (s) {
        try {
            const script = new vm.Script(s, {
                displayErrors: true
            });
            return script.runInContext(globalObject);
        } catch (err) {
            console.error("EvalMachine Error:", err.name);
        }
    };

    try {
        for (let script of scripts) {
            globalObject.loadString(script);
        }
    } catch (err) {
        console.error("runCode Failed:", err.message);
        // console.error("Stack Trace:\n", err.stack);
    }

    return globalObject;
}

const OPTIONS = [
    "Run all tests",
    "Run a single test",
    "Exit"
];

const rl = readline.createInterface({ input, output });

async function showMainMenu() {
    console.log("\nMain Menu:");
    OPTIONS.forEach((option, index) => {
        console.log(`${index + 1}. ${option}`);
    });

    const answer = await rl.question("\nChoose one option: ");
    return answer.trim();
}

async function runAllBenchmarks() {
    console.log("Total Benchmarks:", JetStream.benchmarks.length);
    await JetStream.initialize();
    await JetStream.start();
}

async function runSelectedBenchmark() {
    const benchmarkOptions = JetStream.benchmarks;

    console.log("\nAvailable Benchmarks:");
    benchmarkOptions.forEach((benchmark, index) => {
        console.log(`${index + 1}. ${benchmark.name}`);
    });

    const testName = await rl.question("\nEnter test number: ");
    const selectedIndex = parseInt(testName.trim()) - 1;

    if (selectedIndex < 0 || selectedIndex >= benchmarkOptions.length) {
        console.log("Invalid test number");
        return;
    }

    JetStream.benchmarks = [benchmarkOptions[selectedIndex]];
    await JetStream.initialize();
    await JetStream.start();
}

async function runJetStream() {
    try {
        const choice = await showMainMenu();

        switch (choice) {
            case "1":
                await runAllBenchmarks();
                break;
            case "2":
                await runSelectedBenchmark();
                break;
            case "3":
                console.log("Exiting...");
                break;
            default:
                console.log("Invalid option");
        }
    } catch (err) {
        console.error("An error occurred:", err);
    } finally {
        rl.close();
    }
}

runJetStream();


