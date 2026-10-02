const extractionService = require('../services/extraction.service');
const { sendSuccess } = require('../utils/response');

const extract = async (req, res, next) => {
  try {
    const { transcript } = req.body;
    const data = await extractionService.extractFromTranscript(transcript);
    return sendSuccess(res, 'Structured extraction completed successfully', data, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  extract
};
