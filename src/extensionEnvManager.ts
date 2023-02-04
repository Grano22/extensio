import type {Browser} from "puppeteer";
import puppeteer from "puppeteer";
import BrowserPathResolver from "./Service/BrowserPathResolver";
//import {HTTPRequest} from "puppeteer";
import {z} from "zod";
import BrowserTypeResolver, {Browsers, KnownBrowsersEntry} from "./Service/BrowserTypResolver";
import ExtensionsOperator from "./Service/ExtensionsOperator";
import CannotResolveGivenBrowser from "./Exception/CannotResolveGivenBrowser";

// const puppeteer = require("puppeteer");

const ExtensionEnvManagerConfig = z.object({
    browserName: z.enum(['MicrosoftEdge', 'chrome', 'msedge', 'none']).default('none'),
    extensionPath: z.string(),
    moreInfo: z.boolean().default(false)
});

type ExtensionEnvManagerConfigProto = z.infer<typeof ExtensionEnvManagerConfig>;

export default class ExtensionEnvManager {
    #browser: Browser | null = null;
    #dynamicConfig: Map<string, any>;
    #browserPathResolver: BrowserPathResolver;
    #browserTypeResolver: BrowserTypeResolver;
    #config: ExtensionEnvManagerConfigProto;
    #resolvedBrowser: KnownBrowsersEntry | null;
    #extensionsOperator: ExtensionsOperator;

    constructor(config: ExtensionEnvManagerConfigProto) {
        this.#browserPathResolver = new BrowserPathResolver();
        this.#browserTypeResolver = new BrowserTypeResolver();
        this.#extensionsOperator = new ExtensionsOperator();
        this.#config = config;
        this.#dynamicConfig = new Map();
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

            /*await this.#browser.reload({
                headless: false,
                executablePath: this.#dynamicConfig.get('browserExecutionPath'),
                args: [
                    '--disable-extensions-except=' + this.#config.extensionPath,
                    '--load-extension=' + this.#config.extensionPath
                ]
            });*/
        }
    }


    async start() {
        await this.#createNewSession();
    }

    async stop() {
        if (!this.#browser) {
            throw new Error('Env is not initialised');
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

            let browserExecPath: string = '';

            const browserFetcher = puppeteer.createBrowserFetcher();
            let revisionInfo = await browserFetcher.download('884014');

            if (browserName === Browsers.EDGE) {
                browserExecPath = this.#browserPathResolver.resolveEdge();
            }

            if (browserName === 'none') {
                browserExecPath = revisionInfo!.executablePath;
            }

            if (!browserExecPath) {
                browserExecPath = await this.#browserPathResolver.resolve(browserName);
            }

            if (!browserExecPath) {
                throw new Error(`Cannot find ${browserName}`);
            }

            console.info(`Opening browser: ${browserName}`);

            this.#dynamicConfig.set('browserExecutionPath', browserExecPath);

            this.#browser = await this.#newBrowser(browserExecPath);

            this.#browser!.on('disconnected', () => {
                console.log('Browser was closed.');

                process.exit();
            });

            await this.#extensionsOperator.start(this.#browser);

            //console.log(this.#extensionsOperator.getExtensionBy(''))

            //const testingPage = await this.#browser!.newPage();

            //const session = await testingPage.target().createCDPSession();
            //const {windowId} = await session.send('Browser.getWindowForTarget');
            // await session.send('Browser.setWindowBounds', {windowId, bounds: {windowState: 'minimized'}});

            // await testingPage.setRequestInterception(true);
            // testingPage.on('request', (interceptedRequest: HTTPRequest) => {
            //     if (interceptedRequest.isInterceptResolutionHandled()) return;
            //     if (
            //         interceptedRequest.url().endsWith('.png') ||
            //         interceptedRequest.url().endsWith('.jpg')
            //     )
            //         interceptedRequest.abort();
            //     else interceptedRequest.continue();
            // });

            //await testingPage.goto('chrome://extensions/', { waitUntil: 'networkidle2' });

            //await testingPage.goto('https://google.com');
        } catch(err) {
            //console.error(err);

            throw err;
        }
    }

    public async reloadAllExtensions(): Promise<void>
    {
        await this.#extensionsOperator.reloadAllExtensions();
    }

    async #newBrowser(browserExecPath: string): Promise<Browser> {
        return await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            timeout: 2000,
            devtools: true,
            //dumpio: true,
            executablePath: browserExecPath,
            args: [
                '--disable-extensions-except=' + this.#config.extensionPath,
                '--load-extension=' + this.#config.extensionPath,
                '--no-sandbox',
                '--disabled-setupid-sandbox',
                '--fast-start',
                '--new-tab'
                //'--single-process',
            ]
        });
    }
}