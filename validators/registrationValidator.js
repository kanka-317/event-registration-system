const { param } = require('express-validator');

const registrationEventParamValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid Event ID format')
];

const registrationIdParamValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid Registration ID format')
];

module.exports = {
  registrationEventParamValidator,
  registrationIdParamValidator
};
