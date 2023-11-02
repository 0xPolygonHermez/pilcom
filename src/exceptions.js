const CannotBeCastToType = require('./exceptions/cannot_be_cast_to_type.js');
const ReferenceNotFound = require('./exceptions/reference_not_found.js');
const ReferenceNotVisible = require('./exceptions/reference_not_visible.js');
const Exceptions = {
    CannotBeCastToType,
    ReferenceNotFound,
    ReferenceNotVisible
}
module.exports = Exceptions;
