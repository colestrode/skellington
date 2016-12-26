'use strict'

const chai = require('chai')
const expect = chai.expect

describe('logger', function () {
  let logger

  beforeEach(function () {
    logger = require('../../../lib/logger')
  })

  describe('setLogger', function () {
    it('should return logger with setLogger method', function () {
      const newLogger = {}
      const l = logger.setLogger(newLogger)
      expect(l).to.equal(newLogger)
      expect(l.setLogger).to.exist
    })
  })
})
