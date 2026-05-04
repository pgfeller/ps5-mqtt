import { runSaga } from 'redux-saga';
import type MQTT from 'async-mqtt';

import { MQTT_CLIENT } from '../../services';
import { updateHomeAssistant } from './update-ha';
import type { Device } from '../types';

const baseDevice: Device = {
    id: 'test-device-id',
    name: 'Test PS5',
    normalizedName: 'test_ps5',
    address: { address: '192.168.0.10', port: 987 },
    available: true,
    status: 'STANDBY',
    systemVersion: '1.0',
    transitioning: false,
    type: 'PS5',
    activity: undefined,
};

function makeMockMqtt() {
    return {
        publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as MQTT.AsyncClient;
}

async function runUpdateHa(device: Device) {
    const mqtt = makeMockMqtt();
    await runSaga(
        {
            context: { [MQTT_CLIENT]: mqtt },
        },
        updateHomeAssistant,
        { type: 'UPDATE_HOME_ASSISTANT' as const, payload: device }
    ).toPromise();
    return mqtt;
}

describe('updateHomeAssistant saga', () => {
    test('publishes AWAKE when device status is AWAKE', async () => {
        const mqtt = await runUpdateHa({ ...baseDevice, status: 'AWAKE', available: true });
        const published = JSON.parse((mqtt.publish as jest.Mock).mock.calls[0][1]);
        expect(published.power).toBe('AWAKE');
    });

    test('publishes STANDBY when device status is STANDBY', async () => {
        const mqtt = await runUpdateHa({ ...baseDevice, status: 'STANDBY', available: false });
        const published = JSON.parse((mqtt.publish as jest.Mock).mock.calls[0][1]);
        expect(published.power).toBe('STANDBY');
    });

    test('publishes STANDBY (not UNKNOWN) when device status is UNKNOWN', async () => {
        const mqtt = await runUpdateHa({ ...baseDevice, status: 'UNKNOWN', available: false });
        const published = JSON.parse((mqtt.publish as jest.Mock).mock.calls[0][1]);
        expect(published.power).toBe('STANDBY');
        expect(published.power).not.toBe('UNKNOWN');
    });

    test('sets device_status to offline when device is not available', async () => {
        const mqtt = await runUpdateHa({ ...baseDevice, status: 'UNKNOWN', available: false });
        const published = JSON.parse((mqtt.publish as jest.Mock).mock.calls[0][1]);
        expect(published.device_status).toBe('offline');
    });
});
