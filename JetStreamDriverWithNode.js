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

async function runAllBenchmarks(excludeNames = [], forceIterations = null) {
    JetStream.benchmarks = JetStream.benchmarks.filter(b => !excludeNames.includes(b.name));
    if (forceIterations !== null) {
        JetStream.benchmarks.forEach(b => b.iterations = forceIterations);
    }
    console.log("Total Benchmarks:", JetStream.benchmarks.length);
    await JetStream.initialize();
    await JetStream.start();
}

async function runSelectedBenchmarks(benchmarkNames, excludeNames = [], forceIterations = null) {
    const benchmarkOptions = JetStream.benchmarks;
    const selectedBenchmarks = [];

    for (const name of benchmarkNames) {
        const benchmark = benchmarkOptions.find(b => b.name === name);
        if (!benchmark) {
            console.log(`Invalid benchmark name: ${name}`);
            await showUsage();
            return;
        }
        selectedBenchmarks.push(benchmark);
    }

    // Filter out excluded benchmarks
    JetStream.benchmarks = selectedBenchmarks.filter(b => !excludeNames.includes(b.name));
    if (forceIterations !== null) {
        JetStream.benchmarks.forEach(b => b.iterations = forceIterations);
    }
    await JetStream.initialize();
    await JetStream.start();
}

async function showUsage() {
    console.log("\nUsage:");
    console.log("  npm run jetstream-node -- all [--output=filename.json] [--exclude=name1,name2] [--iterations=N]    # Run all benchmarks except excluded ones");
    console.log("  npm run jetstream-node -- <name> [name2 ...] [--output=filename.json] [--exclude=name1,name2] [--iterations=N]  # Run specific benchmarks by name");
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
        let excludeNames = [];
        let forceIterations = null;
        
        // Parse output file, exclude arguments, and iterations if present
        const outputArgIndex = args.findIndex(arg => arg.startsWith('--output='));
        if (outputArgIndex !== -1) {
            outputFile = args[outputArgIndex].split('=')[1];
            args.splice(outputArgIndex, 1);
        }

        const excludeArgIndex = args.findIndex(arg => arg.startsWith('--exclude='));
        if (excludeArgIndex !== -1) {
            excludeNames = args[excludeArgIndex].split('=')[1].split(',');
            args.splice(excludeArgIndex, 1);
        }

        const iterationsArgIndex = args.findIndex(arg => arg.startsWith('--iterations='));
        if (iterationsArgIndex !== -1) {
            forceIterations = parseInt(args[iterationsArgIndex].split('=')[1]);
            if (isNaN(forceIterations) || forceIterations <= 0) {
                console.error("Error: --iterations must be a positive number");
                process.exit(1);
            }
            args.splice(iterationsArgIndex, 1);
        }
        
        if (args.length === 0) {
            await showUsage();
            return;
        }

        const command = args[0].toLowerCase();

        if (command === 'all') {
            await runAllBenchmarks(excludeNames, forceIterations);
        } else {
            // Parse all arguments as benchmark names
            const benchmarkNames = args;
            await runSelectedBenchmarks(benchmarkNames, excludeNames, forceIterations);
        }

        // Save results to JSON file
        await saveResultsToFile(outputFile);
    } catch (err) {
        console.error("An error occurred:", err);
        process.exit(1);
    }
}

runJetStream();


