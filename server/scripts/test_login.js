const jwt = require('jsonwebtoken')
const axios = require('axios')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const JWT_SECRET = process.env.JWT_SECRET || 'carepulse_dev_secret_change_in_prod'
console.log('Using secret:', JWT_SECRET)

// Let's create a token for user 55 (nurse@gmail.com)
// From our listUsers, the USER_ID is 55.
const mockUser = {
    userId: 55,
    staffId: '1234', // Doesn't matter for the endpoint
    role: 'nurse',
    name: 'nurse2'
}

const token = jwt.sign(mockUser, JWT_SECRET, { expiresIn: '8h' })

async function checkMe() {
    try {
        const res = await axios.get('http://localhost:5000/api/nurse/me', {
            headers: { Authorization: `Bearer ${token}` }
        })
        console.log('SUCCESS!')
        console.log(JSON.stringify(res.data, null, 2))
    } catch (err) {
        console.log('FAILED!')
        if (err.response) {
            console.log('Status:', err.response.status)
            console.log('Data:', err.response.data)
        } else {
            console.log('Error:', err.message)
        }
    }
}

checkMe()
