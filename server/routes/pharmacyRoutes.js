const express = require('express');
const jwt = require('jsonwebtoken');
const controller = require('./pharmacyController');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'carepulse_dev_secret_change_in_prod';

// Helper middleware to authenticate requests matching standard project pattern
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// Secured Routes
router.post('/dispense', authenticateToken, controller.dispense);
router.get('/low-stock', authenticateToken, controller.getLowStock);
router.get('/prescriptions', authenticateToken, controller.getPrescriptions);
router.get('/drugs', authenticateToken, controller.getDrugs);
router.post('/add-drug', authenticateToken, controller.addDrug);
router.post('/deduct-stock', authenticateToken, controller.deductStock);
router.delete('/delete-drug/:id', authenticateToken, controller.deleteDrug);

module.exports = router;
