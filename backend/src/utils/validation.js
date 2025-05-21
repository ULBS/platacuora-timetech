/**
 * Validation utility functions for API requests
 */

/**
 * Validates required fields in a request body
 * @param {Object} body - The request body
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object} - { isValid: boolean, missingFields: Array }
 */
const validateRequiredFields = (body, requiredFields) => {
  const missingFields = [];
  
  requiredFields.forEach(field => {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      missingFields.push(field);
    }
  });
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

/**
 * Validates that date fields are valid dates
 * @param {Object} body - The request body
 * @param {Array} dateFields - Array of date field names
 * @returns {Object} - { isValid: boolean, invalidDateFields: Array }
 */
const validateDateFields = (body, dateFields) => {
  const invalidDateFields = [];
  
  dateFields.forEach(field => {
    if (body[field] !== undefined) {
      const dateValue = new Date(body[field]);
      if (isNaN(dateValue.getTime())) {
        invalidDateFields.push(field);
      }
    }
  });
  
  return {
    isValid: invalidDateFields.length === 0,
    invalidDateFields
  };
};

/**
 * Validates that numeric fields contain valid numbers
 * @param {Object} body - The request body
 * @param {Array} numericFields - Array of numeric field names
 * @returns {Object} - { isValid: boolean, invalidNumericFields: Array }
 */
const validateNumericFields = (body, numericFields) => {
  const invalidNumericFields = [];
  
  numericFields.forEach(field => {
    if (body[field] !== undefined) {
      if (isNaN(Number(body[field]))) {
        invalidNumericFields.push(field);
      }
    }
  });
  
  return {
    isValid: invalidNumericFields.length === 0,
    invalidNumericFields
  };
};

/**
 * Validates that a field's value is in a given set of allowed values
 * @param {Object} body - The request body
 * @param {String} field - The field name to check
 * @param {Array} allowedValues - Array of allowed values
 * @returns {Object} - { isValid: boolean, field: String }
 */
const validateAllowedValues = (body, field, allowedValues) => {
  if (body[field] !== undefined && !allowedValues.includes(body[field])) {
    return {
      isValid: false,
      field
    };
  }
  
  return { isValid: true };
};

/**
 * Validates pagination parameters
 * @param {Object} query - The request query parameters
 * @returns {Object} - { page: number, limit: number }
 */
const validatePagination = (query) => {
  const defaultPage = 1;
  const defaultLimit = 10;
  const maxLimit = 100;
  
  let page = parseInt(query.page) || defaultPage;
  let limit = parseInt(query.limit) || defaultLimit;
  
  // Ensure positive values
  page = Math.max(1, page);
  limit = Math.max(1, limit);
  
  // Cap the limit to prevent performance issues
  limit = Math.min(limit, maxLimit);
  
  return { page, limit };
};

module.exports = {
  validateRequiredFields,
  validateDateFields,
  validateNumericFields,
  validateAllowedValues,
  validatePagination
};
