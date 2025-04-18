import vm from "node:vm";
import {stdin as input, stdout as output} from 'node:process';
import fs from 'node:fs';

import "./JetStreamDriver.js";
import { geomean } from "./JetStreamDriver.js";

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
    console.log("  npm run jetstream-node all [--output=filename.json]    # Run all benchmarks");
    console.log("  npm run jetstream-node <number> [--output=filename.json]  # Run a specific benchmark");
    console.log("\nAvailable benchmarks:");
    JetStream.benchmarks.forEach((benchmark, index) => {
        console.log(`  ${index + 1}. ${benchmark.name}`);
    });
    process.exit(1);
}

async function saveResultsToFile(filename) {
    try {
        const jsonResults = {
            timestamp: new Date().toISOString(),
            benchmarks: JetStream.benchmarks.map(benchmark => ({
                name: benchmark.name,
                score: benchmark.score,
                subTimes: benchmark.subTimes()
            })),
            totalScore: geomean(JetStream.benchmarks.map(b => b.score))
        };

        await fs.promises.writeFile(filename, JSON.stringify(jsonResults, null, 2));
        console.log(`\nResults saved to ${filename}`);
    } catch (err) {
        console.error(`Error saving results to ${filename}:`, err);
    }
}

async function runJetStream() {
    try {
        const args = process.argv.slice(2);
        let outputFile = 'bench_result.json';

        // Parse output file argument if present
        const outputArgIndex = args.findIndex(arg => arg.startsWith('--output='));
        if (outputArgIndex !== -1) {
            outputFile = args[outputArgIndex].split('=')[1];
            args.splice(outputArgIndex, 1);
        }
        
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

        // Save results to JSON file
        await saveResultsToFile(outputFile);
    } catch (err) {
        console.error("An error occurred:", err);
        process.exit(1);
    }
}

runJetStream();


