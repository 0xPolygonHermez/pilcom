module.exports = class ReferenceNotVisible extends Error {
    constructor (name) {
        super('Error reference '+name+' not visible/accesible');
    }
}