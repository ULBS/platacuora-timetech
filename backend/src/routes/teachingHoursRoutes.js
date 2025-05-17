const express = require('express');
const router = express.Router();
const teachingCtrl = require('../controllers/teachingHoursController');

router.post('/', teachingCtrl.createTeachingHours);
router.get('/', teachingCtrl.getTeachingHours);
router.get('/:id', teachingCtrl.getTeachingHoursById);
router.put('/:id', teachingCtrl.updateTeachingHours);
router.delete('/:id', teachingCtrl.deleteTeachingHours);

module.exports = router;