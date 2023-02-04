export default class ExtensionsPageTerminated extends Error {
    constructor() {
        super(`Extensions page was terminated, this one should be active during development`);
    }

}