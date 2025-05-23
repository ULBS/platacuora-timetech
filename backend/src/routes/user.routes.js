/**
 * @swagger
 * tags:
 *  name: Users
 *  description: API endpoints for user management
 */

/**
 * @swagger
 * components:
 *  schemas:
 *    User:
 *      type: object
 *      required:
 *        - googleId
 *        - firstName
 *        - lastName
 *        - email
 *        - position
 *      properties:
 *        id:
 *          type: string
 *          description: The auto-generated ID
 *        googleId:
 *          type: string
 *          description: Google ID for OAuth authentication
 *        firstName:
 *          type: string
 *          description: User's first name
 *        lastName:
 *          type: string
 *          description: User's last name
 *        email:
 *          type: string
 *          format: email
 *          description: User's email address (must be ulbsibiu.ro or gmail.com domain)
 *        profilePicture:
 *          type: string
 *          description: URL to user's profile picture
 *        role:
 *          type: string
 *          enum: [user, admin]
 *          default: user
 *          description: User role for access control
 *        position:
 *          type: string
 *          enum: [Prof, Conf, Lect, Asist, Drd, titular, asociat]
 *          default: titular
 *          description: Academic position
 *        faculty:
 *          type: string
 *          description: Faculty name
 *        department:
 *          type: string
 *          description: Department name
 *        active:
 *          type: boolean
 *          default: true
 *          description: Whether the user account is active
 *        lastLogin:
 *          type: string
 *          format: date-time
 *          description: Last login timestamp
 *        profileCompleted:
 *          type: boolean
 *          default: false
 *          description: Whether the user has completed their profile
 *      example:
 *        googleId: "123456789012345678901"
 *        firstName: "Ion"
 *        lastName: "Popescu"
 *        email: "ion.popescu@ulbsibiu.ro"
 *        role: "user"
 *        position: "Lect"
 *        faculty: "Facultatea de Inginerie"
 *        department: "Calculatoare"
 *        active: true
 *        profileCompleted: true
 */

const express = require('express');
const router = express.Router();
const userCtrl = require('../controllers/userController');
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       403:
 *         description: Forbidden - Not an admin user
 *       500:
 *         description: Server error
 * 
 * @route   GET /api/users
 * @desc    Get all users (admin only)
 * @access  Private/Admin
 */
router.get('/', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-__v');
    return res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       403:
 *         description: Forbidden - Not an admin user
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 * 
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private/Admin
 */
router.get('/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-__v');
    
    if (!user) {
      return res.status(404).json({ message: 'Utilizator negăsit' });
    }
    
    return res.json(user);
  } catch (error) {
    console.error('Get user by ID error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user role (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 description: New role to assign to the user
 *             required:
 *               - role
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid role provided
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       403:
 *         description: Forbidden - Not an admin user
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 *
 * @route   PUT /api/users/:id
 * @desc    Update user roles/status (admin only)
 * @access  Private/Admin
 */
router.put('/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    
    if (role && !['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Rol invalid' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'Utilizator negăsit' });
    }
    
    return res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete a user (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to delete
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Utilizator șters cu succes"
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       403:
 *         description: Forbidden - Not an admin user
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 *
 * @route   DELETE /api/users/:id
 * @desc    Delete user (admin only)
 * @access  Private/Admin
 */
router.delete('/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilizator negăsit' });
    }
    
    return res.json({ message: 'Utilizator șters cu succes' });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

module.exports = router;