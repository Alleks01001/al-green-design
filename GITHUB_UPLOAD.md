# GitHub-Upload – Studio 2.1

Dieses ZIP ist ein vollständiges Projekt und kein Einzel-Patch.

## Wichtig

Nach dem Entpacken müssen die Dateien und Ordner aus dem Projektstamm in das GitHub-Repository übernommen werden. Die ZIP-Datei selbst darf nicht als Programmdatei in das Repository hochgeladen werden.

Der Repository-Stamm muss danach unter anderem so aussehen:

```text
app/
components/
core/
data/
docs/
engines/
stores/
types/
package.json
package-lock.json
tsconfig.json
next.config.mjs
vercel.json
```

Alte, gleichnamige Dateien werden ersetzt. Veraltete Root-Dateien aus früheren Versionen dürfen nicht zusätzlich bestehen bleiben.

## Vercel

Nach dem Commit startet Vercel automatisch einen neuen Build. Die in `package.json` eingestellte Node-Zielversion ist 20.x.
