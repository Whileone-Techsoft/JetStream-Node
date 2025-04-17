import vm from "node:vm";
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

async function runAllBenchmarks() {
    console.log("Total Benchmarks:", JetStream.benchmarks.length);
    await JetStream.initialize();
    await JetStream.start();
}

async function runSelectedBenchmark(benchmarkNumber) {
    const benchmarkOptions = JetStream.benchmarks;
    const selectedIndex = benchmarkNumber - 1;

    if (selectedIndex < 0 || selectedIndex >= benchmarkOptions.length) {
        console.log("Invalid benchmark number. Available benchmarks:");
        benchmarkOptions.forEach((benchmark, index) => {
            console.log(`${index + 1}. ${benchmark.name}`);
        });
        process.exit(1);
    }

    JetStream.benchmarks = [benchmarkOptions[selectedIndex]];
    await JetStream.initialize();
    await JetStream.start();
}

async function showUsage() {
    console.log("\nUsage:");
    console.log("  npm run jetstream-node all            # Run all benchmarks");
    console.log("  npm run jetstream-node <number>       # Run a specific benchmark");
    console.log("\nAvailable benchmarks:");
    JetStream.benchmarks.forEach((benchmark, index) => {
        console.log(`  ${index + 1}. ${benchmark.name}`);
    });
    process.exit(1);
}

async function runJetStream() {
    try {
        const args = process.argv.slice(2);
        
        if (args.length !== 1) {
            await showUsage();
            return;
        }

        const command = args[0].toLowerCase();

        if (command === 'all') {
            await runAllBenchmarks();
        } else {
            const benchmarkNumber = parseInt(command);
            if (isNaN(benchmarkNumber)) {
                await showUsage();
                return;
            }
            await runSelectedBenchmark(benchmarkNumber);
        }
    } catch (err) {
        console.error("An error occurred:", err);
        process.exit(1);
    }
}

runJetStream();


