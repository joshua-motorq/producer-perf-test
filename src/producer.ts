import { config as dotenvConfig } from 'dotenv';
import { Client, Producer, AuthenticationToken, Message, ProducerMessage } from 'pulsar-client';
import { readFileSync } from 'fs';
import { parse } from 'yaml';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { promisify } from 'util';
import * as si from 'systeminformation';
import * as os from 'os';

dotenvConfig({ path: '.env.local' });

const appendFile = promisify(fs.appendFile);

const messageSize = process.env.MESSAGE_SIZE;
const batchSize = process.env.BATCH_SIZE;
const batchTimeout = process.env.BATCH_TIMEOUT;
const maxUniqueKeys = process.env.MAX_UNIQUE_KEYS;
const messageRate = process.env.MESSAGE_RATE;
const serviceUrl = process.env.SERVICE_URL;
const authParams = process.env.AUTH_PARAMS;
const topic = process.env.TOPIC;

if (!messageSize) {
    throw new Error('MESSAGE_SIZE environment variable is not defined');
}

if (!batchSize) {
    throw new Error('BATCH_SIZE environment variable is not defined');
}

if (!batchTimeout) {
    throw new Error('BATCH_TIMEOUT environment variable is not defined');
}

if (!maxUniqueKeys) {
    throw new Error('MAX_UNIQUE_KEYS environment variable is not defined');
}

if (!messageRate) {
    throw new Error('MESSAGE_RATE environment variable is not defined');
}

if (!serviceUrl) {
    throw new Error('SERVICE_URL environment variable is not defined');
}

if (!authParams) {
    throw new Error('AUTH_PARAMS environment variable is not defined');
}

if (!topic) {
    throw new Error('TOPIC environment variable is not defined');
}

const parsedMessageSize = parseInt(messageSize as string, 10);
const parsedBatchSize = parseInt(batchSize as string, 10);
const parsedBatchTimeout = parseInt(batchTimeout as string, 10);
const parsedMaxUniqueKeys = parseInt(maxUniqueKeys as string, 10);
const parsedMessageRate = parseInt(messageRate as string, 10);

console.log({
    messageSize: parsedMessageSize,
    batchSize: parsedBatchSize,
    batchTimeout: parsedBatchTimeout,
    maxUniqueKeys: parsedMaxUniqueKeys,
    messageRate: parsedMessageRate,
    serviceUrl,
    authParams,
    topic
})


const calculateBatchInterval = (parsedMessageRate: number, parsedBatchSize: number) => {
    return (parsedBatchSize / parsedMessageRate) * 1000; // Convert to milliseconds
};

const batchInterval = calculateBatchInterval(parsedMessageRate, parsedBatchSize);
console.log(`Calculated batch interval: ${batchInterval} ms`);

async function createProducer(client: Client, enableKeyBasedBatching: boolean): Promise<Producer> {
    if (enableKeyBasedBatching) {
        return await client.createProducer({
            topic: topic as string,
            batchingEnabled: true,
            batchingMaxMessages: parsedBatchSize,
            batchingMaxPublishDelayMs: parsedBatchTimeout * 1000,
            blockIfQueueFull: true,
            batchingType: 'KeyBasedBatching',
            maxPendingMessages: 10000000000000, // Set a very high limit to avoid blocking
            maxPendingMessagesAcrossPartitions: 1000000000000000, // Set a very high limit to avoid blocking
        });
    } else {
        return await client.createProducer({
            topic: topic as string,
            batchingEnabled: true,
            batchingMaxMessages: parsedBatchSize,
            batchingMaxPublishDelayMs: parsedBatchTimeout * 1000,
            blockIfQueueFull: true,
            batchingType: 'DefaultBatching',
            maxPendingMessages: 10000000000000, // Set a very high limit to avoid blocking
            maxPendingMessagesAcrossPartitions: 1000000000000000, // Set a very high limit to avoid blocking
        });
    }
}

