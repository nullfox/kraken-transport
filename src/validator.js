import Joi from 'joi';

const schemas = {
  request: Joi.object().keys({
    id: Joi.string().guid().required(),
    model: Joi.string().required(),
    task: Joi.string().required(),
    timestamp: Joi.date().timestamp('javascript').required(),
    params: Joi.object()
  }),

  response: Joi.object().keys({
    id: Joi.string().guid().required(),
    error: Joi.object().allow(null).keys({
      type: Joi.string().required(),
      message: Joi.string().required(),
      code: Joi.number().integer()
    }),
    data: Joi.alternatives().try(
      Joi.object(),
      Joi.array()
    )
  })
};

export default class Validator {
  static request(data) {
    return Joi.validate(data, schemas.request);
  }

  static response(data) {
    return Joi.validate(data, schemas.response);
  }
}
