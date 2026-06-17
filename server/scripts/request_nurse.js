const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testNurse() {
    // Use userId=31 (lakshan), which  we confirmed exists in USER_AUTH  
    const token = jwt.sign({
        userId: 31,
        staffId: '2',
        role: 'nurse',
        name: 'Lakshan',
    }, 'carepulse_dev_secret_change_in_prod', { expiresIn: '8h' });

    console.log('Testing /api/nurse/me with userId=31');
    try {
        const res = await axios.get('http://localhost:5000/api/nurse/me', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('SUCCESS:', JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.log('ERROR:', JSON.stringify(err.response?.data, null, 2));
    }

    console.log('\nTesting /api/nurse/ward/details');
    try {
        const res = await axios.get('http://localhost:5000/api/nurse/ward/details', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('SUCCESS:', JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.log('ERROR:', JSON.stringify(err.response?.data, null, 2));
    }

    console.log('\nTesting /api/nurse/ward/patients');
    try {
        const res = await axios.get('http://localhost:5000/api/nurse/ward/patients', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('SUCCESS:', JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.log('ERROR:', JSON.stringify(err.response?.data, null, 2));
    }
}

testNurse();