export async function runProducer(enableKeyBasedBatching: boolean) {
    const auth = new AuthenticationToken({
        token: authParams as string
    });


    const client = new Client({
        serviceUrl: serviceUrl as string,
        operationTimeoutSeconds: 300,
        authentication: auth,
        ioThreads: 16, // Adjust based on your system's capabilities
    });

    const producer = await createProducer(client, enableKeyBasedBatching);

    const payload = '{"_ts":1741198400912,"dId":"81164f71-933d-4cd9-bada-800934530f9f","dataSource":"Ford","dtc_events":[],"feed_ver":1741198400912,"id":"2328bc65-e784-4c10-81af-fc8c89e3f961","location":{"lat":75.30460072563241,"lon":120.46989704309152},"meta":{"version":"1.0","timestamp":1741198400912,"status":"active"},"odm_can_mi":8469.49446194708,"speed_can_mph":55.24800420173388,"ts_local":"2025-03-05T18:13:23.431Z","ts_src":"2025-03-05T18:13:23.431Z","ttl":432000,"type":"COMBINEDFEED","types":["LOADTEST","LOADTESTEXTENDED"],"tzId":"America/Chicago","vId":"b7fe0572-8787-4e97-a678-ab43e63ce069"}' + 'A'.repeat(parsedMessageSize - 585);

    await Promise.resolve(() => { setTimeout(() => { }, 5000); }); // Ensure the producer is ready

    let messageCount = 0;
    const startTime = Date.now();

    let running = true;

    process.on('SIGTERM', () => {
        console.log('Received SIGTERM, stopping producer...');
        running = false;
    });

    const logFilePath = 'producer.log';

    const logMessageCount = async () => {
        try {
            await appendFile(logFilePath, `${Date.now()} Message count: ${messageCount}\n`);
        } catch (err) {
            console.error('Failed to write to log file:', err);
            throw err
        }
    };

    let batchStartTime = Date.now();
    let overrunAccumulator = 0;
    let keyIndexCounter = 0; // Initialize counter for round-robin key selection

    while (running) {
        // Use round-robin key selection
        const keyIndex = keyIndexCounter % parsedMaxUniqueKeys;
        const key = keyIndex.toString();
        keyIndexCounter++; // Increment the counter for the next message

        producer.send({
            data: Buffer.from(payload),
            partitionKey: key,
            orderingKey: key
        });

        messageCount++;

        if (messageCount % parsedBatchSize === 0) {
            const netData = await si.networkStats();
            await producer.flush().catch(err => {
                console.error('Failed to flush producer:', err);
                throw err;
            });

            await logMessageCount();

            const batchEndTime = Date.now();
            const batchElapsedTime = batchEndTime - batchStartTime;

            if (batchElapsedTime < batchInterval) {
                let sleepTime = batchInterval - batchElapsedTime;
                sleepTime -= overrunAccumulator;

                if (sleepTime < 0) {
                    overrunAccumulator -= Math.abs(sleepTime);
                    sleepTime = 0;
                } else {
                    overrunAccumulator = 0;
                }

                const start = process.hrtime();
                let elapsed = 0;
                while (elapsed < sleepTime * 1000000) {
                    const diff = process.hrtime(start);
                    elapsed = diff[0] * 1000000000 + diff[1];
                }
            } else {
                const overrun = batchElapsedTime - batchInterval;
                overrunAccumulator += overrun;
                try {
                    await appendFile(logFilePath, `${Date.now()} Batch overrun: expected ${batchInterval}ms, elapsed ${batchElapsedTime}ms, accumulated ${overrunAccumulator}ms\n`);
                    console.log(`Batch overrun: expected ${batchInterval}ms, elapsed ${batchElapsedTime}ms, accumulated ${overrunAccumulator}ms`);
                } catch (err) {
                    console.error('Failed to write to log file:', err);
                    throw err;
                }
            }

            batchStartTime = Date.now();
        }

        if (messageCount % 1000 === 0) {
            console.log(`Sent ${messageCount} messages so far`);
        }
    }

    await producer.flush();
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    console.log(`Sent ${messageCount} messages in ${duration} seconds`);

    await producer.close();
    await client.close();
}
