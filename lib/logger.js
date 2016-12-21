module.exports.setLogger = setLogger

function setLogger (l) {
  module.exports = l
  module.exports.setLogger = setLogger
  return l
}
