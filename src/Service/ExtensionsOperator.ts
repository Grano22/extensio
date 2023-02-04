import {Browser, Page} from "puppeteer";
import ExtensionsPageTerminated from "../Exception/ExtensionsPageTerminated";

interface Icon {
    readonly size: number;
    readonly url: string;
}

interface ExtensionChromiumEntry {
    readonly description: string;
    readonly enabled: boolean;
    readonly homepageUrl: string;
    readonly hostPermissions: string[];
    readonly icons: Icon[];
    readonly id: string;
    readonly installType: 'development';
    readonly isApp: boolean;
    readonly mayDisable: true;
    readonly name: string;
    readonly offlineEnabled: boolean;
    readonly optionsUrl: string;
    readonly permissions: string[];
    readonly shortName: string;
    readonly type: 'extension';
    readonly version: string;

}

type ExtensionEntrySearchCriteria = keyof ExtensionChromiumEntry;

export default class ExtensionsOperator {
    #extensionsPage: Page | null;
    #loadedExtensionEntries: ExtensionChromiumEntry[];

    constructor() {
        this.#extensionsPage = null;
        this.#loadedExtensionEntries = [];
    }

    async start(browserContext: Browser) {
        this.#extensionsPage = await browserContext.newPage();
        this.#extensionsPage.on('close', async () => {
            const pages = await this.#extensionsPage?.browser()?.pages();

            if (!pages) {
                return;
            }

            const availablePages = pages.filter(page => !page.isClosed());

            if (availablePages.length !== 0) {
                throw new ExtensionsPageTerminated();
            }
        });
        await this.#extensionsPage.goto('chrome://extensions/', { waitUntil: 'networkidle2' });

        this.#loadedExtensionEntries = await this.#getLoadedExtensionsInDevelopment();
    }

    async shutdown() {
        this.#loadedExtensionEntries = [];
        this.#extensionsPage?.close();
        this.#extensionsPage = null;
    }

    public getExtensionBy(criteria: ExtensionEntrySearchCriteria, delimiter: string) {
        return this.#loadedExtensionEntries.find((el) => el[criteria] === delimiter);
    }

    public async reloadAllExtensions(): Promise<void> {
        if (!this.#extensionsPage) {
            throw new Error('Extensions page is not available during fetching data');
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

    async #getLoadedExtensionsInDevelopment(): Promise<ExtensionChromiumEntry[]> {
        if (!this.#extensionsPage) {
            throw new Error('Extensions page is not available during fetching data');
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
        `) as ExtensionChromiumEntry[];
    }
}