import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const source = readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    },
    fileName: filename
  }).outputText;
  module._compile(output, filename);
};

const {
  INITIAL_PROJECT_PERSISTENCE,
  LOCAL_SAVE_ERROR_MESSAGE,
  persistProjectLocally
} = require(path.resolve("core/platform/projectPersistence.ts"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(INITIAL_PROJECT_PERSISTENCE.phase === "loading", "Vor der Hydrierung darf kein gespeicherter Zustand gemeldet werden");
assert(INITIAL_PROJECT_PERSISTENCE.lastSavedAt === null, "Vor dem ersten erfolgreichen Speichern darf kein Zeitpunkt gesetzt sein");

let writtenKey = "";
let writtenValue = "";
const savedAt = "2026-09-16T08:30:00.000Z";
const file = { application: "AL Green Design Studio", savedAt, project: { name: "Test" } };
const saved = persistProjectLocally({
  setItem(key, value) {
    writtenKey = key;
    writtenValue = value;
  }
}, "al-green-test", file, savedAt, INITIAL_PROJECT_PERSISTENCE);

assert(writtenKey === "al-green-test", "Der bestehende Speicherschlüssel wird nicht verwendet");
assert(JSON.parse(writtenValue).project.name === "Test", "Die Projektdatei wird nicht vollständig gespeichert");
assert(saved.phase === "saved", "Ein erfolgreicher Schreibvorgang wird nicht als gespeichert gemeldet");
assert(saved.lastSavedAt === savedAt, "Der letzte erfolgreiche Speicherzeitpunkt fehlt");
assert(saved.error === null, "Ein erfolgreicher Schreibvorgang behält fälschlich einen Fehler");

const failed = persistProjectLocally({
  setItem() {
    throw new Error("QuotaExceededError: private browser detail");
  }
}, "al-green-test", file, "2026-09-16T08:31:00.000Z", saved);

assert(failed.phase === "error", "Ein fehlgeschlagener Schreibvorgang wird nicht als Fehler gemeldet");
assert(failed.lastSavedAt === savedAt, "Ein Fehler löscht den letzten erfolgreichen Speicherzeitpunkt");
assert(failed.error === LOCAL_SAVE_ERROR_MESSAGE, "Der Speicherfehler ist nicht sicher und handlungsorientiert formuliert");
assert(!failed.error.includes("QuotaExceededError"), "Interne Browserdetails gelangen in die Oberfläche");

console.log("Projekt-Persistenz: Lade-, Erfolgs- und Fehlerzustand erfolgreich geprüft.");
