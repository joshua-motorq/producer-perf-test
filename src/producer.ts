import { Client, Producer, AuthenticationToken, Message, ProducerMessage } from 'pulsar-client';
import { readFileSync } from 'fs';
import { parse } from 'yaml';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { promisify } from 'util';
import * as si from 'systeminformation';
import * as os from 'os';

const appendFile = promisify(fs.appendFile);

interface Config {
    messageSize: number;
    batchSize: number;
    batchTimeout: number;
    maxUniqueKeys: number;
    messageRate: number;
    serviceUrl: string;
    auth_params: string;
    topic: string;
}

const config = {
    messageSize: 700, // Size of each message in bytes
    batchSize: 1500, // Number of messages in each batch
    batchTimeout: 10, // Maximum time to wait for a batch in seconds
    maxUniqueKeys: 1000, // Maximum number of unique keys for key-based batching
    messageRate: 8571, // Target message rate in messages per second
    serviceUrl: 'pulsar+ssl://pc-276beb96.azure-eastus-test-w5d89.azure.snio.cloud:6651', // Pulsar service URL
    auth_params: 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImQwMjFkM2YzLWU0OTQtNTY0OC04YmI1LTcxZDg3OGMzNDM4MyIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsidXJuOnNuOnB1bHNhcjpvLTh6aTV0OmRldnRlc3QtY2xhc3NpYyJdLCJleHAiOjE3NTA5MjY4MTIsImh0dHBzOi8vc3RyZWFtbmF0aXZlLmlvL3Njb3BlIjpbImFkbWluIiwiYWNjZXNzIl0sImh0dHBzOi8vc3RyZWFtbmF0aXZlLmlvL3VzZXJuYW1lIjoic2hhc2hhbmstc2VydmljZS1hY2NvdW50QG8tOHppNXQuYXV0aC5zdHJlYW1uYXRpdmUuY2xvdWQiLCJpYXQiOjE3NDgzMzQ4MTUsImlzcyI6Imh0dHBzOi8vcGMtMjc2YmViOTYuYXp1cmUtZWFzdHVzLXRlc3QtdzVkODkuYXp1cmUuc25pby5jbG91ZC9hcGlrZXlzLyIsImp0aSI6IjA3NTZiNWUyMjg1OTQwOGJiZThjZTM2YjM1MmQwYzE3IiwicGVybWlzc2lvbnMiOltdLCJzdWIiOiJ6MG1ZdHFjTkd4V1RpZTFMMXNBQXFGOG1xdE9UMldlYkBjbGllbnRzIn0.LyqbiWBZ9vK0jeMqtuZsJOx4NFol9W6jXuq0D5O_LHtb7309NDcn-nYkzDBFF-Fa-H8vjrPTC2m4N7LxNbtZsTbx_0uP69Ntgb8rcIhl0cdjmtp9QJCE2Yvkz51kW8DPPoQUfGh98gG0ChDuTbsaqHggtAMuKhGqQWWIET4hg8Nl-JSdNawm6w0Qk9eG8Py-yilS6bsckwlQ5LHUuLf5VfwxlvLyCwuaybTHt93l2fxzQTIZysVMJLC8KfIYpvxycSgiqH6LxA-cJzlb_VsLVjA_288IGSPLLSa4OlA6pVjlocgvhUikqDSLpB29PiGqtl0sBn93_WhtfU-MHM2VFg',
    topic: 'persistent://joshua-motorq-classic/joshua-classic-namespace/experiment1'
} as Config;

console.log(config)


const calculateBatchInterval = (messageRate: number, batchSize: number) => {
    return (batchSize / messageRate) * 1000; // Convert to milliseconds
};

const batchInterval = calculateBatchInterval(config.messageRate, config.batchSize);
console.log(`Calculated batch interval: ${batchInterval} ms`);

async function createProducer(client: Client, enableKeyBasedBatching: boolean): Promise<Producer> {
    if (enableKeyBasedBatching) {
        return await client.createProducer({
            topic: config.topic,
            batchingEnabled: true,
            batchingMaxMessages: config.batchSize,
            batchingMaxPublishDelayMs: config.batchTimeout * 1000,
            blockIfQueueFull: true,
            batchingType: 'KeyBasedBatching',
            maxPendingMessages: 10000000000000, // Set a very high limit to avoid blocking
            maxPendingMessagesAcrossPartitions: 1000000000000000, // Set a very high limit to avoid blocking
        });
    } else {
        return await client.createProducer({
            topic: config.topic,
            batchingEnabled: true,
            batchingMaxMessages: config.batchSize,
            batchingMaxPublishDelayMs: config.batchTimeout * 1000,
            blockIfQueueFull: true,
            batchingType: 'DefaultBatching',
            maxPendingMessages: 10000000000000, // Set a very high limit to avoid blocking
            maxPendingMessagesAcrossPartitions: 1000000000000000, // Set a very high limit to avoid blocking
        });
    }
}

export async function runProducer(enableKeyBasedBatching: boolean) {
    const auth = new AuthenticationToken({
        token: config.auth_params
    });


    const client = new Client({
        serviceUrl: config.serviceUrl,
        operationTimeoutSeconds: 300,
        authentication: auth,
        ioThreads: 16, // Adjust based on your system's capabilities
    });

    const producer = await createProducer(client, enableKeyBasedBatching);

    const payload = '{"_ts":1741198400912,"dId":"81164f71-933d-4cd9-bada-800934530f9f","dataSource":"Ford","dtc_events":[],"feed_ver":1741198400912,"id":"2328bc65-e784-4c10-81af-fc8c89e3f961","location":{"lat":75.30460072563241,"lon":120.46989704309152},"meta":{"version":"1.0","timestamp":1741198400912,"status":"active"},"odm_can_mi":8469.49446194708,"speed_can_mph":55.24800420173388,"ts_local":"2025-03-05T18:13:23.431Z","ts_src":"2025-03-05T18:13:23.431Z","ttl":432000,"type":"COMBINEDFEED","types":["LOADTEST","LOADTESTEXTENDED"],"tzId":"America/Chicago","vId":"b7fe0572-8787-4e97-a678-ab43e63ce069"}' + 'A'.repeat(config.messageSize - 585);

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
        const keyIndex = keyIndexCounter % config.maxUniqueKeys;
        const key = keyIndex.toString();
        keyIndexCounter++; // Increment the counter for the next message

        producer.send({
            data: Buffer.from(payload),
            partitionKey: key,
            orderingKey: key
        });

        messageCount++;

        if (messageCount % config.batchSize === 0) {
            const netData = await si.networkStats();
            await producer.flush().catch(err => {
                console.error('Failed to flush producer:', err);
                throw err;
            });

            await logMessageCount();

            // const cpuUsage = process.cpuUsage();
            // const cpus = os.cpus();
            // let cpuPercent = 0;
            // if (cpus.length > 0) {
            //     cpuPercent = cpuUsage.system / (cpus[0].times.sys + cpus[0].times.idle) * 100;
            // }
            // const memoryUsage = process.memoryUsage();

            // console.log(`Batch completed: ${messageCount} messages`);
            // console.log(`CPU Load: ${cpuPercent.toFixed(2)}%`);
            // console.log(`Memory Usage: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
            // if (netData && netData.length > 0) {
            //     console.log(`Network RX: ${(netData[0].rx_bytes / 1024 / 1024).toFixed(2)} MB, TX: ${(netData[0].tx_bytes / 1024 / 1024).toFixed(2)} MB`);
            // }

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
