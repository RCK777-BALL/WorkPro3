import dotenv from 'dotenv';
dotenv.config();
export default {
    mqtt: {
        url: process.env.MQTT_BROKER_URL || '',
        username: process.env.MQTT_BROKER_USERNAME || '',
        password: process.env.MQTT_BROKER_PASSWORD || '',
    },
    predictive: {
        model: process.env.PREDICTIVE_MODEL || 'linear',
    },
};
