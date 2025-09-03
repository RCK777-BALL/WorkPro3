import mqtt from "mqtt";
import config from "../config/default";
const options = {};
export function createMqttClient(brokerUrl) {
    const client = mqtt.connect(brokerUrl, options);
    client.on("connect", () => console.log("MQTT connected:", brokerUrl));
    client.on("error", (err) => console.error("MQTT error:", err));
    return client;
}
export function initMQTTFromConfig() {
    const url = config.mqtt.url;
    if (!url)
        return null;
    return createMqttClient(url);
}
