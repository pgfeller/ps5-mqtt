import { expectSaga } from 'redux-saga-test-plan';
import * as matchers from 'redux-saga-test-plan/matchers';
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

describe('updateHomeAssistant saga', () => {
    it('publishes AWAKE when device status is AWAKE', async () => {
        const mqtt = makeMockMqtt();
        const device: Device = { ...baseDevice, status: 'AWAKE', available: true };

        await expectSaga(updateHomeAssistant, { type: 'UPDATE_HOME_ASSISTANT', payload: device })
            .provide([[matchers.getContext(MQTT_CLIENT), mqtt]])
            .run();

        const published = JSON.parse((mqtt.publish as jest.Mock).mock.calls[0][1]);
        expect(published.power).toBe('AWAKE');
    });

    it('publishes STANDBY when device status is STANDBY', async () => {
        const mqtt = makeMockMqtt();
        const device: Device = { ...baseDevice, status: 'STANDBY', available: false };

        await expectSaga(updateHomeAssistant, { type: 'UPDATE_HOME_ASSISTANT', payload: device })
            .provide([[matchers.getContext(MQTT_CLIENT), mqtt]])
            .run();

        const published = JSON.parse((mqtt.publish as jest.Mock).mock.calls[0][1]);
        expect(published.power).toBe('STANDBY');
    });

    it('publishes STANDBY (not UNKNOWN) when device status is UNKNOWN', async () => {
        const mqtt = makeMockMqtt();
        const device: Device = { ...baseDevice, status: 'UNKNOWN', available: false };

        await expectSaga(updateHomeAssistant, { type: 'UPDATE_HOME_ASSISTANT', payload: device })
            .provide([[matchers.getContext(MQTT_CLIENT), mqtt]])
            .run();

        const published = JSON.parse((mqtt.publish as jest.Mock).mock.calls[0][1]);
        expect(published.power).toBe('STANDBY');
        expect(published.power).not.toBe('UNKNOWN');
    });

    it('sets device_status to offline when device is not available', async () => {
        const mqtt = makeMockMqtt();
        const device: Device = { ...baseDevice, status: 'UNKNOWN', available: false };

        await expectSaga(updateHomeAssistant, { type: 'UPDATE_HOME_ASSISTANT', payload: device })
            .provide([[matchers.getContext(MQTT_CLIENT), mqtt]])
            .run();

        const published = JSON.parse((mqtt.publish as jest.Mock).mock.calls[0][1]);
        expect(published.device_status).toBe('offline');
    });
});
