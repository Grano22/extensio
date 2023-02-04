export default class CannotResolveGivenBrowser extends Error {
    constructor(browserName: string) {
        super(
            `Cannot resolve given browser name: ${browserName},
            it can happened because can be unsupported or system don't have it`
        );
    }
}