import {knownBrowsers} from "./BrowserTypResolver";
import * as os from "os";
import which from "which";
import fs from "fs";
import {exec} from "child_process";
import {getEdgePath} from "edge-paths";
import path from "path";

/*const which = require("which");
const os = require('os')
const path = require('path');
const fs = require('fs');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const edgePaths = require("edge-paths");*/

export default class BrowserPathResolver {
    public async resolve(browserName: string): Promise<string> {
        let browserExecPath: string;

        if (os.type().toLowerCase().startsWith('windows')) {
            // @ts-ignore
            browserExecPath = await which(`${browserName}.exe`, { nothrow: true });

            if (!browserExecPath) {
                console.error(`Cannot find ${browserName} in PATH, trying to find it where command`);

                browserExecPath = await this.#getBrowserByWhereCommandInWindows(browserName);
            }

            if (!browserExecPath) {
                console.error(`Cannot find ${browserName} using where command, trying to find it manually`);

                browserExecPath = this.#getBrowserPathInWindowsUsingFinding(browserName);
            }
        } else {
            // @ts-ignore
            browserExecPath = await which(browserName, { nothrow: true });
        }

        return browserExecPath;
    }

    public resolveEdge() {
        return getEdgePath();
    }

    async #getBrowserByWhereCommandInWindows(browserName: string): Promise<string>
    {
        try {
            const { stdout, stderr } = await exec(`where ${browserName}.exe`);

            if (stderr) {
                throw stderr;
            }

            return String(stdout) || '';
        } catch (err) {
            console.error(`exec error: ${err}`);

            return '';
        }
    }

    #getBrowserPathInWindowsUsingFinding(browserName: string): string
    {
        let browserExePath: string = '';

        const chromePaths = [];

        if (process.env.LOCALAPPDATA) {
            chromePaths.push(path.join(process.env.LOCALAPPDATA, ...knownBrowsers[browserName].winPathParts || []));
        }

        if (process.env.ProgramFiles) {
            chromePaths.push(path.join(process.env.ProgramFiles, ...knownBrowsers[browserName].winPathParts || []));
        }

        if (process.env.ProgramFilesX86) {
            chromePaths.push(path.join(process.env.ProgramFilesX86, ...knownBrowsers[browserName].winPathParts || []));
        }

        for (const chromePath of chromePaths) {
            try {
                const files = fs.readdirSync(chromePath);
                const chromeExe = files.find((file: string) => file.endsWith(`${browserName}.exe`));
                if (chromeExe) {
                    browserExePath = path.join(chromePath, chromeExe);
                    break;
                }
            } catch (e) {
                console.error(e);
            }
        }

        return browserExePath;
    }
}