import vm from "node:vm";

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

async function runJetStream() {
    try {
        console.log("Total Benchmarks", JetStream.benchmarks.length);
        await JetStream.initialize();
        JetStream.start();
    } catch (e) {
        console.log("JetStream2 failed: " + e);
    }
}

runJetStream();


