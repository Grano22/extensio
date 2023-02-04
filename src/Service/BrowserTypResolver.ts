export enum Browsers {
    CHROME = 'chrome',
    EDGE = 'MicrosoftEdge'
}

export type KnownBrowsersEntry = {
    winPathParts: string[];
    aliases: string[];
    namespace: string;
}

export const knownBrowsers: { [key: string]: KnownBrowsersEntry } = {
    [Browsers.CHROME]: {
        winPathParts: ['Google', 'Chrome', 'Application'],
        aliases: [],
        namespace: 'chrome'
    },
    [Browsers.EDGE]: {
        winPathParts: ['Microsoft', 'Edge', 'Application'],
        aliases: ['msedge', 'edge'],
        namespace: 'edge'
    }
}

export default class BrowserTypResolver {
    public resolveFromNameOrAlias(browserName: string): string
    {
        if (Object.keys(knownBrowsers).includes(browserName)) {
            return browserName;
        }

        for (const knowBrowser in knownBrowsers) {
            if (knownBrowsers[knowBrowser].aliases.includes(browserName)) {
                return browserName;
            }
        }

        return '';
    }

    public resolveSpecByName(browserName: string): KnownBrowsersEntry | null
    {
        return Object.freeze(Object.freeze(Object.seal(knownBrowsers[browserName]))) ?? null;
    }

    public resolveNamespaceByName(browserName: string): string
    {
        return knownBrowsers[browserName].namespace;
    }
}