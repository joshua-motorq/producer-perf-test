import { runProducer } from "./producer";


async function main() {
    console.log('Running with default batching');
    await runProducer(false);
}

main().catch(e => {
    console.log('Error: ', e);
    throw e;
});
