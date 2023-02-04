#!/usr/bin/env node
import puppeteer from "puppeteer";
import * as os from "os";
import os__default from "os";
import which from "which";
import fs from "fs";
import { exec } from "child_process";
import { getEdgePath } from "edge-paths";
import path from "path";
import { z } from "zod";
import * as readline from "readline";
import chalk from "chalk";
import { Command } from "commander";
import figlet from "figlet";
var Browsers = /* @__PURE__ */ ((Browsers2) => {
  Browsers2["CHROME"] = "chrome";
  Browsers2["EDGE"] = "MicrosoftEdge";
  return Browsers2;
})(Browsers || {});
const knownBrowsers = {
  [
    "chrome"
    /* CHROME */
  ]: {
    winPathParts: ["Google", "Chrome", "Application"],
    aliases: [],
    namespace: "chrome"
  },
  [
    "MicrosoftEdge"
    /* EDGE */
  ]: {
    winPathParts: ["Microsoft", "Edge", "Application"],
    aliases: ["msedge", "edge"],
    namespace: "edge"
  }
};
class BrowserTypResolver {
  resolveFromNameOrAlias(browserName) {
    if (Object.keys(knownBrowsers).includes(browserName)) {
      return browserName;
    }
    for (const knowBrowser in knownBrowsers) {
      if (knownBrowsers[knowBrowser].aliases.includes(browserName)) {
        return browserName;
      }
    }
    return "";
  }
  resolveSpecByName(browserName) {
    return Object.freeze(Object.freeze(Object.seal(knownBrowsers[browserName]))) ?? null;
  }
  resolveNamespaceByName(browserName) {
    return knownBrowsers[browserName].namespace;
  }
}
class BrowserPathResolver {
  async resolve(browserName) {
    let browserExecPath;
    if (os.type().toLowerCase().startsWith("windows")) {
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
      browserExecPath = await which(browserName, { nothrow: true });
    }
    return browserExecPath;
  }
  resolveEdge() {
    return getEdgePath();
  }
  async #getBrowserByWhereCommandInWindows(browserName) {
    try {
      const { stdout, stderr } = await exec(`where ${browserName}.exe`);
      if (stderr) {
        throw stderr;
      }
      return String(stdout) || "";
    } catch (err) {
      console.error(`exec error: ${err}`);
      return "";
    }
  }
  #getBrowserPathInWindowsUsingFinding(browserName) {
    let browserExePath = "";
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
        const chromeExe = files.find((file) => file.endsWith(`${browserName}.exe`));
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
class ExtensionsPageTerminated extends Error {
  constructor() {
    super(`Extensions page was terminated, this one should be active during development`);
  }
}
class ExtensionsOperator {
  #extensionsPage;
  #loadedExtensionEntries;
  constructor() {
    this.#extensionsPage = null;
    this.#loadedExtensionEntries = [];
  }
  async start(browserContext) {
    this.#extensionsPage = await browserContext.newPage();
    this.#extensionsPage.on("close", async () => {
      const pages = await this.#extensionsPage?.browser()?.pages();
      if (!pages) {
        return;
      }
      const availablePages = pages.filter((page) => !page.isClosed());
      if (availablePages.length !== 0) {
        throw new ExtensionsPageTerminated();
      }
    });
    await this.#extensionsPage.goto("chrome://extensions/", { waitUntil: "networkidle2" });
    this.#loadedExtensionEntries = await this.#getLoadedExtensionsInDevelopment();
  }
  async shutdown() {
    this.#loadedExtensionEntries = [];
    this.#extensionsPage?.close();
    this.#extensionsPage = null;
  }
  getExtensionBy(criteria, delimiter) {
    return this.#loadedExtensionEntries.find((el) => el[criteria] === delimiter);
  }
  async reloadAllExtensions() {
    if (!this.#extensionsPage) {
      throw new Error("Extensions page is not available during fetching data");
    }
    await this.#extensionsPage.evaluate(`
            (async () => {
                const extensions = await chrome.management.getAll();

                for (const extension of extensions) {
                    if (extension.installType === 'development') {
                        await chrome.management.setEnabled(extension.id, false);
                        await chrome.management.setEnabled(extension.id, true);
                    }
                }
            })();
        `);
  }
  async #getLoadedExtensionsInDevelopment() {
    if (!this.#extensionsPage) {
      throw new Error("Extensions page is not available during fetching data");
    }
    return await this.#extensionsPage.evaluate(`
            (async () => {
                //const { management } = await import('chrome://extensions/content/extensions.js');
                const extensions = await chrome.management.getAll();

                const extensionsInDevelopment = [];

                for (const extension of extensions) {
                    if (extension.installType === 'development') {
                        extensionsInDevelopment.push(extension);
                    }
                }

                return extensionsInDevelopment;
            })();
        `);
  }
}
class CannotResolveGivenBrowser extends Error {
  constructor(browserName) {
    super(
      `Cannot resolve given browser name: ${browserName},
            it can happened because can be unsupported or system don't have it`
    );
  }
}
z.object({
  browserName: z.enum(["MicrosoftEdge", "chrome", "msedge", "none"]).default("none"),
  extensionPath: z.string(),
  moreInfo: z.boolean().default(false)
});
class ExtensionEnvManager {
  #browser = null;
  #dynamicConfig;
  #browserPathResolver;
  #browserTypeResolver;
  #config;
  #resolvedBrowser;
  #extensionsOperator;
  constructor(config) {
    this.#browserPathResolver = new BrowserPathResolver();
    this.#browserTypeResolver = new BrowserTypResolver();
    this.#extensionsOperator = new ExtensionsOperator();
    this.#config = config;
    this.#dynamicConfig = /* @__PURE__ */ new Map();
    this.#resolvedBrowser = null;
  }
  async reloadEntireTestPage() {
  }
  async reloadBrowserWithExtension() {
    if (this.#browser) {
      const backgroundPage = (await this.#browser.pages())[0];
      await backgroundPage.evaluate(`
                (async () => {
                  const {management} = await import('chrome://extensions/content/extensions.js');
                  management.get( "${null}" ).reload();
                })();
            `);
    }
  }
  async start() {
    await this.#createNewSession();
  }
  async stop() {
    if (!this.#browser) {
      throw new Error("Env is not initialised");
    }
    await this.#browser.close();
  }
  async #createNewSession() {
    try {
      const browserName = this.#browserTypeResolver.resolveFromNameOrAlias(this.#config.browserName);
      this.#resolvedBrowser = this.#browserTypeResolver.resolveSpecByName(browserName);
      if (!this.#resolvedBrowser) {
        throw new CannotResolveGivenBrowser(this.#config.browserName);
      }
      let browserExecPath = "";
      const browserFetcher = puppeteer.createBrowserFetcher();
      let revisionInfo = await browserFetcher.download("884014");
      if (browserName === Browsers.EDGE) {
        browserExecPath = this.#browserPathResolver.resolveEdge();
      }
      if (browserName === "none") {
        browserExecPath = revisionInfo.executablePath;
      }
      if (!browserExecPath) {
        browserExecPath = await this.#browserPathResolver.resolve(browserName);
      }
      if (!browserExecPath) {
        throw new Error(`Cannot find ${browserName}`);
      }
      console.info(`Opening browser: ${browserName}`);
      this.#dynamicConfig.set("browserExecutionPath", browserExecPath);
      this.#browser = await this.#newBrowser(browserExecPath);
      this.#browser.on("disconnected", () => {
        console.log("Browser was closed.");
        process.exit();
      });
      await this.#extensionsOperator.start(this.#browser);
    } catch (err) {
      throw err;
    }
  }
  async reloadAllExtensions() {
    await this.#extensionsOperator.reloadAllExtensions();
  }
  async #newBrowser(browserExecPath) {
    return await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      timeout: 2e3,
      devtools: true,
      //dumpio: true,
      executablePath: browserExecPath,
      args: [
        "--disable-extensions-except=" + this.#config.extensionPath,
        "--load-extension=" + this.#config.extensionPath,
        "--no-sandbox",
        "--disabled-setupid-sandbox",
        "--fast-start",
        "--new-tab"
        //'--single-process',
      ]
    });
  }
}
(async () => {
  const program = new Command();
  program.name("extensio").addHelpText("beforeAll", figlet.textSync("Exensio")).description("CLI to handle developing browser extensions").version("0.0.1");
  program.command("dev").description("Create extension development environment").usage(chalk.green("dev <extensionPath> [-v Verbose]")).addHelpCommand("h", "Hello").argument("<extensionPath>", "Extension path or name").option("-v, --verbose", "Run with verbose logging").option(
    "-b, --browser <browser>",
    "Switch browser",
    os__default.type().toLowerCase().startsWith("windows") ? "MicrosoftEdge" : "Firefox"
  ).action(
    async (extensionPath, options) => {
      try {
        if (options.verbose)
          console.info("Starting extension development env...");
        const extensionEnvManager = new ExtensionEnvManager({
          extensionPath,
          browserName: options.browser || "none"
        });
        console.info(extensionPath);
        await extensionEnvManager.start();
        console.info(`Press R to reload extension, or press Q to quit`);
        readline.emitKeypressEvents(process.stdin);
        process.stdin.on("keypress", (ch, key) => {
          if (key && key.name === "r") {
            console.log("Reloading extensions...");
            void extensionEnvManager.reloadAllExtensions();
          } else if (key && key.name === "q") {
            process.exit();
          }
        });
        process.stdin.setRawMode(true);
        process.stdin.resume();
      } catch (err) {
        console.error(err.message);
        process.exit(1);
      }
    }
  );
  program.parse(process.argv);
})();
