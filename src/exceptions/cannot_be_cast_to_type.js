module.exports = class CannotBeCastToType extends Error {
    constructor (castingType = false) {
        super('Error casting type '+ (castingType === false ? '':' to '+castingType));
    }

}