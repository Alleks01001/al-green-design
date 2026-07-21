# Build Validation

## npm install
Exit code: `1`
```text
npm error code EACCES
npm error syscall open
npm error path /home/oai/.npm/_cacache/tmp/9a79efe6
npm error errno EACCES
npm error
npm error Your cache folder contains root-owned files, due to a bug in
npm error previous versions of npm which has since been addressed.
npm error
npm error To permanently fix this problem, please run:
npm error   sudo chown -R 1000:1000 "/home/oai/.npm"
npm error Log files were not written due to an error writing to the directory: /home/oai/.npm/_logs
npm error You can rerun the command with `--loglevel=verbose` to see the logs in your terminal
```
