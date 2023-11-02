module.exports = class ReferenceNotFound extends Error {
    constructor (name) {
        super('Error reference '+name+' not found');
    }
}