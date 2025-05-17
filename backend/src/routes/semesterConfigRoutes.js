const express = require('express');
const router = express.Router();
const semCtrl = require('../controllers/semesterConfigController');

router.post('/', semCtrl.createSemesterConfig);
router.get('/', semCtrl.getSemesterConfigs);
router.get('/:id', semCtrl.getSemesterConfigById);
router.put('/:id', semCtrl.updateSemesterConfig);
router.delete('/:id', semCtrl.deleteSemesterConfig);

module.exports = router;